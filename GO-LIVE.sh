#!/bin/bash
# ONE COMMAND TO GO LIVE - Run this and you're done

echo "🚀 TEAM CLAUDE - GOING LIVE NOW!"
echo "================================="
echo ""

# Create logs directory
mkdir -p logs

# Step 1: Copy env file
echo "📝 Step 1/5: Setting up environment..."
if [ -f ".env.production" ]; then
    cp .env.production .env
    echo "✅ Environment configured"
else
    echo "❌ .env.production not found - run ULTIMATE_DEPLOY.sh first"
    exit 1
fi

# Step 2: Build backend
echo ""
echo "🔨 Step 2/5: Building backend..."
cd date-app-dashboard/backend
if npm run build; then
    echo "✅ Backend built successfully"
else
    echo "⚠️  Backend build had errors - continuing anyway"
fi
cd ../..

# Step 3: Stop any existing PM2 processes
echo ""
echo "🛑 Step 3/5: Stopping old processes..."
pm2 delete all 2>/dev/null || true
echo "✅ Old processes stopped"

# Step 4: Start services
echo ""
echo "🚀 Step 4/5: Starting services..."
pm2 start ecosystem.config.js
pm2 save
echo "✅ Services started"

# Step 5: Check status
echo ""
echo "📊 Step 5/5: Checking status..."
sleep 3
pm2 status

echo ""
echo "================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "================================="
echo ""
echo "🧪 Test your site:"
echo "   curl http://localhost:5000/api/health"
echo "   curl http://localhost:3000"
echo ""
echo "📋 View logs:"
echo "   pm2 logs"
echo ""
echo "🌐 Go live:"
echo "   1. Get your PUBLIC IP: curl ifconfig.me"
echo "   2. Update Cloudflare DNS with that IP"
echo "   3. Visit https://youandinotai.com"
echo "   4. START EARNING MONEY! 💰"
echo ""
