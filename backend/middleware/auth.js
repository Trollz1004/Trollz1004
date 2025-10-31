const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request
        req.userId = decoded.userId;
        req.userEmail = decoded.email;

        // Check if user still exists and is active
        const pool = req.app.locals.pool;
        const result = await pool.query(
            'SELECT id, email, account_status FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.account_status !== 'active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expired' });
        }
        logger.error('Authentication error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Middleware to require premium subscription
 */
const requirePremium = async (req, res, next) => {
    try {
        const pool = req.app.locals.pool;

        // Check if user has active premium subscription
        const result = await pool.query(
            `SELECT us.id, sp.tier_level, sp.name
             FROM user_subscriptions us
             JOIN subscription_plans sp ON us.plan_id = sp.id
             WHERE us.user_id = $1
             AND us.status = 'active'
             AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
             ORDER BY sp.tier_level DESC
             LIMIT 1`,
            [req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: 'Premium subscription required',
                upgradeUrl: '/api/payments/plans'
            });
        }

        req.subscription = result.rows[0];
        next();
    } catch (error) {
        logger.error('Premium check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Middleware to require admin access
 */
const requireAdmin = async (req, res, next) => {
    try {
        const pool = req.app.locals.pool;

        // Check if user is admin
        const result = await pool.query(
            'SELECT id, role, permissions FROM admin_users WHERE email = $1',
            [req.userEmail]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        req.admin = result.rows[0];
        next();
    } catch (error) {
        logger.error('Admin check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Middleware to check specific permission
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const permissions = req.admin.permissions || [];

        if (req.admin.role === 'super_admin' || permissions.includes(permission)) {
            next();
        } else {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permission
            });
        }
    };
};

module.exports = {
    authenticateToken,
    requirePremium,
    requireAdmin,
    requirePermission
};
