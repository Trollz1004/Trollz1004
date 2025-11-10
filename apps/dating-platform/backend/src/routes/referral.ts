import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import logger from '../logger';
import {
  generateReferralCode,
  getReferralCodeDetails,
} from '../automations/referral/referralCodeGenerator';
import {
  trackReferral,
  processReferralConversion,
  getUserReferralStats,
} from '../automations/referral/referralProcessor';
import {
  claimReward,
  getUnclaimedRewards,
  checkAndAwardBadges,
} from '../automations/referral/referralRewards';
import {
  getReferralLeaderboard,
  getReferralAnalyticsSummary,
  getReferralTrends,
} from '../automations/referral/referralAnalytics';

export const referralRouter = Router();

/**
 * POST /api/referral/generate-code
 * Generate a new referral code for the authenticated user
 * 
 * Response:
 * {
 *   code: string,
 *   expiresAt: string,
 *   shareUrl: string
 * }
 */
referralRouter.post('/generate-code', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const result = await generateReferralCode(req.userId);

    res.json({
      code: result.code,
      expiresAt: result.expiresAt,
      shareUrl: result.shareUrl,
      message: 'Referral code generated successfully',
    });
  } catch (error: any) {
    logger.error('Generate referral code failed', {
      error: error.message,
      userId: req.userId,
    });
    res.status(500).json({ message: 'Failed to generate referral code' });
  }
});

/**
 * POST /api/referral/track
 * Track a referral when a new user signs up with a referral code
 * 
 * Body:
 * {
 *   referralCode: string
 * }
 * 
 * Response:
 * {
 *   status: string,
 *   referrerName: string,
 *   referrerId: string
 * }
 */
referralRouter.post('/track', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { referralCode } = req.body;

  if (!referralCode || typeof referralCode !== 'string') {
    return res.status(400).json({ message: 'Referral code is required' });
  }

  try {
    const result = await trackReferral(req.userId, referralCode);

    res.json({
      status: 'tracked',
      referrerName: result.referrerName,
      referrerId: result.referrerId,
      message: 'Referral tracked successfully',
    });
  } catch (error: any) {
    logger.error('Track referral failed', {
      error: error.message,
      userId: req.userId,
      referralCode,
    });

    const statusCode = error.message.includes('Invalid') || error.message.includes('expired') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Failed to track referral' });
  }
});

/**
 * GET /api/referral/stats
 * Get referral statistics for the authenticated user
 * 
 * Response:
 * {
 *   totalReferrals: number,
 *   pendingReferrals: number,
 *   convertedReferrals: number,
 *   conversionRate: number,
 *   totalRewardsEarned: number,
 *   unclaimedRewards: array
 * }
 */
referralRouter.get('/stats', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const stats = await getUserReferralStats(req.userId);
    const unclaimedRewards = await getUnclaimedRewards(req.userId);

    // Check and award badges
    await checkAndAwardBadges(req.userId);

    res.json({
      ...stats,
      unclaimedRewards,
    });
  } catch (error: any) {
    logger.error('Get referral stats failed', {
      error: error.message,
      userId: req.userId,
    });
    res.status(500).json({ message: 'Failed to get referral stats' });
  }
});

/**
 * GET /api/referral/leaderboard
 * Get top referrers leaderboard
 * 
 * Query params:
 * - limit: number (default: 10)
 * - period: 'all' | 'week' | 'month' (default: 'all')
 * 
 * Response:
 * [
 *   {
 *     rank: number,
 *     name: string,
 *     totalReferrals: number,
 *     convertedReferrals: number,
 *     conversionRate: number
 *   }
 * ]
 */
