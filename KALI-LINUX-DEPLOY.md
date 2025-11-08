# 🐉 Kali Linux Deployment Guide - Team Claude For The Kids

## Deploy on Kali Linux (T5500 or Any Machine)

Perfect choice! Kali Linux has all the tools you need.

---

## 🚀 QUICK DEPLOY (Copy/Paste - 5 Minutes)

### **Step 1: Open Terminal in Kali**

**Click the terminal icon** or press `Ctrl+Alt+T`

---

### **Step 2: Update System & Install Required Tools**

```bash
# Update Kali
sudo apt update && sudo apt upgrade -y

# Install Git (usually pre-installed in Kali)
sudo apt install git -y

# Install Node.js 20.x (Latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
echo "========================================"
echo "Installation Check:"
git --version
node --version
npm --version
echo "========================================"
```

---

### **Step 3: Install Railway CLI**

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Verify installation
railway --version
```

**If you get permission errors:**
```bash
# Fix npm global permissions (Kali-specific)
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Now install Railway
npm install -g @railway/cli
```

---

### **Step 4: Clone Repository**

```bash
# Navigate to home directory
cd ~

# Create projects folder
mkdir -p projects
cd projects

# Clone the repository
git clone https://github.com/Trollz1004/Trollz1004.git

# Enter repository
cd Trollz1004

# Checkout deployment branch
git checkout claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK

# Verify branch
git branch

# List deployment files
ls -la | grep -i deploy
```

You should see:
- `railway-api-deploy.sh`
- `DEPLOY-NOW.sh`
- Various `DEPLOY-*.md` files
- `deploy.html`

---

### **Step 5: Configure Environment Variables**

```bash
# Copy example environment file
cp .env.production.example .env.production

# Edit with your preferred editor
nano .env.production
# OR
vim .env.production
# OR
gedit .env.production  # If you prefer GUI editor
```

**Update these 3 REQUIRED lines:**

```env
SQUARE_ACCESS_TOKEN=EAAAlxxxxxxxxxxxxxxxxxxxxxxx
SQUARE_APP_ID=sq0idp-xxxxxxxxxxxxxxx
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get credentials:**

1. **Square Production Credentials:**
   - Open Firefox/Chromium in Kali
   - Go to: https://developer.squareup.com/apps
   - Login to your Square Developer account
   - Select your app (or create new one)
   - Click **"Production"** tab
   - Copy **Access Token** → Paste in .env.production
   - Copy **Application ID** → Paste in .env.production
   - Copy **Location ID** → Paste in .env.production

2. **Perplexity API Key:**
   - Go to: https://www.perplexity.ai/settings/api
   - Sign up/Login
   - Generate API key
   - Copy → Paste in .env.production

**Save the file:**
- **Nano:** Press `Ctrl+X`, then `Y`, then `Enter`
- **Vim:** Press `Esc`, type `:wq`, press `Enter`
- **Gedit:** Press `Ctrl+S`, close window

---

### **Step 6: Deploy to Railway**

```bash
# Make deployment script executable
chmod +x railway-api-deploy.sh

# Run deployment
./railway-api-deploy.sh
```

---

## 📱 What Happens Next:

### **1. Railway Authentication**

The script will open a browser window for Railway login:

```
🚂 RAILWAY AUTOMATED DEPLOYMENT 🚂

Step 1: Installing Railway CLI...
✅ Railway CLI already installed

Step 2: Setting up Railway authentication...
⚠️  Not logged in to Railway
ℹ️  Opening Railway login...

Please follow these steps:
1. You'll be redirected to Railway website
2. Log in with GitHub (or create account)
3. Authorize the CLI
4. Return here when done

Press ENTER to open login page...
```

**Press Enter** → Browser opens → **Login with GitHub** → Return to terminal

### **2. Environment Validation**

```
Step 3: Checking environment variables...
✅ Environment variables configured
```

If you see errors here, your .env.production needs valid credentials.

### **3. Project Creation**

```
Step 4: Initializing Railway project...
ℹ️  Creating new Railway project...
✅ Railway project created
```

### **4. Database Setup**

```
Step 5: Adding PostgreSQL database...
ℹ️  Adding PostgreSQL database...
✅ PostgreSQL database added
```

### **5. Variable Configuration**

```
Step 6: Setting environment variables...
✅ Environment variables set
```

