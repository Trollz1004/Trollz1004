import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import experimentService from '../automations/experiments/experimentService';
import logger from '../logger';

const router = Router();

/**
 * POST /api/experiments
 * Create new A/B test experiment (Admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional().isString(),
    body('variants').isArray({ min: 2 }).withMessage('At least 2 variants required'),
    body('variants.*.name').notEmpty(),
    body('variants.*.weight').isInt({ min: 0, max: 100 }),
    body('variants.*.config').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, description, variants } = req.body;

      const result = await experimentService.createExperiment(name, description, variants);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Experiment created successfully',
          experiment: result.experiment,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to create experiment',
        });
      }
    } catch (error: any) {
      logger.error('Error creating experiment', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/experiments
 * Get all experiments (Admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status } = req.query;

      const result = await experimentService.getAllExperiments(status as string);

      if (result.success) {
        res.json({
          success: true,
          experiments: result.experiments,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || 'Failed to fetch experiments',
        });
      }
    } catch (error: any) {
      logger.error('Error fetching experiments', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/experiments/:id
 * Get experiment results (Admin only)
 */
router.get(
  '/:id',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await experimentService.getExperimentResults(id);

      if (result.success) {
        res.json({
          success: true,
          results: result.results,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || 'Experiment not found',
        });
      }
    } catch (error: any) {
      logger.error('Error fetching experiment results', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/experiments/:id/start
 * Start an experiment (Admin only)
 */
router.post(
  '/:id/start',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await experimentService.startExperiment(id);

      if (result.success) {
        res.json({
          success: true,
          message: 'Experiment started successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to start experiment',
        });
      }
    } catch (error: any) {
      logger.error('Error starting experiment', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/experiments/:id/end
 * End an experiment (Admin only)
 */
router.post(
  '/:id/end',
  authenticate,
  requireAdmin,
  [body('winningVariantId').optional().isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { winningVariantId } = req.body;

      const result = await experimentService.endExperiment(id, winningVariantId);

      if (result.success) {
        res.json({
          success: true,
          message: 'Experiment ended successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to end experiment',
        });
      }
    } catch (error: any) {
      logger.error('Error ending experiment', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/experiments/:id/assign
 * Assign user to experiment variant (or get existing assignment)
 */
router.post(
  '/:id/assign',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const result = await experimentService.assignVariant(userId, id);

      if (result.success) {
        res.json({
          success: true,
          variant: result.variant,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to assign variant',
        });
      }
    } catch (error: any) {
      logger.error('Error assigning variant', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/experiments/:id/variant
 * Get user's variant for experiment
 */
router.get(
  '/:id/variant',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const result = await experimentService.getUserVariant(userId, id);

      if (result.success) {
        res.json({
          success: true,
          variant: result.variant,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || 'Variant not found',
        });
      }
    } catch (error: any) {
      logger.error('Error getting user variant', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/experiments/:id/track
 * Track experiment event
 */
router.post(
  '/:id/track',
  authenticate,
  [
    body('eventType').notEmpty().withMessage('Event type is required'),
    body('value').optional().isNumeric(),
    body('metadata').optional().isObject(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const { eventType, value, metadata } = req.body;

      const result = await experimentService.trackEvent(
        userId,
        id,
        eventType,
        value,
        metadata
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Event tracked successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || 'Failed to track event',
        });
      }
    } catch (error: any) {
      logger.error('Error tracking experiment event', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;
