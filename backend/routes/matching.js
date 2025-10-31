const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// GET /api/matching/discover - Get potential matches
router.get('/discover', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        // Get users the current user hasn't swiped on yet
        const result = await req.app.locals.pool.query(
            `SELECT u.id, p.first_name, p.display_name, p.bio, p.date_of_birth,
                    p.location_city, p.location_state, p.verified, p.dynamic_vibe,
                    (SELECT photo_url FROM user_photos WHERE user_id = u.id AND is_primary = true LIMIT 1) as primary_photo
             FROM users u
             JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id != $1
             AND u.account_status = 'active'
             AND u.id NOT IN (
                 SELECT swiped_user_id FROM swipes WHERE swiper_id = $1
             )
             ORDER BY RANDOM()
             LIMIT $2`,
            [req.userId, limit]
        );

        res.json({ success: true, users: result.rows });
    } catch (error) {
        logger.error('Discover error:', error);
        res.status(500).json({ error: 'Failed to get matches' });
    }
});

// POST /api/matching/swipe - Swipe on a user
router.post('/swipe', async (req, res) => {
    const client = await req.app.locals.pool.connect();

    try {
        const { targetUserId, direction } = req.body;

        if (!['like', 'pass', 'super_like'].includes(direction)) {
            return res.status(400).json({ error: 'Invalid swipe direction' });
        }

        await client.query('BEGIN');

        // Record swipe
        await client.query(
            `INSERT INTO swipes (swiper_id, swiped_user_id, direction)
             VALUES ($1, $2, $3)
             ON CONFLICT (swiper_id, swiped_user_id) DO NOTHING`,
            [req.userId, targetUserId, direction]
        );

        let isMatch = false;

        // Check for mutual like
        if (direction === 'like' || direction === 'super_like') {
            const mutualLike = await client.query(
                `SELECT id FROM swipes
                 WHERE swiper_id = $1 AND swiped_user_id = $2
                 AND direction IN ('like', 'super_like')`,
                [targetUserId, req.userId]
            );

            if (mutualLike.rows.length > 0) {
                isMatch = true;

                // Create match (ensure consistent ordering)
                const [userA, userB] = [req.userId, targetUserId].sort();

                const matchResult = await client.query(
                    `INSERT INTO matches (user_id_a, user_id_b, status)
                     VALUES ($1, $2, 'active')
                     ON CONFLICT (user_id_a, user_id_b) DO NOTHING
                     RETURNING id`,
                    [userA, userB]
                );

                if (matchResult.rows.length > 0) {
                    // Create conversation
                    await client.query(
                        `INSERT INTO conversations (match_id)
                         VALUES ($1)`,
                        [matchResult.rows[0].id]
                    );
                }
            }
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            isMatch,
            message: isMatch ? "It's a match!" : 'Swipe recorded'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Swipe error:', error);
        res.status(500).json({ error: 'Failed to process swipe' });
    } finally {
        client.release();
    }
});

// GET /api/matching/matches - Get user's matches
router.get('/matches', async (req, res) => {
    try {
        const result = await req.app.locals.pool.query(
            `SELECT m.id as match_id, m.matched_at,
                    CASE
                        WHEN m.user_id_a = $1 THEN m.user_id_b
                        ELSE m.user_id_a
                    END as matched_user_id,
                    p.first_name, p.display_name, p.bio,
                    (SELECT photo_url FROM user_photos WHERE user_id = CASE WHEN m.user_id_a = $1 THEN m.user_id_b ELSE m.user_id_a END AND is_primary = true LIMIT 1) as primary_photo
             FROM matches m
             JOIN user_profiles p ON p.user_id = CASE WHEN m.user_id_a = $1 THEN m.user_id_b ELSE m.user_id_a END
             WHERE (m.user_id_a = $1 OR m.user_id_b = $1)
             AND m.status = 'active'
             ORDER BY m.matched_at DESC`,
            [req.userId]
        );

        res.json({ success: true, matches: result.rows });
    } catch (error) {
        logger.error('Get matches error:', error);
        res.status(500).json({ error: 'Failed to get matches' });
    }
});

module.exports = router;
