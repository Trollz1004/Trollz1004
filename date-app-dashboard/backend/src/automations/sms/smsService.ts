import twilio from 'twilio';
import pool from '../../database';
import logger from '../../logger';
import config from '../../config';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || '',
  process.env.TWILIO_AUTH_TOKEN || ''
);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';
const SMS_ENABLED = process.env.ENABLE_SMS_AUTOMATION === 'true';
const CODE_LENGTH = parseInt(process.env.SMS_VERIFICATION_CODE_LENGTH || '6');
const CODE_EXPIRY_MINUTES = parseInt(process.env.SMS_VERIFICATION_EXPIRY_MINUTES || '10');

// SMS Templates
const SMS_TEMPLATES = {
  verification: (code: string) => `Your Trollz1004 verification code is: ${code}. Valid for ${CODE_EXPIRY_MINUTES} minutes.`,
  match_alert: () => `🔥 New match on Trollz1004! Open the app now to start chatting.`,
  message_alert: (name: string, preview: string) => 
    `${name} messaged you on Trollz1004: "${preview.substring(0, 50)}${preview.length > 50 ? '...' : ''}"`,
  subscription_expiring: (days: number) => 
    `Your Trollz1004 Premium subscription expires in ${days} day${days !== 1 ? 's' : ''}! Renew now to keep your benefits.`,
  subscription_expired: () => 
    `Your Trollz1004 Premium has expired. Upgrade now to unlock unlimited likes, see who liked you, and more!`,
  daily_match: (count: number) => 
    `Good morning! You have ${count} new potential ${count === 1 ? 'match' : 'matches'} on Trollz1004 today. 🌟`,
  profile_boost: () => 
    `Your Trollz1004 profile boost is active! You'll get 10x more visibility for the next 30 minutes. 🚀`,
};

export interface SMSQueueItem {
  id?: string;
  user_id?: string;
  phone_number: string;
  message: string;
  template?: string;
  status?: string;
  twilio_sid?: string;
  sent_at?: Date;
  delivered_at?: Date;
  error_message?: string;
  retry_count?: number;
  scheduled_for?: Date;
  created_at?: Date;
}

export interface VerificationCode {
  id?: string;
  phone_number: string;
  code: string;
  expires_at: Date;
  verified?: boolean;
  verified_at?: Date;
  attempts?: number;
  created_at?: Date;
}

/**
 * Send SMS directly via Twilio
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!SMS_ENABLED) {
    logger.warn('SMS automation is disabled');
    return { success: false, error: 'SMS automation disabled' };
  }

  if (!TWILIO_PHONE_NUMBER || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logger.error('Twilio credentials not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    logger.info(`SMS sent successfully to ${phoneNumber}`, { sid: result.sid });
    return { success: true, sid: result.sid };
  } catch (error: any) {
    logger.error('Failed to send SMS', { phoneNumber, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Generate and send verification code
 */
