import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import logger from '../utils/logger';

export const requireAgeVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.age_verified) {
    logger.warn('Age verification required', { userId: req.userId });
    return res.status(403).json({ 
      error: 'Age verification required',
      message: 'You must verify your age (18+) to access this feature'
    });
  }
  next();
};

export const verifyAgeMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  return requireAgeVerified(req, res, next);
};

export const requireStrictAgeCheck = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.age_verified) {
    return res.status(403).json({ 
      error: 'Strict age verification required',
      message: 'Premium features require ID verification'
    });
  }
  next();
};

export const calculateAge = (birthdate: Date): number => {
  return Math.floor((Date.now() - birthdate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
};

export const isAgeEligible = (birthdate: Date): boolean => {
  return calculateAge(birthdate) >= 18;
};
