import { Router } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import * as admin from 'firebase-admin';
import logger from '../logger';

const router = Router();

// Helper function to log activity
export const logActivity = async (userId: string, type: string, description: string, metadata?: any) => {
  try {
    const db = admin.firestore();
    await db.collection('activities').add({
      userId,
      type,
      description,
      metadata: metadata || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error('Error logging activity:', error);
  }
};

// Get user's activity feed
router.get('/feed', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { uid } = req.user!;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const db = admin.firestore();
    const activitiesSnapshot = await db.collection('activities')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const activities = activitiesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
    }));

    res.json(activities);
  } catch (error) {
    logger.error('Error fetching activity feed:', error);
    res.status(500).json({ message: 'Error fetching activity feed' });
  }
});

// Get global activity feed (for admins or public feed)
router.get('/global', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const db = admin.firestore();
    const activitiesSnapshot = await db.collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    // Get user details for each activity
    const userIds = [...new Set(activitiesSnapshot.docs.map(doc => doc.data().userId))];
    const usersSnapshot = await Promise.all(
      userIds.map(uid => db.collection('users').doc(uid).get())
    );
    
    const usersMap = new Map();
    usersSnapshot.forEach(userDoc => {
      if (userDoc.exists) {
        usersMap.set(userDoc.id, userDoc.data());
      }
    });

    const activities = activitiesSnapshot.docs.map(doc => {
      const data = doc.data();
      const user = usersMap.get(data.userId);
      return {
        id: doc.id,
        ...data,
        user: user ? {
          displayName: user.displayName,
          avatar: user.avatar,
        } : null,
        createdAt: data.createdAt?.toDate().toISOString(),
      };
    });

    res.json(activities);
  } catch (error) {
    logger.error('Error fetching global activity feed:', error);
    res.status(500).json({ message: 'Error fetching global activity feed' });
  }
});

export const activityRouter = router;
