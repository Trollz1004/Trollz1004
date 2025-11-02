const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../services/db');

const router = express.Router();

router.post('/signup', async (req, res) => {
    const { email, password, fullName } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hashedPassword = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
            [email, hashedPassword]
        );
        const userId = userResult.rows[0].id;
        await client.query(
            'INSERT INTO user_profiles (user_id, full_name) VALUES ($1, $2)',
            [userId, fullName]
        );
        await client.query(
            'INSERT INTO user_trust_scores (user_id) VALUES ($1)',
            [userId]
        );
        await client.query('COMMIT');
        res.status(201).json({ message: 'User created' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error creating user' });
    } finally {
        client.release();
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (await bcrypt.compare(password, user.password_hash)) {
                const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
                res.json({ token });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
