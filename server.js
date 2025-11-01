const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'YouAndINotAI V8',
    ein: '33-4655313',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    service: 'YouAndINotAI V8',
    version: '8.0.0',
    domain: 'youandinotai.com',
    ein: '33-4655313',
    business: 'Trash or Treasure Online Recycler LLC'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'YouAndINotAI V8',
    message: 'Welcome to YouAndINotAI - Dating with AI',
    endpoints: {
      health: '/health',
      status: '/api/status'
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ YouAndINotAI V8 running on port ' + PORT);
});
