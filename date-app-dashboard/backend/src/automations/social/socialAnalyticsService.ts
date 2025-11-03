import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';

/**
 * Social Analytics Service
 * 
 * Tracks and analyzes social media performance
 * Features:
 * - Engagement metrics (likes, shares, clicks)
 * - UTM click tracking
 * - Cohort analysis (which platform users came from)
 * - ROI calculation per platform
 * - Platform comparison
 */

interface PlatformMetrics {
  platform: string;
  totalPosts: number;
  totalLikes: number;
  totalShares: number;
  totalClicks: number;
  totalImpressions: number;
  avgEngagementRate: number;
  topPost?: any;
}

interface CohortMetrics {
  acquisitionPlatform: string;
  totalUsers: number;
  convertedUsers: number;
  conversionRate: number;
  avgLifetimeValue: number;
  totalRevenue: number;
}

/**
 * Update analytics for a post
 */
export const updatePostAnalytics = async (
  postId: string,
  metrics: {
    likes?: number;
    retweets?: number;
    replies?: number;
    shares?: number;
    clicks?: number;
    impressions?: number;
  }
): Promise<void> => {
  try {
    // Calculate engagement rate
    const totalEngagements =
      (metrics.likes || 0) + (metrics.retweets || 0) + (metrics.replies || 0) + (metrics.shares || 0);
    const engagementRate = metrics.impressions
      ? (totalEngagements / metrics.impressions) * 100
      : 0;

    await pool.query(
      `UPDATE social_analytics 
       SET likes = COALESCE($1, likes),
           retweets = COALESCE($2, retweets),
           replies = COALESCE($3, replies),
           shares = COALESCE($4, shares),
           clicks = COALESCE($5, clicks),
           impressions = COALESCE($6, impressions),
           engagement_rate = $7,
           last_updated = NOW()
       WHERE post_id = $8`,
      [
        metrics.likes,
        metrics.retweets,
        metrics.replies,
        metrics.shares,
        metrics.clicks,
        metrics.impressions,
        engagementRate,
        postId,
      ]
    );

    logger.info('Post analytics updated', { postId, engagementRate });

    await logAutomation({
      service: 'social',
      action: 'update_post_analytics',
      status: 'success',
      details: { postId, metrics },
    });
  } catch (error: any) {
    logger.error('Failed to update post analytics', {
      postId,
      error: error.message,
    });

    await logAutomation({
      service: 'social',
      action: 'update_post_analytics',
      status: 'failed',
      details: { postId, error: error.message },
    });
  }
};

/**
 * Get analytics by platform
 */
export const getAnalyticsByPlatform = async (platform: string): Promise<PlatformMetrics | null> => {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(sp.id) as total_posts,
        COALESCE(SUM(sa.likes), 0) as total_likes,
        COALESCE(SUM(sa.shares), 0) as total_shares,
        COALESCE(SUM(sa.clicks), 0) as total_clicks,
        COALESCE(SUM(sa.impressions), 0) as total_impressions,
        COALESCE(AVG(sa.engagement_rate), 0) as avg_engagement_rate
       FROM social_posts sp
       LEFT JOIN social_analytics sa ON sp.id = sa.post_id
       WHERE sp.platform = $1 AND sp.status = 'posted'`,
      [platform]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get top performing post
    const topPostResult = await pool.query(
      `SELECT sp.*, sa.* 
       FROM social_posts sp
       INNER JOIN social_analytics sa ON sp.id = sa.post_id
       WHERE sp.platform = $1 AND sp.status = 'posted'
       ORDER BY sa.engagement_rate DESC
       LIMIT 1`,
      [platform]
    );

    const metrics: PlatformMetrics = {
      platform,
      totalPosts: parseInt(row.total_posts, 10),
      totalLikes: parseInt(row.total_likes, 10),
      totalShares: parseInt(row.total_shares, 10),
      totalClicks: parseInt(row.total_clicks, 10),
      totalImpressions: parseInt(row.total_impressions, 10),
      avgEngagementRate: parseFloat(row.avg_engagement_rate || '0'),
      topPost: topPostResult.rows[0] || null,
    };

    return metrics;
  } catch (error: any) {
    logger.error('Failed to get analytics by platform', {
      platform,
      error: error.message,
    });
    return null;
  }
};

/**
 * Get all platforms analytics
 */
export const getAllPlatformsAnalytics = async (): Promise<PlatformMetrics[]> => {
  try {
    const platforms = ['twitter', 'instagram', 'reddit'];
    const analytics: PlatformMetrics[] = [];

    for (const platform of platforms) {
      const metrics = await getAnalyticsByPlatform(platform);
      if (metrics) {
        analytics.push(metrics);
      }
    }

    return analytics;
  } catch (error: any) {
    logger.error('Failed to get all platforms analytics', {
      error: error.message,
    });
    return [];
  }
};

/**
 * Track user acquisition from social media
 */
export const trackUserAcquisition = async (
  userId: string,
  platform: string,
  utmSource?: string
): Promise<void> => {
  try {
    // Check if user already has acquisition record
    const existing = await pool.query(
      `SELECT id FROM social_user_cohorts WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      logger.info('User already has acquisition record', { userId });
      return;
    }

    // Create acquisition record
    await pool.query(
      `INSERT INTO social_user_cohorts (
        user_id, acquisition_platform, first_click_date, signup_date
      )
       VALUES ($1, $2, NOW(), NOW())`,
      [userId, utmSource || platform]
    );

    logger.info('User acquisition tracked', { userId, platform });

    await logAutomation({
      service: 'social',
      action: 'track_user_acquisition',
      status: 'success',
      details: { userId, platform },
    });
  } catch (error: any) {
    logger.error('Failed to track user acquisition', {
      userId,
      platform,
      error: error.message,
    });
  }
};

