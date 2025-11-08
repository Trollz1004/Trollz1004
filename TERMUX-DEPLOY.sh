#!/data/data/com.termux/files/usr/bin/bash
# TERMUX ONE-CLICK DEPLOY
# Run this to go live NOW!

echo "🚀 Team Claude For The Kids - Termux Deployment"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Pull latest code
echo -e "${BLUE}📥 Step 1: Getting latest code...${NC}"
cd ~/Trollz1004 2>/dev/null || cd ~/storage/shared/Trollz1004 2>/dev/null || {
    echo "Cloning repository..."
    cd ~
    git clone https://github.com/Trollz1004/Trollz1004.git
    cd Trollz1004
}

git checkout claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
git pull origin claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV

echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# Step 2: Install dependencies if needed
echo -e "${BLUE}📦 Step 2: Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    pkg install -y nodejs
fi

if ! command -v python &> /dev/null; then
    echo "Installing Python..."
    pkg install -y python
fi

echo -e "${GREEN}✅ Dependencies ready${NC}"
echo ""

# Step 3: Start simple HTTP server for HTML files
echo -e "${BLUE}🌐 Step 3: Starting web server...${NC}"

# Kill any existing servers
pkill -f "python.*http.server" 2>/dev/null
pkill -f "npx.*http-server" 2>/dev/null

# Start server in background
cd public
python -m http.server 8080 &
SERVER_PID=$!

echo -e "${GREEN}✅ Server started on port 8080${NC}"
echo ""

# Step 4: Get public IP
echo -e "${BLUE}🌍 Step 4: Getting your public IP...${NC}"

PUBLIC_IP=$(curl -s https://api.ipify.org)

echo -e "${GREEN}✅ Your public IP: ${PUBLIC_IP}${NC}"
echo ""

# Step 5: Show next steps
echo "================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "================================================"
echo ""
echo "🌐 Your site is running at:"
echo "   Local: http://localhost:8080"
echo "   Public: http://${PUBLIC_IP}:8080"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Configure DNS in Cloudflare:"
echo "   - Go to: https://dash.cloudflare.com"
echo "   - Select: youandinotai.com"
echo "   - DNS → Add record"
echo "   - Type: A"
echo "   - Name: @"
echo "   - IP: ${PUBLIC_IP}"
echo "   - Save"
echo ""
echo "2. Open your site:"
echo "   termux-open-url http://localhost:8080"
echo ""
echo "3. Test pages:"
echo "   - Main: http://localhost:8080/index.html"
echo "   - Shop: http://localhost:8080/shop.html"
echo "   - About: http://localhost:8080/about.html"
echo ""
echo "💰 To stop server: kill ${SERVER_PID}"
echo "🔄 To restart: ./TERMUX-DEPLOY.sh"
echo ""
echo "================================================"
echo "Team Claude For The Kids - Ready to Earn! 💚"
echo "================================================"
