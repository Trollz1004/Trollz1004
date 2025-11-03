# 🔐 Environment Configuration Guide

## Files Created

✅ **Backend `.env`** - `date-app-dashboard/backend/.env`
✅ **Frontend `.env`** - `date-app-dashboard/frontend/.env`
✅ **Template** - `.env.example` (existing)

## Backend Environment Variables

### Database
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trollz_dating
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trollz_dating
DB_USER=postgres
DB_PASSWORD=postgres
```

### Server
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### JWT Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-change-in-production-trollz2024
JWT_EXPIRES_IN=24h
```

### Payment Processing
```env
# Stripe (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Square (Primary)
SQUARE_ACCESS_TOKEN=your_square_access_token_here
SQUARE_APPLICATION_ID=your_square_application_id_here
SQUARE_ENVIRONMENT=SANDBOX
```

### File Upload
```env
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Age Verification
```env
MIN_AGE=18
AGE_VERIFICATION_REQUIRED=true
```

### CORS
```env
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000,http://localhost:5173
```

### Email (Optional)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@trollzapp.com
```

### Redis (Optional)
```env
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Logging
```env
LOG_LEVEL=debug
LOG_FILE=logs/combined.log
```

## Frontend Environment Variables

### API Configuration
```env
VITE_API_URL=http://localhost:4000
VITE_API_BASE_PATH=/api
```

### Firebase (Optional)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id_here
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here
```

### App Configuration
```env
VITE_APP_NAME=Trollz Dating
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development
```

### Feature Flags
```env
VITE_ENABLE_SOCKET_IO=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_PUSH_NOTIFICATIONS=false
```

### Socket.io
```env
VITE_SOCKET_URL=http://localhost:4000
VITE_SOCKET_PATH=/socket.io
```

### Debug
```env
VITE_DEBUG=true
VITE_LOG_LEVEL=debug
```

## Setup Instructions

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb trollz_dating

# Or via psql
psql -U postgres
CREATE DATABASE trollz_dating;
\q
```

### 2. Backend Setup

```bash
cd date-app-dashboard/backend

# Install dependencies
npm install

# Start server
npm run start
```

**Expected Output:**
```
✅ Server running on port 4000
📍 Environment: development
📊 Database initialized successfully
```

### 3. Frontend Setup

```bash
cd date-app-dashboard/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**Expected Output:**
```
  VITE v4.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 4. Test Connection

```bash
# In new terminal, test backend
curl http://localhost:4000/health

# Expected response
{"status":"ok","timestamp":"2024-11-02T..."}
```

## Environment Variables Quick Reference

| Variable | Backend | Frontend | Purpose |
|----------|---------|----------|---------|
| NODE_ENV | ✅ | - | Development/Production mode |
| PORT | ✅ (4000) | - | Backend server port |
| DATABASE_URL | ✅ | - | PostgreSQL connection |
| JWT_SECRET | ✅ | - | Token signing key |
| VITE_API_URL | - | ✅ | Backend API endpoint |
| SQUARE_ACCESS_TOKEN | ✅ | - | Payment processing |
| FRONTEND_URL | ✅ | - | CORS allowed origin |
| REDIS_URL | ✅ (opt) | - | Caching/sessions |

## Important Notes

### Security Best Practices

⚠️ **NEVER commit `.env` files to Git**
- Both `.env` files are configured to be ignored (`.gitignore`)
- Manually create `.env` on each machine
- Use different values for development/staging/production

### Production Changes Needed

Before deploying to production:

1. **Database**
   ```env
   DATABASE_URL=<AWS RDS endpoint>
   DB_USER=<strong username>
   DB_PASSWORD=<strong password>
   ```

2. **JWT Secret**
   ```env
   JWT_SECRET=<generate 32+ char random string>
   ```

3. **Square Account**
   ```env
   SQUARE_ENVIRONMENT=PRODUCTION
   SQUARE_ACCESS_TOKEN=<live token>
   SQUARE_APPLICATION_ID=<live app id>
   ```

4. **CORS**
   ```env
   FRONTEND_URL=https://yourdomain.com
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

5. **Node Environment**
   ```env
   NODE_ENV=production
   ```

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running
```bash
# macOS
brew services start postgresql

# Windows (use Services app or)
net start postgresql-x64-15
```

### Port Already in Use
```
Error: listen EADDRINUSE :::4000
```
**Solution:** Kill process on port 4000
```bash
# macOS/Linux
lsof -ti:4000 | xargs kill -9

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### JWT Token Error
```
Error: jwt malformed
```
**Solution:** Check JWT_SECRET is properly set in `.env`
- Minimum 32 characters
- No spaces or special characters that need escaping

### CORS Error
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**Solution:** Check `ALLOWED_ORIGINS` and `FRONTEND_URL`
```env
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3000
```

## Development Workflow

### Local Development
```bash
# Terminal 1: Backend
cd backend
npm install
npm run start
# Backend runs on http://localhost:4000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### API Testing
```bash
# Test signup
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123"}'

# Test health check
curl http://localhost:4000/health
```

## Environment Template Comparison

### Backend `.env.example` (Template)
- Located in project root
- Has placeholder values
- Commit to Git (with placeholders)

### Backend `.env` (Development)
- Located in `backend/` directory
- Has actual development values
- Ignore in Git (for security)

### Frontend `.env` (Development)
- Located in `frontend/` directory
- Has actual development values
- Ignore in Git (for security)

## Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] `.env` file created in backend/
- [ ] `.env` file created in frontend/
- [ ] DATABASE_URL points to created database
- [ ] JWT_SECRET is set (32+ characters)
- [ ] Backend npm install completed
- [ ] Frontend npm install completed
- [ ] Backend starts without errors (npm run start)
- [ ] Frontend starts without errors (npm run dev)
- [ ] Health check endpoint responds (http://localhost:4000/health)
- [ ] Frontend can reach backend (check browser console)
- [ ] Can signup and create account

## Next Steps

1. **Create Database:** `createdb trollz_dating`
2. **Install Backend Dependencies:** `cd backend && npm install`
3. **Install Frontend Dependencies:** `cd frontend && npm install`
4. **Start Backend:** `npm run start` (in backend terminal)
5. **Start Frontend:** `npm run dev` (in frontend terminal)
6. **Test Integration:** Visit http://localhost:5173 and test signup flow

---

All environment files are ready. You can now run the full application locally!

