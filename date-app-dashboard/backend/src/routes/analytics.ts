import { Router } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import * as admin from 'firebase-admin';
import logger from '../logger';

const router = Router();

router.get('/overview', isAuthenticated, isAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = admin.firestore();
    
    // Get user registration trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const usersSnapshot = await db.collection('users')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();
    
    // Group by date
    const usersByDate: { [key: string]: number } = {};
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.createdAt).toLocaleDateString();
      usersByDate[date] = (usersByDate[date] || 0) + 1;
    });

    // Get revenue data from orders
    const ordersSnapshot = await db.collection('orders')
      .where('createdAt', '>=', thirtyDaysAgo)
      .get();
    
    let totalRevenue = 0;
    const revenueByDate: { [key: string]: number } = {};
    
    ordersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = new Date(data.createdAt).toLocaleDateString();
      const amount = data.amount || 0;
      totalRevenue += amount;
      revenueByDate[date] = (revenueByDate[date] || 0) + amount;
    });

    // Get fundraiser stats
    const fundraisersSnapshot = await db.collection('fundraisers').get();
    let totalFundraisers = fundraisersSnapshot.size;
    let activeFundraisers = 0;
    let totalFundsRaised = 0;
    
    fundraisersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') activeFundraisers++;
      totalFundsRaised += data.raised || 0;
    });

    // Get product stats
    const productsSnapshot = await db.collection('products').get();
    const productsByCategory: { [key: string]: number } = {};
    
    productsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const category = data.category || 'Uncategorized';
      productsByCategory[category] = (productsByCategory[category] || 0) + 1;
    });

    res.json({
      userGrowth: usersByDate,
      revenue: {
        total: totalRevenue,
        byDate: revenueByDate,
      },
      fundraisers: {
        total: totalFundraisers,
        active: activeFundraisers,
        totalRaised: totalFundsRaised,
      },
      products: {
        total: productsSnapshot.size,
        byCategory: productsByCategory,
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

export const analyticsRouter = router;
