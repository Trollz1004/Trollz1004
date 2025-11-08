# 🪟 Windows 10 Pro + Ubuntu WSL Deployment Guide

## T5500 with Windows 10 Pro & Ubuntu (WSL)

Perfect setup! WSL Ubuntu is ideal for deployment.

---

## 🚀 QUICK DEPLOY (Copy/Paste Commands)

### **Step 1: Open Ubuntu Terminal**

**On your T5500:**
1. Press `Windows Key`
2. Type `Ubuntu`
3. Click **Ubuntu** (or Ubuntu 20.04/22.04)
4. Terminal opens

---

### **Step 2: Update System & Install Tools**

**Copy and paste this entire block into Ubuntu terminal:**

```bash
# Update Ubuntu
sudo apt update && sudo apt upgrade -y

# Install Git
sudo apt install git -y

# Install Node.js 20.x (Latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
echo "========================================"
echo "Checking installations:"
git --version
node --version
npm --version
echo "========================================"
```

**Enter your Ubuntu password when prompted**

---

### **Step 3: Install Railway CLI**

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Verify
railway --version
```

---

### **Step 4: Clone Repository**

```bash
# Navigate to home directory
cd ~

# Create projects folder
mkdir -p projects
cd projects

# Clone repository
git clone https://github.com/Trollz1004/Trollz1004.git

# Enter the repository
cd Trollz1004

# Checkout deployment branch
git checkout claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK

# Verify you're on the right branch
git branch
```

You should see: `* claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK`

---

### **Step 5: Configure Credentials**

**Create and edit .env.production:**

```bash
# Copy example file
cp .env.production.example .env.production

# Edit with nano
nano .env.production
```

**Update these 3 required lines:**

```env
SQUARE_ACCESS_TOKEN=EAAAlxxxxxxxxxxxxxxxxxxxxxxx
SQUARE_APP_ID=sq0idp-xxxxxxxxxxxxxxx
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get credentials:**

1. **Square (REQUIRED):**
   - Windows: Open browser → https://developer.squareup.com/apps
   - Login to your Square account
   - Select your app (or create one)
   - Click "Production" tab
   - Copy "Access Token"
   - Copy "Application ID"
   - Paste into .env.production

2. **Perplexity (REQUIRED):**
   - Windows: Open browser → https://www.perplexity.ai/settings/api
   - Generate API key
   - Copy and paste into .env.production

**Save the file:**
- Press `Ctrl+X`
- Press `Y` (yes)
- Press `Enter`

---

### **Step 6: Deploy to Railway**

```bash
# Make script executable
chmod +x railway-api-deploy.sh

# Run deployment
./railway-api-deploy.sh
```

---

## 📱 What Will Happen:

### **1. Railway Authentication (Browser Opens)**
- WSL will try to open your Windows browser
- If it doesn't open automatically, you'll see a URL like:
  ```
  https://railway.app/cli-login?...
  ```
- **Copy the URL** and paste in Windows browser
- Click **"Login with GitHub"**
- Authorize Railway CLI
- Return to Ubuntu terminal

### **2. Project Creation**
```
✅ Railway CLI installed
✅ Logged in to Railway
✅ Environment variables validated
✅ Railway project created
✅ PostgreSQL database added
```

### **3. Deployment (3-5 minutes)**
```
🚂 Deploying application...
📦 Building Docker container...
☁️  Uploading to Railway...
🎉 Deployment successful!
```

### **4. Get Your Live URL**
```
🌐 Frontend URL: https://teamclaude-production.railway.app
```

---

## 🛠️ WSL-Specific Tips

### **Opening Files in Windows**

**Edit .env.production in Windows Notepad:**
```bash
# From Ubuntu terminal
notepad.exe .env.production
```

**Or use VS Code:**
```bash
# If you have VS Code installed
code .env.production
```

### **Access WSL Files from Windows**

**In Windows File Explorer:**
1. Type in address bar: `\\wsl$\Ubuntu\home\<your-username>\projects\Trollz1004`
2. Or navigate to: `\\wsl$`

### **Copy Files Between Windows/WSL**

**From Windows to WSL:**
```bash
# In Ubuntu terminal
cp /mnt/c/Users/YourName/Downloads/somefile.txt ~/projects/
```

**From WSL to Windows:**
```bash
# In Ubuntu terminal
cp ~/projects/somefile.txt /mnt/c/Users/YourName/Downloads/
```

### **Windows drives in WSL:**
- C: drive → `/mnt/c/`
- D: drive → `/mnt/d/`

---

## ✅ After Deployment

### **Get Your URL:**
```bash
railway domain
```

