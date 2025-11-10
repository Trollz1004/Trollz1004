import pool from '../../database';
import logger from '../../logger';

/**
 * Leaderboard entry interface
 */
interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
}

/**
 * Analytics summary interface
 */
interface ReferralAnalyticsSummary {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  conversionRate: number;
  totalRewardsGiven: number;
  estimatedRevenue: number;
}

/**
 * Get top referrers leaderboard
 * 
 * @param limit - Number of top referrers to return (default: 10)
 * @param period - Time period for leaderboard ('all', 'week', 'month')
 * @returns Array of leaderboard entries
 */
export const getReferralLeaderboard = async (
  limit: number = 10,
  period: 'all' | 'week' | 'month' = 'all'
): Promise<LeaderboardEntry[]> => {
  try {
    let timeFilter = '';
    
    if (period === 'week') {
      timeFilter = "AND r.created_at >= NOW() - INTERVAL '7 days'";
    } else if (period === 'month') {
      timeFilter = "AND r.created_at >= NOW() - INTERVAL '30 days'";
    }

    const query = `
      SELECT 
        r.referrer_id as user_id,
        u.email,
        COUNT(*) as total_referrals,
        SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END) as converted_referrals,
        CAST(
          SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END)::FLOAT / 
          COUNT(*)::FLOAT * 100 
          AS DECIMAL(5,2)
        ) as conversion_rate
      FROM referrals r
      JOIN users u ON r.referrer_id = u.id
      WHERE 1=1 ${timeFilter}
      GROUP BY r.referrer_id, u.email
      HAVING COUNT(*) > 0
      ORDER BY total_referrals DESC, converted_referrals DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    return result.rows.map((row: {
      user_id: string;
      email: string;
      total_referrals: string;
      converted_referrals: string;
      conversion_rate: string;
    }, index: number) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.email.split('@')[0], // Use email username as display name
      totalReferrals: parseInt(row.total_referrals, 10),
      convertedReferrals: parseInt(row.converted_referrals, 10),
      conversionRate: parseFloat(row.conversion_rate),
    }));
  } catch (error: any) {
    logger.error('Failed to get referral leaderboard', {
      error: error.message,
      limit,
      period,
    });
    throw error;
  }
};

/**
 * Get overall referral analytics summary
 * 
 * @returns Analytics summary with key metrics
 */
export const getReferralAnalyticsSummary = async (): Promise<ReferralAnalyticsSummary> => {
  try {
    // Get referral stats
    const referralStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM referrals
    `);

    const stats = referralStats.rows[0];
    const totalReferrals = parseInt(stats.total, 10);
    const convertedReferrals = parseInt(stats.converted, 10);
    const pendingReferrals = parseInt(stats.pending, 10);

    const conversionRate = totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0;

    // Get total rewards given
    const rewardsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM user_rewards
      WHERE reward_type = 'free_premium'
    `);

    const totalRewardsGiven = parseInt(rewardsResult.rows[0].count, 10);

    // Estimate revenue impact (assuming avg premium is $10/month)
    // Revenue = converted referrals × assumed subscription value
    const avgSubscriptionValue = 10; // $10 per month
    const estimatedRevenue = convertedReferrals * avgSubscriptionValue;

    return {
      totalReferrals,
      convertedReferrals,
      pendingReferrals,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      totalRewardsGiven,
      estimatedRevenue,
    };
  } catch (error: any) {
    logger.error('Failed to get referral analytics summary', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get referral trend data over time
 * 
 * @param days - Number of days to look back (default: 30)
 * @returns Array of daily referral counts
 */
export const getReferralTrends = async (
  days: number = 30
): Promise<
  Array<{
    date: string;
    signups: number;
    conversions: number;
  }>
> => {
  try {
    const query = `
      SELECT 
        DATE(referred_signup_date) as date,
        COUNT(*) as signups,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as conversions
      FROM referrals
      WHERE referred_signup_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(referred_signup_date)
      ORDER BY date DESC
    `;

    const result = await pool.query(query);

    return result.rows.map((row: {
      date: Date;
      signups: string;
      conversions: string;
    }) => ({
      date: row.date.toISOString().split('T')[0],
      signups: parseInt(row.signups, 10),
      conversions: parseInt(row.conversions, 10),
    }));
  } catch (error: any) {
    logger.error('Failed to get referral trends', {
      error: error.message,
      days,
    });
    throw error;
  }
};

/**
 * Get top performing referral codes
 * 
 * @param limit - Number of codes to return (default: 10)
 * @returns Array of referral codes with performance metrics
 */
export const getTopReferralCodes = async (
  limit: number = 10
): Promise<
  Array<{
    code: string;
    userId: string;
    totalUses: number;
    conversions: number;
    conversionRate: number;
  }>
> => {
  try {
    const query = `
      SELECT 
        r.referral_code_used as code,
        r.referrer_id as user_id,
        COUNT(*) as total_uses,
        SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END) as conversions,
        CAST(
          SUM(CASE WHEN r.status = 'converted' THEN 1 ELSE 0 END)::FLOAT / 
          COUNT(*)::FLOAT * 100 
          AS DECIMAL(5,2)
        ) as conversion_rate
      FROM referrals r
      WHERE r.referral_code_used IS NOT NULL
      GROUP BY r.referral_code_used, r.referrer_id
      ORDER BY total_uses DESC, conversions DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    return result.rows.map((row: {
      code: string;
      user_id: string;
      total_uses: string;
      conversions: string;
      conversion_rate: string;
    }) => ({
      code: row.code,
      userId: row.user_id,
      totalUses: parseInt(row.total_uses, 10),
      conversions: parseInt(row.conversions, 10),
      conversionRate: parseFloat(row.conversion_rate),
    }));
  } catch (error: any) {
    logger.error('Failed to get top referral codes', {
      error: error.message,
      limit,
    });
    throw error;
  }
};
