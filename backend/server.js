const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

const { pool } = require('./services/db');
const redis = require('./services/redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', async (req, res) => {
  try {
    const dbStatus = await pool.query('SELECT NOW()');
    const redisStatus = await redis.ping();
    res.status(200).json({
      status: 'ok',
      database: dbStatus.rows.length > 0 ? 'ok' : 'error',
      redis: redisStatus === 'PONG' ? 'ok' : 'error',
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({ status: 'error' });
  }
});

// Socket.IO
require('./services/socket')(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    pool.end(() => {
      logger.info('Database pool closed');
      redis.quit(() => {
        logger.info('Redis client closed');
        process.exit(0);
      });
    });
  });
});
