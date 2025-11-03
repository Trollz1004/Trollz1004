# 🚀 Phase 1 Deployment Checklist

## ✅ Pre-Deployment Verification

### 1. Code Completion Status
- ✅ Database schema (4 new tables, 10 indexes)
- ✅ Automation logger utility
- ✅ Referral code generator (8-char alphanumeric)
- ✅ Referral processor (tracking + conversion)
- ✅ Rewards system (premium + badges)
- ✅ Analytics system (leaderboard + trends)
- ✅ API routes (8 endpoints)
- ✅ Automation worker (cron scheduler)
- ✅ Integration with main server
- ✅ Environment configuration template
- ✅ Schema verification script
- ✅ Comprehensive documentation

### 2. TypeScript Compilation
```bash
cd backend
npm run build
```
**Expected:** No errors, only markdown linting warnings (cosmetic)

### 3. Database Schema Verification
```bash
cd backend
npx ts-node src/scripts/verifySchema.ts
```
**Expected:**
```
🔍 Starting schema verification...
📦 Checking extensions...
✅ pgcrypto extension is enabled
📊 Checking tables...
✅ Table 'referral_codes' exists
✅ Table 'referrals' exists
✅ Table 'user_rewards' exists
✅ Table 'automation_logs' exists
🔗 Checking indexes...
✅ Index 'idx_referral_codes_code' exists
...
🎉 Schema verification passed! Database is ready.
```

---

## 🔧 Environment Configuration

### Step 1: Copy Environment Template
```bash
cd backend
cp .env.example .env
```

### Step 2: Configure Required Variables

**Database (REQUIRED):**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/trollz_dating
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trollz_dating
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=false  # Set to 'true' for production
```

**JWT (REQUIRED):**
```bash
JWT_SECRET=CHANGE-THIS-TO-SECURE-RANDOM-STRING
JWT_EXPIRES_IN=7d
```

**Referral System (REQUIRED):**
```bash
ENABLE_REFERRAL_SYSTEM=true
REFERRAL_CODE_LENGTH=8
REFERRAL_CODE_EXPIRATION_DAYS=365
REFERRAL_REWARD_DAYS=30
REFERRAL_MASTER_THRESHOLD=5
```

**Automation Worker (REQUIRED):**
```bash
ENABLE_AUTOMATION_WORKER=true
```

**Server (REQUIRED):**
```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-url.com
```

**Payment (if using Square):**
```bash
SQUARE_ACCESS_TOKEN=your-production-access-token
SQUARE_ENVIRONMENT=production
SQUARE_APPLICATION_ID=your-app-id
SQUARE_LOCATION_ID=your-location-id
```

### Step 3: Generate Secure Secrets
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📊 Database Setup

### Option A: Automatic (Server Start)
The server will automatically run migrations on startup via `initializeDatabase()`.

```bash
npm start
```

**Logs to watch for:**
```
📊 Database initialized successfully
✅ Automation worker started successfully
📅 Scheduled jobs:
  - Daily: Expired codes cleanup (2:00 AM)
  - Weekly: Badge awards check (Sunday 3:00 AM)
  - Health check: Every 5 minutes
```

### Option B: Manual Migration
If you prefer manual control:

1. Connect to your database:
```bash
psql -U your_user -d trollz_dating
```

2. Create extension:
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

3. Copy schema from `backend/src/database.ts` and execute table creation SQL.

---

## 🧪 Testing After Deployment

### 1. Health Check
```bash
curl http://localhost:5000/health
```
**Expected:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

### 2. Generate Referral Code
```bash
curl -X POST http://localhost:5000/api/referral/generate-code \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```
**Expected:**
```json
{
  "code": "AB12CD34",
  "userId": "uuid-here",
  "expiresAt": "2026-01-15T12:00:00.000Z"
}
```

### 3. Check Leaderboard
```bash
curl http://localhost:5000/api/referral/leaderboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected:**
```json
[]  // Empty array initially
```

### 4. Verify Automation Logs
```sql
SELECT * FROM automation_logs 
WHERE service = 'automation_worker' 
ORDER BY created_at DESC 
LIMIT 5;
```
**Expected:** Logs showing `startup`, `health_check` events

---

## 🔒 Security Checklist

- [ ] `NODE_ENV=production` in `.env`
- [ ] Strong `JWT_SECRET` (64+ character random string)
- [ ] Database SSL enabled (`DB_SSL=true`) for remote DBs
- [ ] Environment variables not committed to Git
- [ ] `.env` file added to `.gitignore`
- [ ] CORS configured to match frontend URL
- [ ] Rate limiting enabled (default: 100 requests/15min)
- [ ] Helmet.js security headers active

---

## 🚢 Deployment Platforms

### AWS Elastic Beanstalk
1. Create new environment (Node.js platform)
2. Upload zipped code (exclude `node_modules`)
3. Set environment variables in EB console
4. Database: Use AWS RDS PostgreSQL
5. Enable auto-scaling (min: 1, max: 3 instances)

**Environment Variables Path:**
Configuration → Software → Environment properties

### Render
1. Create new Web Service
2. Connect GitHub repository
3. Build command: `cd backend && npm install && npm run build`
4. Start command: `cd backend && npm start`
5. Add environment variables in Render dashboard
6. Database: Create Render PostgreSQL instance

**Environment Variables Path:**
Dashboard → Service → Environment

### Heroku
1. Create new app: `heroku create trollz-backend`
2. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`
3. Set config vars: `heroku config:set JWT_SECRET=...`
4. Deploy: `git push heroku main`

