# Backend Quick Start Guide

## Prerequisites

- Node.js 16+ 
- PostgreSQL 15+
- npm or yarn

## Installation

### 1. Install Dependencies
```bash
cd date-app-dashboard/backend
npm install
```

### 2. Environment Variables

Create `.env` file in `backend/` directory:

```env
# Server
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/trollz_dating
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trollz_dating
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Square (Payment)
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_ENVIRONMENT=SANDBOX  # or PRODUCTION

# Email (Optional for development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Firebase (Legacy, but keep if using Firebase services)
FIREBASE_SERVICE_ACCOUNT_KEY={}
```

### 3. Create PostgreSQL Database

```bash
# Create database
createdb trollz_dating

# Or via psql
psql -U postgres
CREATE DATABASE trollz_dating;
\q
```

### 4. Start the Server

```bash
npm run start
```

Server will run on `http://localhost:4000`

## Development Commands

```bash
# Start server with hot-reload
npm run start

# Build TypeScript
npm run build

# Seed database (optional)
npm run seed
```

## Testing the API

### 1. Register User
```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### 2. Send Verification Email
```bash
curl -X POST http://localhost:4000/api/auth/verify-email/send \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 3. Verify Email
```bash
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456"
  }'
```

### 4. Verify Age (with birthdate)
```bash
curl -X POST http://localhost:4000/api/auth/verify-age \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "birthdate": "1990-05-15"
  }'
```

### 5. Accept TOS
```bash
curl -X POST http://localhost:4000/api/auth/accept-tos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "version": "1.0"
  }'
```

### 6. Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "email_verified": true,
    "age_verified": true
  }
}
```

### 7. Create Profile
```bash
curl -X POST http://localhost:4000/api/profiles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=John Doe" \
  -F "bio=Love hiking and coffee" \
  -F "interests=hiking,travel,cooking" \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg"
```

### 8. Get Next Profile to Swipe
```bash
curl -X GET http://localhost:4000/api/profiles/discover \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. Like a Profile
```bash
curl -X POST http://localhost:4000/api/matches/like/target-user-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 10. Get All Matches
```bash
curl -X GET http://localhost:4000/api/matches \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 11. Send Message to Match
```bash
curl -X POST http://localhost:4000/api/matches/1/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hey, how are you?"
  }'
```

### 12. Get Messages in Match
```bash
curl -X GET http://localhost:4000/api/matches/1/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 13. Get User Analytics
```bash
curl -X GET http://localhost:4000/api/analytics/user \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 14. Get Subscription Tiers
```bash
curl -X GET http://localhost:4000/api/subscriptions/tiers
```

### 15. Health Check
```bash
curl http://localhost:4000/health
```

## Connecting to Frontend

The frontend (port 3000) will connect to backend (port 4000) via the API proxy:

**Frontend API Configuration** (`frontend/src/api/axios.ts`):
```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
```

When calling endpoints from frontend:
```typescript
// Frontend doesn't need to include host:
const response = await axios.get('/api/matches', {
  headers: { Authorization: `Bearer ${token}` }
});
```

## Docker Setup (Optional)

```bash
# Build image
docker build -t trollz-backend .

# Run container
docker run -p 4000:4000 --env-file .env trollz-backend
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 4000
lsof -ti:4000 | xargs kill -9
```

### Database Connection Error
```bash
# Verify PostgreSQL is running
psql -U postgres -l

# Check credentials in .env
```

### JWT Token Errors
- Ensure `JWT_SECRET` is set in `.env`
- Token expires in 24 hours
- Include `Authorization: Bearer TOKEN` in headers

### Multer Upload Issues
- Max file size: 10MB per request
- Max 6 photos per profile
- Supported: JPG, PNG, GIF

## Logs

Check `logs/combined.log` for detailed logs:
```bash
tail -f logs/combined.log
```

## Next: Integration Testing

1. Start backend: `npm run start`
2. Start frontend in different terminal: `cd frontend && npm run dev`
3. Navigate to `http://localhost:3000`
4. Test complete auth flow through UI

