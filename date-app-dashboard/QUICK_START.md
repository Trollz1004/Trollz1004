# ⚡ Phase 1 Quick Start Guide

**Get the referral system running in 5 minutes!**

---

## 📋 Prerequisites

- Node.js 16+ installed
- PostgreSQL 12+ running
- Git repository cloned

---

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (1 min)
```bash
cd date-app-dashboard/backend
npm install
```

### Step 2: Configure Environment (1 min)
```bash
# Copy template
cp .env.example .env

# Edit .env (minimum required)
DATABASE_URL=postgresql://user:password@localhost:5432/trollz_dating
JWT_SECRET=change-this-to-random-string
ENABLE_REFERRAL_SYSTEM=true
ENABLE_AUTOMATION_WORKER=true
```

### Step 3: Initialize Database (1 min)
```bash
# The server will auto-create tables on first start
npm run dev
```

**Look for these logs:**
```
📊 Database initialized successfully
✅ Automation worker started successfully
📅 Scheduled jobs:
  - Daily: Expired codes cleanup (2:00 AM)
  - Weekly: Badge awards check (Sunday 3:00 AM)
```

### Step 4: Verify Installation (1 min)
```bash
# Open new terminal window
cd date-app-dashboard/backend

# Run schema verification
npx ts-node src/scripts/verifySchema.ts
```

**Expected output:**
```
✅ Table 'referral_codes' exists
✅ Table 'referrals' exists
✅ Table 'user_rewards' exists
✅ Table 'automation_logs' exists
🎉 Schema verification passed!
```

### Step 5: Test API (1 min)
```bash
# Health check
curl http://localhost:5000/health

# Expected: {"status":"ok","timestamp":"..."}
```

---

## ✅ You're Done!

**Server running at:** `http://localhost:5000`

**Referral API available at:** `http://localhost:5000/api/referral`

---

## 🧪 Quick Test

### Generate a Referral Code

**1. Get JWT Token** (login or signup first via `/api/auth/login`)

**2. Generate Code:**
```bash
curl -X POST http://localhost:5000/api/referral/generate-code \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "code": "AB12CD34",
  "userId": "...",
  "expiresAt": "2026-01-15T12:00:00.000Z"
}
```

### Check Leaderboard
```bash
curl http://localhost:5000/api/referral/leaderboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📚 Next Steps

1. **Read Full Docs:** `AUTOMATION_README.md`
2. **Deployment Guide:** `DEPLOYMENT_CHECKLIST.md`
3. **API Reference:** See "API Endpoints" in `AUTOMATION_README.md`
4. **Troubleshooting:** See "Troubleshooting" section in docs

---

## 🐛 Common Issues

### "Database connection failed"
**Fix:** Check `DATABASE_URL` in `.env` matches your PostgreSQL credentials

### "Worker not starting"
**Fix:** Set `ENABLE_AUTOMATION_WORKER=true` in `.env` and restart

### "Table does not exist"
**Fix:** Server auto-creates tables on startup. Check server logs for errors.

---

## 🎉 Success!

If you see:
- ✅ Server running on port 5000
- ✅ Database initialized
- ✅ Automation worker started
- ✅ Schema verification passed

**You're ready to use the referral system!** 🚀

---

## 📞 Need Help?

- **Full Documentation:** `AUTOMATION_README.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **Implementation Details:** `PHASE1_SUMMARY.md`
