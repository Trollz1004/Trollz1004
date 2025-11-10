import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { addToQueue } from './emailQueueService';

/**
 * Check if user has email preferences and is not unsubscribed
 * 
 * @param userId - User ID
 * @param preferenceType - Type of preference to check
 * @returns Promise<boolean>
 */
const canSendEmail = async (userId: string, preferenceType?: string): Promise<boolean> => {
  try {
    const result = await pool.query(
      `SELECT is_globally_unsubscribed, welcome_sequence, match_notifications, 
              message_alerts, subscription_reminders, referral_notifications, promotional_emails
       FROM email_preferences
       WHERE user_id = $1`,
      [userId]
    );

    // If no preferences exist, create default ones
    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO email_preferences (user_id)
         VALUES ($1)`,
        [userId]
      );
      return true; // Default is to allow emails
    }

    const prefs = result.rows[0];

    // Check global unsubscribe
    if (prefs.is_globally_unsubscribed) {
      return false;
    }

    // Check specific preference if provided
    if (preferenceType) {
      return prefs[preferenceType] === true;
    }

    return true;
  } catch (error: any) {
    logger.error(`Failed to check email preferences for user ${userId}`, { error: error.message });
    return false;
  }
};

/**
 * Send welcome email sequence
 * Triggered when user signs up
 * 
 * @param userId - New user ID
 * @param email - User email address
 * @param name - User name
 * @returns Promise<void>
 */
export const sendWelcomeSequence = async (userId: string, email: string, name: string): Promise<void> => {
  try {
    const canSend = await canSendEmail(userId, 'welcome_sequence');
    if (!canSend) {
      logger.info(`User ${userId} opted out of welcome sequence`);
      return;
    }

    // Email 1: Immediate welcome
    await addToQueue({
      userId,
      templateName: 'welcome_1',
      recipientEmail: email,
      variables: {
        userName: name,
        appName: 'Trollz1004',
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      },
      scheduledFor: new Date(),
    });

    // Email 2: Day 1 - Complete profile
    await addToQueue({
      userId,
      templateName: 'welcome_2',
      recipientEmail: email,
      variables: {
        userName: name,
        profileUrl: `${process.env.FRONTEND_URL}/profile`,
      },
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 day
    });

    // Email 3: Day 3 - Social proof
    await addToQueue({
      userId,
      templateName: 'welcome_3',
      recipientEmail: email,
      variables: {
        userName: name,
        dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
      },
      scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // +3 days
    });

    // Email 4: Day 7 - Premium trial
    await addToQueue({
      userId,
      templateName: 'welcome_4',
      recipientEmail: email,
      variables: {
        userName: name,
        premiumUrl: `${process.env.FRONTEND_URL}/premium`,
      },
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    });

    // Email 5: Day 14 - Trial expiring
    await addToQueue({
      userId,
      templateName: 'welcome_5',
      recipientEmail: email,
      variables: {
        userName: name,
        premiumUrl: `${process.env.FRONTEND_URL}/premium`,
      },
      scheduledFor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 days
    });

    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_welcome_sequence',
      status: 'success',
      details: { userId, email },
    });

    logger.info(`Welcome sequence queued for user ${userId}`);
  } catch (error: any) {
    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_welcome_sequence',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error(`Failed to queue welcome sequence for user ${userId}`, { error: error.message });
    throw error;
  }
};

/**
 * Send new match notification
 * Triggered when users match
 * 
 * @param userId - User ID
 * @param matchName - Name of the match
 * @param matchPhoto - Photo URL of the match
 * @returns Promise<void>
 */
export const sendMatchNotification = async (
  userId: string,
  matchName: string,
  matchPhoto: string
): Promise<void> => {
  try {
    const canSend = await canSendEmail(userId, 'match_notifications');
    if (!canSend) {
      logger.info(`User ${userId} opted out of match notifications`);
      return;
    }

    // Get user email
    const userResult = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const { email, name } = userResult.rows[0];

    // Send within 5 minutes
    await addToQueue({
      userId,
      templateName: 'match_notification',
      recipientEmail: email,
      variables: {
        userName: name,
        matchName,
        matchPhoto,
        viewMatchUrl: `${process.env.FRONTEND_URL}/matches`,
      },
      scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // +5 minutes
    });

    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_match_notification',
      status: 'success',
      details: { userId, matchName },
    });

    logger.info(`Match notification queued for user ${userId}`);
  } catch (error: any) {
    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_match_notification',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error(`Failed to send match notification to user ${userId}`, { error: error.message });
  }
};

/**
 * Send new message alert
 * Triggered when user receives a message
 * Max 1x per day per user
 * 
 * @param userId - User ID
 * @param senderName - Name of message sender
 * @returns Promise<void>
 */
export const sendMessageAlert = async (userId: string, senderName: string): Promise<void> => {
  try {
    const canSend = await canSendEmail(userId, 'message_alerts');
    if (!canSend) {
      logger.info(`User ${userId} opted out of message alerts`);
      return;
    }

    // Check if already sent message alert today
    const checkResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM email_queue
       WHERE user_id = $1
         AND email_template_id = (SELECT id FROM email_templates WHERE name = 'message_alert')
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    if (parseInt(checkResult.rows[0].count, 10) > 0) {
      logger.info(`Message alert already sent to user ${userId} today`);
      return;
    }

    // Get user email
    const userResult = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const { email, name } = userResult.rows[0];

    // Send within 10 minutes
    await addToQueue({
      userId,
      templateName: 'message_alert',
      recipientEmail: email,
      variables: {
        userName: name,
        senderName,
        messagesUrl: `${process.env.FRONTEND_URL}/messages`,
      },
      scheduledFor: new Date(Date.now() + 10 * 60 * 1000), // +10 minutes
    });

    logger.info(`Message alert queued for user ${userId}`);
  } catch (error: any) {
    logger.error(`Failed to send message alert to user ${userId}`, { error: error.message });
  }
};

/**
 * Send subscription confirmation
 * Triggered immediately after purchase
 * 
 * @param userId - User ID
 * @param tier - Subscription tier
 * @param price - Price paid
 * @returns Promise<void>
 */
export const sendSubscriptionConfirmation = async (
  userId: string,
  tier: string,
  price: number
): Promise<void> => {
  try {
    const canSend = await canSendEmail(userId, 'subscription_reminders');
    if (!canSend) {
      logger.info(`User ${userId} opted out of subscription emails`);
      return;
    }

    // Get user email
    const userResult = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const { email, name } = userResult.rows[0];

    await addToQueue({
      userId,
      templateName: 'subscription_confirmation',
      recipientEmail: email,
      variables: {
        userName: name,
        tier,
        price: price.toFixed(2),
        accountUrl: `${process.env.FRONTEND_URL}/account`,
      },
      scheduledFor: new Date(), // Immediate
    });

    logger.info(`Subscription confirmation queued for user ${userId}`);
  } catch (error: any) {
    logger.error(`Failed to send subscription confirmation to user ${userId}`, { error: error.message });
  }
};

/**
 * Send subscription expiring reminder
 * Cron job: Run daily to check subscriptions expiring in 7 days
 * 
 * @returns Promise<number> - Number of reminders sent
 */
export const sendSubscriptionExpiringReminders = async (): Promise<number> => {
  try {
    // Find subscriptions expiring in 7 days
    const result = await pool.query(
      `SELECT s.user_id, u.email, u.name, s.tier
       FROM subscriptions s
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'active'
         AND s.expires_at BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'`
    );

    let sent = 0;

    for (const row of result.rows) {
      const canSend = await canSendEmail(row.user_id, 'subscription_reminders');
      if (!canSend) continue;

      await addToQueue({
        userId: row.user_id,
        templateName: 'subscription_expiring',
        recipientEmail: row.email,
        variables: {
          userName: row.name,
          tier: row.tier,
          renewUrl: `${process.env.FRONTEND_URL}/premium`,
        },
      });

      sent++;
    }

    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_subscription_expiring_reminders',
      status: 'success',
      details: { sent },
    });

    logger.info(`Sent ${sent} subscription expiring reminders`);
    return sent;
  } catch (error: any) {
    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_subscription_expiring_reminders',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error('Failed to send subscription expiring reminders', { error: error.message });
    return 0;
  }
};