### **6. Deployment (3-5 minutes)**

```
Step 7: Deploying application...
ℹ️  This will build and deploy your application (takes 3-5 minutes)...

🚂 Building...
📦 Uploading source files...
🔨 Installing dependencies...
⚙️  Building application...
🚀 Deploying to Railway...

✅ Deployment successful!
```

### **7. Get Your Live URL**

```
Step 8: Getting deployment information...

✅ Deployment Information:

🌐 Frontend URL: https://teamclaude-production.railway.app
📦 Project ID: abc-123-xyz
🏗️  Environment: production
```

---

## 🎯 After Deployment

### **Get Your Domain:**

```bash
railway domain
```

### **View Live Logs:**

```bash
railway logs --follow
```

Press `Ctrl+C` to stop following logs.

### **Open Railway Dashboard:**

```bash
railway open
```

This opens Railway dashboard in your browser.

### **Check Deployment Status:**

```bash
railway status
```

---

## 🌐 Test Your Platform

### **1. Open in Browser:**

```bash
# Firefox (default in Kali)
firefox https://your-app.railway.app

# Or Chromium
chromium https://your-app.railway.app
```

### **2. Create Test Account**

### **3. Test Payment:**

Use Square test card:
- **Card Number:** `4111 1111 1111 1111`
- **Expiry:** Any future date (e.g., 12/25)
- **CVV:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

### **4. Verify in Square Dashboard:**

```bash
firefox https://squareup.com/dashboard
```

Check that:
- ✅ Payment was processed
- ✅ 50% allocated to charity
- ✅ Revenue tracking working

---

## 🛠️ Kali Linux Specific Tips

### **Running as Root (Common in Kali):**

If you're logged in as root (default in some Kali installations):

```bash
# Check if you're root
whoami

# If output is "root", you can skip "sudo" in commands
# But for npm global packages, use --unsafe-perm:
npm install -g @railway/cli --unsafe-perm
```

### **Installing Additional Tools:**

```bash
# Install build tools (if needed)
sudo apt install build-essential -y

# Install curl (if not present)
sudo apt install curl -y

# Install screen (for persistent sessions)
sudo apt install screen -y
```

### **Using Screen for Long-Running Processes:**

```bash
# Start a screen session
screen -S deployment

# Run deployment
./railway-api-deploy.sh

# Detach from screen: Ctrl+A, then D

# Reattach later
screen -r deployment
```

### **Firewall Configuration (if UFW enabled):**

```bash
# Check firewall status
sudo ufw status

# Usually not needed for Railway deployment
# Railway handles all networking
```

---

## 🐛 Troubleshooting on Kali

### **"npm: command not found" after installing Node:**

```bash
# Check if nodejs is installed
which node

# Create symlink if needed
sudo ln -s /usr/bin/node /usr/bin/nodejs

# Or reinstall
sudo apt remove nodejs npm -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### **"Permission denied" errors with npm:**

```bash
# Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall Railway
npm install -g @railway/cli
```

### **"railway: command not found":**

```bash
# Check installation
which railway

# Add to PATH manually
echo 'export PATH="$PATH:~/.npm-global/bin"' >> ~/.bashrc
source ~/.bashrc

# Or use npx
npx @railway/cli login
npx @railway/cli up
```

### **Browser doesn't open for Railway auth:**

```bash
# Copy the URL shown in terminal
# Open Firefox manually:
firefox "paste-the-url-here"

# Or export BROWSER variable
export BROWSER=firefox
railway login
```

### **Git authentication issues:**

```bash
# Use HTTPS instead of SSH
git clone https://github.com/Trollz1004/Trollz1004.git

# Configure git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## 💡 Kali Linux Advantages

### **Built-in Security Tools:**

Your Kali system has tools to:
- ✅ Monitor traffic (Wireshark)
- ✅ Test security (Burp Suite, OWASP ZAP)
- ✅ Analyze performance (Various monitoring tools)
- ✅ Penetration test your own platform

### **Recommended: Test Your Platform Security**

After deployment, use Kali's tools to:

```bash
# Test SSL/TLS configuration
sslscan your-app.railway.app

# Scan for vulnerabilities (ethical testing only!)
nikto -h https://your-app.railway.app

# Check headers
curl -I https://your-app.railway.app
```

**Note:** Only test your own platform! Unauthorized testing is illegal.

---

