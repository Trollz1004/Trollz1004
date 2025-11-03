# Amazon Q Production Code Generation Prompt

**CRITICAL: Copy this ENTIRE prompt into Amazon Q. No modifications. Execute exactly as written.**

---

## TASK: Build Complete Dating App Backend with Live Square Payments

**Project**: `date-app-dashboard/backend`  
**Language**: TypeScript (Node.js + Express)  
**Database**: PostgreSQL  
**Payments**: Square (LIVE MODE ONLY, no sandbox)  
**Deployment**: Docker + AWS  

---

## REQUIREMENTS (EXECUTE ONLY THESE)

### 1. COMPLETE DATABASE SCHEMA
Generate complete `src/database/schema.sql`:
- `users` table (id, email, phone, birthdate, age_verified, tos_accepted, tos_version, created_at)
- `age_verifications` table (user_id, birthdate_encrypted, verification_method, stripe_id, verified_at, ip_address)
- `phone_verifications` table (user_id, phone_hash, verification_code_hash, verified, verified_at)
- `profiles` table (user_id, bio, photos, interests, location, lat, lng, gender, looking_for)
- `matches` table (user_a_id, user_b_id, matched_at, status, chat_active)
- `messages` table (match_id, sender_id, content, sent_at, read_at)
- `square_customers` table (user_id, square_customer_id, created_at)
- `square_payments` table (payment_id, user_id, amount, currency, status, receipt_url, created_at)
- All tables include: created_at, updated_at, deleted_at (soft delete)
- All sensitive fields encrypted: birthdate, phone_hash, SSN
- All tables indexed on: user_id, created_at, status

Generate migration file: `src/database/migrations/001_initial_schema.sql`

### 2. AGE VERIFICATION SYSTEM (18+ MANDATORY)
Create `src/middleware/ageVerification.ts`:
- Function: `verifyAgeMiddleware()` - checks user.age_verified === true before any dating feature access
- Function: `requireStrictAgeCheck()` - enforces ID verification (Stripe Identity) for premium features
- Email verification (Nodemailer: 6-digit code, 15min expiry)
- Phone verification (Twilio: SMS 6-digit code, 10min expiry)
- Age calculation: `Math.floor((Date.now() - birthdate) / (1000 * 60 * 60 * 24 * 365.25)) >= 18`
- Database logging: user_id, verification_method, verified_at, ip_address, user_agent
- Reject: any user age < 18 → return 403 Forbidden

### 3. TERMS OF SERVICE + LIABILITY
Create `src/routes/tos.ts`:
- GET `/api/tos/current` - returns latest TOS version + version number
- POST `/api/tos/accept` - requires: {email, tos_version, accepted_liability_checkbox: true}
  - Validation: all checkboxes must be true
  - Create record: user_tos_acceptance (user_id, tos_version, accepted_at, ip_address, user_agent)
  - Immutable: cannot modify after creation
- TOS content in `src/data/tos.txt`:
  - Section 1: Age 18+ legally binding requirement
  - Section 2: No harassment policy
  - Section 3: User assumes risk meeting strangers
  - Section 4: Company liability limited to refunds only
  - Section 5: Data privacy (GDPR/CCPA)

### 4. SQUARE INTEGRATION (LIVE PAYMENTS ONLY)
Create `src/integrations/square.ts`:
- Initialize: `const client = new Client({ accessToken: process.env.SQUARE_ACCESS_TOKEN, environment: Environment.Production })`
- Function: `createSquareCustomer(email, phone)` - returns square_customer_id
- Function: `createPayment(user_id, amount_cents, payment_source_token)` - LIVE mode only
  - Idempotency key: `${user_id}-${Date.now()}`
  - Response: { payment_id, status, receipt_url }
  - Log to square_payments table
- Function: `getPaymentStatus(payment_id)` - returns payment details
- Function: `refundPayment(payment_id, amount_cents)` - full or partial refund
- Error handling: catch Square errors, log to Sentry, retry max 3 times
- Webhook handler: POST `/webhooks/square/payment.updated` - update square_payments table status

### 5. AUTH ROUTES (18+ ENFORCED)
Create `src/routes/auth.ts`:
- POST `/api/auth/signup`
  - Body: { email, password, birthdate, phone_number }
  - Steps:
    1. Validate: email format, password strength (12+ chars, 1 upper, 1 number, 1 special)
    2. Check age: `(Date.now() - birthdate) >= 18 years` → reject if false
    3. Hash password: bcrypt (salt 12)
    4. Create user record (age_verified: false initially)
    5. Send email verification code (Nodemailer)
    6. Return: { user_id, message: "Check your email" }

