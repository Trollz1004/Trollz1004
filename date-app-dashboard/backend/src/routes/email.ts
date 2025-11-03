import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import logger from '../logger';
import { addToQueue, getQueueStats } from '../automations/email/emailQueueService';
import {
  getEmailAnalytics,
  getAnalyticsByTemplate,
  getCohortAnalytics,
} from '../automations/email/emailAnalyticsService';
import pool from '../database';
import crypto from 'crypto';

export const emailRouter = Router();

/**
 * Send email (internal use by automation services)
 * POST /api/email/send
 */
emailRouter.post('/send', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, templateName, variables } = req.body;

    if (!templateName) {
      return res.status(400).json({ message: 'Template name is required' });
    }

    // Get recipient email
    const userResult = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId || req.userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const recipientEmail = userResult.rows[0].email;

    // Add to queue
    const queueId = await addToQueue({
      userId: userId || req.userId!,
      templateName,
      recipientEmail,
      variables: variables || {},
    });

    res.status(200).json({
      queueId,
      status: 'queued',
      message: 'Email queued successfully',
    });
  } catch (error: any) {
    logger.error('Failed to queue email', { error: error.message });
    res.status(500).json({ message: 'Failed to queue email', error: error.message });
  }
});

/**
 * View email queue (admin only)
 * GET /api/email/queue
 */
emailRouter.get('/queue', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit } = req.query;

    let query = `
      SELECT 
        eq.id,
        eq.user_id,
        eq.recipient_email,
        eq.subject_line,
        eq.status,
        eq.scheduled_for,
        eq.sent_at,
        eq.failed_reason,
        eq.retry_count,
        eq.created_at,
        et.name as template_name
      FROM email_queue eq
      LEFT JOIN email_templates et ON eq.email_template_id = et.id
    `;

    const params: any[] = [];

    if (status) {
      query += ` WHERE eq.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY eq.created_at DESC`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit as string, 10));
    } else {
      query += ` LIMIT 100`;
    }

    const result = await pool.query(query, params);

    res.status(200).json({
      queue: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    logger.error('Failed to get email queue', { error: error.message });
    res.status(500).json({ message: 'Failed to get email queue', error: error.message });
  }
});

/**
 * Get email performance metrics
 * GET /api/email/stats
 */
emailRouter.get('/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);

    const [overallStats, queueStats] = await Promise.all([
      getEmailAnalytics(days),
      getQueueStats(),
    ]);

    res.status(200).json({
      overall: overallStats,
      queue: queueStats,
      period: `Last ${days} days`,
    });
  } catch (error: any) {
    logger.error('Failed to get email stats', { error: error.message });
    res.status(500).json({ message: 'Failed to get email stats', error: error.message });
  }
});

/**
 * Update email preferences for logged-in user
 * POST /api/email/preferences
 */
emailRouter.post('/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const {
      welcomeSequence,
      matchNotifications,
      messageAlerts,
      subscriptionReminders,
      referralNotifications,
      promotionalEmails,
    } = req.body;

    // Upsert preferences
    await pool.query(
      `INSERT INTO email_preferences (
        user_id, welcome_sequence, match_notifications, message_alerts, 
        subscription_reminders, referral_notifications, promotional_emails, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        welcome_sequence = COALESCE($2, email_preferences.welcome_sequence),
        match_notifications = COALESCE($3, email_preferences.match_notifications),
        message_alerts = COALESCE($4, email_preferences.message_alerts),
        subscription_reminders = COALESCE($5, email_preferences.subscription_reminders),
        referral_notifications = COALESCE($6, email_preferences.referral_notifications),
        promotional_emails = COALESCE($7, email_preferences.promotional_emails),
        updated_at = NOW()`,
      [
        userId,
        welcomeSequence,
        matchNotifications,
        messageAlerts,
        subscriptionReminders,
        referralNotifications,
        promotionalEmails,
      ]
    );

    logger.info(`Email preferences updated for user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Email preferences updated successfully',
    });
  } catch (error: any) {
    logger.error('Failed to update email preferences', { error: error.message });
    res.status(500).json({ message: 'Failed to update email preferences', error: error.message });
  }
});

/**
 * Get logged-in user's email preferences
 * GET /api/email/preferences
 */
emailRouter.get('/preferences', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        welcome_sequence,
        match_notifications,
        message_alerts,
        subscription_reminders,
        referral_notifications,
        promotional_emails,
        is_globally_unsubscribed,
        unsubscribed_at
      FROM email_preferences
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults if no preferences exist
      return res.status(200).json({
        welcomeSequence: true,
        matchNotifications: true,
        messageAlerts: true,
        subscriptionReminders: true,
        referralNotifications: true,
        promotionalEmails: false,
        isGloballyUnsubscribed: false,
      });
    }

    const prefs = result.rows[0];

    res.status(200).json({
      welcomeSequence: prefs.welcome_sequence,
      matchNotifications: prefs.match_notifications,
      messageAlerts: prefs.message_alerts,
      subscriptionReminders: prefs.subscription_reminders,
      referralNotifications: prefs.referral_notifications,
      promotionalEmails: prefs.promotional_emails,
      isGloballyUnsubscribed: prefs.is_globally_unsubscribed,
      unsubscribedAt: prefs.unsubscribed_at,
    });
  } catch (error: any) {
    logger.error('Failed to get email preferences', { error: error.message });
    res.status(500).json({ message: 'Failed to get email preferences', error: error.message });
  }
});

/**
 * One-click unsubscribe (public endpoint)
 * POST /api/email/unsubscribe
 */
emailRouter.post('/unsubscribe', async (req, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Unsubscribe token is required' });
    }

    // Decode token (format: base64(userId))
    const userId = Buffer.from(token, 'base64').toString('utf-8');

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({ message: 'Invalid unsubscribe token' });
    }

    // Unsubscribe user
    await pool.query(
      `INSERT INTO email_preferences (user_id, is_globally_unsubscribed, unsubscribed_at, updated_at)
       VALUES ($1, TRUE, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         is_globally_unsubscribed = TRUE,
         unsubscribed_at = NOW(),
         updated_at = NOW()`,
      [userId]
    );

    logger.info(`User ${userId} unsubscribed via one-click`);

    res.status(200).json({
      success: true,
      message: 'You have been successfully unsubscribed from all emails',
    });
  } catch (error: any) {
    logger.error('Failed to unsubscribe user', { error: error.message });
    res.status(500).json({ message: 'Failed to unsubscribe', error: error.message });
  }
});

/**
 * Get detailed email analytics
 * GET /api/email/analytics
 */
emailRouter.get('/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);

    const [byTemplate, cohorts] = await Promise.all([
      getAnalyticsByTemplate(days),
      getCohortAnalytics(),
    ]);

    res.status(200).json({
      byTemplate,
      cohorts,
      period: `Last ${days} days`,
    });
  } catch (error: any) {
    logger.error('Failed to get email analytics', { error: error.message });
    res.status(500).json({ message: 'Failed to get email analytics', error: error.message });
  }
});
