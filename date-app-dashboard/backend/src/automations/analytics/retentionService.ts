import { pool } from '../../database';
import logger from '../../logger';

export interface RetentionData {
  period: string;
  retentionRate: number;
  activeUsers: number;
  totalUsers: number;
}

export interface ChurnData {
  period: string;
  churnRate: number;
  churnedUsers: number;
  totalUsers: number;
}

export interface CohortRetention {
  cohortName: string;
  cohortSize: number;
  week0: number;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  [key: string]: any;
}

export interface LTVData {
  cohortName: string;
  ltv: number;
  averageRevenue: number;
  retentionRate: number;
  paybackPeriodDays: number;
}

/**
 * Calculate retention rate for a specific period (1-day, 7-day, 30-day)
 */
export const calculateRetentionRate = async (days: number = 7): Promise<RetentionData[]> => {
  try {
    const query = `
      WITH signup_cohort AS (
        SELECT 
          DATE_TRUNC('week', created_at) as cohort_week,
          id as user_id,
          created_at
        FROM users
        WHERE created_at >= NOW() - INTERVAL '12 weeks'
      ),
      active_users AS (
        SELECT DISTINCT
          sc.cohort_week,
          sc.user_id,
          em.metric_date
        FROM signup_cohort sc
        INNER JOIN engagement_metrics em 
          ON sc.user_id = em.user_id
          AND em.metric_date >= sc.created_at::DATE + $1
          AND em.metric_date < sc.created_at::DATE + $1 + 1
          AND (em.likes_sent > 0 OR em.messages_sent > 0 OR em.swipes > 0)
      )
      SELECT 
        TO_CHAR(sc.cohort_week, 'YYYY-MM-DD') as period,
        COUNT(DISTINCT sc.user_id) as total_users,
        COUNT(DISTINCT au.user_id) as active_users,
        ROUND(
          COUNT(DISTINCT au.user_id)::NUMERIC / 
          NULLIF(COUNT(DISTINCT sc.user_id), 0) * 100,
          2
        ) as retention_rate
      FROM signup_cohort sc
      LEFT JOIN active_users au ON sc.user_id = au.user_id
      GROUP BY sc.cohort_week
      ORDER BY sc.cohort_week DESC
      LIMIT 12
    `;

    const result = await pool.query(query, [days]);

    return result.rows.map((row: any) => ({
      period: row.period,
      retentionRate: parseFloat(row.retention_rate) || 0,
      activeUsers: parseInt(row.active_users),
      totalUsers: parseInt(row.total_users),
    }));
  } catch (error: any) {
    logger.error('Failed to calculate retention rate', { error: error.message });
    throw error;
  }
};

/**
 * Calculate churn rate (users who stopped using the app)
 */
