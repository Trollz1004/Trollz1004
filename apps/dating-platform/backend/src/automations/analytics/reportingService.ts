import { pool } from '../../database';
import logger from '../../logger';
import { addToQueue } from '../email/emailQueueService';
import { getExecutiveDashboard, getRevenueMetrics, getActiveUsers, getGrowthRate } from './analyticsService';
import { getAcquisitionBySource, getChannelPerformance } from './acquisitionService';
import { calculateRetentionRate, calculateChurnRate } from './retentionService';

export interface DailySnapshot {
  snapshotDate: Date;
  totalUsers: number;
  activeUsersDaily: number;
  activeUsersWeekly: number;
  activeUsersMonthly: number;
  totalRevenue: number;
  newPremiumSubscribers: number;
  churnCount: number;
  newSignups: number;
}

/**
 * Create daily snapshot (aggregate metrics for the day)
 */
export const createDailySnapshot = async (): Promise<DailySnapshot> => {
  try {
    const snapshotDate = new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    // Get metrics
    const dashboard = await getExecutiveDashboard();

    const query = `
      INSERT INTO daily_snapshots (
        snapshot_date, total_users, active_users_daily, active_users_weekly,
        active_users_monthly, total_revenue, new_premium_subscribers,
        churn_count, new_signups
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (snapshot_date) 
      DO UPDATE SET
        total_users = EXCLUDED.total_users,
        active_users_daily = EXCLUDED.active_users_daily,
        active_users_weekly = EXCLUDED.active_users_weekly,
        active_users_monthly = EXCLUDED.active_users_monthly,
        total_revenue = EXCLUDED.total_revenue,
        new_premium_subscribers = EXCLUDED.new_premium_subscribers,
        churn_count = EXCLUDED.churn_count,
        new_signups = EXCLUDED.new_signups
      RETURNING *
    `;

    const result = await pool.query(query, [
      snapshotDate,
      dashboard.totalUsers,
      dashboard.activeUsersDaily,
      dashboard.activeUsersWeekly,
      dashboard.activeUsersMonthly,
      dashboard.totalRevenue,
      dashboard.newPremiumSubscribers,
      dashboard.churnCount,
      dashboard.newSignups,
    ]);

    logger.info(`Daily snapshot created for ${snapshotDate.toISOString().split('T')[0]}`);

    return {
      snapshotDate: result.rows[0].snapshot_date,
      totalUsers: parseInt(result.rows[0].total_users),
      activeUsersDaily: parseInt(result.rows[0].active_users_daily),
      activeUsersWeekly: parseInt(result.rows[0].active_users_weekly),
      activeUsersMonthly: parseInt(result.rows[0].active_users_monthly),
      totalRevenue: parseFloat(result.rows[0].total_revenue),
      newPremiumSubscribers: parseInt(result.rows[0].new_premium_subscribers),
      churnCount: parseInt(result.rows[0].churn_count),
      newSignups: parseInt(result.rows[0].new_signups),
    };
  } catch (error: any) {
    logger.error('Failed to create daily snapshot', { error: error.message });
    throw error;
  }
};

/**
 * Generate daily report
 */
export const generateDailyReport = async (emailRecipient?: string): Promise<any> => {
  try {
    const dashboard = await getExecutiveDashboard();
    const revenue = await getRevenueMetrics('daily');
    const activeUsers = await getActiveUsers();

    const report = {
      date: new Date().toISOString().split('T')[0],
      summary: {
        totalUsers: dashboard.totalUsers,
        dau: activeUsers.dau,
        newSignups: dashboard.newSignups,
        revenue: revenue.totalRevenue,
        premiumConversions: dashboard.newPremiumSubscribers,
      },
      highlights: [
        `${dashboard.newSignups} new signups today`,
        `${activeUsers.dau} daily active users`,
        `$${revenue.totalRevenue.toFixed(2)} revenue generated`,
        `${dashboard.newPremiumSubscribers} new premium subscribers`,
      ],
    };

    // Send email if recipient provided
    if (emailRecipient) {
      await addToQueue({
        templateName: 'daily_analytics_report',
        recipientEmail: emailRecipient,
        variables: {
          date: report.date,
          totalUsers: dashboard.totalUsers,
          dau: activeUsers.dau,
          newSignups: dashboard.newSignups,
          revenue: revenue.totalRevenue.toFixed(2),
          premiumConversions: dashboard.newPremiumSubscribers,
        },
      });

      logger.info(`Daily report emailed to ${emailRecipient}`);
    }

    logger.info('Daily report generated');
    return report;
  } catch (error: any) {
    logger.error('Failed to generate daily report', { error: error.message });
    throw error;
  }
};

/**
 * Generate weekly business review
 */