export async function sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
  try {
    // Generate random 6-digit code
    const code = Math.floor(Math.random() * Math.pow(10, CODE_LENGTH))
      .toString()
      .padStart(CODE_LENGTH, '0');

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

    // Store code in database
    await pool.query(
      `INSERT INTO sms_verification_codes (phone_number, code, expires_at)
       VALUES ($1, $2, $3)`,
      [phoneNumber, code, expiresAt]
    );

    // Send SMS
    const message = SMS_TEMPLATES.verification(code);
    const result = await sendSMS(phoneNumber, message);

    if (result.success) {
      logger.info(`Verification code sent to ${phoneNumber}`);
      return { success: true, expiresAt };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    logger.error('Failed to send verification code', { phoneNumber, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Verify SMS code
 */
export async function verifyCode(
  phoneNumber: string, 
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the most recent non-verified code for this phone number
    const result = await pool.query(
      `SELECT * FROM sms_verification_codes
       WHERE phone_number = $1 
         AND verified = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [phoneNumber]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'No valid verification code found' };
    }

    const codeRecord = result.rows[0];

    // Increment attempts
    await pool.query(
      `UPDATE sms_verification_codes
       SET attempts = attempts + 1
       WHERE id = $1`,
      [codeRecord.id]
    );

    // Check max attempts (prevent brute force)
    if (codeRecord.attempts >= 5) {
      return { success: false, error: 'Too many verification attempts' };
    }

    // Verify code
    if (codeRecord.code === code) {
      await pool.query(
        `UPDATE sms_verification_codes
         SET verified = TRUE, verified_at = NOW()
         WHERE id = $1`,
        [codeRecord.id]
      );

      // Update user's phone verification status
      await pool.query(
        `UPDATE users
         SET phone_verified = TRUE
         WHERE phone = $1`,
        [phoneNumber]
      );

      logger.info(`Phone number verified: ${phoneNumber}`);
      return { success: true };
    } else {
      return { success: false, error: 'Invalid verification code' };
    }
  } catch (error: any) {
    logger.error('Failed to verify code', { phoneNumber, error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Queue SMS for later processing
 */
export async function queueSMS(
  userId: string | null,
  phoneNumber: string,
  template: string,
  data: Record<string, any>,
  scheduledFor?: Date
): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    let message = '';

    // Generate message from template
    switch (template) {
      case 'match_alert':
        message = SMS_TEMPLATES.match_alert();
        break;
      case 'message_alert':
        message = SMS_TEMPLATES.message_alert(data.name || 'Someone', data.preview || '');
        break;
      case 'subscription_expiring':
        message = SMS_TEMPLATES.subscription_expiring(data.days || 3);
        break;
      case 'subscription_expired':
        message = SMS_TEMPLATES.subscription_expired();
        break;
      case 'daily_match':
        message = SMS_TEMPLATES.daily_match(data.count || 0);
        break;
      case 'profile_boost':
        message = SMS_TEMPLATES.profile_boost();
        break;
      default:
        message = data.message || '';
    }

    const result = await pool.query(
      `INSERT INTO sms_queue (user_id, phone_number, message, template, scheduled_for)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, phoneNumber, message, template, scheduledFor || null]
    );

    logger.info('SMS queued successfully', { queueId: result.rows[0].id, template });
    return { success: true, queueId: result.rows[0].id };
  } catch (error: any) {
    logger.error('Failed to queue SMS', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Process SMS queue - send pending messages
 */
export async function processSMSQueue(): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  try {
    // Get pending messages (including scheduled messages that are due)
    const result = await pool.query(
      `SELECT * FROM sms_queue
       WHERE status = 'pending'
         AND (scheduled_for IS NULL OR scheduled_for <= NOW())
       ORDER BY created_at ASC
       LIMIT 50`
    );

    logger.info(`Processing ${result.rows.length} SMS from queue`);

    for (const sms of result.rows) {
      try {
        // Update status to 'sending'
        await pool.query(
          `UPDATE sms_queue SET status = 'sending' WHERE id = $1`,
          [sms.id]
        );

        // Send SMS
        const sendResult = await sendSMS(sms.phone_number, sms.message);

        if (sendResult.success) {
          // Update status to 'sent'
          await pool.query(
            `UPDATE sms_queue 
             SET status = 'sent', twilio_sid = $1, sent_at = NOW()
             WHERE id = $2`,
            [sendResult.sid, sms.id]
          );
          processed++;
        } else {
          // Update status to 'failed'
          await pool.query(
            `UPDATE sms_queue 
             SET status = 'failed', error_message = $1, retry_count = retry_count + 1
             WHERE id = $2`,
            [sendResult.error, sms.id]
          );
          failed++;
        }
      } catch (error: any) {
        logger.error('Error processing SMS', { smsId: sms.id, error: error.message });
        await pool.query(
          `UPDATE sms_queue 
           SET status = 'failed', error_message = $1, retry_count = retry_count + 1
           WHERE id = $2`,
          [error.message, sms.id]
        );
        failed++;
      }
    }

    logger.info(`SMS queue processed: ${processed} sent, ${failed} failed`);
    return { processed, failed };
  } catch (error: any) {
    logger.error('Failed to process SMS queue', { error: error.message });
    return { processed, failed };
  }
}

/**
 * Retry failed SMS (max 3 attempts)
 */
export async function retryFailedSMS(): Promise<{ retried: number }> {
  try {
    // Reset failed messages with retry_count < 3 back to pending
    const result = await pool.query(
      `UPDATE sms_queue
       SET status = 'pending', error_message = NULL
       WHERE status = 'failed'
         AND retry_count < 3
         AND created_at > NOW() - INTERVAL '24 hours'
       RETURNING id`
    );

    logger.info(`Retrying ${result.rows.length} failed SMS`);
    return { retried: result.rows.length };
  } catch (error: any) {
    logger.error('Failed to retry SMS', { error: error.message });
    return { retried: 0 };
  }
}

/**
 * Send new match alert
 */
export async function sendMatchAlert(userId: string, matchId: string): Promise<void> {
  try {
    // Get user's phone number
    const userResult = await pool.query(
      `SELECT phone FROM users WHERE id = $1 AND phone_verified = TRUE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      logger.warn('User has no verified phone number', { userId });
      return;
    }

    const phoneNumber = userResult.rows[0].phone;
    await queueSMS(userId, phoneNumber, 'match_alert', { matchId });
  } catch (error: any) {
    logger.error('Failed to send match alert', { userId, error: error.message });
  }
}

/**
 * Send new message alert
 */
export async function sendMessageAlert(userId: string, senderId: string, messagePreview: string): Promise<void> {
  try {
    // Get recipient's phone number
    const userResult = await pool.query(
      `SELECT phone FROM users WHERE id = $1 AND phone_verified = TRUE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      logger.warn('User has no verified phone number', { userId });
      return;
    }

    // Get sender's name
    const senderResult = await pool.query(
      `SELECT first_name FROM profiles WHERE user_id = $1`,
      [senderId]
    );

    const senderName = senderResult.rows[0]?.first_name || 'Someone';
    const phoneNumber = userResult.rows[0].phone;

    await queueSMS(userId, phoneNumber, 'message_alert', {
      name: senderName,
      preview: messagePreview,
    });
  } catch (error: any) {
    logger.error('Failed to send message alert', { userId, error: error.message });
  }
}

/**
 * Send subscription expiring reminders (daily cron job)
 */
export async function sendSubscriptionReminders(): Promise<{ sent: number }> {
  try {
    // Find premium users whose subscription expires in 3, 7, or 1 day(s)
    const result = await pool.query(
      `SELECT u.id, u.phone, s.end_date
       FROM users u
       JOIN subscriptions s ON u.id = s.user_id
       WHERE u.phone_verified = TRUE
         AND s.status = 'active'
         AND s.end_date::date IN (
           CURRENT_DATE + INTERVAL '1 day',
           CURRENT_DATE + INTERVAL '3 days',
           CURRENT_DATE + INTERVAL '7 days'
         )`
    );

    let sent = 0;
    for (const user of result.rows) {
      const daysUntilExpiry = Math.ceil(
        (new Date(user.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await queueSMS(user.id, user.phone, 'subscription_expiring', { days: daysUntilExpiry });
      sent++;
    }

    logger.info(`Sent ${sent} subscription expiring reminders`);
    return { sent };
  } catch (error: any) {
    logger.error('Failed to send subscription reminders', { error: error.message });
    return { sent: 0 };
  }
}

/**
 * Send daily match notifications (daily cron job)
 */
export async function sendDailyMatchNotifications(): Promise<{ sent: number }> {
  try {
    // Find users with new potential matches from last 24 hours
    const result = await pool.query(
      `SELECT u.id, u.phone, COUNT(DISTINCT i.target_user_id) as match_count
       FROM users u
       LEFT JOIN interactions i ON i.target_user_id = u.id
       WHERE u.phone_verified = TRUE
         AND i.interaction_type = 'like'
         AND i.created_at > NOW() - INTERVAL '24 hours'
       GROUP BY u.id, u.phone
       HAVING COUNT(DISTINCT i.target_user_id) > 0`
    );

    let sent = 0;
    for (const user of result.rows) {
      await queueSMS(user.id, user.phone, 'daily_match', { count: user.match_count });
      sent++;
    }

    logger.info(`Sent ${sent} daily match notifications`);
    return { sent };
  } catch (error: any) {
    logger.error('Failed to send daily match notifications', { error: error.message });
    return { sent: 0 };
  }
}

export default {
  sendSMS,
  sendVerificationCode,
  verifyCode,
  queueSMS,
  processSMSQueue,
  retryFailedSMS,
  sendMatchAlert,
  sendMessageAlert,
  sendSubscriptionReminders,
  sendDailyMatchNotifications,
};
