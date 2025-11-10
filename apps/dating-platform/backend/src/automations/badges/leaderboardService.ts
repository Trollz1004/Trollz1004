/**
 * Leaderboard Service
 * Calculate and manage user rankings across different metrics
 */

import pool from '../../database';
import logger from '../../logger';

export interface LeaderboardEntry {
  id: string;
  leaderboard_type: string;
  user_id: string;
  rank: number;
  score: number;
  period_start: Date;
  period_end: Date;
  is_current: boolean;
  // Joined user data
  user_name?: string;
  user_photo?: string;
  badge_count?: number;
}

export type LeaderboardType =
  | 'weekly_matches'
  | 'weekly_referrals'
  | 'all_time_badges'
  | 'monthly_new_users';

/**
 * Get current leaderboard of a specific type
 */
export const getLeaderboard = async (
  type: LeaderboardType,
  limit = 10
): Promise<LeaderboardEntry[]> => {
  try {
    const query = `
      SELECT 
        l.*,
        p.first_name as user_name,
        p.photos[1] as user_photo,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = l.user_id) as badge_count
      FROM leaderboards l
      LEFT JOIN profiles p ON l.user_id = p.user_id
      WHERE l.leaderboard_type = $1
        AND l.is_current = true
      ORDER BY l.rank ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [type, limit]);
    logger.debug(`Retrieved ${type} leaderboard`, { entries: result.rows.length });
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get leaderboard', { type, error: error.message });
    throw error;
  }
};

/**
 * Get user's rank in a specific leaderboard
 */
export const getUserRank = async (
  userId: string,
  type: LeaderboardType
): Promise<{ rank: number; score: number } | null> => {
  try {
    const query = `
      SELECT rank, score
      FROM leaderboards
      WHERE user_id = $1
        AND leaderboard_type = $2
        AND is_current = true
    `;

    const result = await pool.query(query, [userId, type]);
    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Failed to get user rank', { userId, type, error: error.message });
    throw error;
  }
};

/**
 * Get user's ranks across all leaderboards
 */
export const getUserAllRanks = async (userId: string): Promise<Record<string, { rank: number; score: number }>> => {
  try {
    const query = `
      SELECT leaderboard_type, rank, score
      FROM leaderboards
      WHERE user_id = $1
        AND is_current = true
    `;

    const result = await pool.query(query, [userId]);

    const ranks: Record<string, { rank: number; score: number }> = {};
    result.rows.forEach((row) => {
      ranks[row.leaderboard_type] = {
        rank: row.rank,
        score: row.score,
      };
    });

    return ranks;
  } catch (error: any) {
    logger.error('Failed to get user all ranks', { userId, error: error.message });
    throw error;
  }
};

/**
 * Calculate weekly matches leaderboard
 */
export const calculateWeeklyMatchesLeaderboard = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get start and end of current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek; // Monday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    logger.info('Calculating weekly matches leaderboard', { weekStart, weekEnd });

    // Mark previous entries as not current
    await client.query(`
      UPDATE leaderboards
      SET is_current = false
      WHERE leaderboard_type = 'weekly_matches'
        AND is_current = true
    `);

    // Calculate top users by matches this week
    const calculateQuery = `
      WITH weekly_matches AS (
        SELECT 
          CASE 
            WHEN user1_id < user2_id THEN user1_id
            ELSE user2_id
          END as user_id,
          COUNT(*) as match_count
        FROM matches
        WHERE created_at >= $1 AND created_at < $2
          AND status = 'active'
        GROUP BY user_id
        
        UNION ALL
        
        SELECT 
          CASE 
            WHEN user1_id < user2_id THEN user2_id
            ELSE user1_id
          END as user_id,
          COUNT(*) as match_count
        FROM matches
        WHERE created_at >= $1 AND created_at < $2
          AND status = 'active'
        GROUP BY user_id
      ),
      aggregated AS (
        SELECT user_id, SUM(match_count) as total_matches
        FROM weekly_matches
        GROUP BY user_id
      ),
      ranked AS (
        SELECT 
          user_id,
          total_matches,
          RANK() OVER (ORDER BY total_matches DESC) as rank
        FROM aggregated
      )
      INSERT INTO leaderboards (leaderboard_type, user_id, rank, score, period_start, period_end, is_current)
      SELECT 'weekly_matches', user_id, rank, total_matches, $1, $2, true
      FROM ranked
      WHERE rank <= 50
    `;

    await client.query(calculateQuery, [weekStart, weekEnd]);

    await client.query('COMMIT');
    logger.info('Weekly matches leaderboard calculated successfully');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to calculate weekly matches leaderboard', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Calculate weekly referrals leaderboard
 */
export const calculateWeeklyReferralsLeaderboard = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    logger.info('Calculating weekly referrals leaderboard', { weekStart, weekEnd });

    await client.query(`
      UPDATE leaderboards
      SET is_current = false
      WHERE leaderboard_type = 'weekly_referrals'
        AND is_current = true
    `);

    const calculateQuery = `
      WITH weekly_referrals AS (
        SELECT 
          referrer_id as user_id,
          COUNT(*) as referral_count
        FROM referrals
        WHERE created_at >= $1 AND created_at < $2
          AND status = 'converted'
        GROUP BY referrer_id
      ),
      ranked AS (
        SELECT 
          user_id,
          referral_count,
          RANK() OVER (ORDER BY referral_count DESC) as rank
        FROM weekly_referrals
      )
      INSERT INTO leaderboards (leaderboard_type, user_id, rank, score, period_start, period_end, is_current)
      SELECT 'weekly_referrals', user_id, rank, referral_count, $1, $2, true
      FROM ranked
      WHERE rank <= 50
    `;

    await client.query(calculateQuery, [weekStart, weekEnd]);

    await client.query('COMMIT');
    logger.info('Weekly referrals leaderboard calculated successfully');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to calculate weekly referrals leaderboard', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Calculate all-time badges leaderboard
 */
export const calculateAllTimeBadgesLeaderboard = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Calculating all-time badges leaderboard');

    await client.query(`
      UPDATE leaderboards
      SET is_current = false
      WHERE leaderboard_type = 'all_time_badges'
        AND is_current = true
    `);

    const now = new Date();
    const startOfTime = new Date('2024-01-01');

    const calculateQuery = `
      WITH badge_counts AS (
        SELECT 
          user_id,
          COUNT(*) as badge_count
        FROM user_badges
        GROUP BY user_id
      ),
      ranked AS (
        SELECT 
          user_id,
          badge_count,
          RANK() OVER (ORDER BY badge_count DESC) as rank
        FROM badge_counts
      )
      INSERT INTO leaderboards (leaderboard_type, user_id, rank, score, period_start, period_end, is_current)
      SELECT 'all_time_badges', user_id, rank, badge_count, $1, $2, true
      FROM ranked
      WHERE rank <= 50
    `;

    await client.query(calculateQuery, [startOfTime, now]);

    await client.query('COMMIT');
    logger.info('All-time badges leaderboard calculated successfully');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to calculate all-time badges leaderboard', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Calculate monthly new users leaderboard (engagement)
 */
export const calculateMonthlyNewUsersLeaderboard = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    logger.info('Calculating monthly new users leaderboard', { monthStart, monthEnd });

    await client.query(`
      UPDATE leaderboards
      SET is_current = false
      WHERE leaderboard_type = 'monthly_new_users'
        AND is_current = true
    `);

    // Engagement score = matches + (referrals * 3) + (badges * 2)
    const calculateQuery = `
      WITH new_users AS (
        SELECT id as user_id
        FROM users
        WHERE created_at >= $1 AND created_at < $2
      ),
      engagement_scores AS (
        SELECT 
          nu.user_id,
          (
            COALESCE((
              SELECT COUNT(*) 
              FROM matches m 
              WHERE (m.user1_id = nu.user_id OR m.user2_id = nu.user_id) 
                AND m.status = 'active'
            ), 0) +
            COALESCE((
              SELECT COUNT(*) * 3 
              FROM referrals r 
              WHERE r.referrer_id = nu.user_id 
                AND r.status = 'converted'
            ), 0) +
            COALESCE((
              SELECT COUNT(*) * 2 
              FROM user_badges ub 
              WHERE ub.user_id = nu.user_id
            ), 0)
          ) as engagement_score
        FROM new_users nu
      ),
      ranked AS (
        SELECT 
          user_id,
          engagement_score,
          RANK() OVER (ORDER BY engagement_score DESC) as rank
        FROM engagement_scores
        WHERE engagement_score > 0
      )
      INSERT INTO leaderboards (leaderboard_type, user_id, rank, score, period_start, period_end, is_current)
      SELECT 'monthly_new_users', user_id, rank, engagement_score, $1, $2, true
      FROM ranked
      WHERE rank <= 50
    `;

    await client.query(calculateQuery, [monthStart, monthEnd]);

    await client.query('COMMIT');
    logger.info('Monthly new users leaderboard calculated successfully');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to calculate monthly new users leaderboard', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Calculate all leaderboards
 */
export const calculateAllLeaderboards = async (): Promise<void> => {
  try {
    logger.info('Calculating all leaderboards');

    await Promise.all([
      calculateWeeklyMatchesLeaderboard(),
      calculateWeeklyReferralsLeaderboard(),
      calculateAllTimeBadgesLeaderboard(),
      calculateMonthlyNewUsersLeaderboard(),
    ]);

    logger.info('All leaderboards calculated successfully');
  } catch (error: any) {
    logger.error('Failed to calculate all leaderboards', { error: error.message });
    throw error;
  }
};

/**
 * Get leaderboard statistics
 */
export const getLeaderboardStats = async (): Promise<{
  totalEntries: number;
  activeLeaderboards: number;
  topUser: { userId: string; totalRanks: number } | null;
}> => {
  try {
    const totalQuery = `SELECT COUNT(*) as count FROM leaderboards WHERE is_current = true`;
    const activeQuery = `SELECT COUNT(DISTINCT leaderboard_type) as count FROM leaderboards WHERE is_current = true`;
    const topUserQuery = `
      SELECT user_id, COUNT(*) as total_ranks
      FROM leaderboards
      WHERE is_current = true
      GROUP BY user_id
      ORDER BY total_ranks DESC
      LIMIT 1
    `;

    const [total, active, topUser] = await Promise.all([
      pool.query(totalQuery),
      pool.query(activeQuery),
      pool.query(topUserQuery),
    ]);

    return {
      totalEntries: parseInt(total.rows[0].count, 10),
      activeLeaderboards: parseInt(active.rows[0].count, 10),
      topUser: topUser.rows[0] ? { userId: topUser.rows[0].user_id, totalRanks: topUser.rows[0].total_ranks } : null,
    };
  } catch (error: any) {
    logger.error('Failed to get leaderboard stats', { error: error.message });
    throw error;
  }
};

/**
 * Archive old leaderboards (keep last 4 weeks)
 */
export const archiveOldLeaderboards = async (): Promise<void> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 28); // 4 weeks ago

    const deleteQuery = `
      DELETE FROM leaderboards
      WHERE is_current = false
        AND period_end < $1
    `;

    const result = await pool.query(deleteQuery, [cutoffDate]);
    logger.info(`Archived ${result.rowCount} old leaderboard entries`);
  } catch (error: any) {
    logger.error('Failed to archive old leaderboards', { error: error.message });
    throw error;
  }
};

export default {
  getLeaderboard,
  getUserRank,
  getUserAllRanks,
  calculateWeeklyMatchesLeaderboard,
  calculateWeeklyReferralsLeaderboard,
  calculateAllTimeBadgesLeaderboard,
  calculateMonthlyNewUsersLeaderboard,
  calculateAllLeaderboards,
  getLeaderboardStats,
  archiveOldLeaderboards,
};
