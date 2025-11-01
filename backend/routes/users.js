const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', async (req, res) => {
    try {
        const result = await req.app.locals.pool.query(
            `SELECT u.id, u.email, u.email_verified, u.phone_verified, u.created_at,
                    p.first_name, p.last_name, p.display_name, p.bio, p.date_of_birth,
                    p.gender, p.looking_for, p.location_city, p.location_state,
                    p.height_cm, p.education, p.occupation, p.verified, p.dynamic_vibe
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = $1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, profile: result.rows[0] });
    } catch (error) {
        logger.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', async (req, res) => {
    try {
        const updates = req.body;
        const allowedFields = ['first_name', 'last_name', 'display_name', 'bio', 'date_of_birth',
                               'gender', 'looking_for', 'location_city', 'location_state',
                               'height_cm', 'education', 'occupation'];

        const fields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(req.userId);

        await req.app.locals.pool.query(
            `UPDATE user_profiles SET ${fields.join(', ')}, updated_at = NOW()
             WHERE user_id = $${paramCount}`,
            values
        );

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * GET /api/users/photos
 * Get user photos
 */
router.get('/photos', async (req, res) => {
    try {
        const result = await req.app.locals.pool.query(
            `SELECT id, photo_url, is_primary, display_order, ai_tags, uploaded_at
             FROM user_photos
             WHERE user_id = $1
             ORDER BY display_order, uploaded_at`,
            [req.userId]
        );

        res.json({ success: true, photos: result.rows });
    } catch (error) {
        logger.error('Get photos error:', error);
        res.status(500).json({ error: 'Failed to get photos' });
    }
});

/**
 * GET /api/users/subscription
 * Get user subscription status
 */
router.get('/subscription', async (req, res) => {
    try {
        const result = await req.app.locals.pool.query(
            `SELECT us.id, us.status, us.started_at, us.current_period_end,
                    sp.name, sp.display_name, sp.price_monthly, sp.features
             FROM user_subscriptions us
             JOIN subscription_plans sp ON us.plan_id = sp.id
             WHERE us.user_id = $1
             AND us.status = 'active'
             ORDER BY sp.tier_level DESC
             LIMIT 1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                subscription: null,
                message: 'No active subscription'
            });
        }

        res.json({ success: true, subscription: result.rows[0] });
    } catch (error) {
        logger.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});

module.exports = router;
