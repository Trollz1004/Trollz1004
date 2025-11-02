import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import http from 'http';
import * as admin from 'firebase-admin';
import { Client, Environment } from 'square';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket';
import { authRouter } from './routes/auth';
import { shopRouter } from './routes/shop';
import { fundraiserRouter } from './routes/fundraiser';
import { marketingRouter } from './routes/marketing';
import { profileRouter } from './routes/profile';
import { adminRouter } from './routes/admin';
import { searchRouter } from './routes/search';
import { analyticsRouter } from './routes/analytics';
import { activityRouter } from './routes/activity';
import { twoFactorRouter } from './routes/twoFactor';
import logger from './logger';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)),
  });
}

// Initialize Square Client
export const squareClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const app: Express = express();
const server = http.createServer(app);
initSocket(server);

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
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/shop', shopRouter);
app.use('/api/fundraiser', fundraiserRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);
app.use('/api/search', searchRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/2fa', twoFactorRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  logger.info(`✅ Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});