### **View Logs:**
```bash
railway logs --follow
```

### **Open Railway Dashboard:**
```bash
# This should open in Windows browser
railway open

# If it doesn't open, manually visit:
# https://railway.app/dashboard
```

### **Check Deployment Status:**
```bash
railway status
```

---

## 🌐 Test Your Platform

**In Windows Browser:**
1. Open Chrome/Edge/Firefox
2. Go to your Railway URL: `https://your-app.railway.app`
3. Create a test account
4. Test payment with card: `4111 1111 1111 1111`
5. Verify in Square Dashboard: https://squareup.com/dashboard

---

## 🐛 Troubleshooting WSL Issues

### **"railway: command not found"**
```bash
# Check if npm global packages are in PATH
echo $PATH

# Try with npx
npx @railway/cli login

# Or reinstall
npm uninstall -g @railway/cli
npm install -g @railway/cli
```

### **"Browser didn't open for Railway login"**
```bash
# Run login manually
railway login

# Copy the URL shown
# Paste in Windows browser
# Complete authentication
```

### **"Permission denied"**
```bash
# Make sure script is executable
chmod +x railway-api-deploy.sh

# Run with bash explicitly
bash railway-api-deploy.sh
```

### **"Cannot connect to Railway"**
```bash
# Check internet connection
ping -c 3 google.com

# Try logout/login
railway logout
railway login
```

### **WSL Ubuntu won't start**
- Open PowerShell as Administrator:
  ```powershell
  wsl --list --verbose
  wsl --shutdown
  wsl
  ```

---

## 💡 Pro Tips for WSL

### **Update WSL to WSL 2 (if needed):**
```powershell
# In Windows PowerShell (Admin)
wsl --set-default-version 2
wsl --set-version Ubuntu 2
```

### **Increase WSL Memory (if deployment is slow):**
1. Create file: `C:\Users\YourName\.wslconfig`
2. Add:
   ```ini
   [wsl2]
   memory=4GB
   processors=2
   ```
3. Restart WSL:
   ```powershell
   wsl --shutdown
   ```

### **Install Windows Terminal (Better Experience):**
- Microsoft Store → Search "Windows Terminal"
- Gives tabs, better colors, easier to use

---

## 📊 Monitoring & Management

### **Useful Railway Commands:**
```bash
railway logs          # View application logs
railway logs -f       # Follow logs in real-time
railway status        # Check deployment status
railway open          # Open Railway dashboard
railway domain        # View/generate domain
railway variables     # List environment variables
railway restart       # Restart application
railway down          # Stop application
railway up            # Redeploy
```

### **Check Platform Health:**
```bash
# View recent logs
railway logs --lines 50

# Check if app is running
railway status

# See environment variables
railway variables
```

---

## 💰 Revenue Tracking

**Square Dashboard (Windows Browser):**
- https://squareup.com/dashboard
- View all transactions
- 50% automatically allocated to charity

**Railway Dashboard:**
- https://railway.app/dashboard
- Monitor uptime
- Check resource usage
- View deployment logs

---

## 🎯 Next Steps

### **After Your Platform is Live:**

1. **Share URL** on social media
2. **Monitor Square Dashboard** for payments
3. **Check Railway logs** for activity
4. **Scale automatically** - Railway handles traffic spikes
5. **Marketing automation** runs every 6 hours

### **Expected Growth:**
- **Week 1:** First users, test payments
- **Month 1:** $10K revenue = $5K to charity
- **Month 6:** $50K revenue = $25K to charity
- **Year 1:** $1.2M revenue = $600K to Shriners! 💚

---

## 📞 Need Help?

### **Documentation:**
- `T5500-SETUP-GUIDE.md` - General setup
- `DEPLOY-INSTRUCTIONS.md` - All deployment options
- `DEPLOY-RAILWAY.md` - Railway details
- `deploy.html` - Visual guide

### **Online Resources:**
- Railway Docs: https://docs.railway.app
- WSL Docs: https://docs.microsoft.com/en-us/windows/wsl
- Square Developer: https://developer.squareup.com

---

## ✨ You're Ready to Deploy!

**From your T5500 Ubuntu terminal, run:**

```bash
cd ~/projects/Trollz1004
./railway-api-deploy.sh
```

**Result:** Live platform helping kids in 5 minutes! 🚀💚

---

**Branch:** `claude/review-commit-7f5d789-011CUvrM6CxXtWjbnKL6DNJK`
**Repository:** https://github.com/Trollz1004/Trollz1004
**Target:** $600K+ to Shriners Children's Hospitals in Year 1
