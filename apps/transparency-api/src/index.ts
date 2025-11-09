// Transparency API - ALL SECURITY FIXES APPLIED
// Team Claude For The Kids - Production Grade
// ✅ Redis caching (5-min TTL)
// ✅ Rate limiting (30 req/min)
// ✅ Input validation
// ✅ CSRF protection
// ✅ Audit logging
// ✅ SSE connection limits

import express, { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import csrf from 'csurf';
import helmet from 'helmet';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 4001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000
});

// Redis connection for caching
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '10kb' })); // Prevent large payloads

// Rate limiting - 30 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// CSRF protection
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Audit logging
interface AuditLog {
  timestamp: Date;
  ip: string;
  userId?: string;
  action: string;
  resource: string;
  success: boolean;
  error?: string;
}

async function logAudit(log: AuditLog): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_logs (timestamp, ip, user_id, action, resource, success, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [log.timestamp, log.ip, log.userId, log.action, log.resource, log.success, log.error]
    );
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// Input validation middleware
function validateInput(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logAudit({
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      action: req.method,
      resource: req.path,
      success: false,
      error: 'Validation failed'
    });
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

// Redis caching helper (5-minute TTL)
async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: unknown, ttl: number = 300): Promise<void> {
  try {
    await redis.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Cache set failed:', error);
  }
}

// SSE connection management - limit to 1000 connections
const sseConnections = new Set<Response>();
const MAX_SSE_CONNECTIONS = 1000;

// API Routes

// Get platform statistics with caching
app.get('/api/stats',
  async (req: Request, res: Response) => {
    const cacheKey = 'platform_stats';

    try {
      // Check cache first
      const cached = await getFromCache<any>(cacheKey);
      if (cached) {
        logAudit({
          timestamp: new Date(),
          ip: req.ip || 'unknown',
          action: 'GET',
          resource: '/api/stats',
          success: true
        });
        return res.json({ ...cached, cached: true });
      }

      // Query database
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as active_users,
          SUM(revenue) as total_revenue,
          SUM(revenue * 0.5) as charity_amount
        FROM users
      `);

      const stats = result.rows[0];

      // Cache for 5 minutes
      await setCache(cacheKey, stats);

      logAudit({
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        action: 'GET',
        resource: '/api/stats',
        success: true
      });

      res.json(stats);
    } catch (error) {
      logAudit({
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        action: 'GET',
        resource: '/api/stats',
        success: false,
        error: String(error)
      });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }
);

// Get revenue split with validation
app.get('/api/revenue/:period',
  param('period').isIn(['day', 'week', 'month', 'year']).trim().escape(),
  validateInput,
  async (req: Request, res: Response) => {
    const { period } = req.params;
    const cacheKey = `revenue_${period}`;

    try {
      const cached = await getFromCache<any>(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }

      let interval = '1 day';
      if (period === 'week') interval = '7 days';
      if (period === 'month') interval = '30 days';
      if (period === 'year') interval = '365 days';

      const result = await pool.query(`
        SELECT
          SUM(amount) as total_revenue,
          SUM(platform_share) as platform_revenue,
          SUM(charity_share) as charity_revenue
        FROM revenue_split
        WHERE created_at > NOW() - INTERVAL '${interval}'
      `);

      const revenue = result.rows[0];
      await setCache(cacheKey, revenue);

      logAudit({
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        action: 'GET',
        resource: `/api/revenue/${period}`,
        success: true
      });

      res.json(revenue);
    } catch (error) {
      logAudit({
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        action: 'GET',
        resource: `/api/revenue/${period}`,
        success: false,
        error: String(error)
      });
      res.status(500).json({ error: 'Failed to fetch revenue' });
    }
  }
);

// Post transaction with validation and replay protection
app.post('/api/transaction',
  body('amount').isNumeric().toFloat(),
  body('type').isIn(['subscription', 'donation', 'purchase']).trim().escape(),
  body('userId').isUUID(),
  body('nonce').isInt().toInt(),
  validateInput,
  async (req: Request, res: Response) => {
    const { amount, type, userId, nonce } = req.body;

    try {
      // Check for transaction replay
      const existing = await pool.query(
        'SELECT id FROM transactions WHERE user_id = $1 AND nonce = $2',
        [userId, nonce]
      );

      if (existing.rows.length > 0) {
        throw new Error('Transaction replay detected');
      }

      // Insert transaction with auto 50/50 split
      const result = await pool.query(
        `INSERT INTO transactions (user_id, amount, type, nonce, platform_share, charity_share)
         VALUES ($1, $2, $3, $4, $2 * 0.5, $2 * 0.5)
         RETURNING id, platform_share, charity_share`,
        [userId, amount, type, nonce]
      );

      // Invalidate cache
      await redis.del('platform_stats');

      logAudit({
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        userId,
        action: 'POST',
        resource: '/api/transaction',
        success: true
      });

      res.json(result.rows[0]);
    } catch (error) {
      logAudit({
        timestamp: new Date(),
        ip: req.ip || 'unknown',
        userId,
        action: 'POST',
        resource: '/api/transaction',
        success: false,
        error: String(error)
      });
      res.status(400).json({ error: String(error) });
    }
  }
);

// Server-Sent Events for real-time updates - with connection limit
app.get('/api/events',
  (req: Request, res: Response) => {
    // Check connection limit
    if (sseConnections.size >= MAX_SSE_CONNECTIONS) {
      return res.status(503).json({ error: 'Server capacity reached' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    sseConnections.add(res);

    // Send heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      res.write('data: ping\n\n');
    }, 30000);

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      sseConnections.delete(res);
    });

    logAudit({
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      action: 'SSE',
      resource: '/api/events',
      success: true
    });
  }
);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: sseConnections.size,
    uptime: process.uptime()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);

  logAudit({
    timestamp: new Date(),
    ip: req.ip || 'unknown',
    action: req.method,
    resource: req.path,
    success: false,
    error: err.message
  });

  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing connections...');
  await pool.end();
  await redis.quit();
  sseConnections.forEach(conn => conn.end());
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✅ Transparency API running on port ${PORT}`);
  console.log(`✅ Rate limiting: 30 req/min`);
  console.log(`✅ Redis caching enabled`);
  console.log(`✅ CSRF protection active`);
  console.log(`✅ Audit logging enabled`);
  console.log(`✅ SSE connections limited to ${MAX_SSE_CONNECTIONS}`);
});
