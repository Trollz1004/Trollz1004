import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import * as admin from 'firebase-admin';
import { Client, Environment } from 'square';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket';
import { authRouter } from './routes/auth';
import { profileRouter } from './routes/profile';
import { matchesRouter } from './routes/matches';
import { subscriptionsRouter } from './routes/subscriptions';
import { adminRouter } from './routes/admin';
import { analyticsRouter } from './routes/analytics';
import { referralRouter } from './routes/referral';
import { emailRouter } from './routes/email';
import { webhooksRouter } from './routes/webhooks';
import { socialRouter } from './routes/social';
import badgeRouter from './routes/badges';
import smsRouter from './routes/sms';
import experimentsRouter from './routes/experiments';
import contestsRouter from './routes/contests';
import dashboardRouter from './routes/dashboard';
import { anthropicOAuthRouter } from './routes/anthropicOAuth';
import aiRouter from './routes/ai';
import orchestratorRouter from './routes/orchestrator';
import { initializeDatabase } from './database';
import logger from './logger';
import config from './config';
import { requestContext } from './middleware/requestContext';
import { startAutomationWorker, stopAutomationWorker } from './automations/automationWorker';

// Initialize Firebase Admin SDK
if (!admin.apps.length && config.firebase.serviceAccountKey) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(config.firebase.serviceAccountKey)),
  });
}

// Initialize Square Client
export const squareClient = new Client({
  environment: config.square.environment === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: config.square.accessToken,
});

const app: Express = express();
const server = http.createServer(app);
initSocket(server);

app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(requestContext);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(limiter);
app.use(helmet());
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/profiles', profileRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/referral', referralRouter);
app.use('/api/email', emailRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/social', socialRouter);
app.use('/api/badges', badgeRouter);
app.use('/api/sms', smsRouter);
app.use('/api/experiments', experimentsRouter);
app.use('/api/contests', contestsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/oauth/anthropic', anthropicOAuthRouter);
app.use('/api/ai', aiRouter);
app.use('/api/orchestrator', orchestratorRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error', { message: err.message, stack: err.stack });
  res.status(500).json({ 
    message: 'Internal server error',
    error: config.env === 'development' ? err.message : undefined,
    requestId: res.locals.requestId,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found', requestId: res.locals.requestId });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    // Start automation worker
    await startAutomationWorker();
    
    const PORT = config.port;
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${config.env}`);
      logger.info('📊 Database initialized successfully');
    });

    // Graceful shutdown handler
    const shutdown = async () => {
      logger.info('Received shutdown signal, closing gracefully...');
      
      await stopAutomationWorker();
      
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();