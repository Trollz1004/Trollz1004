import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { shopRouter } from './routes/shop';
import { fundraiserRouter } from './routes/fundraiser';
import { marketingRouter } from './routes/marketing';
import { dashboardRouter } from './routes/dashboard';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/shop', shopRouter);
app.use('/api/fundraiser', fundraiserRouter);
app.use('/api/marketing', marketingRouter);
app.use('/api/dashboard', dashboardRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));