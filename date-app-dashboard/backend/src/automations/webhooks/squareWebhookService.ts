import crypto from 'crypto';
import { pool } from '../../database';
import logger from '../../logger';
import { recordRevenueEvent } from '../analytics/analyticsService';
import { trackPremiumConversion } from '../analytics/acquisitionService';
import { addToQueue } from '../email/emailQueueService';

/**
 * Phase 6: Square Payment Webhook Service
 * 
 * Handles Square payment webhooks with signature verification
 * Events: payment.created, payment.updated, subscription.created, etc
 */

interface SquareWebhookEvent {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object: any;
  };
}

/**
 * Verify Square webhook signature
 * Square uses HMAC-SHA256 with notification URL + body
 */
export const verifySquareSignature = (
  signature: string,
  body: string,
  notificationUrl: string
): boolean => {
  try {
    const webhookSecret = process.env.SQUARE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.error('SQUARE_WEBHOOK_SECRET not configured');
      return false;
    }

    // Square signature format: concatenate notification URL + body
    const payload = notificationUrl + body;
    
    // Calculate HMAC-SHA256
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('base64');

    // Compare signatures (constant-time comparison to prevent timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error: any) {
    logger.error('Square signature verification error', { error: error.message });
    return false;
  }
};

/**
 * Log webhook event to database
 */
const logWebhookEvent = async (
  provider: string,
  eventType: string,
  eventId: string,
  payload: any,
  signature: string,
  verified: boolean
): Promise<string> => {
  const result = await pool.query(
    `INSERT INTO webhook_events (provider, event_type, event_id, payload, signature, verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING id`,
    [provider, eventType, eventId, payload, signature, verified]
  );

  return result.rows[0]?.id;
};

/**
 * Log webhook processing action
 */
const logWebhookAction = async (
  webhookEventId: string,
  action: string,
  status: 'success' | 'failed' | 'retrying',
  details?: any,
  errorMessage?: string
): Promise<void> => {
  await pool.query(
    `INSERT INTO webhook_logs (webhook_event_id, action, status, details, error_message)
     VALUES ($1, $2, $3, $4, $5)`,
    [webhookEventId, action, status, details || null, errorMessage || null]
  );
};

/**
 * Move failed webhook to dead letter queue
 */
const moveToDeadLetterQueue = async (
  webhookEventId: string,
  provider: string,
  eventType: string,
  payload: any,
  failureReason: string
): Promise<void> => {
  await pool.query(
    `INSERT INTO dead_letter_queue (webhook_event_id, provider, event_type, payload, failure_reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [webhookEventId, provider, eventType, payload, failureReason]
  );

  logger.warn('Webhook moved to dead letter queue', {
    webhookEventId,
    provider,
    eventType,
    failureReason,
  });
};

/**
 * Handle payment.created event
 * New payment was created
 */
const handlePaymentCreated = async (webhookEventId: string, data: any): Promise<void> => {
  try {
    const payment = data.object.payment;
    
    // Extract payment details
    const amountMoney = payment.amount_money;
    const amount = amountMoney.amount / 100; // Convert cents to dollars
    const currency = amountMoney.currency;
    const customerId = payment.customer_id;
    const paymentId = payment.id;

    // Find user by Square customer ID
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE square_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User not found for Square customer ID: ${customerId}`);
    }

    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;

    // Check if this is first purchase
    const purchaseHistory = await pool.query(
      'SELECT COUNT(*) FROM revenue_events WHERE user_id = $1 AND event_type = $2',
      [userId, 'subscription']
    );
    const isFirstPurchase = purchaseHistory.rows[0].count === '0';

    // Record revenue event
    await recordRevenueEvent({
      userId,
      event_type: 'subscription',
      amount,
      currency,
      subscription_tier: 'premium', // Determine from payment metadata
      billing_period: 'monthly', // Determine from payment metadata
      transaction_id: paymentId,
      payment_method: payment.source_type || 'credit_card',
      is_first_purchase: isFirstPurchase,
    });

    // Track premium conversion if first purchase
    if (isFirstPurchase) {
      await trackPremiumConversion(userId);
    }

    // Send welcome email for first purchase
    if (isFirstPurchase) {
      await addToQueue({
        to: userEmail,
        template: 'premium_welcome',
        data: {
          amount,
          currency,
        },
      });
    }

    await logWebhookAction(webhookEventId, 'process_payment_created', 'success', {
      userId,
      amount,
      paymentId,
    });

    logger.info('Payment created webhook processed', {
      userId,
      amount,
      paymentId,
      isFirstPurchase,
    });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'process_payment_created', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle payment.updated event
 * Payment status changed (completed, failed, canceled)
 */