/**
 * Send referral reward confirmation
 * Triggered when referral converts
 * 
 * @param userId - User ID who earned the reward
 * @param rewardDays - Number of free premium days
 * @returns Promise<void>
 */
export const sendReferralRewardConfirmation = async (userId: string, rewardDays: number): Promise<void> => {
  try {
    const canSend = await canSendEmail(userId, 'referral_notifications');
    if (!canSend) {
      logger.info(`User ${userId} opted out of referral notifications`);
      return;
    }

    // Get user email
    const userResult = await pool.query(`SELECT email, name FROM users WHERE id = $1`, [userId]);
    if (userResult.rows.length === 0) {
      throw new Error(`User ${userId} not found`);
    }

    const { email, name } = userResult.rows[0];

    await addToQueue({
      userId,
      templateName: 'referral_reward_confirmation',
      recipientEmail: email,
      variables: {
        userName: name,
        rewardDays,
        claimUrl: `${process.env.FRONTEND_URL}/referrals`,
      },
      scheduledFor: new Date(), // Immediate
    });

    logger.info(`Referral reward confirmation queued for user ${userId}`);
  } catch (error: any) {
    logger.error(`Failed to send referral reward confirmation to user ${userId}`, { error: error.message });
  }
};

/**
 * Send re-engagement emails
 * Cron job: Run daily for inactive users
 * 
 * @returns Promise<number> - Number of emails sent
 */
