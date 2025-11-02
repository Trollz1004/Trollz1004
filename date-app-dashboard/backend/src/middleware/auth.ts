import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

export const isAuthenticated = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: Missing or invalid authorization header' });
  }

  const split = authorization.split('Bearer ');
  if (split.length !== 2) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token format' });
  }

  const token = split[1];

  try {
    const decodedToken: admin.auth.DecodedIdToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};
