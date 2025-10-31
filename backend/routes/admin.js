const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// GET /api/admin/stats - Get platform statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = {};

        // Total users
        const usersResult = await req.app.locals.pool.query(
            'SELECT COUNT(*) as total, account_status FROM users GROUP BY account_status'
        );
        stats.users = usersResult.rows;

        // Total matches
        const matchesResult = await req.app.locals.pool.query(
            'SELECT COUNT(*) as total FROM matches WHERE status = $1',
            ['active']
        );
        stats.totalMatches = matchesResult.rows[0]?.total || 0;

        // Active subscriptions
        const subscriptionsResult = await req.app.locals.pool.query(
            `SELECT sp.name, COUNT(*) as count
             FROM user_subscriptions us
             JOIN subscription_plans sp ON us.plan_id = sp.id
             WHERE us.status = 'active'
             GROUP BY sp.name`
        );
        stats.subscriptions = subscriptionsResult.rows;

        // Revenue (last 30 days)
        const revenueResult = await req.app.locals.pool.query(
            `SELECT SUM(amount) as total_revenue
             FROM payments
             WHERE status = 'completed'
             AND created_at >= NOW() - INTERVAL '30 days'`
        );
        stats.revenue30Days = parseFloat(revenueResult.rows[0]?.total_revenue || 0);

        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// GET /api/admin/users - Get users list
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const result = await req.app.locals.pool.query(
            `SELECT u.id, u.email, u.account_status, u.created_at, u.last_login_at,
                    p.first_name, p.last_name, p.verified,
                    ts.score as trust_score
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             LEFT JOIN user_trust_scores ts ON u.id = ts.user_id
             ORDER BY u.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const countResult = await req.app.locals.pool.query('SELECT COUNT(*) FROM users');
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            users: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// GET /api/admin/reports - Get user reports
router.get('/reports', async (req, res) => {
    try {
        const result = await req.app.locals.pool.query(
            `SELECT r.id, r.reason, r.description, r.status, r.created_at,
                    reporter.email as reporter_email,
                    reported.email as reported_email
             FROM user_reports r
             JOIN users reporter ON r.reporter_id = reporter.id
             JOIN users reported ON r.reported_user_id = reported.id
             WHERE r.status = 'pending'
             ORDER BY r.created_at DESC
             LIMIT 100`
        );

        res.json({ success: true, reports: result.rows });
    } catch (error) {
        logger.error('Get reports error:', error);
        res.status(500).json({ error: 'Failed to get reports' });
    }
});

module.exports = router;
