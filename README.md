# Trollz1004 - Dating App Platform

Full-stack dating application with React frontend, Node.js/Express backend, and PostgreSQL database.

## 🎯 Project Status

| Component | Status | Progress |
|-----------|--------|----------|
| **Frontend** | ✅ Complete | 100% - All components built & styled |
| **Backend** | 🟡 In Progress | 60% - Core API ready, real-time pending |
| **Database** | ✅ Complete | 100% - 11 tables with relationships |
| **Integration** | 🟡 Ready | Can start testing end-to-end |
| **Deployment** | ⏹️ Pending | Docker/AWS setup ready |

## 📁 Project Structure

```
date-app-dashboard/
├── backend/
│   ├── src/
│   │   ├── index.ts              (Express server, 4000)
│   │   ├── database.ts           (PostgreSQL 11 tables)
│   │   ├── logger.ts             (Winston logging)
│   │   ├── socket.ts             (Socket.io config)
│   │   ├── middleware/
│   │   │   ├── auth.ts           (JWT verification)
│   │   │   ├── admin.ts          (Admin checks)
│   │   │   └── validation.ts     (Input validation)
│   │   └── routes/
│   │       ├── auth.ts           (9 endpoints)
│   │       ├── profile.ts        (4 endpoints)
│   │       ├── matches.ts        (5 endpoints)
│   │       ├── subscriptions.ts  (4 endpoints)
│   │       ├── analytics.ts      (3 endpoints)
│   │       ├── admin.ts          (Admin endpoints)
│   │       └── search.ts         (Discovery)
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/           (15 components)
│   │   ├── store/                (Auth, theme)
│   │   ├── api/                  (Axios client)
│   │   └── setupTests.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── jest.config.js
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml

Documentation/
├── BACKEND_IMPLEMENTATION.md
├── BACKEND_QUICKSTART.md
├── INTEGRATION_STATUS.md
└── API_ENDPOINTS.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 15+
- npm or yarn

### Backend Setup

```bash
cd date-app-dashboard/backend
npm install

# Create .env file
cat > .env << EOF
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/trollz_dating
JWT_SECRET=your-secret-key-here-min-32-chars
SQUARE_ACCESS_TOKEN=your_square_token
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF

# Create database
createdb trollz_dating

# Start server
npm run start
```

Backend runs on `http://localhost:4000`

### Frontend Setup

```bash
cd date-app-dashboard/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📡 API Endpoints (28 Total)

### Authentication (9 endpoints)
```
POST   /api/auth/signup
POST   /api/auth/verify-email/send
POST   /api/auth/verify-email
POST   /api/auth/verify-age
POST   /api/auth/verify-phone/send
POST   /api/auth/verify-phone
POST   /api/auth/accept-tos
POST   /api/auth/login
POST   /api/auth/logout
```

### Profiles (4 endpoints)
```
POST   /api/profiles                 - Create profile with photos
GET    /api/profiles/discover        - Get next profile to swipe
GET    /api/profiles/:userId         - Get profile details
PUT    /api/profiles                 - Update profile
```

### Matching (5 endpoints)
```
POST   /api/matches/like/:targetId   - Like a profile
POST   /api/matches/pass/:targetId   - Pass on profile
GET    /api/matches                  - Get all matches
POST   /api/matches/:matchId/message - Send message
GET    /api/matches/:matchId/messages - Get message history
```

### Subscriptions (4 endpoints)
```
POST   /api/subscriptions/create     - Start subscription
GET    /api/subscriptions/current    - Get active subscription
POST   /api/subscriptions/cancel     - Cancel subscription
GET    /api/subscriptions/tiers      - List available tiers
```

### Analytics (3 endpoints)
```
GET    /api/analytics/user           - User engagement metrics
GET    /api/analytics/admin          - Platform metrics
GET    /api/analytics/distribution   - Match trends
```

### Other
```
GET    /health                       - Health check
```

## 🔐 Security Features

✅ **Implemented:**
- Password hashing (bcrypt, 12 rounds)
- JWT authentication (24-hour expiry)
- Birthdate encryption (AES-256)
- Phone hashing (SHA256, irreversible)
- CORS restriction (frontend only)
- Rate limiting (100 req/15 min per IP)
- SQL injection prevention (parameterized queries)
- Authorization checks on all protected routes
- Helmet security headers

## 📊 Database Schema

**11 Tables:**
1. `users` - Core user data with encryption
2. `profiles` - Dating profiles with photos
3. `matches` - Match relationships
4. `messages` - Chat history
5. `interactions` - Like/Pass tracking
6. `subscriptions` - Billing tiers
7. `transactions` - Payment history
8. `tos_acceptance` - Legal audit trail
9. `verification_codes` - Email/SMS codes
10. `admin_logs` - Admin action logs
11. `blacklist` - Banned/suspended users

## 🎨 Frontend Components

**15 Components:**
- Auth flow (Signup, Login, VerifyEmail, VerifyAge, AcceptTOS)
- Main app (Dashboard, Profile, Discover)
- Messaging (Chat, Matches)
- Features (Subscriptions, Analytics, Admin)
- Shared (Navigation, Theme, Forms)

## 💳 Payment Integration

- **Square** - Primary payment processor (LIVE mode ready)
- **Subscription Tiers:**
  - Premium: $9.99/mo (unlimited likes, priority messaging)
  - Gold: $19.99/mo (+ profile boost)
  - Platinum: $49.99/mo (+ concierge)

## 🧪 Testing API

### Example: Complete Auth Flow
```bash
# 1. Sign up
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# 2. Verify email (code sent to console)
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'

