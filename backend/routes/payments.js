const express = require('express');
const router = express.Router();
const { Client, Environment } = require('square');
const logger = require('../utils/logger');

// Initialize Square client
const squareClient = new Client({
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: Environment.Production // LIVE MODE
});

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

// POST /api/payments/create-checkout - Create Square checkout session
router.post('/create-checkout', async (req, res) => {
    try {
        const { planId } = req.body;

        // Get plan details
        const planResult = await req.app.locals.pool.query(
            'SELECT * FROM subscription_plans WHERE id = $1',
            [planId]
        );

        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const plan = planResult.rows[0];

        // TODO: Implement Square checkout session creation
        // For now, return plan info
        res.json({
            success: true,
            plan,
            message: 'Square integration pending - use Square Web SDK on frontend'
        });

    } catch (error) {
        logger.error('Create checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout' });
    }
});

// POST /api/payments/webhook - Handle Square webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const event = req.body;

        logger.info('Square webhook received:', event.type);

        // TODO: Implement Square webhook handling
        // - subscription.created
        // - subscription.updated
        // - payment.created
        // - payment.updated

        res.json({ success: true });
    } catch (error) {
        logger.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
