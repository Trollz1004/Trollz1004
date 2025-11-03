import { Router, Request, Response } from 'express';
import logger from '../logger';
import { trackEvent } from '../automations/email/emailAnalyticsService';
import crypto from 'crypto';
import { pool } from '../database';
import {
  verifySquareSignature,
  processSquareWebhook,
  replaySquareWebhook,
} from '../automations/webhooks/squareWebhookService';
import {
  verifySendGridSignature as verifySGSignature,
  processSendGridWebhook,
} from '../automations/webhooks/sendgridWebhookService';
import { isAdmin } from '../middleware/admin';
import { requireAuth } from '../middleware/auth';

export const webhooksRouter = Router();

/**
 * Phase 6: Webhook Handlers
 * Handles webhooks from Square, SendGrid with signature verification
 */

// =====================================================
// SQUARE PAYMENT WEBHOOKS
// =====================================================

/**
 * POST /api/webhooks/square
 * Handle Square payment webhooks
 */
webhooksRouter.post('/square', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-square-hmacsha256-signature'] as string;
    const notificationUrl = `${process.env.BACKEND_URL}/api/webhooks/square`;
    const body = JSON.stringify(req.body);

    if (!signature) {
      logger.warn('Square webhook missing signature');
      return res.status(401).json({ error: 'Missing signature' });
    }

    // Verify signature
    const isValid = verifySquareSignature(signature, body, notificationUrl);

    if (!isValid) {
      logger.warn('Square webhook invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook event
    await processSquareWebhook(req.body, signature, notificationUrl);

    res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Square webhook handler error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/webhooks/square/replay/:id
 * Replay failed Square webhook from dead letter queue
 * Admin only
 */
webhooksRouter.post('/square/replay/:id', requireAuth, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await replaySquareWebhook(id);

    res.status(200).json({ 
      success: true,
      message: 'Webhook replayed successfully',
    });
  } catch (error: any) {
    logger.error('Square webhook replay error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// SENDGRID EMAIL WEBHOOKS (PHASE 2 + PHASE 6 ENHANCED)
// =====================================================

/**
 * SendGrid Event Webhook Handler
 * POST /api/webhooks/sendgrid
 * 
 * Handles events: open, click, bounce, dropped, deferred, complaint, unsubscribe
 */
webhooksRouter.post('/sendgrid', async (req: Request, res: Response) => {
  try {
    const sendgridPublicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY || '';
    const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

    // Verify signature (in production)
    if (process.env.NODE_ENV === 'production' && sendgridPublicKey) {
      const payload = JSON.stringify(req.body);
      const isValid = verifySGSignature(signature, timestamp, payload);

      if (!isValid) {
        logger.warn('Invalid SendGrid webhook signature');
        return res.status(401).json({ message: 'Invalid webhook signature' });
      }
    }

    const events = Array.isArray(req.body) ? req.body : [req.body];

    logger.info(`Received ${events.length} SendGrid webhook events`);

    // Process each event
    for (const event of events) {
      try {
        const {
          event: eventType,
          email,
          timestamp: eventTimestamp,
          email_queue_id,
          url,
          reason,
          status,
        } = event;

        logger.debug(`Processing SendGrid event: ${eventType} for ${email}`);

        // Get email_queue_id from custom_args if available
        const queueId = event.email_queue_id || event.custom_args?.email_queue_id;

        if (!queueId) {
          logger.warn('Event missing email_queue_id', { eventType, email });
          continue;
        }

        // Prepare event data
        const eventData: any = {
          email,
          timestamp: eventTimestamp,
        };

        if (url) {
          eventData.url = url;
        }

        if (reason) {
          eventData.reason = reason;
        }

        if (status) {
          eventData.status = status;
        }

        // Map SendGrid event types to our event types
        let mappedEventType = eventType;

        switch (eventType) {
          case 'open':
            mappedEventType = 'open';
            break;
          case 'click':
            mappedEventType = 'click';
            break;
          case 'bounce':
          case 'dropped':
          case 'deferred':
            mappedEventType = 'bounce';
            eventData.bounceReason = reason || status || eventType;
            break;
          case 'spamreport':
          case 'unsubscribe':
            mappedEventType = eventType === 'spamreport' ? 'complaint' : 'unsubscribe';
            break;
          default:
            logger.debug(`Ignoring SendGrid event type: ${eventType}`);
            continue;
        }

        // Track the event
        await trackEvent(queueId, mappedEventType, eventData);

        logger.debug(`Tracked ${mappedEventType} event for email ${queueId}`);
      } catch (eventError: any) {
        logger.error('Failed to process individual webhook event', {
          error: eventError.message,
          event,
        });
        // Continue processing other events
      }
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true, processed: events.length });
  } catch (error: any) {
    logger.error('Failed to process SendGrid webhook', { error: error.message });
    
    // Still return 200 to avoid SendGrid retries
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Test webhook endpoint (for development)
 * POST /api/webhooks/test
 */
webhooksRouter.post('/test', async (req: Request, res: Response) => {
  try {
    logger.info('Test webhook received', { body: req.body });
    
    res.status(200).json({
      success: true,
      message: 'Webhook test received',
      body: req.body,
    });
  } catch (error: any) {
    logger.error('Test webhook error', { error: error.message });
    res.status(500).json({ message: 'Webhook test failed', error: error.message });
  }
});

// =====================================================
// WEBHOOK MONITORING & MANAGEMENT (PHASE 6)
// =====================================================

/**
 * GET /api/webhooks/events
 * List recent webhook events (Admin only)
 */
webhooksRouter.get('/events', requireAuth, isAdmin, async (req: Request, res: Response) => {
  try {
    const { provider, processed, limit = 100 } = req.query;

    let query = `
      SELECT 
        id,
        provider,
        event_type,
        event_id,
        verified,
        processed,
        processed_at,
        error_message,
        retry_count,
        created_at
      FROM webhook_events
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (provider) {
      query += ` AND provider = $${paramCount}`;
      params.push(provider);
      paramCount++;
    }

    if (processed !== undefined) {
      query += ` AND processed = $${paramCount}`;
      params.push(processed === 'true');
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    params.push(Number(limit));

    const { rows } = await pool.query(query, params);

    res.json({ events: rows });
  } catch (error: any) {
    logger.error('Failed to fetch webhook events', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/events/:id
 * Get webhook event details with logs (Admin only)
 */
webhooksRouter.get('/events/:id', requireAuth, isAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const eventResult = await pool.query(
      `SELECT * FROM webhook_events WHERE id = $1`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook event not found' });
    }

    const logsResult = await pool.query(
      `SELECT * FROM webhook_logs WHERE webhook_event_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      event: eventResult.rows[0],
      logs: logsResult.rows,
    });
  } catch (error: any) {
    logger.error('Failed to fetch webhook event details', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/dead-letter-queue
 * List failed webhooks in dead letter queue (Admin only)
 */
webhooksRouter.get('/dead-letter-queue', requireAuth, isAdmin, async (req: Request, res: Response) => {
  try {
    const { provider, resolved, limit = 50 } = req.query;

    let query = `
      SELECT 
        dlq.*,
        we.event_type,
        we.created_at as event_created_at
      FROM dead_letter_queue dlq
      LEFT JOIN webhook_events we ON dlq.webhook_event_id = we.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (provider) {
      query += ` AND dlq.provider = $${paramCount}`;
      params.push(provider);
      paramCount++;
    }

    if (resolved !== undefined) {
      query += ` AND dlq.resolved = $${paramCount}`;
      params.push(resolved === 'true');
      paramCount++;
    }

    query += ` ORDER BY dlq.created_at DESC LIMIT $${paramCount}`;
    params.push(Number(limit));

    const { rows } = await pool.query(query, params);

    res.json({ items: rows });
  } catch (error: any) {
    logger.error('Failed to fetch dead letter queue', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/stats
 * Webhook processing statistics (Admin only)
 */
webhooksRouter.get('/stats', requireAuth, isAdmin, async (req: Request, res: Response) => {
  try {
    const { days = 7 } = req.query;

    const stats = await pool.query(
      `SELECT 
         provider,
         COUNT(*) as total_events,
         COUNT(*) FILTER (WHERE processed = true) as processed,
         COUNT(*) FILTER (WHERE processed = false) as pending,
         COUNT(*) FILTER (WHERE verified = false) as verification_failed,
         COUNT(*) FILTER (WHERE retry_count > 0) as retried,
         AVG(retry_count) as avg_retry_count
       FROM webhook_events
       WHERE created_at >= NOW() - INTERVAL '${Number(days)} days'
       GROUP BY provider`,
    );

    const dlqStats = await pool.query(
      `SELECT 
         provider,
         COUNT(*) as total_failed,
         COUNT(*) FILTER (WHERE resolved = true) as resolved,
         COUNT(*) FILTER (WHERE resolved = false) as pending
       FROM dead_letter_queue
       WHERE created_at >= NOW() - INTERVAL '${Number(days)} days'
       GROUP BY provider`,
    );

    res.json({
      webhook_events: stats.rows,
      dead_letter_queue: dlqStats.rows,
    });
  } catch (error: any) {
    logger.error('Failed to fetch webhook stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/health
 * Webhook health check
 */
webhooksRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhooks: {
      square: !!process.env.SQUARE_WEBHOOK_SECRET,
      sendgrid: !!process.env.SENDGRID_WEBHOOK_PUBLIC_KEY,
    },
  });
});