export const sendReengagementEmails = async (): Promise<number> => {
  try {
    let sent = 0;

    // Day 7 inactive: "3 people liked you"
    const day7Result = await pool.query(
      `SELECT u.id, u.email, u.name
       FROM users u
       WHERE u.last_login_at BETWEEN NOW() - INTERVAL '8 days' AND NOW() - INTERVAL '6 days'
         AND NOT EXISTS (
           SELECT 1 FROM email_queue eq
           WHERE eq.user_id = u.id
             AND eq.email_template_id = (SELECT id FROM email_templates WHERE name = 'reengagement_day7')
             AND eq.created_at > NOW() - INTERVAL '30 days'
         )`
    );

    for (const row of day7Result.rows) {
      const canSend = await canSendEmail(row.id, 'promotional_emails');
      if (!canSend) continue;

      await addToQueue({
        userId: row.id,
        templateName: 'reengagement_day7',
        recipientEmail: row.email,
        variables: {
          userName: row.name,
          likesCount: 3,
          dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
        },
      });

      sent++;
    }

    // Day 14 inactive: "Come back and see your matches"
    const day14Result = await pool.query(
      `SELECT u.id, u.email, u.name
       FROM users u
       WHERE u.last_login_at BETWEEN NOW() - INTERVAL '15 days' AND NOW() - INTERVAL '13 days'
         AND NOT EXISTS (
           SELECT 1 FROM email_queue eq
           WHERE eq.user_id = u.id
             AND eq.email_template_id = (SELECT id FROM email_templates WHERE name = 'reengagement_day14')
             AND eq.created_at > NOW() - INTERVAL '30 days'
         )`
    );

    for (const row of day14Result.rows) {
      const canSend = await canSendEmail(row.id, 'promotional_emails');
      if (!canSend) continue;

      await addToQueue({
        userId: row.id,
        templateName: 'reengagement_day14',
        recipientEmail: row.email,
        variables: {
          userName: row.name,
          matchesUrl: `${process.env.FRONTEND_URL}/matches`,
        },
      });

      sent++;
    }

    // Day 30 inactive: "Special offer: 30% off premium"
    const day30Result = await pool.query(
      `SELECT u.id, u.email, u.name
       FROM users u
       WHERE u.last_login_at BETWEEN NOW() - INTERVAL '31 days' AND NOW() - INTERVAL '29 days'
         AND NOT EXISTS (
           SELECT 1 FROM email_queue eq
           WHERE eq.user_id = u.id
             AND eq.email_template_id = (SELECT id FROM email_templates WHERE name = 'reengagement_day30')
             AND eq.created_at > NOW() - INTERVAL '30 days'
         )`
    );

    for (const row of day30Result.rows) {
      const canSend = await canSendEmail(row.id, 'promotional_emails');
      if (!canSend) continue;

      await addToQueue({
        userId: row.id,
        templateName: 'reengagement_day30',
        recipientEmail: row.email,
        variables: {
          userName: row.name,
          discountCode: 'COMEBACK30',
          premiumUrl: `${process.env.FRONTEND_URL}/premium`,
        },
      });

      sent++;
    }

    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_reengagement_emails',
      status: 'success',
      details: { sent },
    });

    logger.info(`Sent ${sent} re-engagement emails`);
    return sent;
  } catch (error: any) {
    await logAutomation({
      service: 'email_trigger_service',
      action: 'send_reengagement_emails',
      status: 'failed',
      errorMessage: error.message,
    });

    logger.error('Failed to send re-engagement emails', { error: error.message });
    return 0;
  }
};
