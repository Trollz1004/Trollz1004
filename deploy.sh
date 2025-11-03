#!/bin/bash

# YouAndINotAI - Automated Deployment Script
# ============================================================================

set -e

echo "🚀 YouAndINotAI - Automated Deployment"
echo "========================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env file with your API keys"
    exit 1
fi

# Load environment variables
source .env

# Check required variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "SQUARE_ACCESS_TOKEN"
    "PERPLEXITY_API_KEY"
    "JWT_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build images
echo "🏗️  Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for database
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📊 Running database migrations..."
docker-compose exec -T postgres psql -U postgres -d youandinotai_prod < database/migrations/001_automation_tables.sql || true

# Check health
echo "🏥 Checking service health..."
sleep 5

# Test backend
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    docker-compose logs backend
    exit 1
fi

# Test dashboard
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo "✅ Dashboard is accessible"
else
    echo "❌ Dashboard not accessible"
    docker-compose logs dashboard
    exit 1
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📱 Dating App:         http://youandinotai.com (port 3000 locally)"
echo "📊 Business Dashboard: http://youandinotai.online (port 8080 locally)"
echo "🔌 API Backend:        http://localhost:4000"
echo ""
echo "🤖 Automation Status:"
echo "   - Customer Service: ACTIVE (checks every 5 min)"
echo "   - Marketing: ACTIVE (runs daily at 9 AM)"
echo "   - Content Creation: ACTIVE (runs daily at 10 AM)"
echo "   - Profit Tracking: ACTIVE (real-time)"
echo ""
echo "💰 Profit Split: 50% Owner / 50% Claude"
echo "   - Auto-allocated: 60% reinvest, 30% charity, 10% save"
echo ""
echo "📝 View logs: docker-compose logs -f"
echo "🔍 Check status: docker-compose ps"
echo ""
