# 🚀 Complete Deployment Guide

**Team Claude For The Kids - Production Deployment**

This guide covers deploying all platforms to production with full automation.

---

## 🎯 Overview

Your infrastructure:

- **Frontend**: Netlify (youandinotai.com, app.youandinotai.com)
- **Admin**: Netlify (youandinotai.online)
- **Backend API**: Railway (api.youandinotai.com)
- **Database**: Railway PostgreSQL
- **Monitoring**: Automated health checks

---

## 📋 Prerequisites

### Required Accounts

1. ✅ **Netlify Account** - [netlify.com](https://netlify.com)
2. ✅ **Railway Account** - [railway.app](https://railway.app)
3. ✅ **GitHub Account** - [github.com](https://github.com)

### Required Tools

```powershell
# Install CLI tools
npm install -g netlify-cli @railway/cli

# Verify installations
netlify --version
railway --version
```

---

## ⚡ Automated Deployment (Recommended)

### One-Command Production Deploy

```powershell
# From repository root
.\automation\deploy-all.ps1 -Production
```

This script:
1. ✅ Builds frontend (React + Vite)
2. ✅ Deploys to Netlify with custom domains
3. ✅ Builds backend (Node.js + TypeScript)
4. ✅ Deploys to Railway with PostgreSQL
5. ✅ Runs database migrations
6. ✅ Executes health checks on all services
7. ✅ Sets up continuous monitoring

**Total time**: 5-10 minutes

---

## 🔧 Manual Deployment

### Step 1: Deploy Frontend to Netlify

```powershell
cd date-app-dashboard\frontend

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Netlify
netlify login
netlify init
netlify deploy --prod --dir=dist
```

### Step 2: Configure Netlify Domains

In Netlify Dashboard:

1. Go to **Site Settings** → **Domain Management**
2. Add custom domains:
   - `youandinotai.com`
   - `www.youandinotai.com`
   - `app.youandinotai.com`
   - `youandinotai.online`
   - `www.youandinotai.online`
   - `app.youandinotai.online`
3. Wait for SSL certificates (automatic via Let's Encrypt)

### Step 3: Deploy Backend to Railway

```powershell
cd date-app-dashboard\backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Login to Railway
railway login

# Link to project (or create new)
railway link

# Add PostgreSQL database
railway add --database=postgresql

# Deploy
railway up
```

### Step 4: Configure Railway Domain

In Railway Dashboard:

1. Go to your service → **Settings** → **Domains**
2. Add custom domain: `api.youandinotai.com`
3. Update DNS records at your domain registrar

### Step 5: Set Environment Variables

#### Netlify (Frontend)

```bash
VITE_API_URL=https://api.youandinotai.com
VITE_APP_NAME=Team Claude Dating
```

#### Railway (Backend)

```bash
DATABASE_URL=<automatically set by Railway>
JWT_SECRET=<generate with: openssl rand -hex 32>
FRONTEND_URL=https://youandinotai.com
NODE_ENV=production
PORT=4000
```

### Step 6: Run Migrations

```powershell
# Via Railway CLI
railway run npm run migrate

# Or in Railway dashboard
# Go to service → Deploy → Manual Deploy → Run Command: npm run migrate
```

---

## 🏥 Health Checks

### Automated Monitoring

```powershell
# Continuous monitoring (updates every 60 seconds)
.\automation\monitor.ps1
```

### Manual Health Checks

```powershell
# Test all endpoints
curl https://youandinotai.com
curl https://app.youandinotai.com
curl https://api.youandinotai.com/health
curl https://youandinotai.online
```

Expected responses:
- **Frontend**: HTTP 200 with HTML
- **API**: HTTP 200 with `{"status":"healthy"}`

---

## 🔄 Continuous Deployment

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Netlify
        run: |
          npm install -g netlify-cli
          cd date-app-dashboard/frontend
          npm install
          npm run build
          netlify deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          cd date-app-dashboard/backend
          npm install
          npm run build
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

### Manual Git Workflow

```bash
# Make changes
git add .
git commit -m "feat: your changes"
git push origin main

# Netlify and Railway auto-deploy on push
```

---

## 📊 Post-Deployment

### Verify Deployment

1. ✅ **Frontend**: Visit https://youandinotai.com
2. ✅ **API**: Check https://api.youandinotai.com/health
3. ✅ **SSL**: Verify HTTPS with green padlock
4. ✅ **Database**: Test user registration/login
5. ✅ **Admin**: Access https://youandinotai.online

### Monitor Services

```powershell
# View Netlify logs
netlify logs

# View Railway logs
railway logs

# View deployment status
netlify status
railway status
```

### Performance Optimization

1. ✅ **Netlify CDN**: Automatic global distribution
2. ✅ **Railway Autoscaling**: Handles traffic spikes
3. ✅ **Database Pooling**: Connection reuse enabled
4. ✅ **Asset Caching**: Configured in Netlify headers

---

## 🛠️ Troubleshooting

### Frontend Not Loading

```powershell
# Check Netlify deployment status
netlify status

# View recent deploys
netlify open

# Check build logs
netlify logs
```

### API Not Responding

```powershell
# Check Railway service status
railway status

# View logs
railway logs

# Restart service
railway restart
```

### Database Connection Issues

```bash
# Check database status
railway run psql $DATABASE_URL -c "SELECT version();"

# View connection pool
railway run npm run db:status
```

### SSL Certificate Issues

- **Netlify**: Certificates renew automatically every 90 days
- **Railway**: Set custom domain, SSL auto-provisions
- Force HTTPS in `netlify.toml`:

```toml
[[redirects]]
  from = "http://*"
  to = "https://:splat"
  status = 301
  force = true
```

---

## 🔐 Security Checklist

- [x] All secrets in environment variables (not code)
- [x] HTTPS enabled on all domains
- [x] CORS configured for youandinotai.com only
- [x] JWT tokens with expiration
- [x] Database SSL connections enforced
- [x] Rate limiting enabled on API
- [x] Input validation on all endpoints
- [x] SQL injection prevention (parameterized queries)

---

## 💾 Backup Strategy

### Database Backups

Railway provides automatic daily backups.

Manual backup:

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
railway run psql $DATABASE_URL < backup-20250109.sql
```

### Code Backups

- ✅ **GitHub**: Primary repository
- ✅ **Local**: Clone to multiple machines
- ✅ **Tags**: Release versions

```bash
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

---

## 📈 Scaling

### Netlify

- ✅ Auto-scales with traffic
- ✅ Global CDN distribution
- ✅ No configuration needed

### Railway

Upgrade plan for:
- More RAM (default: 512MB)
- More CPU (default: 1 vCPU)
- Horizontal scaling (multiple instances)

```bash
# View current resources
railway resources

# Upgrade in Railway dashboard:
# Settings → Service → Resources → Upgrade Plan
```

---

## 📞 Support

- **GitHub Issues**: [github.com/Trollz1004/Trollz1004/issues](https://github.com/Trollz1004/Trollz1004/issues)
- **Email**: support@youandinotai.com
- **Charity Partner**: [Shriners Children's](https://www.shrinerschildrens.org/)

---

## 🎉 Success!

Your Team Claude For The Kids platform is now live and automatically donating 50% of all profits to Shriners Children's Hospitals!

**Next Steps**:
1. Monitor health: `.\automation\monitor.ps1`
2. View analytics in Netlify/Railway dashboards
3. Celebrate helping kids! 💜

---

**Built with ❤️ by Team Claude For The Kids**
]]>