/**
 * Update user conversion to premium
 */
export const trackUserConversion = async (userId: string, revenue: number): Promise<void> => {
  try {
    await pool.query(
      `UPDATE social_user_cohorts 
       SET converted_to_premium = TRUE,
           converted_date = NOW(),
           lifetime_value = lifetime_value + $1
       WHERE user_id = $2`,
      [revenue, userId]
    );

    logger.info('User conversion tracked', { userId, revenue });

    await logAutomation({
      service: 'social',
      action: 'track_user_conversion',
      status: 'success',
      details: { userId, revenue },
    });
  } catch (error: any) {
    logger.error('Failed to track user conversion', {
      userId,
      error: error.message,
    });
  }
};

/**
 * Get cohort analytics by platform
 */
export const getCohortAnalytics = async (platform: string): Promise<CohortMetrics | null> => {
  try {
    const result = await pool.query(
      `SELECT 
        acquisition_platform,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE converted_to_premium = TRUE) as converted_users,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE converted_to_premium = TRUE) / NULLIF(COUNT(*), 0),
          2
        ) as conversion_rate,
        COALESCE(AVG(lifetime_value) FILTER (WHERE converted_to_premium = TRUE), 0) as avg_ltv,
        COALESCE(SUM(lifetime_value), 0) as total_revenue
       FROM social_user_cohorts
       WHERE acquisition_platform = $1
       GROUP BY acquisition_platform`,
      [platform]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    const metrics: CohortMetrics = {
      acquisitionPlatform: row.acquisition_platform,
      totalUsers: parseInt(row.total_users, 10),
      convertedUsers: parseInt(row.converted_users, 10),
      conversionRate: parseFloat(row.conversion_rate || '0'),
      avgLifetimeValue: parseFloat(row.avg_ltv || '0'),
      totalRevenue: parseFloat(row.total_revenue || '0'),
    };

    return metrics;
  } catch (error: any) {
    logger.error('Failed to get cohort analytics', {
      platform,
      error: error.message,
    });
    return null;
  }
};

/**
 * Get all cohorts analytics
 */
export const getAllCohortsAnalytics = async (): Promise<CohortMetrics[]> => {
  try {
    const result = await pool.query(
      `SELECT 
        acquisition_platform,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE converted_to_premium = TRUE) as converted_users,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE converted_to_premium = TRUE) / NULLIF(COUNT(*), 0),
          2
        ) as conversion_rate,
        COALESCE(AVG(lifetime_value) FILTER (WHERE converted_to_premium = TRUE), 0) as avg_ltv,
        COALESCE(SUM(lifetime_value), 0) as total_revenue
       FROM social_user_cohorts
       GROUP BY acquisition_platform
       ORDER BY total_revenue DESC`
    );

    const cohorts: CohortMetrics[] = result.rows.map((row) => ({
      acquisitionPlatform: row.acquisition_platform,
      totalUsers: parseInt(row.total_users, 10),
      convertedUsers: parseInt(row.converted_users, 10),
      conversionRate: parseFloat(row.conversion_rate || '0'),
      avgLifetimeValue: parseFloat(row.avg_ltv || '0'),
      totalRevenue: parseFloat(row.total_revenue || '0'),
    }));

    return cohorts;
  } catch (error: any) {
    logger.error('Failed to get all cohorts analytics', {
      error: error.message,
    });
    return [];
  }
};

/**
 * Calculate ROI by platform
 */
export const calculatePlatformROI = async (
  platform: string
): Promise<{ platform: string; revenue: number; cost: number; roi: number } | null> => {
  try {
    // Get total revenue from this platform's cohort
    const cohort = await getCohortAnalytics(platform);
    if (!cohort) {
      return null;
    }

    // Cost is mostly time + API costs (minimal for free tiers)
    // Estimate: $0 for free tier APIs
    const cost = 0;

    const roi = cost > 0 ? ((cohort.totalRevenue - cost) / cost) * 100 : Infinity;

    return {
      platform,
      revenue: cohort.totalRevenue,
      cost,
      roi,
    };
  } catch (error: any) {
    logger.error('Failed to calculate platform ROI', {
      platform,
      error: error.message,
    });
    return null;
  }
};
