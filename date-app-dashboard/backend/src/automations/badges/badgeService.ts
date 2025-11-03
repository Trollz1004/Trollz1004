/**
 * Badge Service
 * Handles badge definitions, awards, and rewards
 */

import { pool } from '../../database';
import logger from '../../logger';
import { addToQueue } from '../email/emailQueueService';

export interface Badge {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon_url: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  milestone_count: number;
  reward_type: 'premium_days' | 'extra_swipes' | 'status' | 'feature_unlock';
  reward_value: string;
  badge_category: 'matches' | 'referrals' | 'profile' | 'activity' | 'engagement';
  is_active: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: Date;
  is_new: boolean;
  notified: boolean;
  reward_claimed: boolean;
}

export interface BadgeWithProgress extends Badge {
  earned: boolean;
  earned_at?: Date;
  progress?: number;
  current_count?: number;
}

// Cache for badge definitions (avoid repeated DB queries)
let badgeCache: Badge[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all badge definitions
 */
export const getAllBadges = async (): Promise<Badge[]> => {
  try {
    // Check cache first
    const now = Date.now();
    if (badgeCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
      return badgeCache;
    }

    const query = `
      SELECT * FROM badges
      WHERE is_active = true
      ORDER BY badge_category, milestone_count
    `;

    const result = await pool.query(query);
    badgeCache = result.rows;
    cacheTimestamp = now;

    logger.info(`Loaded ${result.rows.length} badge definitions`);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get badges', { error: error.message });
    throw error;
  }
};

/**
 * Get badge by name
 */
export const getBadgeByName = async (name: string): Promise<Badge | null> => {
  try {
    const badges = await getAllBadges();
    return badges.find((b) => b.name === name) || null;
  } catch (error: any) {
    logger.error('Failed to get badge by name', { name, error: error.message });
    throw error;
  }
};

/**
 * Get badge by ID
 */
export const getBadgeById = async (badgeId: string): Promise<Badge | null> => {
  try {
    const badges = await getAllBadges();
    return badges.find((b) => b.id === badgeId) || null;
  } catch (error: any) {
    logger.error('Failed to get badge by ID', { badgeId, error: error.message });
    throw error;
  }
};

/**
 * Get user's earned badges
 */
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const query = `
      SELECT * FROM user_badges
      WHERE user_id = $1
      ORDER BY earned_at DESC
    `;

    const result = await pool.query(query, [userId]);
    logger.debug(`User ${userId} has ${result.rows.length} badges`);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get user badges', { userId, error: error.message });
    throw error;
  }
};

/**
 * Get user's badges with full badge details
 */
export const getUserBadgesWithDetails = async (userId: string): Promise<BadgeWithProgress[]> => {
  try {
    const query = `
      SELECT 
        b.*,
        ub.earned_at,
        ub.is_new,
        ub.notified,
        ub.reward_claimed,
        true as earned
      FROM badges b
      INNER JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = $1
        AND b.is_active = true
      ORDER BY ub.earned_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get user badges with details', { userId, error: error.message });
    throw error;
  }
};

/**
 * Check if user has earned a badge
 */
export const hasEarnedBadge = async (userId: string, badgeId: string): Promise<boolean> => {
  try {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM user_badges
        WHERE user_id = $1 AND badge_id = $2
      ) as has_badge
    `;

    const result = await pool.query(query, [userId, badgeId]);
    return result.rows[0].has_badge;
  } catch (error: any) {
    logger.error('Failed to check badge ownership', { userId, badgeId, error: error.message });
    throw error;
  }
};

/**
 * Award a badge to a user (atomic transaction)
 */