**Set all environment variables:**
```bash
heroku config:set ENABLE_REFERRAL_SYSTEM=true
heroku config:set REFERRAL_CODE_LENGTH=8
# ... etc
```

---

## 📈 Monitoring

### Application Logs
```bash
# Local
npm run dev

# AWS EB
eb logs

# Render
render logs

# Heroku
heroku logs --tail
```

### Database Monitoring
```sql
-- Active referral codes
SELECT COUNT(*) FROM referral_codes WHERE is_active = true;

-- Total conversions
SELECT COUNT(*) FROM referrals WHERE status = 'converted';

-- Unclaimed rewards
SELECT COUNT(*) FROM user_rewards WHERE is_claimed = false;

-- Recent automation activity
SELECT service, action, status, COUNT(*) 
FROM automation_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY service, action, status;
```

### Health Endpoints
- Server: `GET /health`
- Database: Check `automation_logs` for recent `health_check` entries

---

## 🐛 Troubleshooting

### Issue: Automation Worker Not Starting
**Symptom:** No logs in `automation_logs` table

**Solution:**
1. Check `ENABLE_AUTOMATION_WORKER=true` in `.env`
2. Restart server
3. Check server logs for startup errors
4. Verify database connection

### Issue: Referral Code Generation Fails
**Symptom:** `500 Internal Server Error` on `/generate-code`

**Solution:**
1. Check database connection
2. Verify `pgcrypto` extension installed
3. Check `referral_codes` table exists
4. Review `automation_logs` for errors

### Issue: Conversion Not Tracking
**Symptom:** Referral stays `pending` after premium upgrade

**Solution:**
1. Verify `processReferralConversion()` is called in `subscriptions.ts`
2. Check `automation_logs` for conversion errors
3. Manually test: `POST /api/referral/convert`
4. Verify `referred_user_id` exists in `referrals` table

---

## 📝 Post-Deployment Tasks

- [ ] Test all 8 API endpoints
- [ ] Verify automation worker logs appearing every 5 minutes
- [ ] Test full referral flow (generate → track → convert → claim)
- [ ] Monitor database performance (check query execution times)
- [ ] Set up error alerting (Sentry, New Relic, etc.)
- [ ] Document API endpoints in frontend integration guide
- [ ] Create dashboard for viewing referral analytics
- [ ] Schedule weekly review of leaderboard metrics

---

## 🎯 Success Metrics

### Week 1 Goals
- [ ] 0 deployment errors
- [ ] 100% automation worker uptime
- [ ] At least 1 successful referral conversion
- [ ] All scheduled jobs running (check `automation_logs`)

### Month 1 Goals
- [ ] 50+ active referral codes
- [ ] 10+ successful conversions
- [ ] Average response time < 200ms for API endpoints
- [ ] 0 security incidents

---

## 🔄 Rollback Plan

If deployment fails:

1. **Database:** Tables are backward compatible (no existing data modified)
2. **Code:** Remove referral routes from `index.ts`
3. **Worker:** Set `ENABLE_AUTOMATION_WORKER=false`
4. **Tables:** Keep tables (data is safe), just disable features

**Quick Rollback:**
```bash
# Disable features via environment variables
ENABLE_REFERRAL_SYSTEM=false
ENABLE_AUTOMATION_WORKER=false

# Restart server
pm2 restart trollz-backend  # or your process manager
```

---

## ✅ Final Checklist

Before marking deployment complete:

- [ ] All environment variables configured
- [ ] Database schema verified (run `verifySchema.ts`)
- [ ] Server starts without errors
- [ ] Automation worker logs appearing
- [ ] At least one API endpoint tested successfully
- [ ] Documentation reviewed and accessible
- [ ] Monitoring/alerting configured
- [ ] Team notified of new features
- [ ] Rollback plan documented and tested

---

## 📚 Documentation Links

- **Full Documentation:** `AUTOMATION_README.md`
- **API Reference:** See "API Endpoints" section in `AUTOMATION_README.md`
- **Database Schema:** See "Database Schema" section in `AUTOMATION_README.md`
- **Environment Config:** `backend/.env.example`
- **Troubleshooting:** See "Troubleshooting" section above

---

## 🎉 You're Ready to Deploy!

Once all checkboxes are marked:
1. Commit all changes to version control
2. Push to deployment branch
3. Deploy via your chosen platform
4. Monitor logs for 24 hours
5. Celebrate successful Phase 1 launch! 🚀

**Next:** Phase 2 - Email Automation System