- POST `/api/auth/verify-email`
  - Body: { email, verification_code }
  - Validate code (max 3 attempts, rate limit)
  - Set: email_verified: true, verified_at: now
  - Return: JWT token (24hr expiry)

- POST `/api/auth/verify-phone`
  - Body: { phone_number, verification_code }
  - Twilio SMS validation
  - Set: phone_verified: true
  - No token yet (complete signup first)

- POST `/api/auth/accept-tos`
  - Require: JWT token from email verification
  - Body: { tos_version, liability_checkbox: true }
  - Validate all checkboxes checked
  - Create user_tos_acceptance record
  - Return: upgraded JWT token (now can access dating features)

- POST `/api/auth/login`
  - Body: { email, password }
  - Validate: age_verified && tos_accepted before issuing token
  - Return: JWT token (24hr expiry)

### 6. PROFILE ROUTES (18+ VERIFIED ONLY)
Create `src/routes/profiles.ts`:
- Middleware: `@requireAuth @requireAgeVerified @requireTosAccepted`
- POST `/api/profiles` - create profile
  - Body: { bio, interests[], gender, looking_for, photos[] }
  - Validate: bio max 500 chars, max 6 photos, gender in ['M', 'F', 'Other']
  - Create profiles table record
  - Return: { profile_id, created_at }

- GET `/api/profiles/me` - get own profile
- PUT `/api/profiles/me` - update own profile
- GET `/api/profiles/nearby?lat=X&lng=Y&distance_km=10` - get profiles within distance
  - Use PostGIS: `ST_DWithin(location_point, user_point, distance_m)`
  - Return: paginated profiles (12 per page)
  - Exclude: blocked users, already matched
  - Order by: distance ASC, last_active DESC

### 7. MATCHING ALGORITHM
Create `src/services/matchingService.ts`:
- Function: `getMatches(user_id)` - returns matching profiles
  - Filter: age_verified && tos_accepted
  - Filter: matching gender preferences (bidirectional)
  - Filter: within distance radius
  - Order: mutual interests score DESC
  - Limit: 50 per day free, unlimited with payment
  - Log all swipes: user_id, target_id, action ('like'|'pass'), timestamp

- Function: `recordLike(user_a_id, user_b_id)` - record like action
  - Check: mutual like → create match
  - If match: enable chat between both users
  - Notify: send in-app notification to both users

### 8. CHAT ROUTES (WEBSOCKET)
Create `src/routes/chat.ts`:
- Socket.io integration
- POST `/api/chat/history?match_id=X` - get message history (paginated, 50 per page)
- Socket event: `chat:message` → broadcast to match participants
  - Structure: { match_id, sender_id, content, sent_at }
  - Store in messages table
  - Rate limit: max 50 messages/min per user
- Socket event: `chat:typing` → broadcast typing indicator
- Socket event: `chat:read` → update read_at timestamp

### 9. PAYMENTS + SUBSCRIPTION ROUTES
Create `src/routes/payments.ts`:
- POST `/api/payments/create-payment-token`
  - Call Square Web Payments API (frontend generates token)
  - Body: { user_id, amount_cents, card_token }
  - Create Square customer if new
  - Call Square createPayment()
  - On success: create subscription record (if recurring)
  - Return: { payment_id, status, receipt_url }

- POST `/api/payments/subscribe`
  - Body: { subscription_type: 'premium'|'elite'|'vip', billing_cycle: 'monthly'|'yearly' }
  - Prices: premium=$9.99/mo, elite=$29.99/mo, vip=$99.99/mo
  - Create recurring Square subscription
  - Set user.subscription_tier
  - Return: { subscription_id, next_billing_date, receipt_url }

- POST `/api/payments/cancel-subscription`
  - Cancel Square subscription
  - Set user.subscription_tier = null
  - Return: { status: 'cancelled' }

- GET `/api/payments/receipts` - list past receipts
  - Return: array of { payment_id, amount, date, receipt_url }

### 10. MERCH STORE ROUTES
Create `src/routes/merch.ts`:
- GET `/api/merch/products` - list all merch
  - Query: { category, sort_by, page }
  - Return: { products: [], total_count, page, per_page }

- POST `/api/merch/order`
  - Body: { products: [{product_id, quantity, size, color}], shipping_address }
  - Calculate: total = sum(item_prices) + $10 shipping
  - Create Square payment
  - On success: create merch_order record, send fulfillment to Printful
  - Return: { order_id, tracking_number_pending, estimated_delivery }

- GET `/api/merch/orders` - list user's merch orders
  - Return: paginated orders with status

### 11. MIDDLEWARE (ALL CRITICAL)
Create `src/middleware/` files:

