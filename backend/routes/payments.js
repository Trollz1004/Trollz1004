const express = require('express');
const { Client, Environment } = require('square');
const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../services/db');

const router = express.Router();
router.use(authenticateToken);

const squareClient = new Client({
    environment: Environment.Production,
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

router.get('/plans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM subscription_plans');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get plans' });
    }
});

router.post('/subscribe', async (req, res) => {
    const { planId } = req.body;
    // Logic to create Square checkout link
    res.json({ message: 'Subscription endpoint' });
});

router.post('/webhook', async (req, res) => {
    // Logic to handle Square webhooks
    res.sendStatus(200);
});

module.exports = router;
