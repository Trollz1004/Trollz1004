import { pool } from '../../database';
import logger from '../../logger';

export interface AcquisitionSource {
  source: string;
  count: number;
  conversionRate: number;
  revenue: number;
}

export interface AcquisitionData {
  userId: string;
  acquisitionSource: string;
  referrerUserId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ipAddress?: string;
}

export interface ChannelPerformance {
  channel: string;
  users: number;
  revenue: number;
  cac: number; // Cost per acquisition
  roi: number;
  conversionRate: number;
}

/**
 * Track new user acquisition
 */
export const trackUserAcquisition = async (data: AcquisitionData): Promise<void> => {
  try {
    const {
      userId,
      acquisitionSource,
      referrerUserId,
      utmSource,
      utmMedium,
      utmCampaign,
      ipAddress,
    } = data;

    const query = `
      INSERT INTO user_acquisition (
        user_id, acquisition_source, referrer_user_id,
        utm_source, utm_medium, utm_campaign, ip_address
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO NOTHING
    `;

    await pool.query(query, [
      userId,
      acquisitionSource,
      referrerUserId || null,
      utmSource || null,
      utmMedium || null,
      utmCampaign || null,
      ipAddress || null,
    ]);

    // Assign to cohort
    await assignUserToCohort(userId);

    logger.info(`User acquisition tracked`, { userId, source: acquisitionSource });
  } catch (error: any) {
    logger.error('Failed to track user acquisition', { error: error.message });
    throw error;
  }
};

/**
 * Assign user to weekly and monthly cohorts
 */
export const assignUserToCohort = async (userId: string): Promise<void> => {
  try {
    // Get user signup date
    const userQuery = `SELECT created_at FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const signupDate = new Date(userResult.rows[0].created_at);

    // Calculate weekly cohort (ISO week)
    const weekNumber = getISOWeek(signupDate);
    const year = signupDate.getFullYear();
    const weeklyCohortName = `${year}-week-${weekNumber}`;
    const weekStart = getWeekStart(signupDate);

    // Calculate monthly cohort
    const month = String(signupDate.getMonth() + 1).padStart(2, '0');
    const monthlyCohortName = `${year}-${month}`;
    const monthStart = new Date(year, signupDate.getMonth(), 1);

    // Insert weekly cohort
    await pool.query(
      `INSERT INTO user_cohorts (cohort_name, cohort_type, cohort_start_date, user_id, signup_date)
       VALUES ($1, 'weekly', $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [weeklyCohortName, weekStart, userId, signupDate]
    );

    // Insert monthly cohort
    await pool.query(
      `INSERT INTO user_cohorts (cohort_name, cohort_type, cohort_start_date, user_id, signup_date)
       VALUES ($1, 'monthly', $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [monthlyCohortName, monthStart, userId, signupDate]
    );

    logger.info(`User assigned to cohorts`, { userId, weekly: weeklyCohortName, monthly: monthlyCohortName });
  } catch (error: any) {
    logger.error('Failed to assign user to cohort', { error: error.message });
    // Don't throw - cohort assignment failure shouldn't block acquisition tracking
  }
};

/**
 * Update first action date when user performs first meaningful action
 */
export const trackFirstAction = async (userId: string): Promise<void> => {
  try {
    await pool.query(
      `UPDATE user_acquisition 
       SET first_action_date = NOW() 
       WHERE user_id = $1 AND first_action_date IS NULL`,
      [userId]
    );

    logger.info(`First action tracked for user ${userId}`);
  } catch (error: any) {
    logger.error('Failed to track first action', { error: error.message });
  }
};

/**
 * Update premium conversion date
 */
export const trackPremiumConversion = async (userId: string): Promise<void> => {
  try {
    await pool.query(
      `UPDATE user_acquisition 
       SET converted_to_premium_date = NOW() 
       WHERE user_id = $1 AND converted_to_premium_date IS NULL`,
      [userId]
    );

    logger.info(`Premium conversion tracked for user ${userId}`);
  } catch (error: any) {
    logger.error('Failed to track premium conversion', { error: error.message });
  }
};

/**
 * Get acquisition breakdown by source
 */
export const getAcquisitionBySource = async (
  startDate?: Date,
  endDate?: Date
): Promise<AcquisitionSource[]> => {
  try {
    const query = `
      SELECT 
        acquisition_source as source,
        COUNT(*) as count,
        COUNT(CASE WHEN converted_to_premium_date IS NOT NULL THEN 1 END) as conversions,
        ROUND(
          COUNT(CASE WHEN converted_to_premium_date IS NOT NULL THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as conversion_rate,
        COALESCE(SUM(r.amount), 0) as revenue
      FROM user_acquisition ua
      LEFT JOIN revenue_events r ON ua.user_id = r.user_id
      WHERE 1=1
        ${startDate ? `AND ua.signup_date >= $1` : ''}
        ${endDate ? `AND ua.signup_date <= $${startDate ? 2 : 1}` : ''}
      GROUP BY acquisition_source
      ORDER BY count DESC
    `;

    const params: any[] = [];
    if (startDate) params.push(startDate);
    if (endDate) params.push(endDate);

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => ({
      source: row.source,
      count: parseInt(row.count),
      conversionRate: parseFloat(row.conversion_rate) || 0,
      revenue: parseFloat(row.revenue) || 0,
    }));
  } catch (error: any) {
    logger.error('Failed to get acquisition by source', { error: error.message });
    throw error;
  }
};

/**
 * Get channel performance metrics
 */
export const getChannelPerformance = async (): Promise<ChannelPerformance[]> => {
  try {
    const query = `
      SELECT 
        ua.acquisition_source as channel,
        COUNT(DISTINCT ua.user_id) as users,
        COALESCE(SUM(r.amount), 0) as revenue,
        0 as cac,  -- Will need to be manually set for paid channels
        CASE 
          WHEN COUNT(DISTINCT ua.user_id) > 0 
          THEN COALESCE(SUM(r.amount), 0) / COUNT(DISTINCT ua.user_id)
          ELSE 0 
        END as roi,
        ROUND(
          COUNT(CASE WHEN ua.converted_to_premium_date IS NOT NULL THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(DISTINCT ua.user_id), 0) * 100, 
          2
        ) as conversion_rate
      FROM user_acquisition ua
      LEFT JOIN revenue_events r ON ua.user_id = r.user_id
      GROUP BY ua.acquisition_source
      ORDER BY revenue DESC
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      channel: row.channel,
      users: parseInt(row.users),
      revenue: parseFloat(row.revenue) || 0,
      cac: parseFloat(row.cac) || 0,
      roi: parseFloat(row.roi) || 0,
      conversionRate: parseFloat(row.conversion_rate) || 0,
    }));
  } catch (error: any) {
    logger.error('Failed to get channel performance', { error: error.message });
    throw error;
  }
};

