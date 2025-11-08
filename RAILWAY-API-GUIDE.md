# 🚂 Railway API Deployment Guide

## Automated Deployment via Railway CLI & API

This guide shows you how to deploy Team Claude For The Kids to Railway using the command line and API for full automation.

---

## 🎯 Prerequisites

### Required Accounts:

1. **Railway Account**
   - Sign up: https://railway.app
   - Free tier available ($5 credit)

2. **Square Account** (for payments)
   - Sign up: https://squareup.com/signup
   - Get Production credentials

3. **Perplexity AI** (for marketing)
   - Sign up: https://www.perplexity.ai
   - Get API key

### Required Software:

- Node.js 18+ (for Railway CLI)
- Git (to clone repository)
- Terminal/Command Line

---

## 🚀 Quick Deploy (One Command!)

If you just want to deploy immediately:

```bash
# Clone repository
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004
git checkout claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK

# Run automated deployment
chmod +x railway-api-deploy.sh
./railway-api-deploy.sh
```

The script will:
1. ✅ Install Railway CLI (if needed)
2. ✅ Log you in to Railway
3. ✅ Create Railway project
4. ✅ Add PostgreSQL database
5. ✅ Set environment variables
6. ✅ Deploy your application
7. ✅ Generate domain URL

**Time:** ~10 minutes (mostly automated)

---

## 📋 Step-by-Step Manual Deployment

If you prefer to do it manually or understand each step:

### Step 1: Install Railway CLI

**macOS (Homebrew):**
```bash
brew install railway
```

**Linux / macOS (npm):**
```bash
npm install -g @railway/cli
```

**Windows (npm):**
```powershell
npm install -g @railway/cli
```

**Verify installation:**
```bash
railway --version
```

### Step 2: Login to Railway

```bash
railway login
```

This will:
- Open your browser
- Ask you to authorize with GitHub
- Return you to terminal when done

**Verify login:**
```bash
railway whoami
```

### Step 3: Initialize Project

```bash
# Navigate to your project directory
cd Trollz1004

# Initialize Railway project
railway init
```

Choose:
- "Create a new project"
- Give it a name: "team-claude-production"

### Step 4: Add PostgreSQL Database

```bash
railway add --database postgres
```

This creates a PostgreSQL database and automatically sets `DATABASE_URL` environment variable.

### Step 5: Configure Environment Variables

**Option A: Using CLI (recommended)**

```bash
railway variables set NODE_ENV=production
railway variables set SQUARE_ENVIRONMENT=production
railway variables set SQUARE_ACCESS_TOKEN="your_production_token"
railway variables set SQUARE_APP_ID="your_app_id"
railway variables set PERPLEXITY_API_KEY="your_perplexity_key"
```

**Option B: Using Railway Dashboard**

1. Go to https://railway.app/dashboard
2. Select your project
3. Click "Variables" tab
4. Add each variable manually

**Required Variables:**
- `NODE_ENV` = `production`
- `SQUARE_ENVIRONMENT` = `production`
- `SQUARE_ACCESS_TOKEN` = Your Square production token
- `SQUARE_APP_ID` = Your Square application ID
- `PERPLEXITY_API_KEY` = Your Perplexity API key

**Optional Variables:**
- `GOOGLE_ADS_API_KEY` (for paid advertising)
- `SENDGRID_API_KEY` (for email campaigns)
- `FACEBOOK_ACCESS_TOKEN` (for social media automation)

### Step 6: Deploy Application

```bash
railway up
```

This will:
1. Build your application
2. Create Docker container
3. Deploy to Railway infrastructure
4. Start your services

**Watch deployment:**
```bash
railway logs
```

### Step 7: Generate Domain

```bash
railway domain
```

Railway will generate a domain like:
- `teamclaude-production.up.railway.app`

**Custom domain (optional):**
```bash
railway domain add youandinotai.com
```

### Step 8: Verify Deployment

```bash
# Check status
railway status

# View logs
railway logs

# Open in browser
railway open
```

---

## 🔧 Railway CLI Commands

### Deployment Commands:

```bash
railway up                    # Deploy application
railway down                  # Stop application
railway logs                  # View logs (real-time)
railway logs --tail 100       # View last 100 lines
railway restart               # Restart application
```

### Project Management:

```bash
railway status                # View deployment status
railway list                  # List all projects
railway open                  # Open project in browser
railway environment           # Switch environment
```

### Database Commands:

```bash
railway connect postgres      # Connect to PostgreSQL
railway run psql              # Run psql shell
railway run npm run migrate   # Run migrations
```

### Variable Management:

```bash
railway variables             # List all variables
railway variables set KEY=value
railway variables delete KEY
```

### Domain Management:

```bash
railway domain                # Generate domain
railway domain add custom.com # Add custom domain
railway domain list           # List all domains
```

---

## 🔐 Using Railway API Directly

For advanced automation, you can use Railway's GraphQL API.

### Get API Token:

1. Go to https://railway.app/account/tokens
2. Create new token
3. Copy token

### Set Token:

```bash
export RAILWAY_TOKEN="your_token_here"
```

### Example API Request:

```bash
curl https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { me { email projects { edges { node { name } } } } }"
  }'
```

### Common API Operations:

**List Projects:**
```graphql
query {
  me {
    projects {
      edges {
        node {
          id
          name
        }
      }
    }
  }
}
```

**Get Deployment Status:**
```graphql
query {
  deployment(id: "deployment-id") {
    status
    createdAt
    url
  }
}
```

