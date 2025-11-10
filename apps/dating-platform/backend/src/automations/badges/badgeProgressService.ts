/**
 * Badge Progress Service
 * Tracks user progress toward earning badges
 */

import pool from '../../database';
import logger from '../../logger';
import { getBadgeByName, awardBadge, Badge } from './badgeService';

export interface BadgeProgress {
  id: string;
  user_id: string;
  badge_id: string;
  current_count: number;
  milestone: number;
  percentage: number;
  last_increment_at: Date;
  updated_at: Date;
}

/**
 * Initialize progress tracking for a user and badge
 */
export const initializeProgress = async (
  userId: string,
  badgeId: string,
  milestone: number
): Promise<void> => {
  try {
    const query = `
      INSERT INTO badge_progress (user_id, badge_id, current_count, milestone, percentage)
      VALUES ($1, $2, 0, $3, 0)
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `;

    await pool.query(query, [userId, badgeId, milestone]);
    logger.debug(`Initialized progress for user ${userId} on badge ${badgeId}`);
  } catch (error: any) {
    logger.error('Failed to initialize badge progress', { userId, badgeId, error: error.message });
    throw error;
  }
};

/**
 * Get user's progress for a specific badge
 */
export const getBadgeProgress = async (
  userId: string,
  badgeId: string
): Promise<BadgeProgress | null> => {
  try {
    const query = `
      SELECT * FROM badge_progress
      WHERE user_id = $1 AND badge_id = $2
    `;

    const result = await pool.query(query, [userId, badgeId]);
    return result.rows[0] || null;
  } catch (error: any) {
    logger.error('Failed to get badge progress', { userId, badgeId, error: error.message });
    throw error;
  }
};

/**
 * Get all badge progress for a user
 */