export const calculateChurnRate = async (days: number = 30): Promise<ChurnData[]> => {
  try {
    const query = `
      WITH cohort_activity AS (
        SELECT 
          DATE_TRUNC('month', u.created_at) as cohort_month,
          u.id as user_id,
          MAX(em.metric_date) as last_activity_date
        FROM users u
        LEFT JOIN engagement_metrics em ON u.id = em.user_id
        WHERE u.created_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', u.created_at), u.id
      )
      SELECT 
        TO_CHAR(cohort_month, 'YYYY-MM') as period,
        COUNT(*) as total_users,
        COUNT(CASE 
          WHEN last_activity_date IS NULL OR last_activity_date < NOW() - INTERVAL '${days} days'
          THEN 1 
        END) as churned_users,
        ROUND(
          COUNT(CASE 
            WHEN last_activity_date IS NULL OR last_activity_date < NOW() - INTERVAL '${days} days'
            THEN 1 
          END)::NUMERIC / NULLIF(COUNT(*), 0) * 100,
          2
        ) as churn_rate
      FROM cohort_activity
      WHERE cohort_month < DATE_TRUNC('month', NOW())
      GROUP BY cohort_month
      ORDER BY cohort_month DESC
      LIMIT 12
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      period: row.period,
      churnRate: parseFloat(row.churn_rate) || 0,
      churnedUsers: parseInt(row.churned_users),
      totalUsers: parseInt(row.total_users),
    }));
  } catch (error: any) {
    logger.error('Failed to calculate churn rate', { error: error.message });
    throw error;
  }
};

/**
 * Get full cohort retention analysis (classic cohort table)
 */
export const getCohortRetentionAnalysis = async (): Promise<CohortRetention[]> => {
  try {
    const query = `
      WITH cohorts AS (
        SELECT DISTINCT
          cohort_name,
          cohort_start_date,
          COUNT(*) as cohort_size
        FROM user_cohorts
        WHERE cohort_type = 'weekly'
          AND cohort_start_date >= NOW() - INTERVAL '12 weeks'
        GROUP BY cohort_name, cohort_start_date
      ),
      weekly_activity AS (
        SELECT 
          uc.cohort_name,
          uc.user_id,
          FLOOR(EXTRACT(EPOCH FROM (em.metric_date - uc.cohort_start_date)) / 604800)::INT as week_number
        FROM user_cohorts uc
        INNER JOIN engagement_metrics em ON uc.user_id = em.user_id
        WHERE uc.cohort_type = 'weekly'
          AND uc.cohort_start_date >= NOW() - INTERVAL '12 weeks'
          AND (em.likes_sent > 0 OR em.messages_sent > 0 OR em.swipes > 0)
      )
      SELECT 
        c.cohort_name,
        c.cohort_size,
        COUNT(DISTINCT CASE WHEN wa.week_number = 0 THEN wa.user_id END) as week_0,
        COUNT(DISTINCT CASE WHEN wa.week_number = 1 THEN wa.user_id END) as week_1,
        COUNT(DISTINCT CASE WHEN wa.week_number = 2 THEN wa.user_id END) as week_2,
        COUNT(DISTINCT CASE WHEN wa.week_number = 3 THEN wa.user_id END) as week_3,
        COUNT(DISTINCT CASE WHEN wa.week_number = 4 THEN wa.user_id END) as week_4,
        COUNT(DISTINCT CASE WHEN wa.week_number = 8 THEN wa.user_id END) as week_8,
        COUNT(DISTINCT CASE WHEN wa.week_number = 12 THEN wa.user_id END) as week_12
      FROM cohorts c
      LEFT JOIN weekly_activity wa ON c.cohort_name = wa.cohort_name
      GROUP BY c.cohort_name, c.cohort_size, c.cohort_start_date
      ORDER BY c.cohort_start_date DESC
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      cohortName: row.cohort_name,
      cohortSize: parseInt(row.cohort_size),
      week0: parseFloat(((parseInt(row.week_0) / parseInt(row.cohort_size)) * 100).toFixed(2)),
      week1: parseFloat(((parseInt(row.week_1) / parseInt(row.cohort_size)) * 100).toFixed(2)),
      week2: parseFloat(((parseInt(row.week_2) / parseInt(row.cohort_size)) * 100).toFixed(2)),
      week3: parseFloat(((parseInt(row.week_3) / parseInt(row.cohort_size)) * 100).toFixed(2)),
      week4: parseFloat(((parseInt(row.week_4) / parseInt(row.cohort_size)) * 100).toFixed(2)),
      week8: parseFloat(((parseInt(row.week_8) / parseInt(row.cohort_size)) * 100).toFixed(2)),
      week12: parseFloat(((parseInt(row.week_12) / parseInt(row.cohort_size)) * 100).toFixed(2)),
    }));
  } catch (error: any) {
    logger.error('Failed to get cohort retention analysis', { error: error.message });
    throw error;
  }
};

/**
 * Calculate Lifetime Value (LTV) by cohort
 */
export const calculateLTV = async (cohortName?: string): Promise<LTVData[]> => {
  try {
    const query = `
      WITH cohort_revenue AS (
        SELECT 
          uc.cohort_name,
          COUNT(DISTINCT uc.user_id) as cohort_size,
          COALESCE(SUM(re.amount), 0) as total_revenue,
          COALESCE(AVG(re.amount), 0) as avg_revenue_per_paying_user,
          COUNT(DISTINCT re.user_id) as paying_users
        FROM user_cohorts uc
        LEFT JOIN revenue_events re ON uc.user_id = re.user_id
        WHERE uc.cohort_type = 'monthly'
          ${cohortName ? `AND uc.cohort_name = $1` : ''}
        GROUP BY uc.cohort_name
      ),
      cohort_retention AS (
        SELECT 
          uc.cohort_name,
          COUNT(DISTINCT CASE 
            WHEN em.metric_date >= NOW() - INTERVAL '30 days' 
            THEN em.user_id 
          END)::NUMERIC / NULLIF(COUNT(DISTINCT uc.user_id), 0) as retention_30d
        FROM user_cohorts uc
        LEFT JOIN engagement_metrics em ON uc.user_id = em.user_id
        WHERE uc.cohort_type = 'monthly'
          ${cohortName ? `AND uc.cohort_name = $1` : ''}
        GROUP BY uc.cohort_name
      )
      SELECT 
        cr.cohort_name,
        cr.cohort_size,
        cr.total_revenue,
        cr.avg_revenue_per_paying_user,
        cr.total_revenue / NULLIF(cr.cohort_size, 0) as ltv,
        COALESCE(crt.retention_30d, 0) as retention_rate,
        CASE 
          WHEN cr.total_revenue > 0 THEN 30 -- Simplified payback period
          ELSE 0
        END as payback_period_days
      FROM cohort_revenue cr
      LEFT JOIN cohort_retention crt ON cr.cohort_name = crt.cohort_name
      ORDER BY cr.cohort_name DESC
      LIMIT 12
    `;

    const params = cohortName ? [cohortName] : [];
    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      cohortName: row.cohort_name,
      ltv: parseFloat(row.ltv) || 0,
      averageRevenue: parseFloat(row.avg_revenue_per_paying_user) || 0,
      retentionRate: parseFloat(row.retention_rate) * 100 || 0,
      paybackPeriodDays: parseInt(row.payback_period_days),
    }));
  } catch (error: any) {
    logger.error('Failed to calculate LTV', { error: error.message });
    throw error;
  }
};