# 3. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'

# 4. Create profile (with JWT token)
curl -X POST http://localhost:4000/api/profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=John Doe" \
  -F "bio=Love hiking" \
  -F "interests=hiking,travel" \
  -F "photos=@photo.jpg"

# 5. Discover profiles
curl -X GET http://localhost:4000/api/profiles/discover \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. Like a profile
curl -X POST http://localhost:4000/api/matches/like/USER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

See `BACKEND_QUICKSTART.md` for complete API examples.

## 📚 Documentation

- **[BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)** - Detailed API specs and database schema
- **[BACKEND_QUICKSTART.md](BACKEND_QUICKSTART.md)** - How to run and test backend locally
- **[INTEGRATION_STATUS.md](INTEGRATION_STATUS.md)** - Current status and next steps
- **[date-app-dashboard/README.md](date-app-dashboard/README.md)** - Project overview

## 🐳 Docker Setup

```bash
# Build and run with docker-compose
cd date-app-dashboard
docker-compose up

# Or manually
docker build -f backend/Dockerfile -t trollz-backend ./backend
docker run -p 4000:4000 --env-file .env trollz-backend
```

## 📈 Development Roadmap

### ✅ Completed
- Frontend (all components)
- Database schema
- Authentication system
- Profile management
- Matching engine
- Messaging (DB layer)
- Analytics
- Subscription tiers

### 🟡 In Progress
- Real-time messaging (Socket.io)
- Image uploads (S3 integration)
- Email notifications
- Advanced search/filtering
- Admin moderation

### ⏹️ Coming Soon
- Two-factor authentication (TOTP)
- User blocking/reporting
- Payment processing (live)
- Mobile app (React Native)
- Recommendation engine
- Performance optimization

## 📱 Supported Features

| Feature | Status | Notes |
|---------|--------|-------|
| Email signup | ✅ | With verification |
| Password reset | ✅ | Via email code |
| Profile creation | ✅ | With up to 6 photos |
| Discovery swipe | ✅ | Algorithm excludes seen |
| Matching | ✅ | Mutual like detection |
| Messaging | ✅ | Via HTTP (polling ready) |
| Real-time chat | 🟡 | Socket.io ready, not wired |
| Subscriptions | ✅ | Three tiers, Square integrated |
| User analytics | ✅ | Personal metrics |
| Admin dashboard | ✅ | Platform metrics |

## ⚠️ Current Limitations

1. **Image Storage** - Local only (no S3)
2. **Real-time Messages** - Polling only (Socket.io ready)
3. **Email Notifications** - Not sent (Nodemailer ready)
4. **Advanced Search** - Basic only
5. **SMS** - Placeholder only

See `INTEGRATION_STATUS.md` for detailed roadmap.

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Axios
- Zustand (auth store)
- CSS3 (responsive design)

**Backend:**
- Node.js + Express
- TypeScript
- PostgreSQL
- JWT (jsonwebtoken)
- Bcrypt (password hashing)
- Square API
- Socket.io (ready)
- Winston (logging)
- Multer (file uploads)

**Deployment Ready:**
- Docker support
- GitHub Actions CI/CD template
- AWS deployment scripts
- Environment configuration

## 📞 Support

**Common Issues:**

```bash
# Port 4000 already in use
lsof -ti:4000 | xargs kill -9

# PostgreSQL connection error
psql -U postgres -c "CREATE DATABASE trollz_dating;"

# JWT token error
# Ensure JWT_SECRET is set in .env (min 32 chars)

# CORS error
# Check FRONTEND_URL in .env matches frontend port
```

For detailed troubleshooting, see `BACKEND_QUICKSTART.md`.

## 📄 License

All rights reserved. Proprietary code.

---

**Status:** Ready for integration testing and deployment preparation.
**Last Updated:** 2024
**Maintained by:** Development Team

