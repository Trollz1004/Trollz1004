/**
 * YouAndINotAI - God Tier Dating Platform
 * Main Server File
 * Version: 2.0.0
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const Redis = require('ioredis');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const matchingRoutes = require('./routes/matching');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

// Import middleware
const { authenticateToken, requirePremium, requireAdmin } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// ============================================================================
// CONFIGURATION
// ============================================================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.APP_URL || '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('Database connection failed:', err);
    } else {
        logger.info('Database connected successfully');
    }
});

// ============================================================================
// REDIS CONNECTION
// ============================================================================

let redis;
if (process.env.REDIS_HOST) {
    redis = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        }
    });

    redis.on('connect', () => {
        logger.info('Redis connected successfully');
    });

    redis.on('error', (err) => {
        logger.error('Redis connection error:', err);
    });
} else {
    logger.warn('Redis not configured - some features will be disabled');
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'https:', 'wss:']
        }
    }
}));

// CORS
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.APP_URL,
            'http://localhost:3000',
            'http://localhost:8080'
        ].filter(Boolean);

        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'production') {
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
} else {
    app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts, please try again later.'
});

// ============================================================================
// STATIC FILES
// ============================================================================

app.use(express.static(path.join(__dirname, '../frontend')));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', async (req, res) => {
    try {
        // Check database
        await pool.query('SELECT 1');

        // Check Redis if available
        let redisStatus = 'not_configured';
        if (redis) {
            try {
                await redis.ping();
                redisStatus = 'connected';
            } catch (err) {
                redisStatus = 'error';
            }
        }

        res.json({
            status: 'healthy',
            platform: 'YouAndINotAI',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            database: 'connected',
            redis: redisStatus,
            uptime: process.uptime()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: 'Service unavailable',
            timestamp: new Date().toISOString()
        });
    }
});

// ============================================================================
// API ROUTES
// ============================================================================

// Make pool and redis available to routes
app.locals.pool = pool;
app.locals.redis = redis;

// Authentication routes (with rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/matching', authenticateToken, matchingRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/ai', authenticateToken, requirePremium, aiRoutes);

// Admin routes
app.use('/api/admin', authenticateToken, requireAdmin, adminRoutes);

// ============================================================================
// WEBSOCKET - REAL-TIME MESSAGING
// ============================================================================

// Store active user connections
const activeUsers = new Map();

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        next();
    } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.userId}`);
    activeUsers.set(socket.userId, socket.id);

    // Notify user's matches that they're online
    socket.broadcast.emit('user_online', { userId: socket.userId });

    // Handle sending messages
    socket.on('send_message', async (data) => {
        try {
            const { conversationId, content, recipientId } = data;

            // Save message to database
            const result = await pool.query(
                `INSERT INTO messages (conversation_id, sender_id, content, safety_checked)
                 VALUES ($1, $2, $3, false)
                 RETURNING id, content, created_at`,
                [conversationId, socket.userId, content]
            );

            const message = result.rows[0];

            // TODO: AI Safety check (implement in production)
            // const safetyCheck = await checkMessageSafety(content);
            // if (!safetyCheck.safe) { return; }

            // Send to recipient if online
            const recipientSocketId = activeUsers.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('new_message', {
                    ...message,
                    senderId: socket.userId,
                    conversationId
                });
            }

            // Send confirmation to sender
            socket.emit('message_sent', {
                ...message,
                conversationId
            });

            // Update conversation last_message
            await pool.query(
                `UPDATE conversations
                 SET last_message_at = NOW(), last_message_preview = $1
                 WHERE id = $2`,
                [content.substring(0, 100), conversationId]
            );

        } catch (error) {
            logger.error('Error sending message:', error);
            socket.emit('message_error', { error: 'Failed to send message' });
        }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
        const recipientSocketId = activeUsers.get(data.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('user_typing', {
                userId: socket.userId,
                conversationId: data.conversationId
            });
        }
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
        const recipientSocketId = activeUsers.get(data.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('user_stopped_typing', {
                userId: socket.userId,
                conversationId: data.conversationId
            });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        logger.info(`User disconnected: ${socket.userId}`);
        activeUsers.delete(socket.userId);
        socket.broadcast.emit('user_offline', { userId: socket.userId });
    });
});

// ============================================================================
// FRONTEND ROUTES
// ============================================================================

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin/dashboard.html'));
});

// Serve main app (catch-all for SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed');
        await pool.end();
        if (redis) await redis.quit();
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed');
        await pool.end();
        if (redis) await redis.quit();
        process.exit(0);
    });
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, '0.0.0.0', () => {
    logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         YouAndINotAI - God Tier Dating Platform           ║
║                    Version 2.0.0                           ║
║                                                            ║
║  Server running on port ${PORT}                          ║
║  Environment: ${NODE_ENV}                                ║
║  Database: ${pool.totalCount} connections                 ║
║  Redis: ${redis ? 'Connected' : 'Not configured'}         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});

module.exports = { app, server, io, pool, redis };
