import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { sendReferralRewardConfirmation } from '../email/emailTriggerService';

/**
 * Reward types
 */
export enum RewardType {
  FREE_PREMIUM = 'free_premium',
  BADGE = 'badge',
  EXTRA_SWIPES = 'extra_swipes',
}

/**
 * Configuration for referral rewards
 */
const REFERRAL_REWARD_DAYS = parseInt(process.env.REFERRAL_REWARD_DAYS || '30', 10);
const REFERRAL_MASTER_BADGE_THRESHOLD = parseInt(process.env.REFERRAL_MASTER_THRESHOLD || '5', 10);

/**
 * Award free premium subscription to a user
 * Creates a reward record and updates user's subscription status
 * 
 * @param userId - User ID to award premium to
 * @param durationDays - Number of days of free premium
 * @param reason - Reason for the reward (e.g., "referral_conversion")
 * @returns Reward details
 */
export const awardFreePremium = async (
  userId: string,
  durationDays: number = REFERRAL_REWARD_DAYS,
  reason: string = 'referral_conversion'
): Promise<{
  rewardId: string;
  expiresAt: Date;
  premiumUntil: Date;
}> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Calculate expiration dates
    const grantedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Check for existing unclaimed rewards to prevent duplicates
    const existingReward = await client.query(
      `SELECT id FROM user_rewards 
       WHERE user_id = $1 
         AND reward_type = $2 
         AND is_claimed = FALSE
         AND expires_at > NOW()
       LIMIT 1`,
      [userId, RewardType.FREE_PREMIUM]
    );

    if (existingReward.rows.length > 0) {
      logger.warn('User already has unclaimed premium reward', { userId });
      await client.query('COMMIT');

      return {
        rewardId: existingReward.rows[0].id,
        expiresAt,
        premiumUntil: expiresAt,
      };
    }

    // Create reward record
    const rewardResult = await client.query(
      `INSERT INTO user_rewards (
        user_id, 
        reward_type, 
        reward_value, 
        granted_at, 
        expires_at, 
        is_claimed
      )
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id`,
      [userId, RewardType.FREE_PREMIUM, `${durationDays}_days`, grantedAt, expiresAt]
    );

    const rewardId = rewardResult.rows[0].id;

    // Update referral record to mark reward as given
    await client.query(
      `UPDATE referrals 
       SET reward_given = TRUE, updated_at = NOW()
       WHERE referrer_id = $1 
         AND status = 'converted' 
         AND reward_given = FALSE`,
      [userId]
    );

    await client.query('COMMIT');

    logger.info('Free premium awarded', {
      userId,
      rewardId,
      durationDays,
      expiresAt,
      reason,
    });

    await logAutomation({
      service: 'referral',
      action: 'award_free_premium',
      status: 'success',
      details: {
        userId,
        rewardId,
        durationDays,
        expiresAt,
        reason,
      },
    });

    // Send email notification about referral reward
    try {
      await sendReferralRewardConfirmation(userId, durationDays);
    } catch (emailError: any) {
      // Log email error but don't fail the reward
      logger.warn('Failed to send referral reward email', {
        userId,
        rewardId,
        error: emailError.message,
      });
    }

    return {
      rewardId,
      expiresAt,
      premiumUntil: expiresAt,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    logger.error('Failed to award free premium', {
      error: error.message,
      userId,
      durationDays,
      reason,
    });

    await logAutomation({
      service: 'referral',
      action: 'award_free_premium',
      status: 'failed',
      details: { userId, durationDays, reason },
      errorMessage: error.message,
    });

    throw error;
  } finally {
    client.release();
  }
};

/**
 * Claim a reward (activate free premium subscription)
 * 
 * @param userId - User claiming the reward
 * @param rewardId - Reward ID to claim
 * @returns Updated subscription details
 */
