import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';

/**
 * Email analytics metrics
 */
export interface EmailAnalytics {
  totalSent: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

/**
 * Template-specific analytics
 */
export interface TemplateAnalytics {
  templateName: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

/**
 * Track email event (from webhook)
 * 
 * @param emailQueueId - Email queue ID
 * @param eventType - Event type (open, click, bounce, complaint, unsubscribe)
 * @param eventData - Additional event data
 * @returns Promise<void>
 */
export const trackEvent = async (
  emailQueueId: string,
  eventType: string,
  eventData: Record<string, any>
): Promise<void> => {
  try {
    // Insert event
    await pool.query(
      `INSERT INTO email_events (email_queue_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [emailQueueId, eventType, JSON.stringify(eventData)]
    );

    // Update email queue status if needed
    if (eventType === 'bounce') {
      await pool.query(
        `UPDATE email_queue
         SET status = 'bounced', updated_at = NOW()
         WHERE id = $1`,
        [emailQueueId]
      );
    }

    // Handle unsubscribe
    if (eventType === 'unsubscribe' || eventType === 'complaint') {
      const emailResult = await pool.query(
        `SELECT user_id FROM email_queue WHERE id = $1`,
        [emailQueueId]
      );

      if (emailResult.rows.length > 0 && emailResult.rows[0].user_id) {
        await pool.query(
          `UPDATE email_preferences
           SET is_globally_unsubscribed = TRUE, unsubscribed_at = NOW(), updated_at = NOW()
           WHERE user_id = $1`,
          [emailResult.rows[0].user_id]
        );

        logger.info(`User ${emailResult.rows[0].user_id} automatically unsubscribed due to ${eventType}`);
      }
    }

    logger.debug(`Email event tracked: ${eventType} for ${emailQueueId}`);
  } catch (error: any) {
    logger.error('Failed to track email event', { error: error.message, emailQueueId, eventType });
    throw error;
  }
};

/**
 * Get overall email analytics
 * 
 * @param days - Number of days to look back (default: 30)
 * @returns Promise<EmailAnalytics>
 */
export const getEmailAnalytics = async (days: number = 30): Promise<EmailAnalytics> => {
  try {
    // Get sent count
    const sentResult = await pool.query(
      `SELECT COUNT(*) as total_sent
       FROM email_queue
       WHERE status = 'sent'
         AND sent_at > NOW() - INTERVAL '${days} days'`
    );

    const totalSent = parseInt(sentResult.rows[0].total_sent, 10);

    if (totalSent === 0) {
      return {
        totalSent: 0,
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
      };
    }

    // Get event counts
    const eventsResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN eq.id END) as opens,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN eq.id END) as clicks,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'bounce' THEN eq.id END) as bounces,
         COUNT(DISTINCT CASE WHEN ee.event_type IN ('unsubscribe', 'complaint') THEN eq.id END) as unsubscribes
       FROM email_queue eq
       LEFT JOIN email_events ee ON eq.id = ee.email_queue_id
       WHERE eq.status = 'sent'
         AND eq.sent_at > NOW() - INTERVAL '${days} days'`
    );

    const events = eventsResult.rows[0];

    const analytics: EmailAnalytics = {
      totalSent,
      openRate: (parseInt(events.opens, 10) / totalSent) * 100,
      clickRate: (parseInt(events.clicks, 10) / totalSent) * 100,
      bounceRate: (parseInt(events.bounces, 10) / totalSent) * 100,
      unsubscribeRate: (parseInt(events.unsubscribes, 10) / totalSent) * 100,
    };

    logger.info(`Email analytics calculated for last ${days} days`);
    return analytics;
  } catch (error: any) {
    logger.error('Failed to get email analytics', { error: error.message });
    throw error;
  }
};

/**
 * Get analytics by template
 * 
 * @param days - Number of days to look back (default: 30)
 * @returns Promise<TemplateAnalytics[]>
 */
export const getAnalyticsByTemplate = async (days: number = 30): Promise<TemplateAnalytics[]> => {
  try {
    const result = await pool.query(
      `SELECT 
         et.name as template_name,
         COUNT(eq.id) as sent,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN eq.id END) as opened,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN eq.id END) as clicked,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'bounce' THEN eq.id END) as bounced,
         COUNT(DISTINCT CASE WHEN ee.event_type IN ('unsubscribe', 'complaint') THEN eq.id END) as unsubscribed
       FROM email_queue eq
       JOIN email_templates et ON eq.email_template_id = et.id
       LEFT JOIN email_events ee ON eq.id = ee.email_queue_id
       WHERE eq.status = 'sent'
         AND eq.sent_at > NOW() - INTERVAL '${days} days'
       GROUP BY et.name
       ORDER BY sent DESC`
    );

    const analytics: TemplateAnalytics[] = result.rows.map((row: any) => {
      const sent = parseInt(row.sent, 10);
      const opened = parseInt(row.opened, 10);
      const clicked = parseInt(row.clicked, 10);

      return {
        templateName: row.template_name,
        sent,
        opened,
        clicked,
        bounced: parseInt(row.bounced, 10),
        unsubscribed: parseInt(row.unsubscribed, 10),
        openRate: sent > 0 ? (opened / sent) * 100 : 0,
        clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
      };
    });

    logger.info(`Template analytics calculated for last ${days} days`);
    return analytics;
  } catch (error: any) {
    logger.error('Failed to get analytics by template', { error: error.message });
    throw error;
  }
};

/**
 * Get cohort analytics
 * Tracks performance of welcome sequence cohorts
 * 
 * @returns Promise<any>
 */
export const getCohortAnalytics = async (): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT 
         DATE(eq.created_at) as cohort_date,
         COUNT(DISTINCT eq.user_id) as users,
         COUNT(eq.id) as emails_sent,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN eq.id END) as opened,
         COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN eq.id END) as clicked
       FROM email_queue eq
       JOIN email_templates et ON eq.email_template_id = et.id
       LEFT JOIN email_events ee ON eq.id = ee.email_queue_id
       WHERE et.name LIKE 'welcome_%'
         AND eq.status = 'sent'
         AND eq.created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(eq.created_at)
       ORDER BY cohort_date DESC`
    );

    const cohorts = result.rows.map((row: any) => ({
      cohortDate: row.cohort_date,
      users: parseInt(row.users, 10),
      emailsSent: parseInt(row.emails_sent, 10),
      opened: parseInt(row.opened, 10),
      clicked: parseInt(row.clicked, 10),
      openRate: parseInt(row.emails_sent, 10) > 0 
        ? (parseInt(row.opened, 10) / parseInt(row.emails_sent, 10)) * 100 
        : 0,
    }));

    logger.info('Cohort analytics calculated');
    return cohorts;
  } catch (error: any) {
    logger.error('Failed to get cohort analytics', { error: error.message });
    throw error;
  }
};

/**
 * Export email data for dashboard
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Promise<any[]>
 */
export const exportEmailData = async (startDate: Date, endDate: Date): Promise<any[]> => {
  try {
    const result = await pool.query(
      `SELECT 
         eq.id,
         eq.user_id,
         eq.recipient_email,
         eq.subject_line,
         et.name as template_name,
         eq.status,
         eq.sent_at,
         eq.failed_reason,
         (SELECT COUNT(*) FROM email_events WHERE email_queue_id = eq.id AND event_type = 'open') as opens,
         (SELECT COUNT(*) FROM email_events WHERE email_queue_id = eq.id AND event_type = 'click') as clicks
       FROM email_queue eq
       JOIN email_templates et ON eq.email_template_id = et.id
       WHERE eq.created_at BETWEEN $1 AND $2
       ORDER BY eq.created_at DESC`,
      [startDate, endDate]
    );

    logger.info(`Exported ${result.rows.length} email records`);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to export email data', { error: error.message });
    throw error;
  }
};

/**
 * Get real-time email stats (last 24 hours)
 * 
 * @returns Promise<any>
 */
export const getRealtimeStats = async (): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '1 hour') as sent_last_hour,
         COUNT(*) FILTER (WHERE sent_at > NOW() - INTERVAL '24 hours') as sent_last_24h,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') as failed_last_24h
       FROM email_queue`
    );

    const stats = {
      sentLastHour: parseInt(result.rows[0].sent_last_hour, 10),
      sentLast24h: parseInt(result.rows[0].sent_last_24h, 10),
      pending: parseInt(result.rows[0].pending, 10),
      failedLast24h: parseInt(result.rows[0].failed_last_24h, 10),
    };

    logger.debug('Real-time stats retrieved');
    return stats;
  } catch (error: any) {
    logger.error('Failed to get real-time stats', { error: error.message });
    throw error;
  }
};

