const express = require('express');
const router = express.Router();
const { Client, Environment } = require('square');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Initialize Square client - PRODUCTION MODE ONLY
const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Production
});

// Validate Square configuration on startup
if (!process.env.SQUARE_ACCESS_TOKEN || !process.env.SQUARE_LOCATION_ID) {
    logger.error('CRITICAL: Square credentials not configured. Payment processing will fail.');
}

// GET /api/payments/plans - Get available subscription plans
router.get('/plans', async (req, res) => {
    try {
        const result = await req.app.locals.pool.query(
            `SELECT id, name, display_name, description, price_monthly, features, tier_level
             FROM subscription_plans
             WHERE is_active = true
             ORDER BY tier_level ASC`
        );

        res.json({ success: true, plans: result.rows });
    } catch (error) {
        logger.error('Get plans error:', error);
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

// POST /api/payments/create-checkout - Create Square payment link
router.post('/create-checkout', async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.user.userId;

        if (!planId) {
            return res.status(400).json({ error: 'Plan ID is required' });
        }

        // Get plan details
        const planResult = await req.app.locals.pool.query(
            'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
            [planId]
        );

        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const plan = planResult.rows[0];

        // Create payment link using Square Checkout API
        const idempotencyKey = uuidv4();
        const amountMoney = {
            amount: Math.round(parseFloat(plan.price_monthly) * 100), // Convert to cents
            currency: 'USD'
        };

        const checkoutOptions = {
            idempotencyKey,
            order: {
                locationId: process.env.SQUARE_LOCATION_ID,
                lineItems: [{
                    name: plan.display_name,
                    quantity: '1',
                    basePriceMoney: amountMoney,
                    note: `${plan.name} subscription for user ${userId}`
                }],
                metadata: {
                    userId,
                    planId: plan.id,
                    planName: plan.name
                }
            },
            checkoutOptions: {
                redirectUrl: `${process.env.APP_URL || 'https://youandinotai.com'}/payment/success`,
                askForShippingAddress: false,
                acceptedPaymentMethods: {
                    applePay: true,
                    googlePay: true,
                    cashAppPay: true
                }
            },
            prePopulatedData: {
                buyerEmail: req.user.email
            }
        };

        const { result: checkoutResult } = await squareClient.checkoutApi.createPaymentLink(checkoutOptions);

        // Log checkout creation
        await req.app.locals.pool.query(
            `INSERT INTO payment_logs (user_id, plan_id, square_checkout_id, amount, status, created_at)
             VALUES ($1, $2, $3, $4, 'pending', NOW())`,
            [userId, planId, checkoutResult.paymentLink.id, plan.price_monthly]
        );

        logger.info(`Payment link created for user ${userId}, plan ${plan.name}`);

        res.json({
            success: true,
            checkoutUrl: checkoutResult.paymentLink.url,
            orderId: checkoutResult.paymentLink.orderId,
            plan: {
                name: plan.display_name,
                price: plan.price_monthly
            }
        });

    } catch (error) {
        logger.error('Create checkout error:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            message: process.env.NODE_ENV === 'production' ? 'Payment processing error' : error.message
        });
    }
});

