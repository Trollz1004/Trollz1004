import crypto from 'crypto';
import { pool } from '../../database';
import logger from '../../logger';

/**
 * Phase 6: SendGrid Email Webhook Service
 * 
 * Handles SendGrid email event webhooks
 * Events: bounce, dropped, spam_report, unsubscribe, open, click, delivered
 */

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_event_id: string;
  sg_message_id?: string;
  reason?: string;
  status?: string;
  response?: string;
  url?: string;
  useragent?: string;
  ip?: string;
}

/**
 * Verify SendGrid webhook signature
 * SendGrid uses ECDSA (Elliptic Curve Digital Signature Algorithm)
 */
export const verifySendGridSignature = (
  signature: string,
  timestamp: string,
  body: string
): boolean => {
  try {
    const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
    
    if (!publicKey) {
      logger.warn('SENDGRID_WEBHOOK_PUBLIC_KEY not configured, skipping verification');
      return true; // Allow in development
    }

    // SendGrid signature format: timestamp + body
    const payload = timestamp + body;

    // Verify using ECDSA
    const verifier = crypto.createVerify('sha256');
    verifier.update(payload);
    
    const isValid = verifier.verify(
      publicKey,
      signature,
      'base64'
    );

    return isValid;
  } catch (error: any) {
    logger.error('SendGrid signature verification error', { error: error.message });
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
): Promise<string | null> => {
  try {
    const result = await pool.query(
      `INSERT INTO webhook_events (provider, event_type, event_id, payload, signature, verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [provider, eventType, eventId, payload, signature, verified]
    );

    return result.rows[0]?.id || null;
  } catch (error: any) {
    logger.error('Failed to log webhook event', { error: error.message });
    return null;
  }
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
 * Handle bounce event
 * Email bounced (hard bounce or soft bounce)
 */
const handleBounce = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email, reason, status } = event;

    // Hard bounces should unsubscribe user
    if (status?.includes('5.') || reason?.toLowerCase().includes('invalid')) {
      // Mark email as invalid
      await pool.query(
        `UPDATE users 
         SET email_verified = false, 
             email_bounce_reason = $1,
             email_bounce_at = NOW(),
             updated_at = NOW()
         WHERE email = $2`,
        [reason || 'Hard bounce', email]
      );

      // Unsubscribe from all emails
      await pool.query(
        `INSERT INTO email_unsubscribes (email, reason, unsubscribed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (email) DO NOTHING`,
        ['hard_bounce', email]
      );

      logger.info('Email hard bounce - user unsubscribed', { email, reason });
    } else {
      // Soft bounce - just log it
      await pool.query(
        `UPDATE users 
         SET email_bounce_reason = $1,
             email_bounce_at = NOW(),
             updated_at = NOW()
         WHERE email = $2`,
        [reason || 'Soft bounce', email]
      );

      logger.info('Email soft bounce logged', { email, reason });
    }

    await logWebhookAction(webhookEventId, 'handle_bounce', 'success', {
      email,
      reason,
      status,
    });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'handle_bounce', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle dropped event
 * Email was dropped by SendGrid (not sent)
 */
const handleDropped = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email, reason } = event;

    // Log dropped email
    logger.warn('Email dropped by SendGrid', { email, reason });

    // Update user record
    await pool.query(
      `UPDATE users 
       SET email_drop_reason = $1,
           email_drop_at = NOW(),
           updated_at = NOW()
       WHERE email = $2`,
      [reason || 'Dropped by SendGrid', email]
    );

    await logWebhookAction(webhookEventId, 'handle_dropped', 'success', {
      email,
      reason,
    });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'handle_dropped', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle spam_report event
 * User marked email as spam
 */
const handleSpamReport = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email } = event;

    // Immediately unsubscribe user
    await pool.query(
      `INSERT INTO email_unsubscribes (email, reason, unsubscribed_at)
       VALUES ($1, 'spam_report', NOW())
       ON CONFLICT (email) DO NOTHING`,
      [email]
    );

    // Update user record
    await pool.query(
      `UPDATE users 
       SET email_verified = false,
           spam_report_at = NOW(),
           updated_at = NOW()
       WHERE email = $1`,
      [email]
    );

    logger.warn('User reported email as spam', { email });

    await logWebhookAction(webhookEventId, 'handle_spam_report', 'success', { email });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'handle_spam_report', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle unsubscribe event
 * User clicked unsubscribe link
 */
const handleUnsubscribe = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email } = event;

    // Add to unsubscribe list
    await pool.query(
      `INSERT INTO email_unsubscribes (email, reason, unsubscribed_at)
       VALUES ($1, 'user_unsubscribe', NOW())
       ON CONFLICT (email) DO NOTHING`,
      [email]
    );

    logger.info('User unsubscribed from emails', { email });

    await logWebhookAction(webhookEventId, 'handle_unsubscribe', 'success', { email });
  } catch (error: any) {
    await logWebhookAction(webhookEventId, 'handle_unsubscribe', 'failed', null, error.message);
    throw error;
  }
};

/**
 * Handle open event
 * User opened email
 */
const handleOpen = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email, sg_message_id, timestamp, useragent, ip } = event;

    // Track email open for analytics
    await pool.query(
      `INSERT INTO email_tracking (email, event_type, message_id, timestamp, useragent, ip_address)
       VALUES ($1, 'open', $2, to_timestamp($3), $4, $5)`,
      [email, sg_message_id, timestamp, useragent, ip]
    );

    await logWebhookAction(webhookEventId, 'track_open', 'success', {
      email,
      sg_message_id,
    });
  } catch (error: any) {
    // Non-critical error - just log
    logger.debug('Email open tracking error', { error: error.message });
  }
};

/**
 * Handle click event
 * User clicked link in email
 */
const handleClick = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email, url, sg_message_id, timestamp, useragent, ip } = event;

    // Track email click for analytics
    await pool.query(
      `INSERT INTO email_tracking (email, event_type, message_id, timestamp, useragent, ip_address, url)
       VALUES ($1, 'click', $2, to_timestamp($3), $4, $5, $6)`,
      [email, sg_message_id, timestamp, useragent, ip, url]
    );

    await logWebhookAction(webhookEventId, 'track_click', 'success', {
      email,
      url,
      sg_message_id,
    });
  } catch (error: any) {
    // Non-critical error - just log
    logger.debug('Email click tracking error', { error: error.message });
  }
};

/**
 * Handle delivered event
 * Email was successfully delivered
 */
const handleDelivered = async (webhookEventId: string, event: SendGridEvent): Promise<void> => {
  try {
    const { email, sg_message_id } = event;

    // Update email queue status if exists
    await pool.query(
      `UPDATE email_queue 
       SET status = 'delivered', delivered_at = NOW()
       WHERE recipient_email = $1 AND message_id = $2`,
      [email, sg_message_id]
    );

    await logWebhookAction(webhookEventId, 'handle_delivered', 'success', {
      email,
      sg_message_id,
    });
  } catch (error: any) {
    // Non-critical error
    logger.debug('Email delivered tracking error', { error: error.message });
  }
};

/**
 * Process SendGrid webhook events (batch)
 */
export const processSendGridWebhook = async (
  events: SendGridEvent[],
  signature: string,
  timestamp: string
): Promise<void> => {
  logger.info('Processing SendGrid webhook batch', { count: events.length });

  for (const event of events) {
    const { sg_event_id, event: eventType, email } = event;

    // Log webhook event
    const webhookEventId = await logWebhookEvent(
      'sendgrid',
      eventType,
      sg_event_id,
      event,
      signature,
      true
    );

    if (!webhookEventId) {
      logger.debug('Duplicate SendGrid event ignored', { sg_event_id, eventType });
      continue;
    }

    try {
      // Route to appropriate handler
      switch (eventType) {
        case 'bounce':
          await handleBounce(webhookEventId, event);
          break;

        case 'dropped':
          await handleDropped(webhookEventId, event);
          break;

        case 'spamreport':
          await handleSpamReport(webhookEventId, event);
          break;

        case 'unsubscribe':
          await handleUnsubscribe(webhookEventId, event);
          break;

        case 'open':
          await handleOpen(webhookEventId, event);
          break;

        case 'click':
          await handleClick(webhookEventId, event);
          break;

        case 'delivered':
          await handleDelivered(webhookEventId, event);
          break;

        default:
          logger.debug('Unhandled SendGrid event type', { eventType });
          await logWebhookAction(webhookEventId, 'unhandled_event', 'success', { eventType });
      }

      // Mark as processed
      await pool.query(
        `UPDATE webhook_events 
         SET processed = true, processed_at = NOW()
         WHERE id = $1`,
        [webhookEventId]
      );
    } catch (error: any) {
      logger.error('SendGrid event processing error', {
        sg_event_id,
        eventType,
        email,
        error: error.message,
      });

      // Update retry count
      await pool.query(
        `UPDATE webhook_events 
         SET retry_count = retry_count + 1, error_message = $1
         WHERE id = $2`,
        [error.message, webhookEventId]
      );
    }
  }

  logger.info('SendGrid webhook batch processed', { count: events.length });
};

/**
 * Get email engagement stats for user
 */
export const getEmailEngagementStats = async (email: string): Promise<any> => {
  const result = await pool.query(
    `SELECT 
       COUNT(*) FILTER (WHERE event_type = 'open') as opens,
       COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
       COUNT(DISTINCT message_id) as emails_received,
       MAX(timestamp) as last_engagement
     FROM email_tracking
     WHERE email = $1`,
    [email]
  );

  return result.rows[0];
};

/**
 * Check if email is unsubscribed
 */
export const isEmailUnsubscribed = async (email: string): Promise<boolean> => {
  const result = await pool.query(
    `SELECT 1 FROM email_unsubscribes WHERE email = $1`,
    [email]
  );

  return result.rows.length > 0;
};