referralRouter.get('/leaderboard', async (req: AuthRequest, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const period = (req.query.period as 'all' | 'week' | 'month') || 'all';

  if (limit < 1 || limit > 100) {
    return res.status(400).json({ message: 'Limit must be between 1 and 100' });
  }

  if (!['all', 'week', 'month'].includes(period)) {
    return res.status(400).json({ message: 'Period must be all, week, or month' });
  }

  try {
    const leaderboard = await getReferralLeaderboard(limit, period);

    res.json({
      leaderboard,
      period,
      limit,
    });
  } catch (error: any) {
    logger.error('Get leaderboard failed', {
      error: error.message,
      limit,
      period,
    });
    res.status(500).json({ message: 'Failed to get leaderboard' });
  }
});

/**
 * POST /api/referral/claim-reward
 * Claim a referral reward (activate free premium)
 * 
 * Body:
 * {
 *   rewardId: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   premiumExpiresAt: string,
 *   message: string
 * }
 */
referralRouter.post('/claim-reward', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { rewardId } = req.body;

  if (!rewardId || typeof rewardId !== 'string') {
    return res.status(400).json({ message: 'Reward ID is required' });
  }

  try {
    const result = await claimReward(req.userId, rewardId);

    res.json({
      success: result.success,
      premiumExpiresAt: result.premiumExpiresAt,
      rewardType: result.rewardType,
      message: 'Reward claimed successfully',
    });
  } catch (error: any) {
    logger.error('Claim reward failed', {
      error: error.message,
      userId: req.userId,
      rewardId,
    });

    const statusCode = error.message.includes('not found') || error.message.includes('claimed') || error.message.includes('expired') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Failed to claim reward' });
  }
});

/**
 * GET /api/referral/analytics
 * Get overall referral analytics summary (admin only)
 * 
 * Response:
 * {
 *   totalReferrals: number,
 *   convertedReferrals: number,
 *   pendingReferrals: number,
 *   conversionRate: number,
 *   totalRewardsGiven: number,
 *   estimatedRevenue: number
 * }
 */
referralRouter.get('/analytics', requireAuth, async (req: AuthRequest, res: Response) => {
  // TODO: Add admin check when admin system is implemented
  // if (!req.user?.role || req.user.role !== 'admin') {
  //   return res.status(403).json({ message: 'Admin access required' });
  // }

  try {
    const summary = await getReferralAnalyticsSummary();

    res.json(summary);
  } catch (error: any) {
    logger.error('Get referral analytics failed', {
      error: error.message,
    });
    res.status(500).json({ message: 'Failed to get analytics' });
  }
});

/**
 * GET /api/referral/trends
 * Get referral trend data over time
 * 
 * Query params:
 * - days: number (default: 30)
 * 
 * Response:
 * [
 *   {
 *     date: string,
 *     signups: number,
 *     conversions: number
 *   }
 * ]
 */
referralRouter.get('/trends', requireAuth, async (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string, 10) || 30;

  if (days < 1 || days > 365) {
    return res.status(400).json({ message: 'Days must be between 1 and 365' });
  }

  try {
    const trends = await getReferralTrends(days);

    res.json({
      trends,
      days,
    });
  } catch (error: any) {
    logger.error('Get referral trends failed', {
      error: error.message,
      days,
    });
    res.status(500).json({ message: 'Failed to get trends' });
  }
});

/**
 * POST /api/referral/convert
 * Internal endpoint to process referral conversion when user subscribes
 * Should be called when a user upgrades to premium
 * 
 * Body:
 * {
 *   userId: string
 * }
 * 
 * Response:
 * {
 *   processed: boolean,
 *   referralId?: string,
 *   referrerId?: string
 * }
 */
referralRouter.post('/convert', requireAuth, async (req: AuthRequest, res: Response) => {
  const { userId } = req.body;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    const result = await processReferralConversion(userId);

    if (!result) {
      return res.json({
        processed: false,
        message: 'No pending referral found',
      });
    }

    res.json({
      processed: true,
      referralId: result.referralId,
      referrerId: result.referrerId,
      message: 'Referral conversion processed successfully',
    });
  } catch (error: any) {
    logger.error('Process referral conversion failed', {
      error: error.message,
      userId,
    });
    res.status(500).json({ message: 'Failed to process conversion' });
  }
});
