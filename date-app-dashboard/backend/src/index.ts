import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import * as admin from 'firebase-admin';
import { Client, Environment } from 'square';
import logger from './logger';

import { authRouter } from './routes/auth';
import { shopRouter } from './routes/shop';
import { fundraiserRouter } from './routes/fundraiser';
import { marketingRouter } from './routes/marketing';

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)),
});

// Initialize Square Client
const squareClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/shop', shopRouter);
app.use('/api/fundraiser', fundraiserRouter);
app.use('/api/marketing', marketingRouter);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));

export { squareClient };