export const awardBadge = async (
  userId: string,
  badgeId: string,
  skipReward = false
): Promise<{ success: boolean; badge?: Badge; alreadyEarned?: boolean }> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if already earned
    const checkQuery = `
      SELECT id FROM user_badges
      WHERE user_id = $1 AND badge_id = $2
    `;
    const existing = await client.query(checkQuery, [userId, badgeId]);

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      logger.info(`User ${userId} already has badge ${badgeId}`);
      return { success: false, alreadyEarned: true };
    }

    // Award the badge
    const awardQuery = `
      INSERT INTO user_badges (user_id, badge_id, earned_at, is_new, notified, reward_claimed)
      VALUES ($1, $2, NOW(), true, false, $3)
      RETURNING *
    `;
    await client.query(awardQuery, [userId, badgeId, skipReward]);

    // Get badge details
    const badge = await getBadgeById(badgeId);

    if (!badge) {
      await client.query('ROLLBACK');
      throw new Error(`Badge ${badgeId} not found`);
    }

    // Apply reward if not skipped
    if (!skipReward && badge.reward_type) {
      await applyBadgeReward(client, userId, badge);
    }

    await client.query('COMMIT');

    logger.info(`Badge "${badge.display_name}" awarded to user ${userId}`, {
      badgeId,
      userId,
      reward: badge.reward_type,
    });

    // Send notification (async, don't await)
    setImmediate(() => {
      sendBadgeNotification(userId, badge).catch((err) => {
        logger.error('Failed to send badge notification', { error: err.message });
      });
    });

    return { success: true, badge };
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('Failed to award badge', { userId, badgeId, error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Apply badge reward to user
 */
const applyBadgeReward = async (client: any, userId: string, badge: Badge): Promise<void> => {
  try {
    switch (badge.reward_type) {
      case 'premium_days':
        // Add premium days to user subscription
        const days = parseInt(badge.reward_value, 10);
        const updateQuery = `
          UPDATE users
          SET 
            subscription_tier = 'premium',
            subscription_expires_at = COALESCE(
              CASE 
                WHEN subscription_expires_at > NOW() THEN subscription_expires_at + INTERVAL '${days} days'
                ELSE NOW() + INTERVAL '${days} days'
              END,
              NOW() + INTERVAL '${days} days'
            )
          WHERE id = $1
          RETURNING subscription_expires_at
        `;
        const result = await client.query(updateQuery, [userId]);
        logger.info(`Granted ${days} days premium to user ${userId}`, {
          newExpiry: result.rows[0]?.subscription_expires_at,
        });
        break;

      case 'extra_swipes':
        // Add extra swipes to user account
        const swipes = parseInt(badge.reward_value, 10);
        const swipeQuery = `
          UPDATE users
          SET extra_swipes = COALESCE(extra_swipes, 0) + $1
          WHERE id = $2
        `;
        await client.query(swipeQuery, [swipes, userId]);
        logger.info(`Granted ${swipes} extra swipes to user ${userId}`);
        break;

      case 'status':
        // Grant special status badge
        const statusQuery = `
          UPDATE profiles
          SET special_status = $1
          WHERE user_id = $2
        `;
        await client.query(statusQuery, [badge.reward_value, userId]);
        logger.info(`Granted status "${badge.reward_value}" to user ${userId}`);
        break;

      case 'feature_unlock':
        // Unlock a premium feature
        const featureQuery = `
          UPDATE users
          SET unlocked_features = array_append(
            COALESCE(unlocked_features, ARRAY[]::text[]),
            $1
          )
          WHERE id = $2
        `;
        await client.query(featureQuery, [badge.reward_value, userId]);
        logger.info(`Unlocked feature "${badge.reward_value}" for user ${userId}`);
        break;

      default:
        logger.warn(`Unknown reward type: ${badge.reward_type}`);
    }
  } catch (error: any) {
    logger.error('Failed to apply badge reward', { userId, badge: badge.name, error: error.message });
    throw error;
  }
};

/**
 * Send badge earned notification
 */
const sendBadgeNotification = async (userId: string, badge: Badge): Promise<void> => {
  try {
    // Save to notification history
    const notificationQuery = `
      INSERT INTO badge_notifications (user_id, badge_id, notification_type, content)
      VALUES ($1, $2, 'badge_earned', $3)
    `;
    await pool.query(notificationQuery, [
      userId,
      badge.id,
      `Congratulations! You've earned the "${badge.display_name}" badge!`,
    ]);

    // Mark badge as notified
    await pool.query(
      `UPDATE user_badges SET notified = true WHERE user_id = $1 AND badge_id = $2`,
      [userId, badge.id]
    );

    // Get user email
    const userQuery = `SELECT email, first_name FROM users u LEFT JOIN profiles p ON u.id = p.user_id WHERE u.id = $1`;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length > 0) {
      const { email, first_name } = userResult.rows[0];

      // Queue email notification
      await addToQueue({
        userId,
        templateName: 'badge_earned',
        recipientEmail: email,
        variables: {
          userName: first_name || 'there',
          badgeName: badge.display_name,
          badgeDescription: badge.description,
          rewardType: badge.reward_type,
          rewardValue: badge.reward_value,
        },
      });

      logger.info(`Badge notification queued for user ${userId}`, { badgeName: badge.display_name });
    }
  } catch (error: any) {
    logger.error('Failed to send badge notification', { userId, error: error.message });
    // Don't throw - notification failure shouldn't prevent badge award
  }
};

/**
 * Get user's top badges (for profile display)
 */
export const getTopBadges = async (userId: string, limit = 3): Promise<BadgeWithProgress[]> => {
  try {
    const query = `
      SELECT 
        b.*,
        ub.earned_at,
        true as earned,
        CASE b.rarity
          WHEN 'legendary' THEN 5
          WHEN 'epic' THEN 4
          WHEN 'rare' THEN 3
          WHEN 'uncommon' THEN 2
          ELSE 1
        END as rarity_score
      FROM badges b
      INNER JOIN user_badges ub ON b.id = ub.badge_id
      WHERE ub.user_id = $1
        AND b.is_active = true
      ORDER BY rarity_score DESC, ub.earned_at ASC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  } catch (error: any) {
    logger.error('Failed to get top badges', { userId, error: error.message });
    throw error;
  }
};

/**
 * Get badge statistics
 */
export const getBadgeStats = async (): Promise<{
  totalBadges: number;
  totalEarned: number;
  mostEarned: { badge: string; count: number } | null;
  rarest: { badge: string; count: number } | null;
}> => {
  try {
    const totalBadgesQuery = `SELECT COUNT(*) as count FROM badges WHERE is_active = true`;
    const totalEarnedQuery = `SELECT COUNT(*) as count FROM user_badges`;
    const mostEarnedQuery = `
      SELECT b.display_name as badge, COUNT(*) as count
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      GROUP BY b.id, b.display_name
      ORDER BY count DESC
      LIMIT 1
    `;
    const rarestQuery = `
      SELECT b.display_name as badge, COUNT(*) as count
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      GROUP BY b.id, b.display_name
      ORDER BY count ASC
      LIMIT 1
    `;

    const [totalBadges, totalEarned, mostEarned, rarest] = await Promise.all([
      pool.query(totalBadgesQuery),
      pool.query(totalEarnedQuery),
      pool.query(mostEarnedQuery),
      pool.query(rarestQuery),
    ]);

    return {
      totalBadges: parseInt(totalBadges.rows[0].count, 10),
      totalEarned: parseInt(totalEarned.rows[0].count, 10),
      mostEarned: mostEarned.rows[0] || null,
      rarest: rarest.rows[0] || null,
    };
  } catch (error: any) {
    logger.error('Failed to get badge stats', { error: error.message });
    throw error;
  }
};

/**
 * Mark badge notifications as read
 */
export const markNotificationsRead = async (userId: string, badgeIds?: string[]): Promise<void> => {
  try {
    let query = `UPDATE badge_notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`;
    const params: any[] = [userId];

    if (badgeIds && badgeIds.length > 0) {
      query += ` AND badge_id = ANY($2)`;
      params.push(badgeIds);
    }

    await pool.query(query, params);
    logger.debug(`Marked badge notifications as read for user ${userId}`);
  } catch (error: any) {
    logger.error('Failed to mark notifications read', { userId, error: error.message });
    throw error;
  }
};

/**
 * Clear badge cache (call when badges are updated)
 */
export const clearBadgeCache = (): void => {
  badgeCache = null;
  cacheTimestamp = 0;
  logger.info('Badge cache cleared');
};

export default {
  getAllBadges,
  getBadgeByName,
  getBadgeById,
  getUserBadges,
  getUserBadgesWithDetails,
  hasEarnedBadge,
  awardBadge,
  getTopBadges,
  getBadgeStats,
  markNotificationsRead,
  clearBadgeCache,
};
