import { pool } from '../../database';
import logger from '../../logger';

export interface RevenueEvent {
  userId: string;
  eventType: 'subscription_start' | 'subscription_renewal' | 'refund';
  amount: number;
  subscriptionTier: string;
  paymentMethod: string;
  transactionId: string;
}

export interface EngagementMetric {
  userId: string;
  metricDate: Date;
  likesSent?: number;
  likesReceived?: number;
  matches?: number;
  messagesSent?: number;
  messagesReceived?: number;
  profileViews?: number;
  swipes?: number;
  sessionCount?: number;
  sessionDurationMinutes?: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsersDaily: number;
  activeUsersWeekly: number;
  activeUsersMonthly: number;
  totalRevenue: number;
  newSignups: number;
  newPremiumSubscribers: number;
  churnCount: number;
  growthRate: number;
}

export interface FunnelMetrics {
  signups: number;
  profileComplete: number;
  firstLike: number;
  firstMatch: number;
  firstMessage: number;
  premiumConversion: number;
}

/**
 * Record a revenue event
 */
export const recordRevenueEvent = async (data: RevenueEvent): Promise<void> => {
  try {
    const { userId, eventType, amount, subscriptionTier, paymentMethod, transactionId } = data;

    const query = `
      INSERT INTO revenue_events (
        user_id, event_type, amount, subscription_tier,
        payment_method, transaction_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await pool.query(query, [
      userId,
      eventType,
      amount,
      subscriptionTier,
      paymentMethod,
      transactionId,
    ]);

    logger.info(`Revenue event recorded`, { userId, eventType, amount });
  } catch (error: any) {
    logger.error('Failed to record revenue event', { error: error.message });
    throw error;
  }
};

/**
 * Update daily engagement metrics for a user
 */
export const updateEngagementMetrics = async (data: EngagementMetric): Promise<void> => {
  try {
    const {
      userId,
      metricDate,
      likesSent = 0,
      likesReceived = 0,
      matches = 0,
      messagesSent = 0,
      messagesReceived = 0,
      profileViews = 0,
      swipes = 0,
      sessionCount = 0,
      sessionDurationMinutes = 0,
    } = data;

    const query = `
      INSERT INTO engagement_metrics (
        user_id, metric_date, likes_sent, likes_received, matches,
        messages_sent, messages_received, profile_views, swipes,
        session_count, session_duration_minutes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (user_id, metric_date) 
      DO UPDATE SET
        likes_sent = engagement_metrics.likes_sent + EXCLUDED.likes_sent,
        likes_received = engagement_metrics.likes_received + EXCLUDED.likes_received,
        matches = engagement_metrics.matches + EXCLUDED.matches,
        messages_sent = engagement_metrics.messages_sent + EXCLUDED.messages_sent,
        messages_received = engagement_metrics.messages_received + EXCLUDED.messages_received,
        profile_views = engagement_metrics.profile_views + EXCLUDED.profile_views,
        swipes = engagement_metrics.swipes + EXCLUDED.swipes,
        session_count = engagement_metrics.session_count + EXCLUDED.session_count,
        session_duration_minutes = engagement_metrics.session_duration_minutes + EXCLUDED.session_duration_minutes
    `;

    await pool.query(query, [
      userId,
      metricDate,
      likesSent,
      likesReceived,
      matches,
      messagesSent,
      messagesReceived,
      profileViews,
      swipes,
      sessionCount,
      sessionDurationMinutes,
    ]);

    logger.debug(`Engagement metrics updated`, { userId, metricDate });
  } catch (error: any) {
    logger.error('Failed to update engagement metrics', { error: error.message });
    throw error;
  }
};

/**
 * Get executive dashboard summary
 */
export const getExecutiveDashboard = async (): Promise<DashboardMetrics> => {
  try {
    // Check cache first
    const cached = await getCachedDashboard('executive', 'main');
    if (cached) {
      return cached as DashboardMetrics;
    }

    const query = `
      WITH stats AS (
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(DISTINCT user_id) FROM engagement_metrics 
           WHERE metric_date = CURRENT_DATE) as dau,
          (SELECT COUNT(DISTINCT user_id) FROM engagement_metrics 
           WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days') as wau,
          (SELECT COUNT(DISTINCT user_id) FROM engagement_metrics 
           WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days') as mau,
          (SELECT COALESCE(SUM(amount), 0) FROM revenue_events) as total_revenue,
          (SELECT COUNT(*) FROM users 
           WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_signups_30d,
          (SELECT COUNT(*) FROM users 
           WHERE premium_until > NOW() 
           AND created_at >= CURRENT_DATE - INTERVAL '30 days') as new_premium_30d,
          (SELECT COUNT(*) FROM users 
           WHERE id NOT IN (
             SELECT DISTINCT user_id FROM engagement_metrics 
             WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
           )) as churned_users
      ),
      previous_month AS (
        SELECT COUNT(*) as prev_signups
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '60 days'
          AND created_at < CURRENT_DATE - INTERVAL '30 days'
      )
      SELECT 
        s.*,
        CASE 
          WHEN pm.prev_signups > 0 
          THEN ROUND(((s.new_signups_30d - pm.prev_signups)::NUMERIC / pm.prev_signups) * 100, 2)
          ELSE 0 
        END as growth_rate
      FROM stats s, previous_month pm
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    const metrics: DashboardMetrics = {
      totalUsers: parseInt(row.total_users),
      activeUsersDaily: parseInt(row.dau),
      activeUsersWeekly: parseInt(row.wau),
      activeUsersMonthly: parseInt(row.mau),
      totalRevenue: parseFloat(row.total_revenue) || 0,
      newSignups: parseInt(row.new_signups_30d),
      newPremiumSubscribers: parseInt(row.new_premium_30d),
      churnCount: parseInt(row.churned_users),
      growthRate: parseFloat(row.growth_rate) || 0,
    };

    // Cache for 1 hour
    await cacheDashboard('executive', 'main', metrics, 3600);

    return metrics;
  } catch (error: any) {
    logger.error('Failed to get executive dashboard', { error: error.message });
    throw error;
  }
};

/**
 * Get conversion funnel metrics
 */
export const getConversionFunnel = async (): Promise<FunnelMetrics> => {
  try {
    const query = `
      SELECT 
        COUNT(*) as signups,
        COUNT(CASE WHEN p.bio IS NOT NULL AND p.bio != '' THEN 1 END) as profile_complete,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM engagement_metrics em 
          WHERE em.user_id = u.id AND em.likes_sent > 0
        ) THEN 1 END) as first_like,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM engagement_metrics em 
          WHERE em.user_id = u.id AND em.matches > 0
        ) THEN 1 END) as first_match,
        COUNT(CASE WHEN EXISTS (
          SELECT 1 FROM engagement_metrics em 
          WHERE em.user_id = u.id AND em.messages_sent > 0
        ) THEN 1 END) as first_message,
        COUNT(CASE WHEN u.premium_until > NOW() THEN 1 END) as premium_conversion
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    return {
      signups: parseInt(row.signups),
      profileComplete: parseInt(row.profile_complete),
      firstLike: parseInt(row.first_like),
      firstMatch: parseInt(row.first_match),
      firstMessage: parseInt(row.first_message),
      premiumConversion: parseInt(row.premium_conversion),
    };
  } catch (error: any) {
    logger.error('Failed to get conversion funnel', { error: error.message });
    throw error;
  }
};

/**
 * Get revenue metrics (daily, weekly, monthly)
 */
export const getRevenueMetrics = async (period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<any> => {
  try {
    let interval = '30 days';
    if (period === 'daily') interval = '1 day';
    if (period === 'weekly') interval = '7 days';

    const query = `
      WITH revenue_stats AS (
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(DISTINCT user_id) as paying_users,
          COALESCE(AVG(amount), 0) as avg_transaction
        FROM revenue_events
        WHERE revenue_date >= NOW() - INTERVAL '${interval}'
          AND event_type != 'refund'
      ),
      user_count AS (
        SELECT COUNT(*) as total_users FROM users
      ),
      mrr AS (
        SELECT COALESCE(SUM(amount), 0) / 30 as monthly_recurring_revenue
        FROM revenue_events
        WHERE revenue_date >= NOW() - INTERVAL '30 days'
          AND event_type = 'subscription_renewal'
      )
      SELECT 
        rs.total_revenue,
        rs.paying_users,
        rs.avg_transaction,
        rs.total_revenue / NULLIF(uc.total_users, 0) as arpu,
        mrr.monthly_recurring_revenue as mrr,
        rs.total_revenue - COALESCE(prev.prev_revenue, 0) as new_revenue
      FROM revenue_stats rs, user_count uc, mrr,
      LATERAL (
        SELECT COALESCE(SUM(amount), 0) as prev_revenue
        FROM revenue_events
        WHERE revenue_date >= NOW() - INTERVAL '${interval}' - INTERVAL '${interval}'
          AND revenue_date < NOW() - INTERVAL '${interval}'
          AND event_type != 'refund'
      ) prev
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    return {
      totalRevenue: parseFloat(row.total_revenue) || 0,
      payingUsers: parseInt(row.paying_users),
      avgTransaction: parseFloat(row.avg_transaction) || 0,
      arpu: parseFloat(row.arpu) || 0,
      mrr: parseFloat(row.mrr) || 0,
      newRevenue: parseFloat(row.new_revenue) || 0,
    };
  } catch (error: any) {
    logger.error('Failed to get revenue metrics', { error: error.message });
    throw error;
  }
};

/**
 * Get user engagement metrics
 */
export const getUserEngagementMetrics = async (userId?: string): Promise<any> => {
  try {
    const query = `
      SELECT 
        ${userId ? 'user_id,' : ''}
        ROUND(AVG(likes_sent), 2) as avg_likes_per_day,
        ROUND(AVG(matches), 2) as avg_matches_per_day,
        ROUND(AVG(messages_sent), 2) as avg_messages_per_day,
        ROUND(AVG(swipes), 2) as avg_swipes_per_day,
        ROUND(AVG(session_count), 2) as avg_sessions_per_day,
        ROUND(AVG(session_duration_minutes), 2) as avg_session_duration
      FROM engagement_metrics
      WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
        ${userId ? `AND user_id = $1` : ''}
      ${userId ? '' : 'GROUP BY user_id'}
      ${userId ? '' : 'ORDER BY avg_likes_per_day DESC'}
      ${userId ? '' : 'LIMIT 1'}
    `;

    const params = userId ? [userId] : [];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return {
        avgLikesPerDay: 0,
        avgMatchesPerDay: 0,
        avgMessagesPerDay: 0,
        avgSwipesPerDay: 0,
        avgSessionsPerDay: 0,
        avgSessionDuration: 0,
      };
    }

    const row = result.rows[0];
    return {
      avgLikesPerDay: parseFloat(row.avg_likes_per_day) || 0,
      avgMatchesPerDay: parseFloat(row.avg_matches_per_day) || 0,
      avgMessagesPerDay: parseFloat(row.avg_messages_per_day) || 0,
      avgSwipesPerDay: parseFloat(row.avg_swipes_per_day) || 0,
      avgSessionsPerDay: parseFloat(row.avg_sessions_per_day) || 0,
      avgSessionDuration: parseFloat(row.avg_session_duration) || 0,
    };
  } catch (error: any) {
    logger.error('Failed to get engagement metrics', { error: error.message });
    throw error;
  }
};

/**
 * Get active users (DAU, WAU, MAU)
 */
export const getActiveUsers = async (): Promise<any> => {
  try {
    const query = `
      SELECT 
        COUNT(DISTINCT CASE WHEN metric_date = CURRENT_DATE THEN user_id END) as dau,
        COUNT(DISTINCT CASE WHEN metric_date >= CURRENT_DATE - INTERVAL '7 days' THEN user_id END) as wau,
        COUNT(DISTINCT CASE WHEN metric_date >= CURRENT_DATE - INTERVAL '30 days' THEN user_id END) as mau
      FROM engagement_metrics
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    return {
      dau: parseInt(row.dau),
      wau: parseInt(row.wau),
      mau: parseInt(row.mau),
    };
  } catch (error: any) {
    logger.error('Failed to get active users', { error: error.message });
    throw error;
  }
};

/**
 * Get growth rate (user and revenue)
 */
export const getGrowthRate = async (): Promise<any> => {
  try {
    const query = `
      WITH this_month AS (
        SELECT 
          COUNT(*) as users_this_month,
          COALESCE(SUM(r.amount), 0) as revenue_this_month
        FROM users u
        LEFT JOIN revenue_events r ON u.id = r.user_id AND r.revenue_date >= DATE_TRUNC('month', NOW())
        WHERE u.created_at >= DATE_TRUNC('month', NOW())
      ),
      last_month AS (
        SELECT 
          COUNT(*) as users_last_month,
          COALESCE(SUM(r.amount), 0) as revenue_last_month
        FROM users u
        LEFT JOIN revenue_events r ON u.id = r.user_id 
          AND r.revenue_date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
          AND r.revenue_date < DATE_TRUNC('month', NOW())
        WHERE u.created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
          AND u.created_at < DATE_TRUNC('month', NOW())
      )
      SELECT 
        tm.users_this_month,
        lm.users_last_month,
        tm.revenue_this_month,
        lm.revenue_last_month,
        ROUND(
          ((tm.users_this_month - lm.users_last_month)::NUMERIC / NULLIF(lm.users_last_month, 0)) * 100,
          2
        ) as user_growth_rate,
        ROUND(
          ((tm.revenue_this_month - lm.revenue_last_month)::NUMERIC / NULLIF(lm.revenue_last_month, 0)) * 100,
          2
        ) as revenue_growth_rate
      FROM this_month tm, last_month lm
    `;

    const result = await pool.query(query);
    const row = result.rows[0];

    return {
      usersThisMonth: parseInt(row.users_this_month),
      usersLastMonth: parseInt(row.users_last_month),
      revenueThisMonth: parseFloat(row.revenue_this_month) || 0,
      revenueLastMonth: parseFloat(row.revenue_last_month) || 0,
      userGrowthRate: parseFloat(row.user_growth_rate) || 0,
      revenueGrowthRate: parseFloat(row.revenue_growth_rate) || 0,
    };
  } catch (error: any) {
    logger.error('Failed to get growth rate', { error: error.message });
    throw error;
  }
};

// =====================================================
// DASHBOARD CACHING
// =====================================================

/**
 * Cache dashboard data
 */
export const cacheDashboard = async (
  dashboardType: string,
  cacheKey: string,
  data: any,
  ttlSeconds: number = 3600
): Promise<void> => {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await pool.query(
      `INSERT INTO dashboard_cache (dashboard_type, cache_key, cache_data, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (cache_key) 
       DO UPDATE SET 
         cache_data = EXCLUDED.cache_data,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [dashboardType, cacheKey, JSON.stringify(data), expiresAt]
    );

    logger.debug(`Dashboard cached`, { dashboardType, cacheKey });
  } catch (error: any) {
    logger.error('Failed to cache dashboard', { error: error.message });
  }
};

/**
 * Get cached dashboard data
 */
export const getCachedDashboard = async (dashboardType: string, cacheKey: string): Promise<any | null> => {
  try {
    const result = await pool.query(
      `SELECT cache_data FROM dashboard_cache 
       WHERE dashboard_type = $1 AND cache_key = $2 AND expires_at > NOW()`,
      [dashboardType, cacheKey]
    );

    if (result.rows.length > 0) {
      logger.debug(`Dashboard cache hit`, { dashboardType, cacheKey });
      return result.rows[0].cache_data;
    }

    return null;
  } catch (error: any) {
    logger.error('Failed to get cached dashboard', { error: error.message });
    return null;
  }
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = async (): Promise<number> => {
  try {
    const result = await pool.query(`DELETE FROM dashboard_cache WHERE expires_at < NOW()`);
    const deletedCount = result.rowCount || 0;

    logger.info(`Cleared ${deletedCount} expired cache entries`);
    return deletedCount;
  } catch (error: any) {
    logger.error('Failed to clear expired cache', { error: error.message });
    return 0;
  }
};
