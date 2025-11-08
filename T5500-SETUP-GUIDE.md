# 🖥️ T5500 Setup Guide - Team Claude For The Kids

## Dell Precision T5500 Deployment Setup

Complete setup instructions for deploying from your T5500 workstation.

---

## 📋 STEP 1: Check Your System

**Run these commands on your T5500:**

```bash
# Check OS
uname -a
cat /etc/os-release

# Check if Git is installed
git --version

# Check if Node.js is installed
node --version
npm --version
```

---

## 🔧 STEP 2: Install Required Tools

### For Ubuntu/Debian Linux:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Git (if not installed)
sudo apt install git -y

# Install Node.js 20.x (Latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
git --version
node --version
npm --version
```

### For Fedora/RHEL/CentOS:

```bash
# Update system
sudo dnf update -y

# Install Git
sudo dnf install git -y

# Install Node.js
sudo dnf install nodejs npm -y

# Verify
git --version
node --version
npm --version
```

### For Windows (if running Windows on T5500):

1. **Download and install Git:**
   - https://git-scm.com/download/win
   - Use Git Bash for commands

2. **Download and install Node.js:**
   - https://nodejs.org/en/download/
   - Get version 20.x LTS

3. **Verify in Command Prompt or Git Bash:**
```cmd
git --version
node --version
npm --version
```

---

## 🚀 STEP 3: Install Railway CLI

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Verify installation
railway --version
```

---

## 📥 STEP 4: Clone Repository

```bash
# Navigate to your projects directory
cd ~
mkdir -p projects
cd projects

# Clone the repository
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# Checkout the deployment branch
git checkout claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK

# Verify you're on the right branch
git branch
```

---

## 🔑 STEP 5: Configure Environment Variables

**Create .env.production file:**

```bash
# Copy the example
cp .env.production.example .env.production

# Edit with your preferred editor
nano .env.production
# OR
vim .env.production
# OR
code .env.production  # if using VS Code
```

**Add your actual credentials:**

```env
# REQUIRED - Square Payments (Production)
SQUARE_ACCESS_TOKEN=EAAAlxxxxxxxxxxxxxxxxxxx
SQUARE_APP_ID=sq0idp-xxxxxxxxxxxxx
SQUARE_ENVIRONMENT=production
SQUARE_LOCATION_ID=your_location_id

# REQUIRED - AI Marketing
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxx

# OPTIONAL - Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxx

# OPTIONAL - Google Ads
GOOGLE_ADS_API_KEY=your_google_ads_key
```

**Where to get credentials:**

1. **Square (REQUIRED):**
   - Go to: https://developer.squareup.com/apps
   - Select your app (or create one)
   - Get Access Token from "Production" tab
   - Get Application ID from app settings
   - Get Location ID from Locations section

2. **Perplexity (REQUIRED for AI marketing):**
   - Go to: https://www.perplexity.ai/settings/api
   - Generate API key
   - Copy and paste into .env.production

3. **SendGrid (Optional - for emails):**
   - Go to: https://app.sendgrid.com/settings/api_keys
   - Create API key
   - Copy and paste

**Save the file:**
- Nano: `Ctrl+X`, then `Y`, then `Enter`
- Vim: `:wq`
- VS Code: `Ctrl+S`

---

## 🚂 STEP 6: Deploy to Railway

**Run the automated deployment script:**

```bash
# Make script executable
chmod +x railway-api-deploy.sh

# Run deployment
./railway-api-deploy.sh
```

**What will happen:**

1. **Railway CLI Check** - Verifies Railway is installed
2. **Authentication** - Opens browser to login to Railway
   - Click "Login with GitHub"
   - Authorize the CLI
   - Return to terminal

3. **Environment Check** - Validates your credentials
4. **Project Creation** - Creates Railway project
5. **Database Setup** - Provisions PostgreSQL automatically
6. **Variable Configuration** - Sets all environment variables
7. **Deployment** - Builds and deploys your app (3-5 minutes)
8. **Domain Generation** - Creates public URL

