#!/bin/bash
set -e

echo "🚀 YouAndINotAI - Self-Deploying Production Script"
echo "=================================================="

# Create project structure
mkdir -p youandinotai/{apps/api/src,config}
cd youandinotai

echo "📝 Creating all project files..."

# ============================================
# 1. DATABASE SCHEMA
# ============================================
cat > schema.sql <<'EOF'
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(50),
  looking_for VARCHAR(50),
  bio TEXT,
  location VARCHAR(255),
  interests TEXT[],
  photos TEXT[],
  verified BOOLEAN DEFAULT false,
  premium_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE swipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  target_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_id)
);

CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'active',
  matched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  from_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  to_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL,
  square_customer_id VARCHAR(255),
  square_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP
);

CREATE TABLE icebreakers (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  generated_by_ai BOOLEAN DEFAULT false,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_swipes_user ON swipes(user_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
EOF

# ============================================
# 2. DOCKER COMPOSE
# ============================================
cat > docker-compose.yml <<'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: youandinotai_prod
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    restart: always

  api:
    build: ./apps/api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/youandinotai_prod
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      SQUARE_ACCESS_TOKEN: ${SQUARE_ACCESS_TOKEN}
      SQUARE_APPLICATION_ID: ${SQUARE_APPLICATION_ID}
      SQUARE_LOCATION_ID: ${SQUARE_LOCATION_ID}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      AZURE_COGNITIVE_KEY: ${AZURE_COGNITIVE_KEY}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
    restart: always

volumes:
  postgres_data:
  redis_data:
EOF

# ============================================
# 3. PACKAGE.JSON
# ============================================
cat > apps/api/package.json <<'EOF'
{
  "name": "youandinotai-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "socket.io": "^4.6.1",
    "square": "^34.0.0",
    "@google/generative-ai": "^0.1.3",
    "argon2": "^0.31.2",
    "jsonwebtoken": "^9.0.2",
    "redis": "^4.6.7",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/jsonwebtoken": "^9.0.2",
    "@types/node": "^20.3.1",
    "typescript": "^5.1.3",
    "tsx": "^3.12.7"
  }
}
EOF

# ============================================
# 4. TYPESCRIPT CONFIG
# ============================================
cat > apps/api/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
EOF

# ============================================
# 5. DOCKERFILE
# ============================================
cat > apps/api/Dockerfile <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
EOF

# ============================================
# 6. NGINX CONFIG
# ============================================
cat > config/nginx.conf <<'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    server {
        listen 80;
        server_name youandinotai.com www.youandinotai.com;

        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
EOF

# ============================================
# 7. BACKEND API
# ============================================
cat > apps/api/src/index.ts <<'EOF'
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { Client, Environment } from 'square';
import { GoogleGenerativeAI } from '@google/generative-ai';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { createClient } from 'redis';
import pg from 'pg';
import crypto from 'crypto';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: Environment.Production
});

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = gemini.getGenerativeModel({ model: 'gemini-pro' });

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, age, gender, looking_for } = req.body;
    if (!name || !email || !password || !age || !gender || !looking_for) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (parseInt(age) < 18) {
      return res.status(400).json({ error: 'Must be 18 or older' });
    }
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const passwordHash = await argon2.hash(password);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, age, gender, looking_for, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, name, email, age, gender',
      [name, email, passwordHash, age, gender, looking_for]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH, { expiresIn: '7d' });
    res.json({ user, token, refreshToken });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, premium_tier: user.premium_tier }, token, refreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/profiles/queue', authenticateToken, async (req: any, res) => {
  try {
    const cacheKey = `queue:${req.user.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    const profiles = await db.query(
      'SELECT u.id, u.name, u.age, u.bio, u.location, u.interests, u.photos FROM users u WHERE u.id != $1 AND u.verified = true AND u.id NOT IN (SELECT target_id FROM swipes WHERE user_id = $1) LIMIT 20',
      [req.user.id]
    );
    await redis.setEx(cacheKey, 300, JSON.stringify(profiles.rows));
    res.json(profiles.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load profiles' });
  }
});

app.post('/api/profiles/:id/like', authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.query('INSERT INTO swipes (user_id, target_id, action, created_at) VALUES ($1, $2, $3, NOW())', [req.user.id, id, 'like']);
    const mutual = await db.query('SELECT * FROM swipes WHERE user_id = $1 AND target_id = $2 AND action = $3', [id, req.user.id, 'like']);
    if (mutual.rows.length > 0) {
      const matchResult = await db.query('INSERT INTO matches (user1_id, user2_id, matched_at, status) VALUES ($1, $2, NOW(), $3) RETURNING id', [req.user.id, id, 'active']);
      const matchId = matchResult.rows[0].id;
      try {
        const result = await model.generateContent('Generate 3 short, fun icebreaker messages for a dating app match. Keep each under 50 characters. Return as a numbered list.');
        const text = result.response.text();
        const icebreakers = text.split('\n').filter(line => line.trim().match(/^\d/)).map(line => line.replace(/^\d+\.\s*/, ''));
        for (const icebreaker of icebreakers.slice(0, 3)) {
          await db.query('INSERT INTO icebreakers (match_id, content, generated_by_ai) VALUES ($1, $2, true)', [matchId, icebreaker]);
        }
        res.json({ matched: true, matchId, icebreakers: icebreakers.slice(0, 3) });
      } catch (aiError) {
        res.json({ matched: true, matchId, icebreakers: ['Hey! 👋', 'Nice to match!', 'How\'s your day?'] });
      }
    } else {
      res.json({ matched: false });
    }
  } catch (error) {
    res.status(500).json({ error: 'Like failed' });
  }
});

app.get('/api/matches', authenticateToken, async (req: any, res) => {
  try {
    const matches = await db.query(
      'SELECT m.id, m.matched_at, CASE WHEN m.user1_id = $1 THEN u2.id ELSE u1.id END as user_id, CASE WHEN m.user1_id = $1 THEN u2.name ELSE u1.name END as name, CASE WHEN m.user1_id = $1 THEN u2.photos ELSE u1.photos END as photos FROM matches m JOIN users u1 ON m.user1_id = u1.id JOIN users u2 ON m.user2_id = u2.id WHERE (m.user1_id = $1 OR m.user2_id = $1) AND m.status = $2 ORDER BY m.matched_at DESC',
      [req.user.id, 'active']
    );
    res.json(matches.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

app.post('/api/messages', authenticateToken, async (req: any, res) => {
  try {
    const { matchId, toId, content } = req.body;
    const result = await db.query('INSERT INTO messages (match_id, from_id, to_id, content, sent_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *', [matchId, req.user.id, toId, content]);
    const message = result.rows[0];
    io.to(`match-${matchId}`).emit('new-message', message);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.post('/api/payments/subscribe', authenticateToken, async (req: any, res) => {
  try {
    const { tier, cardNonce } = req.body;
    const prices = { starter: BigInt(999), pro: BigInt(1999), premium: BigInt(2999) };
    const customerResponse = await squareClient.customersApi.createCustomer({ emailAddress: req.user.email });
    const customerId = customerResponse.result.customer?.id;
    const subscriptionResponse = await squareClient.subscriptionsApi.createSubscription({
      locationId: process.env.SQUARE_LOCATION_ID!,
      customerId: customerId!,
      planVariationId: tier,
      sourceId: cardNonce,
      priceMoney: { amount: prices[tier as keyof typeof prices], currency: 'USD' }
    });
    await db.query('INSERT INTO subscriptions (user_id, tier, square_customer_id, square_subscription_id, status, start_date) VALUES ($1, $2, $3, $4, $5, NOW())', [req.user.id, tier, customerId, subscriptionResponse.result.subscription?.id, 'active']);
    await db.query('UPDATE users SET premium_tier = $1 WHERE id = $2', [tier, req.user.id]);
    res.json({ success: true, subscription: subscriptionResponse.result.subscription });
  } catch (error) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return next(new Error('Authentication error'));
    socket.data.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  socket.on('join-match', (matchId) => socket.join(`match-${matchId}`));
  socket.on('typing-start', (matchId) => socket.to(`match-${matchId}`).emit('user-typing', socket.data.user.id));
  socket.on('typing-stop', (matchId) => socket.to(`match-${matchId}`).emit('user-stopped-typing', socket.data.user.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
EOF

# ============================================
# 8. GENERATE SECRETS
# ============================================
echo "🔐 Generating secure secrets..."
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# ============================================
# 9. CREATE .ENV FILE WITH REAL CREDENTIALS
# ============================================
echo "📝 Creating .env.production with real credentials..."
cat > .env.production <<EOF
# Auto-generated secrets
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Real production credentials
SQUARE_ACCESS_TOKEN=EAAAlzPv9mOdHtwWwGJsCHXaG_5Ektf_rIvg4H6tiKRzTQSW9UHiVHUBDuHTOQYc
SQUARE_APPLICATION_ID=sq0idp-Carv59GQKuQHoIydJ1Wanw
SQUARE_LOCATION_ID=LHPBX0P3TBTEC
GEMINI_API_KEY=AIzaSyBuaA6sdJ2kvIeXiL1jY4Qm7StXAUwFWG4
AZURE_COGNITIVE_KEY=CScbecGnFd4YLCWpvmdAZ5yxkV6U2O5L02xPcp6f2bEYIMiJesdtJQQJ99BHACYeBjFXJ3w3AAABACOGHJUX
EOF

echo "✅ Real credentials added automatically!"

# Load environment variables
export $(cat .env.production | xargs)

# ============================================
# 10. INSTALL DOCKER (if needed)
# ============================================
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    apt-get install -y docker-compose
fi

# ============================================
# 11. BUILD AND START SERVICES
# ============================================
echo "🚀 Building and starting services..."
docker-compose up -d --build

# ============================================
# 12. WAIT FOR SERVICES
# ============================================
echo "⏳ Waiting for services to start..."
sleep 20

# ============================================
# 13. VERIFY DEPLOYMENT
# ============================================
echo "🔍 Verifying deployment..."
if curl -f http://localhost:3000/health &> /dev/null; then
    echo "✅ API is healthy!"
else
    echo "❌ API health check failed"
    docker-compose logs api
    exit 1
fi

# ============================================
# 14. SSL SETUP (optional)
# ============================================
read -p "Setup SSL with Let's Encrypt? (y/n): " setup_ssl
if [[ $setup_ssl == "y" ]]; then
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx
    fi
    certbot --nginx -d youandinotai.com -d www.youandinotai.com \
        --non-interactive --agree-tos -m admin@youandinotai.com || echo "⚠️  SSL setup failed - continue manually"
fi

# ============================================
# 15. SUMMARY
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Services Status:"
docker-compose ps
echo ""
echo "🌐 Your platform is live:"
echo "   Local:      http://localhost:3000"
echo "   Production: http://youandinotai.com"
echo ""
echo "📝 Useful Commands:"
echo "   View logs:       docker-compose logs -f api"
echo "   Restart:         docker-compose restart"
echo "   Stop:            docker-compose down"
echo "   Database shell:  docker-compose exec postgres psql -U postgres youandinotai_prod"
echo ""
echo "🎉 YouAndINotAI is ready for production!"
echo ""