**auth.ts**:
- `requireAuth` - validate JWT, return 401 if invalid
- Extract: user_id from JWT payload
- Check: user not deleted

**ageVerification.ts**:
- `requireAgeVerified` - check user.age_verified === true (return 403 if false)
- Log: any attempt to access without verification

**tosAcceptance.ts**:
- `requireTosAccepted` - check user.tos_accepted === true (return 403 if false)
- Check: user accepted current TOS version

**rateLimiting.ts**:
- Redis-based rate limiter
- Limits: 100 req/min per IP, 1000 req/min per user
- Endpoints: auth (20 req/min), payments (5 req/min)

**errorHandler.ts**:
- Catch all errors → standardized JSON response
- Never leak PII in error messages
- Log to Sentry with user_id, timestamp, request_id
- Return: { error, message, status_code }

**validation.ts**:
- Zod schemas for all request bodies
- Validate before reaching controllers

### 12. DATABASE MIGRATIONS
Create `src/database/migrations/` with numbered files:
- Run automatically on app startup via `migrate-up`
- Rollback via `migrate-down`
- Schema versioning in `_migrations` table

### 13. ENVIRONMENT CONFIGURATION
Create `.env.example`:
```
# Server
NODE_ENV=production
PORT=5000
APP_URL=https://dating-api.yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dating_app
DATABASE_SSL=true

# Square (LIVE MODE)
SQUARE_ACCESS_TOKEN=sq_live_XXXXX
SQUARE_ENVIRONMENT=Production
SQUARE_LOCATION_ID=XXXXX

# Twilio
TWILIO_ACCOUNT_SID=XXXXX
TWILIO_AUTH_TOKEN=XXXXX
TWILIO_PHONE=+1234567890

# Nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT
JWT_SECRET=super-secret-key-min-32-chars
JWT_EXPIRY=24h

# Redis
REDIS_URL=redis://localhost:6379

# Sentry
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# AWS (for S3 backups)
AWS_ACCESS_KEY_ID=XXXXX
AWS_SECRET_ACCESS_KEY=XXXXX
AWS_REGION=us-east-1
S3_BUCKET=dating-app-backups
```

### 14. DOCKER SETUP
Create `Dockerfile`:
- Base: node:20-alpine
- Install: npm ci
- Build: npm run build
- Expose: 5000
- Health check: curl http://localhost:5000/health
- Non-root user: node

Create `docker-compose.yml`:
- Services: app, postgres, redis
- Volumes: persistent for postgres data
- Environment: sourced from .env
- Auto-migrations: `npm run db:migrate` on startup

### 15. DATABASE CONNECTION POOL
Create `src/database/pool.ts`:
- Use `pg` library with connection pool
- Pool size: 20 (production)
- Idle timeout: 30s
- Connection timeout: 10s
- Query timeout: 30s
- Log slow queries (>5s)

### 16. ERROR HANDLING + LOGGING
Create `src/utils/logger.ts`:
- Winston logger
- Log to: console (dev), file (prod)
- Levels: error, warn, info, debug
- Fields: timestamp, user_id, request_id, level, message, stack trace
- Never log: passwords, tokens, PII

### 17. SECURITY HEADERS
Create `src/middleware/security.ts`:
- helmet() for all headers
- CORS: allow only production domain
- Rate limiting on all routes
- SQL injection prevention: parameterized queries only
- XSS prevention: sanitize all inputs
- CSRF tokens: on all POST endpoints

### 18. TESTING (UNIT TESTS)
Create `src/tests/`:
- Auth tests: signup, verify age, TOS acceptance, login
- Payment tests: Square payment creation (mock Square SDK)
- Match tests: algorithm, filtering
- All tests use Jest
- Coverage target: 80%+ on critical paths (auth, payments)

### 19. API DOCUMENTATION (SWAGGER)
Create `src/swagger.ts`:
- Generate OpenAPI 3.0 spec
- Document all endpoints with:
  - Parameters
  - Request body schema
  - Response schema
  - Authentication required (yes/no)
  - Rate limits
- Serve at: GET `/api-docs`

### 20. DEPLOYMENT SCRIPT
Create `deploy.sh`:
```bash
#!/bin/bash
set -e

# Build Docker image
docker build -t dating-app-backend:latest .

# Push to AWS ECR (replace with your registry)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin XXXXX.dkr.ecr.us-east-1.amazonaws.com
docker tag dating-app-backend:latest XXXXX.dkr.ecr.us-east-1.amazonaws.com/dating-app-backend:latest
docker push XXXXX.dkr.ecr.us-east-1.amazonaws.com/dating-app-backend:latest

# Deploy to ECS (or your container orchestration)
aws ecs update-service --cluster dating-app --service dating-app-backend --force-new-deployment

echo "Deployment complete!"
```

