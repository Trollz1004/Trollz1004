import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import contestService from '../automations/contests/contestService';
import logger from '../logger';

const router = Router();

/**
 * POST /api/contests
 * Create new referral contest (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional().isString(),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    body('prizes.tier1').notEmpty(),
    body('prizes.tier2').notEmpty(),
    body('prizes.tier3').notEmpty(),
    body('prizes.minReferrals1').isInt({ min: 1 }),
    body('prizes.minReferrals2').isInt({ min: 1 }),
    body('prizes.minReferrals3').isInt({ min: 1 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, startDate, endDate, prizes } = req.body;

      const result = await contestService.createContest(
        name,
        description,
        new Date(startDate),
        new Date(endDate),
        prizes
      );

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Contest created successfully',
          contest: result.contest,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to create contest',
        });
      }
    } catch (error: any) {
      logger.error('Error creating contest', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/contests
 * Get all contests (Admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;

      const result = await contestService.getAllContests(status as string);

      if (result.success) {
        res.json({
          success: true,
          contests: result.contests,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to fetch contests',
        });
      }
    } catch (error: any) {
      logger.error('Error fetching contests', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/contests/active
 * Get active contests (all users)
 */
router.get(
  '/active',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const result = await contestService.getActiveContests();

      if (result.success) {
        res.json({
          success: true,
          contests: result.contests,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to fetch active contests',
        });
      }
    } catch (error: any) {
      logger.error('Error fetching active contests', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/contests/:id/leaderboard
 * Get contest leaderboard
 */
router.get(
  '/:id/leaderboard',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      const result = await contestService.getContestLeaderboard(id, parseInt(limit as string));

      if (result.success) {
        res.json({
          success: true,
          leaderboard: result.leaderboard,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || 'Contest not found',
        });
      }
    } catch (error: any) {
      logger.error('Error fetching contest leaderboard', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/contests/:id/my-stats
 * Get user's contest stats
 */
router.get(
  '/:id/my-stats',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const result = await contestService.getUserContestStats(userId, id);

      if (result.success) {
        res.json({
          success: true,
          stats: result.stats,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to fetch stats',
        });
      }
    } catch (error: any) {
      logger.error('Error fetching user contest stats', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/contests/:id/start
 * Start a contest (Admin only)
 */
router.post(
  '/:id/start',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await contestService.startContest(id);

      if (result.success) {
        res.json({
          success: true,
          message: 'Contest started successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to start contest',
        });
      }
    } catch (error: any) {
      logger.error('Error starting contest', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/contests/:id/end
 * End contest and award prizes (Admin only)
 */
router.post(
  '/:id/end',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await contestService.endContestAndAwardPrizes(id);

      if (result.success) {
        res.json({
          success: true,
          message: 'Contest ended and prizes awarded',
          winners: result.winners,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to end contest',
        });
      }
    } catch (error: any) {
      logger.error('Error ending contest', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;