**Set Environment Variable:**
```graphql
mutation {
  variableUpsert(
    input: {
      projectId: "project-id"
      environmentId: "environment-id"
      name: "SQUARE_ACCESS_TOKEN"
      value: "your-token"
    }
  ) {
    id
  }
}
```

**Full API Documentation:** https://docs.railway.app/reference/api-reference

---

## 🔄 CI/CD Integration

### GitHub Actions Example:

Create `.github/workflows/railway-deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --detach
```

Add `RAILWAY_TOKEN` to GitHub Secrets:
1. Go to repository Settings
2. Secrets → Actions
3. New repository secret
4. Name: `RAILWAY_TOKEN`
5. Value: Your Railway token

---

## 📊 Monitoring & Logs

### View Real-time Logs:

```bash
# All logs
railway logs

# Follow logs
railway logs -f

# Filter by service
railway logs --service backend

# Last 500 lines
railway logs --tail 500
```

### Check Resource Usage:

```bash
# View metrics in dashboard
railway open

# Or use API
curl https://backboard.railway.app/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -d '{"query":"query { deployment(id:\"...\") { metrics { cpu memory } } }"}'
```

---

## 💰 Cost Management

### Railway Pricing:

**Free Tier:**
- $5 credit/month
- Good for testing

**Developer Plan:**
- $5/month
- 500 hours runtime
- Perfect for startups

**Team Plan:**
- $20/month
- Unlimited hours
- Better for scaling

### Monitor Usage:

```bash
# View current usage
railway usage

# Or check dashboard
railway open
```

**Cost Optimization Tips:**
1. Use sleep mode for dev environments
2. Monitor resource usage
3. Optimize database queries
4. Use caching (Redis)

---

## 🐛 Troubleshooting

### Deployment Fails:

```bash
# Check logs
railway logs

# Check build logs
railway logs --deployment [deployment-id]

# Restart
railway restart
```

### Database Connection Issues:

```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE

# Test connection
railway run node -e "console.log(process.env.DATABASE_URL)"

# Connect to database
railway connect postgres
```

### Environment Variable Issues:

```bash
# List all variables
railway variables

# Verify specific variable
railway run node -e "console.log(process.env.SQUARE_ACCESS_TOKEN)"

# Re-set variable
railway variables set SQUARE_ACCESS_TOKEN="new-value"
```

### Domain Issues:

```bash
# Check domain configuration
railway domain list

# Regenerate domain
railway domain

# Check DNS propagation
dig your-domain.up.railway.app
```

---

## 📈 Scaling

### Horizontal Scaling:

Railway automatically scales based on traffic. No configuration needed!

### Vertical Scaling:

Upgrade your plan for more resources:
1. Go to Railway dashboard
2. Project Settings
3. Select higher tier plan

### Database Scaling:

```bash
# Upgrade database size via dashboard
railway open
# Go to database service → Settings → Resources
```

---

## 🔒 Security Best Practices

### 1. Use Environment Variables:

✅ **DO:**
```bash
railway variables set SECRET_KEY="secret"
```

❌ **DON'T:**
- Commit secrets to git
- Hardcode credentials

### 2. Use Private Repositories:

If your code is private:
```bash
# Railway supports private GitHub repos
# Just authorize during login
```

### 3. Enable Two-Factor Authentication:

On Railway account:
1. Go to Account Settings
2. Enable 2FA
3. Save backup codes

### 4. Rotate Credentials Regularly:

```bash
# Update tokens periodically
railway variables set SQUARE_ACCESS_TOKEN="new-token"
```

---

## 🎯 Production Checklist

Before going live:

- [ ] Environment variables set correctly
- [ ] Database migrations run
- [ ] SSL/HTTPS enabled (automatic on Railway)
- [ ] Custom domain configured (optional)
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Test payment processing
- [ ] Verify Square integration
- [ ] Check error logs
- [ ] Set up alerts

---

## 🚀 Quick Reference

**Deploy:**
```bash
railway up
```

**Check Status:**
```bash
railway status
```

**View Logs:**
```bash
railway logs -f
```

**Set Variable:**
```bash
railway variables set KEY=value
```

**Generate Domain:**
```bash
railway domain
```

**Open Dashboard:**
```bash
railway open
```

**Connect to Database:**
```bash
railway connect postgres
```

---

## 📚 Additional Resources

**Official Documentation:**
- Railway Docs: https://docs.railway.app
- CLI Reference: https://docs.railway.app/develop/cli
- API Reference: https://docs.railway.app/reference/api-reference

**Support:**
- Discord: https://discord.gg/railway
- GitHub: https://github.com/railwayapp/cli
- Status: https://railway.statuspage.io

**Your Platform Docs:**
- DEPLOY-RAILWAY.md (browser deployment)
- CLOUD-DEPLOYMENT-README.md (GCP/AWS)
- deploy.html (visual guide)

---

## 💚 Ready to Deploy!

**Quick start:**
```bash
./railway-api-deploy.sh
```

**Manual deployment:**
```bash
railway login
railway init
railway add --database postgres
railway variables set [...]
railway up
railway domain
```

**You're 10 minutes from making money for charity!** 💰💚

---

**Team Claude For The Kids**
*"Claude Represents Perfection"*

🚂 Railway Deployment
💰 Revenue Target: $1.2M+ Year 1
💚 Charity Impact: $600K+ to Shriners Children's Hospitals
