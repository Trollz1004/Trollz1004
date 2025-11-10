import { Request, Response, NextFunction } from 'express';
import pool from '../database';
import logger from '../logger';
import { verifyAccessToken } from '../utils/token';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
  sessionId?: string;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const decoded = verifyAccessToken(token);

    const sessionResult = await pool.query(
      'SELECT user_id, revoked, expires_at FROM refresh_tokens WHERE id = $1',
      [decoded.sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ message: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    if (session.revoked || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ message: 'Session expired' });
    }

    if (session.user_id !== decoded.sub) {
      return res.status(401).json({ message: 'Token mismatch' });
    }

    const userResult = await pool.query(
      `SELECT id, email, email_verified, phone_verified, age_verified, tos_accepted_at,
              subscription_tier, failed_login_attempts, locked_until, last_login_at,
              last_login_ip, last_login_user_agent, created_at, updated_at
       FROM users WHERE id = $1`,
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.userId = decoded.sub;
    req.sessionId = decoded.sessionId;
    req.user = userResult.rows[0];
    next();
  } catch (error: any) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(401).json({ message: 'Invalid token' });
  }
};
