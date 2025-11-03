import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { getTemplateByName, renderTemplate } from './emailTemplateService';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@trollz1004.com';
const FROM_NAME = process.env.FROM_NAME || 'Trollz1004';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

/**
 * Email queue configuration
 */
const EMAIL_BATCH_SIZE = parseInt(process.env.EMAIL_BATCH_SIZE || '100', 10);
const EMAIL_RETRY_ATTEMPTS = parseInt(process.env.EMAIL_RETRY_ATTEMPTS || '3', 10);
const EMAIL_RETRY_DELAY_MS = parseInt(process.env.EMAIL_RETRY_DELAY_MS || '5000', 10);
const MAX_EMAILS_PER_USER_PER_DAY = parseInt(process.env.MAX_EMAILS_PER_USER_PER_DAY || '5', 10);

/**
 * Email queue item structure
 */
export interface EmailQueueItem {
  id: string;
  userId: string | null;
  emailTemplateId: string | null;
  recipientEmail: string;
  subjectLine: string;
  htmlContent: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced' | 'unsubscribed';
  scheduledFor: Date;
  sentAt: Date | null;
  failedReason: string | null;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Add email to queue
 * 
 * @param params - Email parameters
 * @returns Promise<string> - Queue item ID
 */
export const addToQueue = async (params: {
  userId?: string;
  templateName: string;
  recipientEmail: string;
  variables: Record<string, any>;
  scheduledFor?: Date;
}): Promise<string> => {
  try {
    const { userId, templateName, recipientEmail, variables, scheduledFor } = params;

    // Get template
    const template = await getTemplateByName(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Render template with variables
    const rendered = renderTemplate(template, variables);

    // Check daily limit per user
    if (userId) {
      const limitCheck = await pool.query(
        `SELECT COUNT(*) as count
         FROM email_queue
         WHERE user_id = $1
           AND status = 'sent'
           AND created_at > NOW() - INTERVAL '24 hours'`,
        [userId]
      );

      if (parseInt(limitCheck.rows[0].count, 10) >= MAX_EMAILS_PER_USER_PER_DAY) {
        logger.warn(`User ${userId} exceeded daily email limit (${MAX_EMAILS_PER_USER_PER_DAY})`);
        throw new Error('Daily email limit exceeded');
      }
    }

    // Insert into queue
    const result = await pool.query(
      `INSERT INTO email_queue (user_id, email_template_id, recipient_email, subject_line, html_content, status, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        userId || null,
        template.id,
        recipientEmail,
        rendered.subjectLine,
        rendered.htmlContent,
        'pending',
        scheduledFor || new Date(),
      ]
    );

    const queueId = result.rows[0].id;

    await logAutomation({
      service: 'email_queue_service',
      action: 'add_to_queue',
      status: 'success',
      details: {
        queueId,
        templateName,
        recipientEmail,
        userId,
      },
    });

    logger.info(`Email queued: ${queueId} (${templateName} to ${recipientEmail})`);
    return queueId;
  } catch (error: any) {
    await logAutomation({
      service: 'email_queue_service',
      action: 'add_to_queue',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error('Failed to add email to queue', { error: error.message });
    throw error;
  }
};

/**
 * Send email via SendGrid
 * 
 * @param queueItem - Email queue item
 * @returns Promise<boolean>
 */
const sendEmail = async (queueItem: EmailQueueItem): Promise<boolean> => {
  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const msg = {
      to: queueItem.recipientEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: queueItem.subjectLine,
      html: queueItem.htmlContent,
      trackingSettings: {
        clickTracking: {
          enable: true,
        },
        openTracking: {
          enable: true,
        },
      },
      customArgs: {
        email_queue_id: queueItem.id,
      },
    };

    await sgMail.send(msg);

    // Mark as sent
    await pool.query(
      `UPDATE email_queue
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [queueItem.id]
    );

    // Log event
    await pool.query(
      `INSERT INTO email_events (email_queue_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [queueItem.id, 'sent', JSON.stringify({ timestamp: new Date().toISOString() })]
    );

    logger.info(`Email sent successfully: ${queueItem.id}`);
    return true;
  } catch (error: any) {
    logger.error(`Failed to send email ${queueItem.id}`, { error: error.message });
    throw error;
  }
};

/**
 * Process email queue
 * Send pending emails in batches
 * 
 * @returns Promise<{ sent: number; failed: number }>
 */
export const processQueue = async (): Promise<{ sent: number; failed: number }> => {
  let sent = 0;
  let failed = 0;

  try {
    // Get pending emails (due for sending)
    const result = await pool.query(
      `SELECT id, user_id, email_template_id, recipient_email, subject_line, html_content, 
              status, scheduled_for, sent_at, failed_reason, retry_count, created_at, updated_at
       FROM email_queue
       WHERE status = 'pending'
         AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT $1`,
      [EMAIL_BATCH_SIZE]
    );

    const emails: EmailQueueItem[] = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      emailTemplateId: row.email_template_id,
      recipientEmail: row.recipient_email,
      subjectLine: row.subject_line,
      htmlContent: row.html_content,
      status: row.status,
      scheduledFor: row.scheduled_for,
      sentAt: row.sent_at,
      failedReason: row.failed_reason,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    logger.info(`Processing ${emails.length} emails from queue`);

    // Process each email
    for (const email of emails) {
      try {
        await sendEmail(email);
        sent++;
      } catch (error: any) {
        failed++;

        // Update retry count
        const newRetryCount = email.retryCount + 1;

        if (newRetryCount >= EMAIL_RETRY_ATTEMPTS) {
          // Max retries reached - mark as failed
          await pool.query(
            `UPDATE email_queue
             SET status = 'failed', failed_reason = $1, retry_count = $2, updated_at = NOW()
             WHERE id = $3`,
            [error.message, newRetryCount, email.id]
          );

          logger.error(`Email ${email.id} failed permanently after ${newRetryCount} attempts`);
        } else {
          // Schedule for retry with exponential backoff
          const retryDelay = EMAIL_RETRY_DELAY_MS * Math.pow(2, newRetryCount);
          const retryAt = new Date(Date.now() + retryDelay);

          await pool.query(
            `UPDATE email_queue
             SET retry_count = $1, scheduled_for = $2, failed_reason = $3, updated_at = NOW()
             WHERE id = $4`,
            [newRetryCount, retryAt, error.message, email.id]
          );

          logger.warn(`Email ${email.id} scheduled for retry ${newRetryCount} at ${retryAt}`);
        }
      }

      // Small delay between sends to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await logAutomation({
      service: 'email_queue_service',
      action: 'process_queue',
      status: 'success',
      details: { sent, failed },
    });

    logger.info(`Queue processing complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error: any) {
    await logAutomation({
      service: 'email_queue_service',
      action: 'process_queue',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error('Queue processing error', { error: error.message });
    throw error;
  }
};

/**
 * Retry failed emails
 * Attempts to resend emails that failed but haven't exceeded retry limit
 * 
 * @returns Promise<number> - Number of emails retried
 */
export const retryFailedEmails = async (): Promise<number> => {
  try {
    // Reset failed emails that haven't exceeded retry count
    const result = await pool.query(
      `UPDATE email_queue
       SET status = 'pending', scheduled_for = NOW(), updated_at = NOW()
       WHERE status = 'failed'
         AND retry_count < $1
       RETURNING id`,
      [EMAIL_RETRY_ATTEMPTS]
    );

    const count = result.rows.length;

    await logAutomation({
      service: 'email_queue_service',
      action: 'retry_failed_emails',
      status: 'success',
      details: { count },
    });

    logger.info(`Reset ${count} failed emails for retry`);
    return count;
  } catch (error: any) {
    await logAutomation({
      service: 'email_queue_service',
      action: 'retry_failed_emails',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error('Failed to retry emails', { error: error.message });
    throw error;
  }
};

/**
 * Get queue statistics
 * 
 * @returns Promise<QueueStats>
 */
export const getQueueStats = async (): Promise<{
  pending: number;
  sent: number;
  failed: number;
  bounced: number;
}> => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'sent') as sent,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COUNT(*) FILTER (WHERE status = 'bounced') as bounced
       FROM email_queue
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    return {
      pending: parseInt(result.rows[0].pending, 10),
      sent: parseInt(result.rows[0].sent, 10),
      failed: parseInt(result.rows[0].failed, 10),
      bounced: parseInt(result.rows[0].bounced, 10),
    };
  } catch (error: any) {
    logger.error('Failed to get queue stats', { error: error.message });
    throw error;
  }
};

/**
 * Clean old queue items
 * Removes sent emails older than specified days
 * 
 * @param daysOld - Number of days to keep
 * @returns Promise<number> - Number of items deleted
 */
export const cleanOldQueue = async (daysOld: number = 30): Promise<number> => {
  try {
    const result = await pool.query(
      `DELETE FROM email_queue
       WHERE status = 'sent'
         AND sent_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    const count = result.rows.length;

    await logAutomation({
      service: 'email_queue_service',
      action: 'clean_old_queue',
      status: 'success',
      details: { count, daysOld },
    });

    logger.info(`Cleaned ${count} old queue items (older than ${daysOld} days)`);
    return count;
  } catch (error: any) {
    logger.error('Failed to clean old queue', { error: error.message });
    throw error;
  }
};
