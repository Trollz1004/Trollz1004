# Trollz1004 Automation System - Phase 1: Referral System

## 🎯 Overview

Phase 1 of the Trollz1004 automation system implements a **production-ready referral program** with code generation, conversion tracking, rewards, and analytics. This serves as the foundation for future automation features (email, social media, webhooks, badges, etc.).

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── automations/                    # Automation system
│   │   ├── automationWorker.ts         # Cron job scheduler & worker
│   │   ├── utils/
│   │   │   └── automationLogger.ts     # Centralized logging
│   │   └── referral/
│   │       ├── referralCodeGenerator.ts  # Code generation
│   │       ├── referralProcessor.ts      # Conversion tracking
│   │       ├── referralRewards.ts        # Reward management
│   │       └── referralAnalytics.ts      # Analytics & leaderboard
│   ├── routes/
│   │   ├── referral.ts                 # API endpoints
│   │   └── subscriptions.ts            # (Modified for conversion tracking)
│   ├── index.ts                        # (Modified for automation worker)
│   └── database.ts                     # (Extended with new tables)
└── .env.example                        # Configuration template
```

---

## 🗄️ Database Schema

### New Tables

#### 1. `referral_codes`
Stores unique referral codes for each user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who owns this code |
| `code` | VARCHAR(50) | Unique 8-character code |
| `is_active` | BOOLEAN | Code active status |
| `created_at` | TIMESTAMP | Creation time |
| `expires_at` | TIMESTAMP | Expiration (default: 365 days) |

**Indexes:**
- `idx_referral_codes_code` (UNIQUE on `code`)
- `idx_referral_codes_user_id`

#### 2. `referrals`
Tracks who signed up using whose code.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `referrer_user_id` | UUID | User who referred |
| `referred_user_id` | UUID | User who signed up |
| `referral_code_id` | UUID | Code used |
| `status` | VARCHAR(50) | `pending`, `converted`, `expired` |
| `created_at` | TIMESTAMP | Signup time |
| `converted_at` | TIMESTAMP | Conversion time (nullable) |

**Indexes:**
- `idx_referrals_referrer_user_id`
- `idx_referrals_referred_user_id`
- `idx_referrals_status`

#### 3. `user_rewards`
Tracks rewards earned through referrals.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Reward recipient |
| `reward_type` | VARCHAR(50) | `free_premium`, `badge`, etc. |
| `reward_value` | JSONB | Reward details (days, badge name) |
| `is_claimed` | BOOLEAN | Claimed status |
| `created_at` | TIMESTAMP | Reward earned time |
| `claimed_at` | TIMESTAMP | Claim time (nullable) |
| `expires_at` | TIMESTAMP | Expiration (nullable) |

**Indexes:**
- `idx_user_rewards_user_id`
- `idx_user_rewards_is_claimed`

#### 4. `automation_logs`
Audit trail for all automation actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `service` | VARCHAR(100) | Service name |
| `action` | VARCHAR(100) | Action performed |
| `status` | VARCHAR(50) | `success`, `failed`, `pending` |
| `user_id` | UUID | Related user (nullable) |
| `details` | JSONB | Additional data |
| `error_message` | TEXT | Error details (nullable) |
| `created_at` | TIMESTAMP | Event time |

**Indexes:**
- `idx_automation_logs_service`
- `idx_automation_logs_created_at`

---

## 🔧 API Endpoints

### Base URL: `/api/referral`

All endpoints require authentication (`Authorization: Bearer <JWT>`) unless noted.

---

### 1. **Generate Referral Code**
**POST** `/generate-code`

Generates a unique 8-character referral code for the authenticated user.

**Request Body:**
```json
{
  "expiresInDays": 365  // Optional, default: 365
}
```

**Response:**
```json
{
  "code": "AB12CD34",
  "userId": "uuid-here",
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Error Codes:**
- `409 Conflict` - User already has an active code

---

### 2. **Track Referral Signup**
**POST** `/track`

Records when a new user signs up using a referral code.

**Request Body:**
```json
{
  "referralCode": "AB12CD34"
}
```

**Response:**
```json
{
  "message": "Referral tracked successfully",
  "referralId": "uuid-here",
  "referrerUserId": "uuid-here"
}
```

**Error Codes:**
- `400 Bad Request` - Invalid or expired code
- `409 Conflict` - User already has a referrer

---

### 3. **Get User Stats**
**GET** `/stats`

Retrieves referral statistics for the authenticated user.

**Response:**
```json
{
  "totalReferrals": 10,
  "convertedReferrals": 3,
  "pendingReferrals": 7,
  "totalRewardsEarned": 2
}
```

---

### 4. **Get Leaderboard**
**GET** `/leaderboard`

Fetches top referrers.

**Query Parameters:**
- `period` (optional): `all`, `month`, `week` (default: `all`)
- `limit` (optional): Number of users (default: `10`)

**Response:**
```json
[
  {
    "userId": "uuid-here",
    "email": "user@example.com",
    "totalReferrals": 25,
    "convertedReferrals": 12,
    "rank": 1
  },
  ...
]
```

---

### 5. **Claim Reward**
**POST** `/claim-reward`

Activates a pending reward.

**Request Body:**
```json
{
  "rewardId": "uuid-here"
}
```

**Response:**
```json
{
  "message": "Reward claimed successfully",
  "reward": {
    "id": "uuid-here",
    "rewardType": "free_premium",
    "rewardValue": { "days": 30 },
    "claimedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**Error Codes:**
- `404 Not Found` - Reward not found or already claimed
- `400 Bad Request` - Reward expired

---

### 6. **Get Analytics Summary**
**GET** `/analytics`

Provides comprehensive referral program metrics.

**Query Parameters:**
- `period` (optional): `all`, `month`, `week` (default: `all`)

**Response:**
```json
{
  "totalReferrals": 150,
  "convertedReferrals": 45,
  "conversionRate": 30.0,
  "totalRewardsAwarded": 45,
  "activeCodes": 120,
  "expiredCodes": 15
}
```

---

### 7. **Get Referral Trends**
**GET** `/trends`

Returns daily signup and conversion data for charting.

**Query Parameters:**
- `days` (optional): Number of days (default: `30`)

**Response:**
```json
[
  {
    "date": "2025-01-01",
    "signups": 5,
    "conversions": 2
  },
  ...
]
```

---

### 8. **Manual Conversion Trigger**
**POST** `/convert`

Manually marks a referral as converted (admin/testing use).

**Request Body:**
```json
{
  "referredUserId": "uuid-here"
}
```

**Response:**
```json
{
  "message": "Referral converted successfully",
  "referralId": "uuid-here"
}
```

---

## ⚙️ Configuration (Environment Variables)

### Referral System Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_REFERRAL_SYSTEM` | `true` | Enable/disable referral features |
| `REFERRAL_CODE_LENGTH` | `8` | Length of generated codes |
| `REFERRAL_CODE_EXPIRATION_DAYS` | `365` | Code validity period |
| `REFERRAL_REWARD_DAYS` | `30` | Days of free premium per conversion |
| `REFERRAL_MASTER_THRESHOLD` | `5` | Conversions needed for "Referral Master" badge |

### Automation Worker Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_AUTOMATION_WORKER` | `true` | Enable/disable background worker |

### Example `.env` File

```bash
# Referral System
ENABLE_REFERRAL_SYSTEM=true
REFERRAL_CODE_LENGTH=8
REFERRAL_CODE_EXPIRATION_DAYS=365
REFERRAL_REWARD_DAYS=30
REFERRAL_MASTER_THRESHOLD=5

# Automation Worker
ENABLE_AUTOMATION_WORKER=true
```

---

## 🤖 Automation Worker

The automation worker runs background cron jobs for maintenance tasks.

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| **Expired Codes Cleanup** | Daily at 2:00 AM | Deactivates referral codes past expiration |
| **Badge Awards Check** | Weekly (Sunday 3:00 AM) | Awards "Referral Master" badges |
| **Health Check** | Every 5 minutes | Logs worker uptime and memory usage |

### Lifecycle

**Start:** Automatically starts with the main server (`npm start`)

**Shutdown:** Gracefully shuts down on `SIGTERM`/`SIGINT` (Ctrl+C)

**Logging:** All jobs log to `automation_logs` table

---

## 🎁 Reward System

### Free Premium Rewards

When a referred user **upgrades to premium**, the referrer receives:
- **30 days of free premium** (configurable via `REFERRAL_REWARD_DAYS`)
- Reward is stored in `user_rewards` table
- User must claim reward via `/api/referral/claim-reward`

### Badge System

**Referral Master Badge:**
- Awarded after **5 successful conversions** (configurable via `REFERRAL_MASTER_THRESHOLD`)
- Automatically granted by automation worker
- Stored in `user_rewards` table with `reward_type: "badge"`

---

## 📊 Analytics Features

### Leaderboard
- Top 10 referrers by conversion count
- Filter by time period (`all`, `month`, `week`)
- Includes user email and rank

### Conversion Tracking
- Real-time conversion rate calculation
- Status transitions: `pending` → `converted`
- Timestamp tracking for analytics

### Trend Analysis
- Daily signup and conversion data
- Configurable lookback period (default: 30 days)
- Perfect for chart visualizations

---

## 🔐 Security Features

### Code Generation
- **8-character alphanumeric codes** (excludes ambiguous characters: `0`, `O`, `I`, `1`, `l`)
- **Collision detection**: Regenerates if code already exists
- **Cryptographically secure**: Uses `crypto.randomBytes()`

### Idempotency
- Referral tracking uses idempotency checks
- Prevents duplicate referral records
- User can only be referred once

### Input Validation
- All API endpoints validate request parameters
- Expiration date enforcement
- Active code checks before tracking

---

## 🚀 Deployment Checklist

### Database Migration
1. Run migrations to create new tables:
   ```bash
   npm run migrate  # or manually run database.ts schema
   ```

2. Verify table creation:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('referral_codes', 'referrals', 'user_rewards', 'automation_logs');
   ```

### Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure referral settings:
   ```bash
   ENABLE_REFERRAL_SYSTEM=true
   REFERRAL_CODE_LENGTH=8
   REFERRAL_CODE_EXPIRATION_DAYS=365
   REFERRAL_REWARD_DAYS=30
   REFERRAL_MASTER_THRESHOLD=5
   ENABLE_AUTOMATION_WORKER=true
   ```

3. Restart the server:
   ```bash
   npm run dev  # or npm start
   ```

### Verification Steps
1. Check logs for worker startup:
   ```
   ✅ Automation worker started successfully
   📅 Scheduled jobs:
     - Daily: Expired codes cleanup (2:00 AM)
     - Weekly: Badge awards check (Sunday 3:00 AM)
     - Health check: Every 5 minutes
   ```

2. Test API endpoints:
   ```bash
   # Generate code
   curl -X POST http://localhost:5000/api/referral/generate-code \
     -H "Authorization: Bearer YOUR_JWT"

   # Get stats
   curl -X GET http://localhost:5000/api/referral/stats \
     -H "Authorization: Bearer YOUR_JWT"
   ```

3. Check automation logs:
   ```sql
   SELECT * FROM automation_logs 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## 🧪 Testing

### Manual Testing Flow

1. **User A generates referral code:**
   ```bash
   POST /api/referral/generate-code
   ```

2. **User B signs up using code:**
   ```bash
   POST /api/referral/track
   {
     "referralCode": "AB12CD34"
   }
   ```

3. **User B upgrades to premium:**
   ```bash
   POST /api/subscriptions/create
   {
     "tier": "premium",
     "nonce": "payment-nonce"
   }
   ```
   *(This automatically triggers `processReferralConversion`)*

4. **User A checks stats:**
   ```bash
   GET /api/referral/stats
   ```

5. **User A claims reward:**
   ```bash
   POST /api/referral/claim-reward
   {
     "rewardId": "reward-uuid"
   }
   ```

### Database Validation

```sql
-- Check referral chain
SELECT 
  rc.code,
  r.status,
  u1.email AS referrer,
  u2.email AS referred,
  r.converted_at
FROM referrals r
JOIN referral_codes rc ON r.referral_code_id = rc.id
JOIN users u1 ON r.referrer_user_id = u1.id
JOIN users u2 ON r.referred_user_id = u2.id;

-- Check rewards
SELECT 
  u.email,
  ur.reward_type,
  ur.reward_value,
  ur.is_claimed,
  ur.created_at
FROM user_rewards ur
JOIN users u ON ur.user_id = u.id;
```

---

## 📈 Future Phases

### Phase 2: Email Automation
- Welcome email sequences
- Referral milestone notifications
- Abandoned cart recovery

### Phase 3: Social Media Integration
- Auto-post success stories to Instagram/Facebook
- Share referral codes on Twitter
- Track social engagement metrics

### Phase 4: Webhooks & Integrations
- Zapier/Make.com integration
- External CRM sync
- Custom webhook endpoints

### Phase 5: Advanced Badges
- Multi-tier badge system
- Custom badge designer
- Badge display on profiles

### Phase 6: Enhanced Analytics
- Cohort analysis
- A/B testing framework
- Revenue attribution

---

## 🐛 Troubleshooting

### Worker Not Starting
**Symptom:** No automation logs appearing

**Solution:**
1. Check `ENABLE_AUTOMATION_WORKER=true` in `.env`
2. Restart server
3. Check logs for startup errors

### Referral Not Converting
**Symptom:** Status stays `pending` after premium upgrade

**Solution:**
1. Verify `processReferralConversion` is called in `subscriptions.ts`
2. Check `automation_logs` for conversion errors
3. Manually trigger: `POST /api/referral/convert`

### Duplicate Codes Generated
**Symptom:** Database unique constraint error

**Solution:**
- This is extremely rare (1 in 2 trillion chance)
- Code generator has retry logic
- Check `automation_logs` for collision events

---

## 📞 Support

For questions or issues:
1. Check `automation_logs` table for error details
2. Review server logs (`npm run dev` output)
3. Contact dev team with `requestId` from API errors

---

## ✅ Phase 1 Complete!

This referral system is **production-ready** and includes:
- ✅ Unique code generation
- ✅ Conversion tracking
- ✅ Automated rewards
- ✅ Analytics & leaderboard
- ✅ Background worker
- ✅ Comprehensive logging
- ✅ Security best practices

Ready for deployment to **AWS**, **Render**, or any Node.js hosting platform! 🚀
