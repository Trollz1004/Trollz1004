import { Router } from 'express';
import * as admin from 'firebase-admin';
import { isAuthenticated } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import logger from '../logger';

const router = Router();

router.use(isAuthenticated, isAdmin);

router.get('/stats', async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const productsSnapshot = await admin.firestore().collection('products').get();
    const fundraisersSnapshot = await admin.firestore().collection('fundraisers').get();

    res.json({
      users: usersSnapshot.size,
      products: productsSnapshot.size,
      fundraisers: fundraisersSnapshot.size,
    });
  } catch (error) {
    logger.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Error fetching admin stats' });
  }
});

export const adminRouter = router;
