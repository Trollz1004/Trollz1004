import { Request, Response, NextFunction } from 'express';
import featureGateService from '../automations/premium/featureGateService';
import logger from '../logger';

/**
 * Middleware to require a specific premium feature
 * Use this to protect routes that require premium access
 * 
 * @param featureKey - The feature key to check (e.g., 'unlimited_likes', 'see_who_liked_you')
 * @returns Express middleware function
 * 
 * @example
 * router.get('/premium-only', authenticate, requireFeature('unlimited_likes'), handler);
 */
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check feature access
      const accessCheck = await featureGateService.hasFeatureAccess(userId, featureKey);

      if (!accessCheck.success) {
        logger.error('Feature access check failed', {
          userId,
          featureKey,
          error: accessCheck.error,
        });
        return res.status(500).json({
          success: false,
          message: 'Failed to verify feature access',
        });
      }

      if (!accessCheck.hasAccess) {
        logger.warn('Feature access denied', { userId, featureKey });
        return res.status(403).json({
          success: false,
          message: 'This feature requires a premium subscription',
          feature: featureKey,
          upgrade_required: true,
        });
      }

      // Track feature usage
      await featureGateService.trackFeatureUsage(userId, featureKey);

      // User has access, proceed
      next();
    } catch (error: any) {
      logger.error('Error in requireFeature middleware', {
        featureKey,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Middleware to check feature access without blocking
 * Adds feature access info to request object
 * 
 * @param featureKey - The feature key to check
 * @returns Express middleware function
 * 
 * @example
 * router.get('/profile', authenticate, checkFeature('incognito_mode'), handler);
 * // In handler: const hasIncognito = (req as any).featureAccess['incognito_mode'];
 */
export const checkFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        (req as any).featureAccess = { [featureKey]: false };
        return next();
      }

      const accessCheck = await featureGateService.hasFeatureAccess(userId, featureKey);

      // Store access result in request object
      if (!req.hasOwnProperty('featureAccess')) {
        (req as any).featureAccess = {};
      }

      (req as any).featureAccess[featureKey] = accessCheck.hasAccess || false;

      next();
    } catch (error: any) {
      logger.error('Error in checkFeature middleware', {
        featureKey,
        error: error.message,
      });
      (req as any).featureAccess = { [featureKey]: false };
      next();
    }
  };
};

/**
 * Middleware to check multiple features at once
 * 
 * @param featureKeys - Array of feature keys to check
 * @returns Express middleware function
 * 
 * @example
 * router.get('/advanced', authenticate, checkFeatures(['advanced_filters', 'read_receipts']), handler);
 */
export const checkFeatures = (featureKeys: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!req.hasOwnProperty('featureAccess')) {
        (req as any).featureAccess = {};
      }

      if (!userId) {
        for (const key of featureKeys) {
          (req as any).featureAccess[key] = false;
        }
        return next();
      }

      // Check all features in parallel
      const checks = await Promise.all(
        featureKeys.map((key) => featureGateService.hasFeatureAccess(userId, key))
      );

      // Store results
      featureKeys.forEach((key, index) => {
        (req as any).featureAccess[key] = checks[index].hasAccess || false;
      });

      next();
    } catch (error: any) {
      logger.error('Error in checkFeatures middleware', {
        featureKeys,
        error: error.message,
      });
      for (const key of featureKeys) {
        (req as any).featureAccess[key] = false;
      }
      next();
    }
  };
};

/**
 * Middleware to require any of the specified features (OR logic)
 * 
 * @param featureKeys - Array of feature keys (user needs at least one)
 * @returns Express middleware function
 * 
 * @example
 * router.get('/special', authenticate, requireAnyFeature(['premium', 'elite']), handler);
 */
export const requireAnyFeature = (featureKeys: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check all features
      const checks = await Promise.all(
        featureKeys.map((key) => featureGateService.hasFeatureAccess(userId, key))
      );

      // Check if user has access to any feature
      const hasAnyAccess = checks.some((check) => check.hasAccess);

      if (!hasAnyAccess) {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a premium subscription',
          required_features: featureKeys,
          upgrade_required: true,
        });
      }

      next();
    } catch (error: any) {
      logger.error('Error in requireAnyFeature middleware', {
        featureKeys,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Middleware to require all specified features (AND logic)
 * 
 * @param featureKeys - Array of feature keys (user needs all)
 * @returns Express middleware function
 * 
 * @example
 * router.get('/ultra-premium', authenticate, requireAllFeatures(['boost', 'incognito_mode']), handler);
 */
export const requireAllFeatures = (featureKeys: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Check all features
      const checks = await Promise.all(
        featureKeys.map((key) => featureGateService.hasFeatureAccess(userId, key))
      );

      // Check if user has access to all features
      const hasAllAccess = checks.every((check) => check.hasAccess);

      if (!hasAllAccess) {
        // Find which features are missing
        const missingFeatures = featureKeys.filter((key, index) => !checks[index].hasAccess);

        return res.status(403).json({
          success: false,
          message: 'This feature requires additional premium features',
          required_features: featureKeys,
          missing_features: missingFeatures,
          upgrade_required: true,
        });
      }

      next();
    } catch (error: any) {
      logger.error('Error in requireAllFeatures middleware', {
        featureKeys,
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

export default {
  requireFeature,
  checkFeature,
  checkFeatures,
  requireAnyFeature,
  requireAllFeatures,
};
