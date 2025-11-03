import pool from '../../database';
import logger from '../../logger';
import { logAutomation } from '../utils/automationLogger';
import { getReferralCodeDetails } from './referralCodeGenerator';

/**
 * Referral status enum
 */
export enum ReferralStatus {
  PENDING = 'pending',
  CONVERTED = 'converted',
  FAILED = 'failed',
}

/**
 * Track a new referral when a user signs up with a referral code
 * Creates a referral record linking referrer and referred user
 * 
 * @param referredUserId - ID of the user who signed up
 * @param referralCode - The referral code used during signup
 * @returns Referral record with referrer information
 * @throws Error if referral code is invalid or referral already exists
 */
export const trackReferral = async (
  referredUserId: string,
  referralCode: string
): Promise<{
  id: string;
  referrerId: string;
  referrerName: string;
  status: string;
}> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validate and get referral code details
    const codeDetails = await getReferralCodeDetails(referralCode);

    if (!codeDetails) {
      throw new Error('Invalid referral code');
    }

    if (!codeDetails.isActive) {
      throw new Error('Referral code is no longer active');
    }

    if (codeDetails.expiresAt && new Date(codeDetails.expiresAt) < new Date()) {
      throw new Error('Referral code has expired');
    }

    // Prevent self-referral
    if (codeDetails.userId === referredUserId) {
      throw new Error('Cannot use your own referral code');
    }

    // Check if referral already exists (idempotency)
    const existingReferral = await client.query(
      `SELECT id FROM referrals 
       WHERE referrer_id = $1 AND referred_user_id = $2`,
      [codeDetails.userId, referredUserId]
    );

    if (existingReferral.rows.length > 0) {
      logger.warn('Referral already tracked', {
        referrerId: codeDetails.userId,
        referredUserId,
        referralCode,
      });

      await client.query('COMMIT');

      // Return existing referral
      return {
        id: existingReferral.rows[0].id,
        referrerId: codeDetails.userId,
        referrerName: 'Existing referral',
        status: ReferralStatus.PENDING,
      };
    }

    // Get referrer name for response
    const referrerResult = await client.query(
      `SELECT email FROM users WHERE id = $1`,
      [codeDetails.userId]
    );

    const referrerEmail = referrerResult.rows[0]?.email || 'Unknown';

    // Create referral record
    const referralResult = await client.query(
      `INSERT INTO referrals (
        referrer_id, 
        referred_user_id, 
        referral_code_used, 
        status, 
        referred_signup_date
      )
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [codeDetails.userId, referredUserId, referralCode.toUpperCase(), ReferralStatus.PENDING]
    );

    const referralId = referralResult.rows[0].id;

    await client.query('COMMIT');

    logger.info('Referral tracked successfully', {
      referralId,
      referrerId: codeDetails.userId,
      referredUserId,
      referralCode,
    });

    await logAutomation({
      service: 'referral',
      action: 'track_referral',
      status: 'success',
      details: {
        referralId,
        referrerId: codeDetails.userId,
        referredUserId,
        referralCode,
      },
    });

    return {
      id: referralId,
      referrerId: codeDetails.userId,
      referrerName: referrerEmail.split('@')[0],
      status: ReferralStatus.PENDING,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    logger.error('Failed to track referral', {
      error: error.message,
      referredUserId,
      referralCode,
    });

    await logAutomation({
      service: 'referral',
      action: 'track_referral',
      status: 'failed',
      details: { referredUserId, referralCode },
      errorMessage: error.message,
    });

    throw error;
  } finally {
    client.release();
  }
};

/**
 * Process referral conversion when referred user subscribes to premium
 * Marks referral as converted and triggers reward processing
 * 
 * @param referredUserId - ID of the user who just subscribed
 * @returns Processed referral details
 */
export const processReferralConversion = async (
  referredUserId: string
): Promise<{
  referralId: string;
  referrerId: string;
  rewardTriggered: boolean;
} | null> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find pending referral for this user
    const referralResult = await client.query(
      `SELECT id, referrer_id, status 
       FROM referrals 
       WHERE referred_user_id = $1 AND status = $2
       LIMIT 1`,
      [referredUserId, ReferralStatus.PENDING]
    );

    if (referralResult.rows.length === 0) {
      logger.info('No pending referral found for user', { referredUserId });
      await client.query('COMMIT');
      return null;
    }

    const referral = referralResult.rows[0];

    // Update referral status to converted
    await client.query(
      `UPDATE referrals 
       SET status = $1, 
           converted_to_premium_date = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [ReferralStatus.CONVERTED, referral.id]
    );

    await client.query('COMMIT');

    logger.info('Referral conversion processed', {
      referralId: referral.id,
      referrerId: referral.referrer_id,
      referredUserId,
    });

    await logAutomation({
      service: 'referral',
      action: 'process_conversion',
      status: 'success',
      details: {
        referralId: referral.id,
        referrerId: referral.referrer_id,
        referredUserId,
      },
    });

    return {
      referralId: referral.id,
      referrerId: referral.referrer_id,
      rewardTriggered: true,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    logger.error('Failed to process referral conversion', {
      error: error.message,
      referredUserId,
    });

    await logAutomation({
      service: 'referral',
      action: 'process_conversion',
      status: 'failed',
      details: { referredUserId },
      errorMessage: error.message,
    });

    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get referral statistics for a specific user
 * 
 * @param userId - ID of the user to get stats for
 * @returns Referral statistics object
 */
export const getUserReferralStats = async (
  userId: string
): Promise<{
  totalReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalRewardsEarned: number;
}> => {
  try {
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
       FROM referrals
       WHERE referrer_id = $1`,
      [userId]
    );

    const stats = statsResult.rows[0];
    const totalReferrals = parseInt(stats.total, 10);
    const pendingReferrals = parseInt(stats.pending, 10);
    const convertedReferrals = parseInt(stats.converted, 10);

    const conversionRate = totalReferrals > 0 ? (convertedReferrals / totalReferrals) * 100 : 0;

    // Get total rewards earned
    const rewardsResult = await pool.query(
      `SELECT COUNT(*) as reward_count
       FROM user_rewards
       WHERE user_id = $1 AND reward_type = 'free_premium'`,
      [userId]
    );

    const totalRewardsEarned = parseInt(rewardsResult.rows[0].reward_count, 10);

    return {
      totalReferrals,
      pendingReferrals,
      convertedReferrals,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      totalRewardsEarned,
    };
  } catch (error: any) {
    logger.error('Failed to get user referral stats', {
      error: error.message,
      userId,
    });
    throw error;
  }
};
