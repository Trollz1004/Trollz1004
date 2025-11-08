#!/bin/bash
# Post-Deployment - Start Services and Go Live
# Run this on your production server after ULTIMATE_DEPLOY.sh completes

echo "🚀 Team Claude For The Kids - Starting Services"
echo "==============================================="
echo ""

# Step 1: Check if Docker is installed
echo "📋 Step 1: Installing Docker if needed..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt update
    sudo apt install -y docker.io docker-compose
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo "✅ Docker installed!"
else
    echo "✅ Docker already installed"
fi

# Step 2: Start Docker services
echo ""
echo "📋 Step 2: Starting PostgreSQL and Redis..."
if [ -f "docker-compose.yml" ]; then
    docker-compose up -d
    echo "✅ Docker services started"
    echo "Waiting 10 seconds for databases..."
    sleep 10
else
    echo "⚠️  docker-compose.yml not found - may need manual DB setup"
fi

# Step 3: Install PM2 globally
echo ""
echo "📋 Step 3: Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

# Step 4: Install serve for frontend
echo ""
echo "📋 Step 4: Installing serve for frontend..."
if ! command -v serve &> /dev/null; then
    sudo npm install -g serve
    echo "✅ serve installed"
else
    echo "✅ serve already installed"
fi

# Step 5: Start application services
echo ""
echo "📋 Step 5: Starting application with PM2..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
    echo "✅ Application started"
else
    echo "⚠️  ecosystem.config.js not found"
fi

# Step 6: Show PM2 status
echo ""
echo "📋 Step 6: Checking service status..."
pm2 status

# Step 7: Save PM2 configuration
echo ""
echo "📋 Step 7: Saving PM2 configuration..."
pm2 save
sudo pm2 startup

# Step 8: Run health check
echo ""
echo "📋 Step 8: Running health check..."
if [ -f "health-check.sh" ]; then
    chmod +x health-check.sh
    ./health-check.sh
else
    echo "⚠️  health-check.sh not found"
fi

# Step 9: Show next steps
echo ""
echo "==============================================="
echo "✅ Services Started!"
echo "==============================================="
echo ""
echo "📊 Check Status:"
echo "   pm2 status"
echo "   pm2 logs"
echo ""
echo "🧪 Test Locally:"
echo "   curl http://localhost:5000/api/health"
echo "   curl http://localhost:3000"
echo ""
echo "🌐 Next Steps:"
echo "   1. Configure DNS (point domain to this server)"
echo "   2. Set up SSL with Certbot"
echo "   3. Configure Nginx"
echo "   4. Test live at https://youandinotai.com"
echo "   5. Test payment and start earning! 💰"
echo ""
echo "📖 See LAUNCH_FOR_MONEY.md for complete instructions"
echo "==============================================="