---

## DELIVERABLES (GENERATE ALL)

1. ✅ `src/database/schema.sql` - complete database schema
2. ✅ `src/database/migrations/001_initial_schema.sql` - migration file
3. ✅ `src/middleware/ageVerification.ts` - age verification
4. ✅ `src/middleware/auth.ts` - JWT authentication
5. ✅ `src/middleware/tosAcceptance.ts` - TOS enforcement
6. ✅ `src/middleware/errorHandler.ts` - error handling
7. ✅ `src/routes/auth.ts` - signup, login, verification
8. ✅ `src/routes/tos.ts` - TOS retrieval and acceptance
9. ✅ `src/routes/profiles.ts` - profile management
10. ✅ `src/routes/matches.ts` - matching algorithm
11. ✅ `src/routes/chat.ts` - messaging (Socket.io)
12. ✅ `src/routes/payments.ts` - Square payment routes
13. ✅ `src/routes/merch.ts` - merch store routes
14. ✅ `src/integrations/square.ts` - Square API integration
15. ✅ `src/integrations/twilio.ts` - SMS verification
16. ✅ `src/integrations/nodemailer.ts` - email verification
17. ✅ `src/services/matchingService.ts` - matching logic
18. ✅ `src/database/pool.ts` - connection pooling
19. ✅ `src/utils/logger.ts` - logging
20. ✅ `src/index.ts` - main app entry point
21. ✅ `Dockerfile` - container image
22. ✅ `docker-compose.yml` - local dev setup
23. ✅ `.env.example` - environment template
24. ✅ `package.json` - dependencies (complete)
25. ✅ `tsconfig.json` - TypeScript config (strict mode)
26. ✅ `deploy.sh` - one-command deployment
27. ✅ `README.md` - setup instructions (5 steps to run)
28. ✅ `jest.config.js` - test configuration
29. ✅ `src/tests/auth.test.ts` - auth tests
30. ✅ `src/tests/payments.test.ts` - payment tests (mock Square)

---

## CODE STANDARDS (ALL GENERATED CODE MUST FOLLOW)

- ✅ TypeScript strict mode (no `any`)
- ✅ All error paths tested
- ✅ No hardcoded secrets (use .env)
- ✅ Rate limiting on all endpoints
- ✅ SQL injection prevention (parameterized only)
- ✅ Comprehensive logging (never leak PII)
- ✅ Input validation (Zod schemas)
- ✅ Proper HTTP status codes (400, 401, 403, 500)
- ✅ Immutable TOS records (no updates after creation)
- ✅ Age verification enforced (middleware on all dating routes)
- ✅ Square LIVE mode only (no sandbox)
- ✅ Connection pooling configured
- ✅ Graceful error handling (meaningful messages, no stack traces in responses)
- ✅ All timestamps in UTC
- ✅ All money amounts in cents (no floats)

---

## TESTING BEFORE DEPLOYMENT

1. Signup flow: email → age verification → phone verification → TOS acceptance → login
2. Payment: create Square customer → create payment (real Square test card) → verify receipt
3. Matching: create 2 profiles → record likes → verify match creation → enable chat
4. Age enforcement: attempt login with user age < 18 → verify 403 Forbidden
5. TOS enforcement: skip TOS acceptance → attempt profile creation → verify 403 Forbidden
6. Rate limiting: send 101 requests/min from same IP → verify 429 Too Many Requests
7. Database: verify all tables created, indexes present, soft deletes working

---

## DEPLOYMENT INSTRUCTIONS

1. Set all `.env` variables (Square LIVE tokens, database URL, SMTP credentials)
2. Run: `docker-compose up -d`
3. Run: `npm run db:migrate`
4. Test: `curl http://localhost:5000/health` → should return 200
5. Deploy: `./deploy.sh` → runs on AWS

---

## FINAL REQUIREMENTS

- **Zero sandbox/mock code**: Square LIVE mode only
- **Zero placeholders**: Every file is complete, functional code
- **Zero ambiguity**: Every endpoint documented, every function typed
- **Production-ready**: No console.logs, proper error handling, logging to files
- **Secure**: No secrets in code, rate limiting, SQL injection prevention
- **Tested**: All critical paths have unit tests
- **Documented**: API docs (Swagger), README, inline code comments

---

**Execute this prompt exactly as written. Generate all files. No modifications. No sandbox. No placeholders.**

**Result: Complete dating app backend, ready to deploy to production today.**
