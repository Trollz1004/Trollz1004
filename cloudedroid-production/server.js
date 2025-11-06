const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.DOMAIN_PRIMARY || 'https://unimanus-desdpotm.manus.space',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Perplexity API configuration
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    agents: 5,
    dao: 'operational',
    uptime: process.uptime()
  });
});

// Perplexity AI endpoint
app.post('/api/perplexity', async (req, res) => {
  try {
    const response = await axios.post('https://api.perplexity.ai/chat/completions', {
      model: 'llama-3.1-sonar-small-128k-online',
      messages: req.body.messages,
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Perplexity API Error:', error.message);
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// Agent status endpoint
app.get('/api/agents/status', (req, res) => {
  res.json({
    agents: [
      { id: 'perplexity', name: 'Perplexity AI', status: 'online', latency: 120 },
      { id: 'claude', name: 'Claude Sonnet', status: 'online', latency: 150 },
      { id: 'gpt4', name: 'GPT-4', status: 'online', latency: 180 },
      { id: 'gemini', name: 'Gemini Pro', status: 'online', latency: 140 },
      { id: 'ollama', name: 'Ollama Local', status: 'online', latency: 50 }
    ]
  });
});

// DAO metrics endpoint
app.get('/api/dao/metrics', (req, res) => {
  res.json({
    love_token: {
      total_supply: 1000000000,
      circulating: 400000000,
      holders: 25000,
      price: 0.042,
      market_cap: 16800000
    },
    aimarket_token: {
      total_supply: 500000000,
      circulating: 175000000,
      holders: 10000,
      price: 0.085,
      market_cap: 14875000
    },
    treasury: {
      value_usd: 2500000,
      proposals_active: 3,
      participation_rate: 0.12,
      governance_power: 65000000
    }
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('message', async (data) => {
    // Handle real-time messaging
    io.emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = process.env.PORT || 3456;
server.listen(PORT, () => {
  console.log(`CloudeDroid Platform running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