**Watch for:**
- Green checkmarks ✅ = Success
- Yellow warnings ⚠️ = Optional features skipped
- Red errors ❌ = Issues to fix

---

## 📱 STEP 7: Get Your Live URL

**After deployment completes:**

```bash
# Get your domain
railway domain

# View deployment status
railway status

# Open Railway dashboard in browser
railway open
```

**Your platform will be live at:**
`https://your-project-name.railway.app`

---

## ✅ STEP 8: Test Your Platform

**1. Visit your URL:**
```bash
# Linux
xdg-open https://your-project-name.railway.app

# macOS
open https://your-project-name.railway.app

# Windows
start https://your-project-name.railway.app
```

**2. Create a test account**

**3. Test payment with Square test card:**
- Card: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits
- Zip: Any 5 digits

**4. Verify payment in Square Dashboard:**
- https://squareup.com/dashboard

**5. Check charity allocation:**
- 50% should automatically go to Shriners

---

## 🛠️ Troubleshooting

### "Railway command not found"
```bash
# Re-install Railway CLI
npm uninstall -g @railway/cli
npm install -g @railway/cli

# Check PATH
echo $PATH

# Try with npx
npx @railway/cli login
```

### "Git not found"
```bash
# Ubuntu/Debian
sudo apt install git -y

# Fedora/RHEL
sudo dnf install git -y
```

### "Node version too old"
```bash
# Ubuntu/Debian - Install Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x.x
```

### "Authentication failed"
```bash
# Logout and re-login
railway logout
railway login
```

### "Deployment failed"
```bash
# Check logs
railway logs

# Check status
railway status

# Re-deploy
railway up
```

---

## 📊 Post-Deployment

### Monitor Your Platform:

```bash
# View logs in real-time
railway logs --follow

# Check deployment status
railway status

# List environment variables
railway variables

# Open Railway dashboard
railway open
```

### Revenue Tracking:
- **Square Dashboard:** https://squareup.com/dashboard
- **Railway Dashboard:** https://railway.app/dashboard

### Marketing Automation:
- Runs automatically every 6 hours
- Posts to social media (12 posts/day)
- Searches for grants daily
- Optimizes ad spend

---

## 💰 Revenue Targets

**Month 1:** $10K = $5K to charity
**Month 6:** $50K = $25K to charity
**Year 1:** $1.2M = $600K to Shriners Children's Hospitals 💚

---

## 🎯 Next Steps After Live

1. **Share your platform URL** on social media
2. **Monitor Square Dashboard** for payments
3. **Check Railway logs** for any issues
4. **Scale up** as users grow (Railway auto-scales)
5. **Apply for grants** (automation handles this)

---

## 📞 Support

**Useful Commands:**
```bash
railway logs          # View application logs
railway status        # Check deployment status
railway open          # Open Railway dashboard
railway domain        # View/generate domain
railway variables     # List environment variables
railway restart       # Restart application
railway down          # Stop application
railway up            # Deploy/redeploy
```

**Documentation:**
- Railway Docs: https://docs.railway.app
- Square Developer: https://developer.squareup.com
- Perplexity API: https://docs.perplexity.ai

**Files in Repository:**
- `DEPLOY-INSTRUCTIONS.md` - Detailed deployment guide
- `DEPLOY-RAILWAY.md` - Railway-specific guide
- `DEPLOY-CHECKLIST.md` - Pre/post deployment checklist
- `deploy.html` - Interactive visual guide

---

## ✨ You're Ready!

Your T5500 is now a deployment powerhouse!

**Run:** `./railway-api-deploy.sh`

**Result:** Live platform helping kids! 🚀💚

---

**Current Branch:** `claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK`
**Repository:** https://github.com/Trollz1004/Trollz1004
**Target:** $600K+ to Shriners Children's Hospitals in Year 1
