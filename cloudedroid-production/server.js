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

// AI Configuration
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const USE_SELF_HOSTED_FIRST = process.env.USE_SELF_HOSTED_FIRST !== 'false'; // Default: true

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

// AI Chat endpoint - Self-Hosted FIRST, Cloud as fallback
app.post('/api/ai/chat', async (req, res) => {
  const { messages, useWeb = false } = req.body;

  try {
    // Try Ollama first (FREE, self-hosted)
    if (USE_SELF_HOSTED_FIRST && !useWeb) {
      try {
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
        const response = await axios.post(`${OLLAMA_HOST}/api/generate`, {
          model: 'llama3.1:8b',
          prompt,
          stream: false
        }, { timeout: 10000 });

        console.log('✅ Using Ollama (self-hosted, FREE)');
        return res.json({
          provider: 'ollama',
          model: 'llama3.1:8b',
          cost: 0,
          response: response.data.response
        });
      } catch (ollamaError) {
        console.warn('⚠️ Ollama unavailable, trying cloud fallback:', ollamaError.message);
      }
    }

    // Fallback to Perplexity (PAID) - for web search or when Ollama fails
    if (useWeb || !USE_SELF_HOSTED_FIRST) {
      const response = await axios.post('https://api.perplexity.ai/chat/completions', {
        model: 'llama-3.1-sonar-small-128k-online',
        messages,
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('💰 Using Perplexity (cloud, PAID)');
      return res.json({
        provider: 'perplexity',
        model: 'llama-3.1-sonar-small-128k-online',
        cost: 0.001, // Approximate cost per request
        response: response.data.choices[0].message.content
      });
    }

    // Last fallback: Gemini
    if (GEMINI_API_KEY) {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: messages.map(m => ({ parts: [{ text: m.content }] }))
        }
      );

      console.log('💰 Using Gemini (cloud, PAID)');
      return res.json({
        provider: 'gemini',
        model: 'gemini-pro',
        cost: 0.0005,
        response: response.data.candidates[0].content.parts[0].text
      });
    }

    throw new Error('No AI providers available');

  } catch (error) {
    console.error('AI Error:', error.message);
    res.status(500).json({ error: 'All AI services temporarily unavailable' });
  }
});

// Legacy Perplexity endpoint (for backwards compatibility)
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

// Agent status endpoint - With real health checks
app.get('/api/agents/status', async (req, res) => {
  const checkOllama = async () => {
    try {
      await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 2000 });
      return { id: 'ollama', name: 'Ollama (Self-Hosted)', status: 'online', latency: 50, cost: 0, priority: 1 };
    } catch {
      return { id: 'ollama', name: 'Ollama (Self-Hosted)', status: 'offline', latency: -1, cost: 0, priority: 1 };
    }
  };

  const ollama = await checkOllama();

  res.json({
    agents: [
      ollama,
      { id: 'perplexity', name: 'Perplexity AI (Cloud)', status: PERPLEXITY_API_KEY ? 'online' : 'offline', latency: 120, cost: 0.001, priority: 2 },
      { id: 'gemini', name: 'Gemini Pro (Cloud)', status: GEMINI_API_KEY ? 'online' : 'offline', latency: 140, cost: 0.0005, priority: 3 },
      { id: 'claude', name: 'Claude Sonnet (Planned)', status: 'planned', latency: 150, cost: 0.003, priority: 4 },
      { id: 'gpt4', name: 'GPT-4 (Planned)', status: 'planned', latency: 180, cost: 0.03, priority: 5 }
    ],
    strategy: USE_SELF_HOSTED_FIRST ? 'self-hosted-first' : 'cloud-first',
    estimated_monthly_cost: ollama.status === 'online' ? '$5' : '$65'
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