// POST /api/payments/create-subscription - Create recurring Square subscription
router.post('/create-subscription', async (req, res) => {
    try {
        const { planId, paymentMethodId } = req.body;
        const userId = req.user.userId;

        if (!planId || !paymentMethodId) {
            return res.status(400).json({ error: 'Plan ID and payment method are required' });
        }

        // Get plan details
        const planResult = await req.app.locals.pool.query(
            'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
            [planId]
        );

        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const plan = planResult.rows[0];

        // Check if user already has active subscription
        const existingSub = await req.app.locals.pool.query(
            `SELECT * FROM user_subscriptions 
             WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );

        if (existingSub.rows.length > 0) {
            return res.status(400).json({ error: 'Active subscription already exists' });
        }

        // Create subscription in Square
        const subscriptionRequest = {
            idempotencyKey: uuidv4(),
            locationId: process.env.SQUARE_LOCATION_ID,
            planId: plan.square_plan_id,
            customerId: paymentMethodId,
            startDate: new Date().toISOString().split('T')[0]
        };

        const { result: subResult } = await squareClient.subscriptionsApi.createSubscription(subscriptionRequest);

        // Save subscription to database
        await req.app.locals.pool.query(
            `INSERT INTO user_subscriptions 
             (user_id, plan_id, square_subscription_id, status, started_at, current_period_end)
             VALUES ($1, $2, $3, 'active', NOW(), $4)`,
            [userId, planId, subResult.subscription.id, subResult.subscription.chargedThroughDate]
        );

        logger.info(`Subscription created for user ${userId}, plan ${plan.name}`);

        res.json({
            success: true,
            subscription: {
                id: subResult.subscription.id,
                status: subResult.subscription.status,
                planName: plan.display_name
            }
        });

    } catch (error) {
        logger.error('Create subscription error:', error);
        res.status(500).json({ 
            error: 'Failed to create subscription',
            message: process.env.NODE_ENV === 'production' ? 'Subscription processing error' : error.message
        });
    }
});

// POST /api/payments/webhook - Handle Square webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const event = req.body;

        logger.info('Square webhook received:', event.type);

        // Verify webhook signature (if configured)
        // const signature = req.headers['x-square-signature'];
        // if (!verifyWebhookSignature(signature, req.body)) {
        //     return res.status(401).json({ error: 'Invalid signature' });
        // }

        switch (event.type) {
            case 'payment.created':
                await handlePaymentCreated(event.data, req.app.locals.pool);
                break;

            case 'payment.updated':
                await handlePaymentUpdated(event.data, req.app.locals.pool);
                break;

            case 'subscription.created':
                await handleSubscriptionCreated(event.data, req.app.locals.pool);
                break;

            case 'subscription.updated':
                await handleSubscriptionUpdated(event.data, req.app.locals.pool);
                break;

            case 'invoice.paid':
                await handleInvoicePaid(event.data, req.app.locals.pool);
                break;

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data, req.app.locals.pool);
                break;

            default:
                logger.info(`Unhandled webhook event: ${event.type}`);
        }

        res.json({ success: true, received: true });
    } catch (error) {
        logger.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// GET /api/payments/subscription - Get current user subscription
router.get('/subscription', async (req, res) => {
    try {
        const userId = req.user.userId;

        const result = await req.app.locals.pool.query(
            `SELECT us.*, sp.name, sp.display_name, sp.features, sp.price_monthly
             FROM user_subscriptions us
             JOIN subscription_plans sp ON us.plan_id = sp.id
             WHERE us.user_id = $1 AND us.status = 'active'
             ORDER BY us.started_at DESC
             LIMIT 1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, subscription: null });
        }

        res.json({ success: true, subscription: result.rows[0] });
    } catch (error) {
        logger.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});

// POST /api/payments/cancel-subscription - Cancel user subscription
router.post('/cancel-subscription', async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get active subscription
        const subResult = await req.app.locals.pool.query(
            `SELECT * FROM user_subscriptions 
             WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );

        if (subResult.rows.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscription = subResult.rows[0];

        // Cancel in Square
        await squareClient.subscriptionsApi.cancelSubscription(subscription.square_subscription_id);

        // Update database
        await req.app.locals.pool.query(
            `UPDATE user_subscriptions 
             SET status = 'canceled', canceled_at = NOW()
             WHERE id = $1`,
            [subscription.id]
        );

        logger.info(`Subscription canceled for user ${userId}`);

        res.json({ success: true, message: 'Subscription canceled successfully' });
    } catch (error) {
        logger.error('Cancel subscription error:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// ============================================================================
// Webhook Handlers
// ============================================================================

async function handlePaymentCreated(data, pool) {
    const payment = data.object.payment;
    logger.info(`Payment created: ${payment.id}, amount: ${payment.amountMoney.amount}`);

    // Update payment log
    if (payment.orderId) {
        await pool.query(
            `UPDATE payment_logs 
             SET square_payment_id = $1, status = 'completed', completed_at = NOW()
             WHERE square_checkout_id = $2`,
            [payment.id, payment.orderId]
        );
    }
}

async function handlePaymentUpdated(data, pool) {
    const payment = data.object.payment;
    logger.info(`Payment updated: ${payment.id}, status: ${payment.status}`);

    await pool.query(
        `UPDATE payment_logs 
         SET status = $1, updated_at = NOW()
         WHERE square_payment_id = $2`,
        [payment.status.toLowerCase(), payment.id]
    );
}

async function handleSubscriptionCreated(data, pool) {
    const subscription = data.object.subscription;
    logger.info(`Subscription created: ${subscription.id}`);
}

async function handleSubscriptionUpdated(data, pool) {
    const subscription = data.object.subscription;
    logger.info(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);

    await pool.query(
        `UPDATE user_subscriptions 
         SET status = $1, updated_at = NOW()
         WHERE square_subscription_id = $2`,
        [subscription.status.toLowerCase(), subscription.id]
    );
}

async function handleInvoicePaid(data, pool) {
    const invoice = data.object.invoice;
    logger.info(`Invoice paid: ${invoice.id}`);
}

async function handleInvoicePaymentFailed(data, pool) {
    const invoice = data.object.invoice;
    logger.error(`Invoice payment failed: ${invoice.id}`);

    // Notify user about payment failure
    // Send email or in-app notification
}

module.exports = router;
