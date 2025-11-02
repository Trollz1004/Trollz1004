import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { Client, Environment, ApiError } from 'square';
import { randomUUID } from 'crypto';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Redis
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

// Square Client
const squareClient = new Client({
  environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '8.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth - Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, age, gender, looking_for } = req.body;
    
    if (!name || !email || !password || !age || !gender || !looking_for) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (parseInt(age) < 18) {
      return res.status(400).json({ error: 'Must be 18 or older' });
    }
    
    const passwordHash = await argon2.hash(password);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, age, gender, looking_for, created_at) VALUES (\, \, \, \, \, \, NOW()) RETURNING id, name, email, age, gender',
      [name, email, passwordHash, age, gender, looking_for]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    res.json({ user, token, refreshToken });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Auth - Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE email = \', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const valid = await argon2.verify(user.password_hash, password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token, refreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Profiles Queue
app.get('/api/profiles/queue', async (req, res) => {
  try {
    const cacheKey = 'profiles:queue';
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const profiles = await pool.query(
      'SELECT id, name, age, bio, location, interests, photos FROM users WHERE verified = true LIMIT 20'
    );
    
    await redis.setEx(cacheKey, 300, JSON.stringify(profiles.rows));
    res.json(profiles.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profiles' });
  }
});

// Square Payment Endpoint
app.post('/api/payments/create-payment', async (req, res) => {
    try {
        const { sourceId, amount, currency = 'USD', customerId } = req.body;

        if (!sourceId || !amount) {
            return res.status(400).json({ error: 'sourceId and amount are required' });
        }

        const { result } = await squareClient.paymentsApi.createPayment({
            sourceId,
            amountMoney: {
                amount: BigInt(amount), // amount in the smallest currency unit (e.g., cents)
                currency,
            },
            idempotencyKey: randomUUID(),
            customerId,
        });

        res.json(result);
    } catch (error) {
        console.error('Square payment error:', error);
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({ errors: error.errors });
        } else {
            res.status(500).json({ error: 'Payment failed' });
        }
    }
});

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-match', (matchId) => {
    socket.join(match-);
  });
  
  socket.on('send-message', (data) => {
    io.to(match-).emit('new-message', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(âœ… YouAndINotAI API V8 listening on port );
});