/**
 * Predict churn risk for active users
 */
export const predictChurnRisk = async (): Promise<any[]> => {
  try {
    const query = `
      WITH user_activity AS (
        SELECT 
          u.id as user_id,
          p.first_name,
          p.last_name,
          u.email,
          MAX(em.metric_date) as last_active_date,
          AVG(em.likes_sent + em.messages_sent) as avg_daily_engagement,
          COUNT(DISTINCT em.metric_date) as active_days_last_30
        FROM users u
        INNER JOIN profiles p ON u.id = p.user_id
        LEFT JOIN engagement_metrics em 
          ON u.id = em.user_id 
          AND em.metric_date >= NOW() - INTERVAL '30 days'
        WHERE u.created_at < NOW() - INTERVAL '7 days'
        GROUP BY u.id, p.first_name, p.last_name, u.email
      )
      SELECT 
        user_id,
        first_name,
        last_name,
        email,
        last_active_date,
        active_days_last_30,
        avg_daily_engagement,
        CASE 
          WHEN last_active_date < NOW() - INTERVAL '14 days' THEN 'high'
          WHEN last_active_date < NOW() - INTERVAL '7 days' THEN 'medium'
          WHEN active_days_last_30 < 5 THEN 'medium'
          WHEN avg_daily_engagement < 2 THEN 'low'
          ELSE 'very_low'
        END as churn_risk
      FROM user_activity
      WHERE last_active_date IS NOT NULL
      ORDER BY 
        CASE 
          WHEN last_active_date < NOW() - INTERVAL '14 days' THEN 1
          WHEN last_active_date < NOW() - INTERVAL '7 days' THEN 2
          WHEN active_days_last_30 < 5 THEN 3
          ELSE 4
        END,
        last_active_date ASC
      LIMIT 100
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      userId: row.user_id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      lastActiveDate: row.last_active_date,
      activeDaysLast30: parseInt(row.active_days_last_30),
      avgDailyEngagement: parseFloat(row.avg_daily_engagement) || 0,
      churnRisk: row.churn_risk,
    }));
  } catch (error: any) {
    logger.error('Failed to predict churn risk', { error: error.message });
    throw error;
  }
};

/**
 * Get retention rate by subscription tier
 */
export const getRetentionByTier = async (): Promise<any[]> => {
  try {
    const query = `
      WITH user_tiers AS (
        SELECT 
          u.id as user_id,
          CASE 
            WHEN u.premium_until > NOW() THEN 'premium'
            ELSE 'free'
          END as tier
        FROM users u
      ),
      tier_activity AS (
        SELECT 
          ut.tier,
          COUNT(DISTINCT ut.user_id) as total_users,
          COUNT(DISTINCT CASE 
            WHEN em.metric_date >= NOW() - INTERVAL '7 days' 
            THEN em.user_id 
          END) as active_7d,
          COUNT(DISTINCT CASE 
            WHEN em.metric_date >= NOW() - INTERVAL '30 days' 
            THEN em.user_id 
          END) as active_30d
        FROM user_tiers ut
        LEFT JOIN engagement_metrics em ON ut.user_id = em.user_id
        GROUP BY ut.tier
      )
      SELECT 
        tier,
        total_users,
        active_7d,
        active_30d,
        ROUND((active_7d::NUMERIC / NULLIF(total_users, 0)) * 100, 2) as retention_7d,
        ROUND((active_30d::NUMERIC / NULLIF(total_users, 0)) * 100, 2) as retention_30d
      FROM tier_activity
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      tier: row.tier,
      totalUsers: parseInt(row.total_users),
      active7d: parseInt(row.active_7d),
      active30d: parseInt(row.active_30d),
      retention7d: parseFloat(row.retention_7d) || 0,
      retention30d: parseFloat(row.retention_30d) || 0,
    }));
  } catch (error: any) {
    logger.error('Failed to get retention by tier', { error: error.message });
    throw error;
  }
};