export const generateWeeklyReport = async (): Promise<any> => {
  try {
    const dashboard = await getExecutiveDashboard();
    const revenue = await getRevenueMetrics('weekly');
    const activeUsers = await getActiveUsers();
    const growth = await getGrowthRate();
    const channels = await getChannelPerformance();
    const retention = await calculateRetentionRate(7);

    const report = {
      week: `Week ending ${new Date().toISOString().split('T')[0]}`,
      kpis: {
        wau: activeUsers.wau,
        weeklyRevenue: revenue.totalRevenue,
        newSignups: dashboard.newSignups,
        growthRate: growth.userGrowthRate,
      },
      channelPerformance: channels.slice(0, 5),
      retention7Day: retention.length > 0 ? retention[0].retentionRate : 0,
      insights: [
        `${growth.userGrowthRate >= 0 ? 'Growth' : 'Decline'} of ${Math.abs(growth.userGrowthRate)}% this week`,
        `Top channel: ${channels.length > 0 ? channels[0].channel : 'N/A'}`,
        `7-day retention: ${retention.length > 0 ? retention[0].retentionRate : 0}%`,
      ],
    };

    logger.info('Weekly report generated');
    return report;
  } catch (error: any) {
    logger.error('Failed to generate weekly report', { error: error.message });
    throw error;
  }
};

/**
 * Generate monthly performance review
 */
export const generateMonthlyReport = async (): Promise<any> => {
  try {
    const dashboard = await getExecutiveDashboard();
    const revenue = await getRevenueMetrics('monthly');
    const activeUsers = await getActiveUsers();
    const growth = await getGrowthRate();
    const channels = await getChannelPerformance();
    const acquisition = await getAcquisitionBySource();
    const retention = await calculateRetentionRate(30);
    const churn = await calculateChurnRate(30);

    const report = {
      month: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      executiveSummary: {
        totalUsers: dashboard.totalUsers,
        mau: activeUsers.mau,
        monthlyRevenue: revenue.totalRevenue,
        mrr: revenue.mrr,
        arpu: revenue.arpu,
        userGrowthRate: growth.userGrowthRate,
        revenueGrowthRate: growth.revenueGrowthRate,
      },
      acquisitionBreakdown: acquisition,
      channelPerformance: channels,
      retentionMetrics: {
        retention30Day: retention.length > 0 ? retention[0].retentionRate : 0,
        churnRate: churn.length > 0 ? churn[0].churnRate : 0,
      },
      keyInsights: [
        `Monthly Active Users: ${activeUsers.mau}`,
        `Total Revenue: $${revenue.totalRevenue.toFixed(2)}`,
        `User Growth: ${growth.userGrowthRate}%`,
        `Revenue Growth: ${growth.revenueGrowthRate}%`,
        `30-day Retention: ${retention.length > 0 ? retention[0].retentionRate : 0}%`,
      ],
    };

    logger.info('Monthly report generated');
    return report;
  } catch (error: any) {
    logger.error('Failed to generate monthly report', { error: error.message });
    throw error;
  }
};

/**
 * Export data to CSV format
 */