## 📊 Monitoring Commands

### **View Railway Logs:**

```bash
# Last 50 lines
railway logs --lines 50

# Follow in real-time
railway logs --follow

# Filter for errors
railway logs | grep -i error
```

### **Check Resource Usage:**

```bash
railway status --json | jq
```

### **List Environment Variables:**

```bash
railway variables
```

### **Restart Application:**

```bash
railway restart
```

---

## 💰 Revenue Tracking

### **Square Dashboard:**
```bash
firefox https://squareup.com/dashboard
```

Monitor:
- Total revenue
- Transactions
- Subscription renewals
- Charity allocation (50%)

### **Railway Dashboard:**
```bash
railway open
```

Monitor:
- Uptime
- Resource usage
- Deployment history
- Database metrics

---

## 🎯 Post-Deployment Checklist

### **Immediate Tasks:**

- [ ] Platform is live and accessible
- [ ] Test account created
- [ ] Payment processing works
- [ ] Square dashboard shows transaction
- [ ] 50% charity split confirmed

### **Within 24 Hours:**

- [ ] Share platform URL on social media
- [ ] Set up monitoring alerts
- [ ] Test all features (profiles, matching, chat)
- [ ] Verify email notifications work
- [ ] Check AI marketing automation

### **Within 1 Week:**

- [ ] Review security (using Kali tools)
- [ ] Monitor for any errors in logs
- [ ] Check database performance
- [ ] Optimize if needed
- [ ] Apply for first grants (automated)

---

## 📱 Useful Railway Commands

```bash
railway logs              # View logs
railway logs -f           # Follow logs
railway status            # Check status
railway open              # Open dashboard
railway domain            # Get/create domain
railway variables         # List variables
railway restart           # Restart app
railway down              # Stop app
railway up                # Deploy/redeploy
railway link              # Link to existing project
railway whoami            # Check login status
```

---

## 🔒 Security Best Practices

### **Protect Your Credentials:**

```bash
# Make sure .env.production is not in git
cat .gitignore | grep .env.production

# Set secure permissions
chmod 600 .env.production

# Never commit .env files
git status  # Should not show .env.production
```

### **Update Kali Regularly:**

```bash
sudo apt update && sudo apt upgrade -y
```

### **Monitor Your Deployment:**

```bash
# Set up log monitoring
railway logs -f | tee deployment.log

# Check for suspicious activity
grep -i "error\|fail\|attack" deployment.log
```

---

## 💚 Expected Results

### **Immediate (Day 1):**
- ✅ Platform live at Railway URL
- ✅ Accepting user registrations
- ✅ Processing payments via Square
- ✅ 50% going to Shriners

### **Month 1:**
- 💰 $10K revenue = $5K to charity
- 👥 First users joining
- 🤖 AI marketing running

### **Year 1:**
- 💰 $1.2M revenue = $600K to Shriners Children's Hospitals
- 👥 Thousands of users
- 🚀 Platform scaling automatically

---

## 📄 Additional Resources

**Documentation in Repository:**
- `T5500-SETUP-GUIDE.md` - Hardware setup
- `DEPLOY-INSTRUCTIONS.md` - All deployment options
- `DEPLOY-RAILWAY.md` - Railway details
- `WINDOWS-WSL-DEPLOY.md` - Windows WSL guide
- `deploy.html` - Interactive visual guide

**External Resources:**
- Railway Docs: https://docs.railway.app
- Kali Linux Docs: https://www.kali.org/docs
- Square Developer: https://developer.squareup.com
- Node.js Docs: https://nodejs.org/docs

---

## ✨ You're Ready to Deploy on Kali!

### **Quick Command Summary:**

```bash
# 1. Install tools
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
npm install -g @railway/cli

# 2. Clone and setup
cd ~ && mkdir -p projects && cd projects
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004
git checkout claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK

# 3. Configure credentials
cp .env.production.example .env.production
nano .env.production
# Add your Square + Perplexity keys, save with Ctrl+X, Y, Enter

# 4. Deploy
chmod +x railway-api-deploy.sh
./railway-api-deploy.sh
```

**Time:** 5-7 minutes
**Result:** Live platform helping kids! 🚀💚

---

**Branch:** `claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK`
**Repository:** https://github.com/Trollz1004/Trollz1004
**Mission:** $600K+ to Shriners Children's Hospitals in Year 1
