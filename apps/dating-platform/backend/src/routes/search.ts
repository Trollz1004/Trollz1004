import { Router } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import * as admin from 'firebase-admin';
import logger from '../logger';

const router = Router();

router.get('/search', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { query, type, minPrice, maxPrice, category } = req.query;
    const searchQuery = query as string || '';
    const searchType = type as string || 'all';

    let results: any = {
      products: [],
      fundraisers: [],
      users: [],
    };

    // Search products
    if (searchType === 'all' || searchType === 'products') {
      const productsRef = admin.firestore().collection('products');
      let productsQuery = productsRef.where('name', '>=', searchQuery).where('name', '<=', searchQuery + '\uf8ff');
      
      if (minPrice) {
        productsQuery = productsQuery.where('price', '>=', parseFloat(minPrice as string));
      }
      if (maxPrice) {
        productsQuery = productsQuery.where('price', '<=', parseFloat(maxPrice as string));
      }
      if (category) {
        productsQuery = productsQuery.where('category', '==', category);
      }

      const productsSnapshot = await productsQuery.limit(20).get();
      results.products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Search fundraisers
    if (searchType === 'all' || searchType === 'fundraisers') {
      const fundraisersRef = admin.firestore().collection('fundraisers');
      const fundraisersQuery = fundraisersRef
        .where('title', '>=', searchQuery)
        .where('title', '<=', searchQuery + '\uf8ff')
        .limit(20);
      
      const fundraisersSnapshot = await fundraisersQuery.get();
      results.fundraisers = fundraisersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Search users (admin only)
    if (req.user?.role === 'admin' && (searchType === 'all' || searchType === 'users')) {
      const usersRef = admin.firestore().collection('users');
      const usersQuery = usersRef
        .where('displayName', '>=', searchQuery)
        .where('displayName', '<=', searchQuery + '\uf8ff')
        .limit(20);
      
      const usersSnapshot = await usersQuery.get();
      results.users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    res.json(results);
  } catch (error) {
    logger.error('Error searching:', error);
    res.status(500).json({ message: 'Error performing search' });
  }
});

export const searchRouter = router;
