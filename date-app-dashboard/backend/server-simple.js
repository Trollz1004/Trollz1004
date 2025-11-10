const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory storage for demo (use real database in production)
const users = new Map();
const verificationCodes = new Map();

// Generate random 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Signup endpoint - generates verification code
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  // Check if user already exists
  if (users.has(email)) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Generate verification code
  const code = generateCode();
  verificationCodes.set(email, { code, password, timestamp: Date.now() });
  
  // Log code to console (in production, send via email)
  console.log(`\n🔐 Verification Code for ${email}: ${code}\n`);
  
  res.json({ 
    message: 'Verification code sent! Check your console/email.',
    email: email,
    // For demo purposes, return the code (REMOVE IN PRODUCTION!)
    verificationCode: code
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  if (user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  res.json({ 
    token: 'jwt_' + Date.now(),
    user: { 
      id: user.id, 
      email: user.email,
      ageVerified: user.ageVerified || false,
      tosAccepted: user.tosAccepted || false,
      subscriptionStatus: 'none'
    }
  });
});

// Verify email with code
app.post('/api/auth/verify-email', (req, res) => {
  const { email, code } = req.body;
  
  const stored = verificationCodes.get(email);
  if (!stored) {
    return res.status(400).json({ error: 'No verification code found. Please signup first.' });
  }
  
  // Check if code is correct
  if (stored.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }
  
  // Check if code expired (10 minutes)
  if (Date.now() - stored.timestamp > 10 * 60 * 1000) {
    verificationCodes.delete(email);
    return res.status(400).json({ error: 'Verification code expired' });
  }
  
  // Create user account
  const userId = 'user_' + Date.now();
  users.set(email, {
    id: userId,
    email,
    password: stored.password, // In production, hash this!
    emailVerified: true,
    ageVerified: false,
    tosAccepted: false,
    createdAt: new Date().toISOString()
  });
  
  verificationCodes.delete(email);
  
  res.json({ 
    message: 'Email verified successfully!',
    user: { id: userId, email }
  });
});

app.post('/api/auth/verify-age', (req, res) => {
  res.json({ message: 'Age verified!' });
});

app.post('/api/tos/accept', (req, res) => {
  res.json({ message: 'TOS accepted!' });
});

// Catch all
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint not found', path: req.originalUrl });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Simple backend running on port ${PORT}`);
});
