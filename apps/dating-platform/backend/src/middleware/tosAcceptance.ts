import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

export const requireTosAccepted = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.tos_accepted) {
    logger.warn('TOS acceptance required', { userId: req.userId });
    return res.status(403).json({ 
      error: 'Terms of Service acceptance required',
      message: 'You must accept the Terms of Service to access dating features'
    });
  }
  next();
};
