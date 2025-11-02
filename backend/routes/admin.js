const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../services/db');

const router = express.Router();
router.use(authenticateToken);

router.get('/stats', async (req, res) => {
    // Logic to get admin stats
    res.json({ message: 'Admin stats endpoint' });
});

router.get('/users/recent', async (req, res) => {
    // Logic to get recent users
    res.json({ message: 'Recent users endpoint' });
});

module.exports = router;