/**
 * Calculate conversion metrics for email campaigns
 * (e.g., how many users who opened welcome emails became paid subscribers)
 * 
 * @returns Promise<any>
 */
export const getConversionMetrics = async (): Promise<any> => {
  try {
    const result = await pool.query(
      `SELECT 
         et.name as template_name,
         COUNT(DISTINCT eq.user_id) as total_users,
         COUNT(DISTINCT CASE 
           WHEN EXISTS (
             SELECT 1 FROM subscriptions s 
             WHERE s.user_id = eq.user_id 
             AND s.created_at > eq.sent_at
             AND s.status = 'active'
           ) THEN eq.user_id 
         END) as converted_users
       FROM email_queue eq
       JOIN email_templates et ON eq.email_template_id = et.id
       WHERE eq.status = 'sent'
         AND eq.sent_at > NOW() - INTERVAL '90 days'
         AND et.name LIKE ANY(ARRAY['welcome_%', '%premium%'])
       GROUP BY et.name`
    );

    const conversions = result.rows.map((row: any) => {
      const totalUsers = parseInt(row.total_users, 10);
      const convertedUsers = parseInt(row.converted_users, 10);

      return {
        templateName: row.template_name,
        totalUsers,
        convertedUsers,
        conversionRate: totalUsers > 0 ? (convertedUsers / totalUsers) * 100 : 0,
      };
    });

    logger.info('Conversion metrics calculated');
    return conversions;
  } catch (error: any) {
    logger.error('Failed to get conversion metrics', { error: error.message });
    throw error;
  }
};
