const express = require('express');
const authenticateToken = require('../middleware/authenticateToken');
const { pool } = require('../services/db');

const router = express.Router();
router.use(authenticateToken);

router.get('/profile', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM user_profiles WHERE user_id = $1', [req.user.userId]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

router.put('/profile', async (req, res) => {
    const { fullName, bio, interests, location } = req.body;
    try {
        await pool.query(
            'UPDATE user_profiles SET full_name = $1, bio = $2, interests = $3, location = $4 WHERE user_id = $5',
            [fullName, bio, interests, location, req.user.userId]
        );
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