/**
 * Get top referrers (users who brought most signups)
 */
export const getTopReferrers = async (limit: number = 10): Promise<any[]> => {
  try {
    const query = `
      SELECT 
        ua.referrer_user_id,
        p.first_name,
        p.last_name,
        COUNT(*) as referral_count,
        COUNT(CASE WHEN ua.converted_to_premium_date IS NOT NULL THEN 1 END) as premium_conversions,
        COALESCE(SUM(r.amount), 0) as total_revenue_generated
      FROM user_acquisition ua
      INNER JOIN profiles p ON ua.referrer_user_id = p.user_id
      LEFT JOIN revenue_events r ON ua.user_id = r.user_id
      WHERE ua.referrer_user_id IS NOT NULL
      GROUP BY ua.referrer_user_id, p.first_name, p.last_name
      ORDER BY referral_count DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    return result.rows.map((row: any) => ({
      userId: row.referrer_user_id,
      name: `${row.first_name} ${row.last_name}`,
      referralCount: parseInt(row.referral_count),
      premiumConversions: parseInt(row.premium_conversions),
      revenueGenerated: parseFloat(row.total_revenue_generated) || 0,
    }));
  } catch (error: any) {
    logger.error('Failed to get top referrers', { error: error.message });
    throw error;
  }
};

/**
 * Get UTM campaign performance
 */
export const getUTMPerformance = async (): Promise<any[]> => {
  try {
    const query = `
      SELECT 
        utm_campaign,
        utm_source,
        utm_medium,
        COUNT(*) as signups,
        COUNT(CASE WHEN converted_to_premium_date IS NOT NULL THEN 1 END) as conversions,
        ROUND(
          COUNT(CASE WHEN converted_to_premium_date IS NOT NULL THEN 1 END)::NUMERIC / 
          NULLIF(COUNT(*), 0) * 100, 
          2
        ) as conversion_rate
      FROM user_acquisition
      WHERE utm_campaign IS NOT NULL
      GROUP BY utm_campaign, utm_source, utm_medium
      ORDER BY signups DESC
    `;

    const result = await pool.query(query);

    return result.rows.map((row: any) => ({
      campaign: row.utm_campaign,
      source: row.utm_source,
      medium: row.utm_medium,
      signups: parseInt(row.signups),
      conversions: parseInt(row.conversions),
      conversionRate: parseFloat(row.conversion_rate) || 0,
    }));
  } catch (error: any) {
    logger.error('Failed to get UTM performance', { error: error.message });
    throw error;
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get ISO week number (1-53)
 */
function getISOWeek(date: Date): number {
  const tempDate = new Date(date.valueOf());
  const dayNum = (date.getDay() + 6) % 7;
  tempDate.setDate(tempDate.getDate() - dayNum + 3);
  const firstThursday = tempDate.valueOf();
  tempDate.setMonth(0, 1);
  if (tempDate.getDay() !== 4) {
    tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
}

/**
 * Get start of ISO week (Monday)
 */
function getWeekStart(date: Date): Date {
  const tempDate = new Date(date.valueOf());
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  tempDate.setDate(diff);
  tempDate.setHours(0, 0, 0, 0);
  return tempDate;
}