const handlePaymentUpdated = async (webhookEventId: string, data: any): Promise<void> => {
  try {
    const payment = data.object.payment;
    const status = payment.status;
    const paymentId = payment.id;

    if (status === 'COMPLETED') {
      // Payment succeeded
      await logWebhookAction(webhookEventId, 'payment_completed', 'success', { paymentId });
      
    } else if (status === 'FAILED') {
      // Payment failed - notify user
      const customerId = payment.customer_id;
      const userResult = await pool.query(
        'SELECT id, email FROM users WHERE square_customer_id = $1',
        [customerId]
      );

      if (userResult.rows.length > 0) {
        const userEmail = userResult.rows[0].email;
        
        await addToQueue({
          to: userEmail,
          template: 'payment_failed',
          data: {
            paymentId,
            failureReason: payment.processing_fee?.[0]?.error_code || 'Unknown error',
          },
        });
      }

      await logWebhookAction(webhookEventId, 'payment_failed', 'success', { paymentId, status });
    }

    logger.info('Payment updated webhook processed', { paymentId, status });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'process_payment_updated', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle subscription.created event
 * New subscription was created
 */
const handleSubscriptionCreated = async (webhookEventId: string, data: any): Promise<void> => {
  try {
    const subscription = data.object.subscription;
    const customerId = subscription.customer_id;
    const subscriptionId = subscription.id;
    const planVariationId = subscription.plan_variation_id;

    // Find user
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE square_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User not found for Square customer ID: ${customerId}`);
    }

    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;

    // Update user subscription
    await pool.query(
      `UPDATE users 
       SET subscription_tier = $1, 
           subscription_id = $2,
           subscription_status = 'active',
           updated_at = NOW()
       WHERE id = $3`,
      ['premium', subscriptionId, userId]
    );

    // Send welcome email
    await addToQueue({
      to: userEmail,
      template: 'subscription_created',
      data: {
        subscriptionId,
        tier: 'premium',
      },
    });

    await logWebhookAction(webhookEventId, 'subscription_created', 'success', {
      userId,
      subscriptionId,
      planVariationId,
    });

    logger.info('Subscription created webhook processed', {
      userId,
      subscriptionId,
    });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'process_subscription_created', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle subscription.updated event
 * Subscription status changed
 */
const handleSubscriptionUpdated = async (webhookEventId: string, data: any): Promise<void> => {
  try {
    const subscription = data.object.subscription;
    const customerId = subscription.customer_id;
    const subscriptionId = subscription.id;
    const status = subscription.status;

    // Find user
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE square_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User not found for Square customer ID: ${customerId}`);
    }

    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;

    // Update subscription status
    await pool.query(
      `UPDATE users 
       SET subscription_status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status.toLowerCase(), userId]
    );

    // Handle different statuses
    if (status === 'CANCELED') {
      // Send cancellation confirmation + win-back email
      await addToQueue({
        to: userEmail,
        template: 'subscription_canceled',
        data: {
          subscriptionId,
        },
      });
    } else if (status === 'PAUSED') {
      // Subscription paused
      await addToQueue({
        to: userEmail,
        template: 'subscription_paused',
        data: {
          subscriptionId,
        },
      });
    }

    await logWebhookAction(webhookEventId, 'subscription_updated', 'success', {
      userId,
      subscriptionId,
      status,
    });

    logger.info('Subscription updated webhook processed', {
      userId,
      subscriptionId,
      status,
    });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'process_subscription_updated', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle refund.created event
 * Refund was issued
 */
const handleRefundCreated = async (webhookEventId: string, data: any): Promise<void> => {
  try {
    const refund = data.object.refund;
    const amountMoney = refund.amount_money;
    const amount = amountMoney.amount / 100;
    const currency = amountMoney.currency;
    const paymentId = refund.payment_id;
    const refundId = refund.id;

    // Find user by payment ID
    const userResult = await pool.query(
      `SELECT user_id FROM revenue_events WHERE transaction_id = $1 LIMIT 1`,
      [paymentId]
    );

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].user_id;

      // Record refund as negative revenue
      await recordRevenueEvent({
        userId,
        event_type: 'refund',
        amount: -amount,
        currency,
        transaction_id: refundId,
        is_first_purchase: false,
      });

      await logWebhookAction(webhookEventId, 'refund_processed', 'success', {
        userId,
        amount,
        refundId,
      });
    }

    logger.info('Refund created webhook processed', {
      refundId,
      amount,
    });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'process_refund_created', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Process Square webhook event
 */
export const processSquareWebhook = async (
  event: SquareWebhookEvent,
  signature: string,
  notificationUrl: string
): Promise<void> => {
  const { event_id, type, data } = event;

  // Log webhook event
  const webhookEventId = await logWebhookEvent(
    'square',
    type,
    event_id,
    event,
    signature,
    true // Already verified before calling this function
  );

  if (!webhookEventId) {
    logger.warn('Duplicate Square webhook event ignored', { event_id, type });
    return; // Duplicate event (already processed)
  }

  try {
    // Route to appropriate handler based on event type
    switch (type) {
      case 'payment.created':
        await handlePaymentCreated(webhookEventId, data);
        break;

      case 'payment.updated':
        await handlePaymentUpdated(webhookEventId, data);
        break;

      case 'subscription.created':
        await handleSubscriptionCreated(webhookEventId, data);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(webhookEventId, data);
        break;

      case 'refund.created':
        await handleRefundCreated(webhookEventId, data);
        break;

      default:
        logger.info('Unhandled Square webhook event type', { type });
        await logWebhookAction(webhookEventId, 'unhandled_event', 'success', { type });
    }

    // Mark webhook as processed
    await pool.query(
      `UPDATE webhook_events 
       SET processed = true, processed_at = NOW() 
       WHERE id = $1`,
      [webhookEventId]
    );

    logger.info('Square webhook processed successfully', { event_id, type });
  } catch (error: any) {
    logger.error('Square webhook processing error', {
      event_id,
      type,
      error: error.message,
    });

    // Move to dead letter queue after 3 failed attempts
    const retryResult = await pool.query(
      `UPDATE webhook_events 
       SET retry_count = retry_count + 1, error_message = $1
       WHERE id = $2
       RETURNING retry_count`,
      [error.message, webhookEventId]
    );

    const retryCount = retryResult.rows[0]?.retry_count || 0;

    if (retryCount >= 3) {
      await moveToDeadLetterQueue(
        webhookEventId,
        'square',
        type,
        event,
        `Failed after ${retryCount} attempts: ${error.message}`
      );
    }

    throw error;
  }
};

/**
 * Replay failed webhook from dead letter queue
 */
export const replaySquareWebhook = async (deadLetterQueueId: string): Promise<void> => {
  const result = await pool.query(
    `SELECT * FROM dead_letter_queue WHERE id = $1 AND provider = 'square' AND resolved = false`,
    [deadLetterQueueId]
  );

  if (result.rows.length === 0) {
    throw new Error('Dead letter queue item not found or already resolved');
  }

  const dlqItem = result.rows[0];

  try {
    // Retry processing
    await processSquareWebhook(
      dlqItem.payload,
      '', // No signature verification on replay
      ''
    );

    // Mark as resolved
    await pool.query(
      `UPDATE dead_letter_queue 
       SET resolved = true, resolved_at = NOW()
       WHERE id = $1`,
      [deadLetterQueueId]
    );

    logger.info('Square webhook replayed successfully', { deadLetterQueueId });
  } catch (error: any) {
    // Update retry count
    await pool.query(
      `UPDATE dead_letter_queue 
       SET retry_attempts = retry_attempts + 1, last_retry_at = NOW()
       WHERE id = $1`,
      [deadLetterQueueId]
    );

    throw error;
  }
};
