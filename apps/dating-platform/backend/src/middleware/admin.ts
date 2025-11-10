import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import * as admin from 'firebase-admin';

export const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { uid } = req.user!;

  try {
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userDoc.data()!;

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking admin role' });
  }
};
