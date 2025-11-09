# 🚀 Railway Deployment Guide for Team Claude Dating App

## Current Status

- ✅ **Frontend**: Deployed to Netlify at https://youandinotai.com
- ⚠️ **Backend**: Configured to connect to Railway at https://postgres-production-475c.up.railway.app
- ❌ **Issue**: Backend not deployed or missing environment variables

## Quick Fix - Deploy Backend to Railway

### Step 1: Generate Security Secrets

```bash
cd date-app-dashboard/backend
node scripts/generate-secrets.js
```

This will output all the secure keys you need. **Keep this terminal open** - you'll copy these values.

### Step 2: Set Up Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `Trollz1004` repository
4. Choose the `date-app-dashboard/backend` directory as root

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create `DATABASE_URL` variable

### Step 4: Configure Environment Variables

Go to your backend service → "Variables" tab and add:

#### Required Variables (from generate-secrets.js output):

```bash
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://youandinotai.com

# Copy these from generate-secrets.js output:
JWT_PUBLIC_KEY=<paste_from_script>
JWT_PRIVATE_KEY=<paste_from_script>
REFRESH_TOKEN_PEPPER=<paste_from_script>
VERIFICATION_CODE_PEPPER=<paste_from_script>
PHONE_SALT=<paste_from_script>
ENCRYPTION_SECRET=<paste_from_script>

# Database (Railway auto-fills these when you add PostgreSQL):
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}

# Payment (get from Square Dashboard):
SQUARE_ACCESS_TOKEN=your_square_token
SQUARE_ENVIRONMENT=sandbox

# Optional:
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
LOG_LEVEL=info
```

### Step 5: Deploy

1. Click "Deploy" in Railway
2. Wait for build to complete (~2-3 minutes)
3. Railway will provide a public URL (e.g., `https://postgres-production-475c.up.railway.app`)

### Step 6: Verify Backend is Running

```bash
curl https://your-railway-url.railway.app/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Step 7: Update Frontend (if Railway URL changed)

If your Railway URL is different from `https://postgres-production-475c.up.railway.app`:

1. Edit `date-app-dashboard/frontend/netlify.toml`
2. Update line 15: `VITE_API_URL = "https://your-new-railway-url.railway.app"`
3. Commit and push
4. Netlify will auto-redeploy

## Current Configuration

### Frontend (Netlify)
- **Site**: https://youandinotai.com
- **Config**: `date-app-dashboard/frontend/netlify.toml`
- **API URL**: Points to Railway backend

### Backend (Railway)
- **Expected URL**: https://postgres-production-475c.up.railway.app
- **Config**: `date-app-dashboard/backend/railway.json`
- **Health Check**: `/health` endpoint
- **Database**: PostgreSQL on Railway

## Troubleshooting

### Issue: "Cannot connect to API"
**Fix**: Check Railway logs for errors. Most likely missing environment variables.

```bash
# In Railway dashboard:
1. Select backend service
2. Click "Deployments" tab
3. Click latest deployment
4. View logs
```

### Issue: "Database connection failed"
**Fix**: Ensure PostgreSQL addon is added and variables are set:

```bash
# Required database variables in Railway:
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
```

### Issue: "JWT error" or "Invalid token"
**Fix**: JWT keys must include newlines. Copy-paste from `generate-secrets.js` output EXACTLY as-is.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Team Claude Dating App                   │
└─────────────────────────────────────────────────────────────┘

Frontend (Netlify)                    Backend (Railway)
┌───────────────────┐                ┌──────────────────┐
│ youandinotai.com  │───────────────▶│  Express API     │
│                   │    HTTPS       │  Port 4000       │
│ - React + Vite    │                │                  │
│ - Chart.js        │                │ - Auth Routes    │
│ - TailwindCSS     │                │ - Match Routes   │
│                   │                │ - Profile Routes │
└───────────────────┘                │ - Payment Routes │
                                     │                  │
                                     └────────┬─────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │   PostgreSQL     │
                                     │   (Railway)      │
                                     │                  │
                                     │ - User profiles  │
                                     │ - Matches        │
                                     │ - Subscriptions  │
                                     │ - Charity splits │
                                     └──────────────────┘
```

## Next Steps After Deployment

1. **Test the API**: Visit https://youandinotai.com and check browser console
2. **Initialize Database**: Run seed scripts if needed
3. **Configure Square**: Add production Square credentials
4. **Set up Redis**: Optional but recommended for caching
5. **Enable Firebase**: Optional for push notifications

## Support

- Railway Docs: https://docs.railway.app
- Netlify Docs: https://docs.netlify.com
- Team Claude Discord: [Your discord link]

---

**Team Claude For The Kids** - 50% to Shriners Children's Hospitals 💚
