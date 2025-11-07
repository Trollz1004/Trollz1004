# Anthropic OAuth Quick Start Guide (Kali Linux)

Complete guide to set up and test the Anthropic OAuth integration on Kali Linux.

## 📋 Prerequisites Checklist

- ✅ Anthropic Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
- ✅ Anthropic Client Secret: `AUcq5MQWG19rDi6w2H9UYhYBeWue0Z0TFrIL5dqv1JajKkEY`
- ✅ Redirect URI configured: `http://localhost:4000/api/oauth/anthropic/callback`

## 🚀 One-Command Setup

Run the automated setup script:

```bash
bash /home/user/Trollz1004/test-oauth-setup.sh
```

This script will:
1. Install/start PostgreSQL
2. Create the database
3. Run all migrations
4. Install Node.js dependencies
5. Create a test user
6. Display next steps

## 📝 Manual Setup (Alternative)

### Step 1: Install PostgreSQL

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo service postgresql start
```

### Step 2: Create Database

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE youandinotai_dev;
ALTER USER postgres WITH PASSWORD 'postgres';
\q
EOF
```

### Step 3: Run Migrations

```bash
# Create base schema (if needed)
sudo -u postgres psql -d youandinotai_dev -f /home/user/Trollz1004/database/migrations/001_automation_tables.sql

# Run OAuth migration
sudo -u postgres psql -d youandinotai_dev -f /home/user/Trollz1004/database/migrations/002_oauth_tables.sql
```

### Step 4: Install Dependencies

```bash
cd /home/user/Trollz1004/date-app-dashboard/backend
npm install
```

### Step 5: Configure Environment

The `.env` file has already been created with your credentials at:
`/home/user/Trollz1004/date-app-dashboard/backend/.env`

### Step 6: Start the Server

```bash
cd /home/user/Trollz1004/date-app-dashboard/backend
npm start

# Or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:4000`

## 🧪 Testing the OAuth Flow

### Automated Test

```bash
# Make sure the server is running first!
bash /home/user/Trollz1004/test-oauth-flow.sh
```

### Manual Testing

#### 1. Login to Get JWT Token

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456789"}' \
  | jq -r '.token')

echo "JWT Token: $TOKEN"
```

**Test User Credentials:**
- Email: `test@example.com`
- Password: `Test123456789`

#### 2. Get OAuth Authorization URL

```bash
curl -X GET http://localhost:4000/api/oauth/anthropic/authorize \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Response:**
```json
{
  "authorizationUrl": "https://console.anthropic.com/oauth/authorize?...",
  "message": "Visit this URL to authorize access to Anthropic API"
}
```

#### 3. Visit Authorization URL

Copy the `authorizationUrl` from the response and visit it in your browser. You'll be prompted to:
1. Login to your Anthropic account (if not already logged in)
2. Review the requested permissions
3. Click "Authorize"

After authorization, you'll be redirected to:
```
http://localhost:4000/api/oauth/anthropic/callback?code=...&state=...
```

The callback will automatically exchange the code for tokens and store them.

#### 4. Check OAuth Status

```bash
curl -X GET http://localhost:4000/api/oauth/anthropic/status \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

**Response (before authorization):**
```json
{
  "authorized": false,
  "message": "No Anthropic OAuth tokens found"
}
```

**Response (after authorization):**
```json
{
  "authorized": true,
  "expiresAt": "2025-11-08T10:30:00Z",
  "expired": false,
  "hasRefreshToken": true,
  "scope": "org:create_api_key user:profile user:inference",
  "message": "Access token is valid"
}
```

## 🤖 Using the AI Endpoints

Once OAuth is authorized, you can use the AI endpoints:

### 1. Test AI (Simple Text Generation)

```bash
curl -X POST http://localhost:4000/api/ai/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Say hello in a friendly, enthusiastic way!"}' | jq '.'
```

**Response:**
```json
{
  "prompt": "Say hello in a friendly, enthusiastic way!",
  "response": "Hello! It's wonderful to connect with you! I hope you're having a great day!",
  "model": "claude-3-5-sonnet-20241022"
}
```

### 2. Generate Dating Profile Bio

```bash
curl -X POST http://localhost:4000/api/ai/generate-bio \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interests": "hiking, photography, cooking Italian food",
    "about": "Software engineer who loves exploring new trails on weekends"
  }' | jq '.'
```

**Response:**
```json
{
  "bio": "Weekend warrior who trades code for mountain trails and captures every summit with my camera. When I'm not debugging or hiking, you'll find me perfecting my homemade pasta recipe. Looking for someone to share adventures and good food with!",
  "interests": "hiking, photography, cooking Italian food"
}
```

### 3. Generate Icebreaker Message

```bash
curl -X POST http://localhost:4000/api/ai/icebreaker \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "matchName": "Sarah",
    "matchInterests": "rock climbing, coffee, travel",
    "commonInterests": "hiking, photography"
  }' | jq '.'
