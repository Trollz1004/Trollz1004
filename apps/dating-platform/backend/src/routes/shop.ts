import { Router } from 'express';
import * as admin from 'firebase-admin';
import { squareClient } from '../index';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';

const router = Router();

// Get all products
router.get('/products', async (req, res) => {
  try {
    const productsSnapshot = await admin.firestore().collection('products').get();
    const products = productsSnapshot.docs.map((doc) => doc.data());
    res.json(products);
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// Create a payment link for a cart
router.post('/create-payment-link', isAuthenticated, async (req: AuthenticatedRequest, res) => {
  const { cart } = req.body;

  try {
    const lineItems = cart.map((item: any) => ({
      name: item.name,
      quantity: item.quantity.toString(),
      basePriceMoney: {
        amount: item.price,
        currency: 'USD',
      },
    }));

    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: uuidv4(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID as string,
        lineItems,
      },
    });

    res.json(response.result.paymentLink);
  } catch (error) {
    logger.error('Error creating payment link:', error);
    res.status(500).json({ message: 'Error creating payment link' });
  }
});

export const shopRouter = router;