export const getUserBadgeProgress = async (userId: string): Promise<BadgeProgress[]> => {
  try {
    const query = `
      SELECT bp.*, b.display_name, b.description, b.icon_url, b.rarity
      FROM badge_progress bp
      JOIN badges b ON bp.badge_id = b.id
      WHERE bp.user_id = $1
        AND b.is_active = true
      ORDER BY bp.percentage DESC, b.display_name
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get user badge progress', { userId, error: error.message });
    throw error;
  }
};

/**
 * Update badge progress (increment count)
 */
export const updateProgress = async (
  userId: string,
  badgeId: string,
  incrementBy = 1
): Promise<{ progress: BadgeProgress; badgeEarned: boolean; badge?: Badge }> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get or create progress record
    let progressQuery = `
      SELECT * FROM badge_progress
      WHERE user_id = $1 AND badge_id = $2
      FOR UPDATE
    `;
    let progressResult = await client.query(progressQuery, [userId, badgeId]);

    if (progressResult.rows.length === 0) {
      // Initialize if doesn't exist
      const badge = await getBadgeByName(badgeId);
      if (!badge) {
        throw new Error(`Badge ${badgeId} not found`);
      }

      const initQuery = `
        INSERT INTO badge_progress (user_id, badge_id, current_count, milestone, percentage)
        VALUES ($1, $2, 0, $3, 0)
        RETURNING *
      `;
      progressResult = await client.query(initQuery, [userId, badgeId, badge.milestone_count]);
    }

    const currentProgress = progressResult.rows[0];
    const newCount = currentProgress.current_count + incrementBy;
    const milestone = currentProgress.milestone;
    const percentage = Math.min(Math.floor((newCount / milestone) * 100), 100);

    // Update progress
    const updateQuery = `
      UPDATE badge_progress
      SET 
        current_count = $1,
        percentage = $2,
        last_increment_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $3 AND badge_id = $4
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [newCount, percentage, userId, badgeId]);
    const updatedProgress = updateResult.rows[0];

    await client.query('COMMIT');

    logger.debug(`Updated progress for user ${userId} on badge ${badgeId}`, {
      oldCount: currentProgress.current_count,
      newCount,
      percentage,
      milestone,
    });

    // Check if badge should be awarded
    if (newCount >= milestone && percentage >= 100) {
      logger.info(`User ${userId} reached milestone for badge ${badgeId}`, {
        count: newCount,
        milestone,
      });

      // Award the badge
      const awardResult = await awardBadge(userId, badgeId);

      if (awardResult.success && awardResult.badge) {
        return {
          progress: updatedProgress,
          badgeEarned: true,
          badge: awardResult.badge,
        };
      }
    }

    return {
      progress: updatedProgress,
      badgeEarned: false,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to update badge progress', { userId, badgeId, error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Track match-based badge progress
 */
export const trackMatchProgress = async (userId: string): Promise<void> => {
  try {
    // Get user's total match count
    const matchCountQuery = `
      SELECT COUNT(*) as count FROM matches
      WHERE (user1_id = $1 OR user2_id = $1)
        AND status = 'active'
    `;
    const matchResult = await pool.query(matchCountQuery, [userId]);
    const matchCount = parseInt(matchResult.rows[0].count, 10);

    // Update progress for match-based badges
    const matchBadges = [
      { name: 'first_match', milestone: 1 },
      { name: 'match_master', milestone: 25 },
      { name: 'match_king', milestone: 50 },
    ];

    for (const badgeInfo of matchBadges) {
      const badge = await getBadgeByName(badgeInfo.name);
      if (badge) {
        // Set progress to exact count (not increment)
        await setProgressCount(userId, badge.id, matchCount, badgeInfo.milestone);
      }
    }

    logger.debug(`Tracked match progress for user ${userId}`, { matchCount });
  } catch (error: any) {
    logger.error('Failed to track match progress', { userId, error: error.message });
    throw error;
  }
};

/**
 * Track referral-based badge progress
 */
export const trackReferralProgress = async (userId: string): Promise<void> => {
  try {
    // Get user's successful referral count
    const referralCountQuery = `
      SELECT COUNT(*) as count FROM referrals
      WHERE referrer_id = $1
        AND status = 'converted'
    `;
    const referralResult = await pool.query(referralCountQuery, [userId]);
    const referralCount = parseInt(referralResult.rows[0].count, 10);

    // Update progress for referral-based badges
    const referralBadges = [
      { name: 'referral_expert', milestone: 5 },
      { name: 'referral_overlord', milestone: 20 },
    ];

    for (const badgeInfo of referralBadges) {
      const badge = await getBadgeByName(badgeInfo.name);
      if (badge) {
        await setProgressCount(userId, badge.id, referralCount, badgeInfo.milestone);
      }
    }

    logger.debug(`Tracked referral progress for user ${userId}`, { referralCount });
  } catch (error: any) {
    logger.error('Failed to track referral progress', { userId, error: error.message });
    throw error;
  }
};

/**
 * Track profile completion badge progress
 */
export const trackProfileProgress = async (userId: string): Promise<void> => {
  try {
    // Check profile completion
    const profileQuery = `
      SELECT 
        (first_name IS NOT NULL AND first_name != '') as has_name,
        (bio IS NOT NULL AND bio != '') as has_bio,
        (location IS NOT NULL AND location != '') as has_location,
        (interests IS NOT NULL AND array_length(interests, 1) > 0) as has_interests,
        (COALESCE(array_length(photos, 1), 0) >= 5) as has_photos
      FROM profiles
      WHERE user_id = $1
    `;
    const profileResult = await pool.query(profileQuery, [userId]);

    if (profileResult.rows.length === 0) {
      return;
    }

    const profile = profileResult.rows[0];
    const completionScore = [
      profile.has_name,
      profile.has_bio,
      profile.has_location,
      profile.has_interests,
      profile.has_photos,
    ].filter(Boolean).length;

    // Profile Perfectionist badge requires all 5 criteria
    const badge = await getBadgeByName('profile_perfectionist');
    if (badge) {
      await setProgressCount(userId, badge.id, completionScore, 5);
    }

    logger.debug(`Tracked profile progress for user ${userId}`, { completionScore });
  } catch (error: any) {
    logger.error('Failed to track profile progress', { userId, error: error.message });
    throw error;
  }
};

/**
 * Track activity streak badge progress
 */
export const trackStreakProgress = async (userId: string): Promise<void> => {
  try {
    // Get current streak from user_streaks table
    const streakQuery = `SELECT current_streak FROM user_streaks WHERE user_id = $1`;
    const streakResult = await pool.query(streakQuery, [userId]);

    if (streakResult.rows.length === 0) {
      return;
    }

    const currentStreak = streakResult.rows[0].current_streak;

    // Streak King badge requires 7 consecutive days
    const badge = await getBadgeByName('streak_king');
    if (badge) {
      await setProgressCount(userId, badge.id, currentStreak, 7);
    }

    logger.debug(`Tracked streak progress for user ${userId}`, { currentStreak });
  } catch (error: any) {
    logger.error('Failed to track streak progress', { userId, error: error.message });
    throw error;
  }
};

/**
 * Track engagement badge progress (likes sent)
 */
export const trackEngagementProgress = async (userId: string): Promise<void> => {
  try {
    // Get total likes sent from user_interactions table
    const likesQuery = `
      SELECT COUNT(*) as count FROM user_interactions
      WHERE user_id = $1 AND interaction_type = 'like'
    `;
    const likesResult = await pool.query(likesQuery, [userId]);
    const likesCount = parseInt(likesResult.rows[0]?.count || '0', 10);

    // Super Liker badge requires 100+ likes
    const badge = await getBadgeByName('super_liker');
    if (badge) {
      await setProgressCount(userId, badge.id, likesCount, 100);
    }

    logger.debug(`Tracked engagement progress for user ${userId}`, { likesCount });
  } catch (error: any) {
    logger.error('Failed to track engagement progress', { userId, error: error.message });
    // Don't throw - this table might not exist yet
  }
};

/**
 * Set progress to a specific count (not increment)
 */
const setProgressCount = async (
  userId: string,
  badgeId: string,
  count: number,
  milestone: number
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const percentage = Math.min(Math.floor((count / milestone) * 100), 100);

    const upsertQuery = `
      INSERT INTO badge_progress (user_id, badge_id, current_count, milestone, percentage, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, badge_id)
      DO UPDATE SET
        current_count = $3,
        percentage = $5,
        updated_at = NOW()
      RETURNING *
    `;

    await client.query(upsertQuery, [userId, badgeId, count, milestone, percentage]);

    await client.query('COMMIT');

    // Check if badge should be awarded
    if (count >= milestone) {
      await awardBadge(userId, badgeId);
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to set progress count', { userId, badgeId, error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get users close to earning a badge (for notifications)
 */
export const getUsersCloseToEarning = async (
  badgeId: string,
  threshold = 80
): Promise<{ userId: string; current: number; milestone: number; percentage: number }[]> => {
  try {
    const query = `
      SELECT 
        user_id,
        current_count,
        milestone,
        percentage
      FROM badge_progress
      WHERE badge_id = $1
        AND percentage >= $2
        AND percentage < 100
      ORDER BY percentage DESC
    `;

    const result = await pool.query(query, [badgeId, threshold]);

    return result.rows.map((row) => ({
      userId: row.user_id,
      current: row.current_count,
      milestone: row.milestone,
      percentage: row.percentage,
    }));
  } catch (error: any) {
    logger.error('Failed to get users close to earning', { badgeId, error: error.message });
    throw error;
  }
};

/**
 * Batch update progress for all users (cron job)
 */
export const batchUpdateAllProgress = async (): Promise<void> => {
  try {
    logger.info('Starting batch progress update for all users');

    // Get all active users
    const usersQuery = `SELECT id FROM users WHERE created_at < NOW() - INTERVAL '1 day'`;
    const usersResult = await pool.query(usersQuery);

    let updatedCount = 0;

    for (const user of usersResult.rows) {
      try {
        await trackMatchProgress(user.id);
        await trackReferralProgress(user.id);
        await trackProfileProgress(user.id);
        await trackStreakProgress(user.id);
        updatedCount++;
      } catch (error: any) {
        logger.error(`Failed to update progress for user ${user.id}`, { error: error.message });
        // Continue with next user
      }
    }

    logger.info(`Batch progress update complete`, { usersUpdated: updatedCount });
  } catch (error: any) {
    logger.error('Failed to batch update progress', { error: error.message });
    throw error;
  }
};

export default {
  initializeProgress,
  getBadgeProgress,
  getUserBadgeProgress,
  updateProgress,
  trackMatchProgress,
  trackReferralProgress,
  trackProfileProgress,
  trackStreakProgress,
  trackEngagementProgress,
  getUsersCloseToEarning,
  batchUpdateAllProgress,
};
