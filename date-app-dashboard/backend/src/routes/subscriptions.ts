import { Router, Response } from 'express';
import pool from '../database';
import { requireAuth, AuthRequest } from '../middleware/auth';
import logger from '../logger';
import { squareClient } from '../index';
import { processReferralConversion } from '../automations/referral/referralProcessor';
import { sendSubscriptionConfirmation } from '../automations/email/emailTriggerService';

export const subscriptionsRouter = Router();

const SUBSCRIPTION_TIERS = {
  premium: {
    name: 'Premium',
    price: 999, // $9.99 in cents
    features: ['unlimited_likes', 'priority_messaging', 'verified_badge'],
  },
  gold: {
    name: 'Gold',
    price: 1999, // $19.99 in cents
    features: ['unlimited_likes', 'priority_messaging', 'verified_badge', 'boost_profile'],
  },
  platinum: {
    name: 'Platinum',
    price: 4999, // $49.99 in cents
    features: ['unlimited_likes', 'priority_messaging', 'verified_badge', 'boost_profile', 'concierge'],
  },
};

// CREATE SUBSCRIPTION
subscriptionsRouter.post('/create', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { tier, nonce } = (req as any).body;

  if (!tier || !Object.keys(SUBSCRIPTION_TIERS).includes(tier)) {
    return res.status(400).json({ message: 'Invalid subscription tier' });
  }

  if (!nonce) {
    return res.status(400).json({ message: 'Payment nonce is required' });
  }

  try {
    // Get user email
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const userEmail = userResult.rows[0]?.email;

    // Create Square payment
    const tierData = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];
    const paymentsApi = squareClient.getPaymentsApi();

    const payment = await paymentsApi.createPayment({
      sourceId: nonce,
      amountMoney: {
        amount: tierData.price,
        currency: 'USD',
      },
      idempotencyKey: `${userId}-${Date.now()}`,
      customerEmail: userEmail,
    });

    const paymentId = payment.result?.payment?.id;

    // Save subscription to database
    const subscription = await pool.query(
      `INSERT INTO subscriptions (user_id, tier, status, square_subscription_id, price, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '30 days')
       RETURNING *`,
      [userId, tier, 'active', paymentId, tierData.price / 100]
    );

    // Save transaction
    await pool.query(
      `INSERT INTO transactions (user_id, subscription_id, amount, status, square_payment_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, subscription.rows[0].id, tierData.price / 100, 'completed', paymentId]
    );

    // Process referral conversion if user was referred
    if (userId) {
      try {
        await processReferralConversion(userId);
        logger.info(`Processed referral conversion for user ${userId}`);
      } catch (referralError: any) {
        // Don't fail subscription if referral processing fails
        logger.error(`Failed to process referral conversion for user ${userId}`, {
          error: referralError.message,
        });
      }
    }

    // Send subscription confirmation email
    try {
      if (userId) {
        await sendSubscriptionConfirmation(userId, tier, tierData.price / 100);
      }
    } catch (emailError: any) {
      // Log email error but don't fail subscription
      logger.warn('Failed to send subscription confirmation email', {
        userId,
        tier,
        error: emailError.message,
      });
    }

    logger.info(`Subscription created: ${tier} for user ${userId}`);
    res.status(201).json({
      message: 'Subscription created successfully',
      subscription: subscription.rows[0],
    });
  } catch (error) {
    logger.error('Create subscription error:', error);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
});

// GET CURRENT SUBSCRIPTION
subscriptionsRouter.get('/current', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ subscription: null });
    }

    const subscription = result.rows[0];
    const tier = SUBSCRIPTION_TIERS[subscription.tier as keyof typeof SUBSCRIPTION_TIERS];

    res.json({
      subscription: {
        ...subscription,
        features: tier.features,
      },
    });
  } catch (error) {
    logger.error('Get subscription error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription' });
  }
});

// CANCEL SUBSCRIPTION
subscriptionsRouter.post('/cancel', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    // Find active subscription
    const result = await pool.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    const subscriptionId = result.rows[0].id;

    // Update subscription status
    await pool.query(
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1`,
      [subscriptionId]
    );

    logger.info(`Subscription cancelled for user ${userId}`);
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

// GET SUBSCRIPTION TIERS (public)
subscriptionsRouter.get('/tiers', async (req: Response, res: any) => {
  try {
    const tiers = Object.keys(SUBSCRIPTION_TIERS).map((key) => ({
      id: key,
      name: SUBSCRIPTION_TIERS[key as keyof typeof SUBSCRIPTION_TIERS].name,
      price: SUBSCRIPTION_TIERS[key as keyof typeof SUBSCRIPTION_TIERS].price / 100,
      features: SUBSCRIPTION_TIERS[key as keyof typeof SUBSCRIPTION_TIERS].features,
    }));

    res.json({ tiers });
  } catch (error) {
    logger.error('Get tiers error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription tiers' });
  }
});

export default subscriptionsRouter;