export const exportToCSV = async (
  table: 'revenue_events' | 'user_acquisition' | 'engagement_metrics' | 'daily_snapshots',
  startDate?: Date,
  endDate?: Date
): Promise<string> => {
  try {
    let query = '';
    let dateColumn = 'created_at';

    switch (table) {
      case 'revenue_events':
        query = `
          SELECT 
            user_id, event_type, amount, subscription_tier,
            payment_method, transaction_id, revenue_date
          FROM revenue_events
        `;
        dateColumn = 'revenue_date';
        break;

      case 'user_acquisition':
        query = `
          SELECT 
            user_id, acquisition_source, referrer_user_id,
            utm_source, utm_medium, utm_campaign, signup_date,
            first_action_date, converted_to_premium_date
          FROM user_acquisition
        `;
        dateColumn = 'signup_date';
        break;

      case 'engagement_metrics':
        query = `
          SELECT 
            user_id, metric_date, likes_sent, likes_received,
            matches, messages_sent, messages_received,
            profile_views, swipes, session_count, session_duration_minutes
          FROM engagement_metrics
        `;
        dateColumn = 'metric_date';
        break;

      case 'daily_snapshots':
        query = `
          SELECT 
            snapshot_date, total_users, active_users_daily,
            active_users_weekly, active_users_monthly, total_revenue,
            new_premium_subscribers, churn_count, new_signups
          FROM daily_snapshots
        `;
        dateColumn = 'snapshot_date';
        break;

      default:
        throw new Error(`Unsupported table: ${table}`);
    }

    // Add date filtering
    const conditions: string[] = [];
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      conditions.push(`${dateColumn} >= $${params.length}`);
    }

    if (endDate) {
      params.push(endDate);
      conditions.push(`${dateColumn} <= $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY ${dateColumn} DESC`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return '';
    }

    // Generate CSV
    const headers = Object.keys(result.rows[0]);
    const csvHeaders = headers.join(',');

    const csvRows = result.rows.map((row: any) => {
      return headers
        .map((header) => {
          const value = row[header];
          // Handle nulls and escape quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',');
    });

    const csv = [csvHeaders, ...csvRows].join('\n');

    logger.info(`CSV export generated for ${table}`, { rows: result.rows.length });
    return csv;
  } catch (error: any) {
    logger.error('Failed to export CSV', { error: error.message });
    throw error;
  }
};

/**
 * Get historical trend data from daily snapshots
 */
export const getHistoricalTrends = async (days: number = 30): Promise<any[]> => {
  try {
    const query = `
      SELECT 
        snapshot_date,
        total_users,
        active_users_daily,
        active_users_weekly,
        active_users_monthly,
        total_revenue,
        new_signups,
        new_premium_subscribers,
        churn_count
      FROM daily_snapshots
      WHERE snapshot_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY snapshot_date ASC
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      date: row.snapshot_date,
      totalUsers: parseInt(row.total_users),
      dau: parseInt(row.active_users_daily),
      wau: parseInt(row.active_users_weekly),
      mau: parseInt(row.active_users_monthly),
      revenue: parseFloat(row.total_revenue),
      newSignups: parseInt(row.new_signups),
      newPremium: parseInt(row.new_premium_subscribers),
      churn: parseInt(row.churn_count),
    }));
  } catch (error: any) {
    logger.error('Failed to get historical trends', { error: error.message });
    throw error;
  }
};

/**
 * Get metrics by user segment (tier, gender, age, location)
 */
export const getMetricsBySegment = async (segment: 'tier' | 'gender' | 'age' | 'location'): Promise<any[]> => {
  try {
    let query = '';

    switch (segment) {
      case 'tier':
        query = `
          SELECT 
            CASE WHEN u.premium_until > NOW() THEN 'premium' ELSE 'free' END as segment,
            COUNT(DISTINCT u.id) as user_count,
            COALESCE(AVG(r.amount), 0) as arpu,
            COUNT(DISTINCT CASE 
              WHEN em.metric_date >= CURRENT_DATE - INTERVAL '30 days' 
              THEN em.user_id 
            END)::NUMERIC / NULLIF(COUNT(DISTINCT u.id), 0) * 100 as retention_30d
          FROM users u
          LEFT JOIN revenue_events r ON u.id = r.user_id
          LEFT JOIN engagement_metrics em ON u.id = em.user_id
          GROUP BY segment
        `;
        break;

      case 'gender':
        query = `
          SELECT 
            p.gender as segment,
            COUNT(DISTINCT u.id) as user_count,
            COALESCE(AVG(r.amount), 0) as arpu,
            COUNT(DISTINCT CASE 
              WHEN em.metric_date >= CURRENT_DATE - INTERVAL '30 days' 
              THEN em.user_id 
            END)::NUMERIC / NULLIF(COUNT(DISTINCT u.id), 0) * 100 as retention_30d
          FROM users u
          INNER JOIN profiles p ON u.id = p.user_id
          LEFT JOIN revenue_events r ON u.id = r.user_id
          LEFT JOIN engagement_metrics em ON u.id = em.user_id
          WHERE p.gender IS NOT NULL
          GROUP BY p.gender
        `;
        break;

      case 'age':
        query = `
          SELECT 
            CASE 
              WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) < 25 THEN '18-24'
              WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) < 35 THEN '25-34'
              WHEN EXTRACT(YEAR FROM AGE(p.date_of_birth)) < 45 THEN '35-44'
              ELSE '45+'
            END as segment,
            COUNT(DISTINCT u.id) as user_count,
            COALESCE(AVG(r.amount), 0) as arpu,
            COUNT(DISTINCT CASE 
              WHEN em.metric_date >= CURRENT_DATE - INTERVAL '30 days' 
              THEN em.user_id 
            END)::NUMERIC / NULLIF(COUNT(DISTINCT u.id), 0) * 100 as retention_30d
          FROM users u
          INNER JOIN profiles p ON u.id = p.user_id
          LEFT JOIN revenue_events r ON u.id = r.user_id
          LEFT JOIN engagement_metrics em ON u.id = em.user_id
          WHERE p.date_of_birth IS NOT NULL
          GROUP BY segment
        `;
        break;

      case 'location':
        query = `
          SELECT 
            p.location as segment,
            COUNT(DISTINCT u.id) as user_count,
            COALESCE(AVG(r.amount), 0) as arpu,
            COUNT(DISTINCT CASE 
              WHEN em.metric_date >= CURRENT_DATE - INTERVAL '30 days' 
              THEN em.user_id 
            END)::NUMERIC / NULLIF(COUNT(DISTINCT u.id), 0) * 100 as retention_30d
          FROM users u
          INNER JOIN profiles p ON u.id = p.user_id
          LEFT JOIN revenue_events r ON u.id = r.user_id
          LEFT JOIN engagement_metrics em ON u.id = em.user_id
          WHERE p.location IS NOT NULL
          GROUP BY p.location
          ORDER BY user_count DESC
          LIMIT 10
        `;
        break;

      default:
        throw new Error(`Unsupported segment: ${segment}`);
    }

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      segment: row.segment,
      userCount: parseInt(row.user_count),
      arpu: parseFloat(row.arpu) || 0,
      retention30d: parseFloat(row.retention_30d) || 0,
    }));
  } catch (error: any) {
    logger.error('Failed to get metrics by segment', { error: error.message });
    throw error;
  }
};