```

**Response:**
```json
{
  "message": "Hey Sarah! I noticed you're into rock climbing - have you tackled any challenging routes lately? I'm more of a hiking person but always admired climbers!",
  "matchName": "Sarah"
}
```

### 4. Chat with Claude

```bash
curl -X POST http://localhost:4000/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What makes a great dating profile?"}
    ],
    "context": "Dating app advice"
  }' | jq '.'
```

## 🔄 Advanced OAuth Operations

### Refresh OAuth Token

```bash
curl -X POST http://localhost:4000/api/oauth/anthropic/refresh \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Revoke OAuth Authorization

```bash
curl -X DELETE http://localhost:4000/api/oauth/anthropic/revoke \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

## 🛠️ Troubleshooting

### Server Won't Start

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check if port 4000 is available
lsof -i :4000

# Kill any process using port 4000
lsof -ti:4000 | xargs kill -9
```

### Database Connection Failed

```bash
# Verify database exists
sudo -u postgres psql -l | grep youandinotai_dev

# Test connection
sudo -u postgres psql -d youandinotai_dev -c "SELECT 1;"
```

### OAuth State Invalid

This happens if the state expires (>10 minutes). Solution:
1. Request a new authorization URL
2. Complete the flow within 10 minutes

### Token Refresh Failed

If refresh fails, re-authorize:
```bash
# Revoke old authorization
curl -X DELETE http://localhost:4000/api/oauth/anthropic/revoke \
  -H "Authorization: Bearer $TOKEN"

# Get new authorization URL
curl -X GET http://localhost:4000/api/oauth/anthropic/authorize \
  -H "Authorization: Bearer $TOKEN"
```

### "User not found" Error

Create the test user:
```bash
sudo -u postgres psql -d youandinotai_dev <<EOF
INSERT INTO users (email, password_hash, email_verified, phone_verified, age_verified, tos_accepted_at)
VALUES ('test@example.com', '\$2a\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIYY3aYqeu', true, true, true, NOW())
ON CONFLICT (email) DO NOTHING;
EOF
```

## 📊 Verify Database Tables

```bash
# Check OAuth tables exist
sudo -u postgres psql -d youandinotai_dev -c "\dt oauth_*"

# Should show:
#  oauth_states
#  oauth_tokens

# View OAuth tokens for test user
sudo -u postgres psql -d youandinotai_dev <<EOF
SELECT
  u.email,
  o.provider,
  o.expires_at,
  o.scope,
  o.created_at
FROM oauth_tokens o
JOIN users u ON u.id = o.user_id
WHERE u.email = 'test@example.com';
EOF
```

## 📚 API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login and get JWT token |
| `/api/oauth/anthropic/authorize` | GET | Get OAuth authorization URL |
| `/api/oauth/anthropic/callback` | GET | Handle OAuth callback (automatic) |
| `/api/oauth/anthropic/status` | GET | Check OAuth authorization status |
| `/api/oauth/anthropic/refresh` | POST | Refresh access token |
| `/api/oauth/anthropic/revoke` | DELETE | Revoke OAuth authorization |
| `/api/ai/test` | POST | Test AI with custom prompt |
| `/api/ai/generate-bio` | POST | Generate dating profile bio |
| `/api/ai/icebreaker` | POST | Generate icebreaker message |
| `/api/ai/chat` | POST | Chat with Claude |

## 🔐 Security Notes

1. **Never commit `.env` files**: Already in `.gitignore`
2. **HTTPS in production**: Use proper SSL certificates
3. **Rotate secrets regularly**: Every 90 days minimum
4. **Monitor API usage**: Check Anthropic console for usage
5. **Rate limiting**: Endpoints are protected (100 req/15min)

## 📖 Full Documentation

For complete documentation, see:
- **OAuth Setup**: `docs/ANTHROPIC_OAUTH_SETUP.md`
- **API Reference**: `README.md`
- **Backend Guide**: `BACKEND_QUICKSTART.md`

## 🎯 Quick Test Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created (`youandinotai_dev`)
- [ ] Migrations applied (`002_oauth_tables.sql`)
- [ ] Dependencies installed (`npm install`)
- [ ] Server running (`npm start`)
- [ ] Can login and get JWT token
- [ ] Can get OAuth authorization URL
- [ ] Successfully authorized in browser
- [ ] OAuth status shows `authorized: true`
- [ ] Can generate AI responses

## 🆘 Need Help?

Check server logs:
```bash
cd /home/user/Trollz1004/date-app-dashboard/backend
npm start 2>&1 | tee server.log
```

View errors:
```bash
tail -f /home/user/Trollz1004/date-app-dashboard/backend/server.log
```

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Server starts without errors
2. ✅ `/health` endpoint returns `{"status":"ok"}`
3. ✅ Login returns a valid JWT token
4. ✅ OAuth authorize returns a URL
5. ✅ After browser authorization, status shows `authorized: true`
6. ✅ AI test endpoint generates responses

**You're all set!** 🎉
