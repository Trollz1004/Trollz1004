/**
 * Badge API Routes
 * RESTful endpoints for badge and gamification features
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import badgeService from '../automations/badges/badgeService';
import badgeProgressService from '../automations/badges/badgeProgressService';
import leaderboardService from '../automations/badges/leaderboardService';
import streakService from '../automations/badges/streakService';
import logger from '../logger';

const router = Router();

/**
 * GET /api/badges
 * Get all available badges with user's progress
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get all badges
    const allBadges = await badgeService.getAllBadges();

    // Get user's earned badges
    const userBadges = await badgeService.getUserBadges(userId);
    const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));

    // Get user's progress
    const progress = await badgeProgressService.getUserBadgeProgress(userId);
    const progressMap = new Map(progress.map((p) => [p.badge_id, p]));

    // Combine data
    const badgesWithProgress = allBadges.map((badge) => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      earned_at: userBadges.find((ub) => ub.badge_id === badge.id)?.earned_at,
      progress: progressMap.get(badge.id)?.percentage || 0,
      current_count: progressMap.get(badge.id)?.current_count || 0,
    }));

    res.json({
      success: true,
      badges: badgesWithProgress,
      total: allBadges.length,
      earned: userBadges.length,
    });
  } catch (error: any) {
    logger.error('GET /api/badges failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

/**
 * GET /api/badges/user/:userId
 * Get specific user's badges (public)
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userBadges = await badgeService.getUserBadgesWithDetails(userId);
    const topBadges = await badgeService.getTopBadges(userId, 3);

    res.json({
      success: true,
      userId,
      badges: userBadges,
      badgeCount: userBadges.length,
      topBadges,
    });
  } catch (error: any) {
    logger.error('GET /api/badges/user/:userId failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch user badges' });
  }
});

/**
 * POST /api/badges/award
 * Manually award badge (admin only)
 */
router.post('/award', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({ success: false, error: 'userId and badgeId required' });
    }

    const result = await badgeService.awardBadge(userId, badgeId);

    if (result.alreadyEarned) {
      return res.status(400).json({ success: false, error: 'Badge already earned' });
    }

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      badge: result.badge,
    });
  } catch (error: any) {
    logger.error('POST /api/badges/award failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to award badge' });
  }
});

/**
 * GET /api/badges/progress/:badgeId
 * Get logged-in user's progress for specific badge
 */
router.get('/progress/:badgeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { badgeId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const progress = await badgeProgressService.getBadgeProgress(userId, badgeId);
    const badge = await badgeService.getBadgeById(badgeId);

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Progress not found' });
    }

    const remaining = progress.milestone - progress.current_count;

    res.json({
      success: true,
      badgeId,
      badgeName: badge?.display_name,
      currentCount: progress.current_count,
      milestone: progress.milestone,
      percentage: progress.percentage,
      remaining,
      estimatedTimeToNext: remaining > 0 ? `${remaining} more needed` : 'Complete!',
    });
  } catch (error: any) {
    logger.error('GET /api/badges/progress/:badgeId failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

/**
 * GET /api/badges/leaderboards
 * Get all leaderboards
 */
router.get('/leaderboards', async (req: Request, res: Response) => {
  try {
    const { type, limit = '10' } = req.query;

    if (type && typeof type === 'string') {
      // Get specific leaderboard
      const leaderboard = await leaderboardService.getLeaderboard(
        type as any,
        parseInt(limit as string, 10)
      );

      return res.json({
        success: true,
        type,
        leaderboard,
      });
    }

    // Get all leaderboards
    const [weeklyMatches, weeklyReferrals, allTimeBadges, monthlyNew] = await Promise.all([
      leaderboardService.getLeaderboard('weekly_matches', 10),
      leaderboardService.getLeaderboard('weekly_referrals', 10),
      leaderboardService.getLeaderboard('all_time_badges', 10),
      leaderboardService.getLeaderboard('monthly_new_users', 10),
    ]);

    res.json({
      success: true,
      leaderboards: {
        weeklyMatches,
        weeklyReferrals,
        allTimeBadges,
        monthlyNew,
      },
    });
  } catch (error: any) {
    logger.error('GET /api/badges/leaderboards failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboards' });
  }
});

/**
 * GET /api/badges/leaderboards/user/:userId
 * Get user's rank in all leaderboards
 */
router.get('/leaderboards/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const ranks = await leaderboardService.getUserAllRanks(userId);

    res.json({
      success: true,
      userId,
      ranks,
    });
  } catch (error: any) {
    logger.error('GET /api/badges/leaderboards/user/:userId failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch user ranks' });
  }
});

