const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req, res) => {
    const client = await req.app.locals.pool.connect();

    try {
        const { email, password, firstName, lastName, dateOfBirth, gender, lookingFor } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user already exists
        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Start transaction
        await client.query('BEGIN');

        // Create user
        const userResult = await client.query(
            `INSERT INTO users (email, password_hash)
             VALUES ($1, $2)
             RETURNING id, email, created_at`,
            [email.toLowerCase(), passwordHash]
        );

        const user = userResult.rows[0];

        // Create user profile
        await client.query(
            `INSERT INTO user_profiles (user_id, first_name, last_name, date_of_birth, gender, looking_for)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [user.id, firstName, lastName, dateOfBirth, gender, lookingFor]
        );

        // Initialize trust score
        await client.query(
            `INSERT INTO user_trust_scores (user_id, score)
             VALUES ($1, 50.00)`,
            [user.id]
        );

        // Initialize rewards
        await client.query(
            `INSERT INTO user_rewards (user_id, gems_balance)
             VALUES ($1, 0)`,
            [user.id]
        );

        // Create notification preferences
        await client.query(
            `INSERT INTO notification_preferences (user_id)
             VALUES ($1)`,
            [user.id]
        );

        // Commit transaction
        await client.query('COMMIT');

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
        );

        logger.info(`New user registered: ${user.email}`);

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.created_at
            },
            token,
            refreshToken
        });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    } finally {
        client.release();
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Get user
        const result = await req.app.locals.pool.query(
            'SELECT id, email, password_hash, verified FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await req.app.locals.pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate tokens
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '24h' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
        );

        logger.info(`User logged in: ${user.email}`);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email
            },
            token,
            refreshToken
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Generate new access token
        const newToken = jwt.sign(
            { userId: decoded.userId, email: decoded.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRATION || '24h' }
        );

        res.json({
            success: true,
            token: newToken
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Invalid or expired refresh token' });
        }
        logger.error('Token refresh error:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client should delete tokens)
 */
router.post('/logout', (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // Optionally, implement token blacklisting with Redis here
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
