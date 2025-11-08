#!/bin/bash
# Quick deployment commands for production server

echo "🚀 Team Claude For The Kids - Quick Deploy"
echo "=========================================="
echo ""

# Clone repository
echo "📥 Step 1: Cloning repository..."
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# Checkout deployment branch
echo "🔀 Step 2: Switching to deployment branch..."
git checkout claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV

# Make script executable
echo "🔧 Step 3: Making deployment script executable..."
chmod +x ULTIMATE_DEPLOY.sh

# Run deployment
echo "🚀 Step 4: Starting deployment..."
echo ""
echo "About to run ULTIMATE_DEPLOY.sh"
echo "This will take ~30 minutes"
echo ""
read -p "Press ENTER to start deployment..."

./ULTIMATE_DEPLOY.sh

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. pm2 start ecosystem.config.js"
echo "2. pm2 status"
echo "3. ./health-check.sh"
echo ""