/**
 * POST /api/badges/notify
 * Manually trigger badge earned notification (admin)
 */
router.post('/notify', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({ success: false, error: 'userId and badgeId required' });
    }

    const badge = await badgeService.getBadgeById(badgeId);

    if (!badge) {
      return res.status(404).json({ success: false, error: 'Badge not found' });
    }

    // TODO: Send notification logic here
    // For now, just mark as sent

    await badgeService.markNotificationsRead(userId, [badgeId]);

    res.json({
      success: true,
      message: 'Notification triggered',
      badge: badge.display_name,
    });
  } catch (error: any) {
    logger.error('POST /api/badges/notify failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to send notification' });
  }
});

/**
 * GET /api/badges/stats
 * Badge analytics
 */
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const badgeStats = await badgeService.getBadgeStats();
    const leaderboardStats = await leaderboardService.getLeaderboardStats();

    res.json({
      success: true,
      stats: {
        badges: badgeStats,
        leaderboards: leaderboardStats,
      },
    });
  } catch (error: any) {
    logger.error('GET /api/badges/stats failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/badges/share
 * Generate shareable badge link
 */
router.post('/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { badgeId } = req.body;

    if (!userId || !badgeId) {
      return res.status(400).json({ success: false, error: 'badgeId required' });
    }

    // Check if user has earned this badge
    const hasEarned = await badgeService.hasEarnedBadge(userId, badgeId);

    if (!hasEarned) {
      return res.status(403).json({ success: false, error: 'You have not earned this badge' });
    }

    const badge = await badgeService.getBadgeById(badgeId);

    if (!badge) {
      return res.status(404).json({ success: false, error: 'Badge not found' });
    }

    const shareUrl = `${process.env.APP_URL || 'https://trollz1004.com'}/badge/${badgeId}?user=${userId}`;

    res.json({
      success: true,
      shareUrl,
      badge: {
        name: badge.display_name,
        description: badge.description,
        icon: badge.icon_url,
      },
    });
  } catch (error: any) {
    logger.error('POST /api/badges/share failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to generate share link' });
  }
});

/**
 * GET /api/badges/streak
 * Get user's current streak
 */
router.get('/streak', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const streak = await streakService.getUserStreak(userId);

    res.json({
      success: true,
      streak: streak || {
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
      },
    });
  } catch (error: any) {
    logger.error('GET /api/badges/streak failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch streak' });
  }
});

/**
 * POST /api/badges/streak/freeze
 * Freeze user's streak (premium feature)
 */
router.post('/streak/freeze', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { days = 1 } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // TODO: Check if user has premium or freeze credits

    await streakService.freezeStreak(userId, days);

    res.json({
      success: true,
      message: `Streak frozen for ${days} day(s)`,
    });
  } catch (error: any) {
    logger.error('POST /api/badges/streak/freeze failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to freeze streak' });
  }
});

/**
 * GET /api/badges/streaks/leaderboard
 * Get top streaks leaderboard
 */
router.get('/streaks/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;

    const topStreaks = await streakService.getTopStreaks(parseInt(limit as string, 10));

    res.json({
      success: true,
      leaderboard: topStreaks,
    });
  } catch (error: any) {
    logger.error('GET /api/badges/streaks/leaderboard failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch streak leaderboard' });
  }
});

export default router;
