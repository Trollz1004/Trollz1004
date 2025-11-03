/**
 * Streak Service
 * Track daily activity streaks for users
 */

import pool from '../../database';
import logger from '../../logger';
import { trackStreakProgress } from './badgeProgressService';

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: Date;
  streak_frozen: boolean;
  freeze_expires_at: Date | null;
}

/**
 * Update user's activity streak
 */
export const updateUserStreak = async (userId: string): Promise<UserStreak> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get or create user streak
    let streakQuery = `
      SELECT * FROM user_streaks WHERE user_id = $1
    `;
    let streakResult = await client.query(streakQuery, [userId]);

    if (streakResult.rows.length === 0) {
      // Create new streak
      const createQuery = `
        INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_active_date)
        VALUES ($1, 1, 1, $2)
        RETURNING *
      `;
      streakResult = await client.query(createQuery, [userId, today]);
      await client.query('COMMIT');

      logger.info(`Created new streak for user ${userId}`);
      return streakResult.rows[0];
    }

    const streak = streakResult.rows[0];
    const lastActiveDate = new Date(streak.last_active_date);
    lastActiveDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

    let newCurrentStreak = streak.current_streak;
    let newLongestStreak = streak.longest_streak;

    if (diffDays === 0) {
      // Same day, no change
      await client.query('COMMIT');
      return streak;
    } else if (diffDays === 1) {
      // Consecutive day
      newCurrentStreak += 1;
      newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
    } else if (diffDays > 1) {
      // Streak broken (unless frozen)
      if (streak.streak_frozen && streak.freeze_expires_at && new Date(streak.freeze_expires_at) > today) {
        // Streak is frozen, maintain current streak
        logger.info(`User ${userId} streak protected by freeze`);
      } else {
        // Streak broken, reset to 1
        newCurrentStreak = 1;
      }
    }

    const updateQuery = `
      UPDATE user_streaks
      SET 
        current_streak = $1,
        longest_streak = $2,
        last_active_date = $3,
        updated_at = NOW()
      WHERE user_id = $4
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [
      newCurrentStreak,
      newLongestStreak,
      today,
      userId,
    ]);

    await client.query('COMMIT');

    const updatedStreak = updateResult.rows[0];

    logger.info(`Updated streak for user ${userId}`, {
      oldStreak: streak.current_streak,
      newStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
    });

    // Update streak badge progress
    await trackStreakProgress(userId);

    return updatedStreak;
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to update user streak', { userId, error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get user's current streak
 */
export const getUserStreak = async (userId: string): Promise<UserStreak | null> => {
  try {
    const query = `SELECT * FROM user_streaks WHERE user_id = $1`;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Failed to get user streak', { userId, error: error.message });
    throw error;
  }
};

/**
 * Freeze a user's streak (premium feature)
 */
export const freezeStreak = async (userId: string, days = 1): Promise<void> => {
  try {
    const freezeUntil = new Date();
    freezeUntil.setDate(freezeUntil.getDate() + days);

    const query = `
      UPDATE user_streaks
      SET 
        streak_frozen = true,
        freeze_expires_at = $1,
        updated_at = NOW()
      WHERE user_id = $2
    `;

    await pool.query(query, [freezeUntil, userId]);
    logger.info(`Froze streak for user ${userId}`, { freezeUntil });
  } catch (error: any) {
    logger.error('Failed to freeze streak', { userId, error: error.message });
    throw error;
  }
};

/**
 * Get users with active streaks (for leaderboard)
 */
export const getTopStreaks = async (limit = 10): Promise<UserStreak[]> => {
  try {
    const query = `
      SELECT us.*, p.first_name, p.photos[1] as photo
      FROM user_streaks us
      LEFT JOIN profiles p ON us.user_id = p.user_id
      WHERE us.current_streak > 0
      ORDER BY us.current_streak DESC, us.longest_streak DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get top streaks', { error: error.message });
    throw error;
  }
};

/**
 * Clean expired streak freezes (cron job)
 */
export const cleanExpiredFreezes = async (): Promise<void> => {
  try {
    const query = `
      UPDATE user_streaks
      SET 
        streak_frozen = false,
        freeze_expires_at = NULL,
        updated_at = NOW()
      WHERE streak_frozen = true
        AND freeze_expires_at < NOW()
    `;

    const result = await pool.query(query);
    logger.info(`Cleaned ${result.rowCount} expired streak freezes`);
  } catch (error: any) {
    logger.error('Failed to clean expired freezes', { error: error.message });
    throw error;
  }
};

export default {
  updateUserStreak,
  getUserStreak,
  freezeStreak,
  getTopStreaks,
  cleanExpiredFreezes,
};