export const claimReward = async (
  userId: string,
  rewardId: string
): Promise<{
  success: boolean;
  premiumExpiresAt: Date | null;
  rewardType: string;
}> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate reward belongs to user and is not claimed
    const rewardResult = await client.query(
      `SELECT id, reward_type, reward_value, expires_at, is_claimed
       FROM user_rewards
       WHERE id = $1 AND user_id = $2`,
      [rewardId, userId]
    );

    if (rewardResult.rows.length === 0) {
      throw new Error('Reward not found or does not belong to user');
    }

    const reward = rewardResult.rows[0];

    if (reward.is_claimed) {
      throw new Error('Reward has already been claimed');
    }

    if (reward.expires_at && new Date(reward.expires_at) < new Date()) {
      throw new Error('Reward has expired');
    }

    // Mark reward as claimed
    await client.query(
      `UPDATE user_rewards 
       SET is_claimed = TRUE 
       WHERE id = $1`,
      [rewardId]
    );

    let premiumExpiresAt: Date | null = null;

    // If reward is free premium, update user subscription
    if (reward.reward_type === RewardType.FREE_PREMIUM) {
      const daysMatch = reward.reward_value.match(/(\d+)_days/);
      const days = daysMatch ? parseInt(daysMatch[1], 10) : REFERRAL_REWARD_DAYS;

      // Get current subscription end date or start from now
      const currentSubResult = await client.query(
        `SELECT end_date FROM subscriptions 
         WHERE user_id = $1 AND status = 'active'
         ORDER BY end_date DESC LIMIT 1`,
        [userId]
      );

      const startDate =
        currentSubResult.rows.length > 0 && currentSubResult.rows[0].end_date
          ? new Date(currentSubResult.rows[0].end_date)
          : new Date();

      premiumExpiresAt = new Date(startDate);
      premiumExpiresAt.setDate(premiumExpiresAt.getDate() + days);

      // Create or extend subscription
      await client.query(
        `INSERT INTO subscriptions (user_id, tier, start_date, end_date, status)
         VALUES ($1, 'premium', NOW(), $2, 'active')
         ON CONFLICT (user_id) DO UPDATE 
         SET end_date = $2, updated_at = NOW()`,
        [userId, premiumExpiresAt]
      );

      // Update user tier
      await client.query(
        `UPDATE users SET subscription_tier = 'premium', updated_at = NOW() WHERE id = $1`,
        [userId]
      );
    }

    await client.query('COMMIT');

    logger.info('Reward claimed successfully', {
      userId,
      rewardId,
      rewardType: reward.reward_type,
      premiumExpiresAt,
    });

    await logAutomation({
      service: 'referral',
      action: 'claim_reward',
      status: 'success',
      details: {
        userId,
        rewardId,
        rewardType: reward.reward_type,
        premiumExpiresAt,
      },
    });

    return {
      success: true,
      premiumExpiresAt,
      rewardType: reward.reward_type,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    logger.error('Failed to claim reward', {
      error: error.message,
      userId,
      rewardId,
    });

    await logAutomation({
      service: 'referral',
      action: 'claim_reward',
      status: 'failed',
      details: { userId, rewardId },
      errorMessage: error.message,
    });

    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check and award referral badges based on user's referral count
 * Should be run daily via cron job
 * 
 * @param userId - User ID to check badges for
 * @returns Array of newly awarded badges
 */
export const checkAndAwardBadges = async (
  userId: string
): Promise<Array<{ badgeType: string; awardedAt: Date }>> => {
  try {
    // Get user's converted referral count
    const referralCountResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM referrals
       WHERE referrer_id = $1 AND status = 'converted'`,
      [userId]
    );

    const referralCount = parseInt(referralCountResult.rows[0].count, 10);
    const awardedBadges: Array<{ badgeType: string; awardedAt: Date }> = [];

    // Award "Referral Master" badge if threshold reached
    if (referralCount >= REFERRAL_MASTER_BADGE_THRESHOLD) {
      // Check if badge already awarded
      const existingBadge = await pool.query(
        `SELECT id FROM user_rewards
         WHERE user_id = $1 AND reward_type = $2 AND reward_value = 'referral_master'`,
        [userId, RewardType.BADGE]
      );

      if (existingBadge.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO user_rewards (user_id, reward_type, reward_value, granted_at, is_claimed)
           VALUES ($1, $2, 'referral_master', NOW(), TRUE)
           RETURNING granted_at`,
          [userId, RewardType.BADGE]
        );

        awardedBadges.push({
          badgeType: 'referral_master',
          awardedAt: result.rows[0].granted_at,
        });

        logger.info('Referral Master badge awarded', { userId, referralCount });
      }
    }

    if (awardedBadges.length > 0) {
      await logAutomation({
        service: 'referral',
        action: 'award_badges',
        status: 'success',
        details: { userId, referralCount, awardedBadges },
      });
    }

    return awardedBadges;
  } catch (error: any) {
    logger.error('Failed to check and award badges', {
      error: error.message,
      userId,
    });

    await logAutomation({
      service: 'referral',
      action: 'award_badges',
      status: 'failed',
      details: { userId },
      errorMessage: error.message,
    });

    throw error;
  }
};

/**
 * Get all unclaimed rewards for a user
 * 
 * @param userId - User ID to get rewards for
 * @returns Array of unclaimed rewards
 */
export const getUnclaimedRewards = async (
  userId: string
): Promise<
  Array<{
    id: string;
    rewardType: string;
    rewardValue: string;
    grantedAt: Date;
    expiresAt: Date | null;
  }>
> => {
  try {
    const result = await pool.query(
      `SELECT id, reward_type, reward_value, granted_at, expires_at
       FROM user_rewards
       WHERE user_id = $1 
         AND is_claimed = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY granted_at DESC`,
      [userId]
    );

    return result.rows.map((row: {
      id: string;
      reward_type: string;
      reward_value: string;
      granted_at: Date;
      expires_at: Date | null;
    }) => ({
      id: row.id,
      rewardType: row.reward_type,
      rewardValue: row.reward_value,
      grantedAt: row.granted_at,
      expiresAt: row.expires_at,
    }));
  } catch (error: any) {
    logger.error('Failed to get unclaimed rewards', {
      error: error.message,
      userId,
    });
    throw error;
  }
};
