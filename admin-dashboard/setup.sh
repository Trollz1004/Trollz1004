#!/bin/bash

# ============================================================================
# TROLLZ1004 ADMIN DASHBOARD - QUICK SETUP SCRIPT
# ============================================================================

echo "🎛️  TROLLZ1004 Admin Dashboard Setup"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking prerequisites..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ required. Current: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Check PostgreSQL
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✅ PostgreSQL installed${NC}"
else
    echo -e "${RED}❌ PostgreSQL not found. Please install PostgreSQL 15+${NC}"
    exit 1
fi

# Check Redis
if command -v redis-cli &> /dev/null; then
    echo -e "${GREEN}✅ Redis installed${NC}"
else
    echo -e "${YELLOW}⚠️  Redis not found. Install Redis for caching & queues${NC}"
fi

echo ""
echo "🔧 Setting up backend..."
cd backend

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    npm install
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Backend node_modules exists, skipping install${NC}"
fi

# Setup .env if not exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit backend/.env with your actual credentials${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Create database if not exists
echo "🗄️  Setting up database..."
DB_NAME="admin_dashboard"
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${GREEN}✅ Database '$DB_NAME' already exists${NC}"
else
    echo "Creating database '$DB_NAME'..."
    createdb $DB_NAME
    echo -e "${GREEN}✅ Database created${NC}"
fi

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate
echo -e "${GREEN}✅ Migrations complete${NC}"

cd ..

echo ""
echo "🎨 Setting up frontend..."
cd frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend node_modules exists, skipping install${NC}"
fi

# Setup .env if not exists
if [ ! -f ".env" ]; then
    echo "📝 Creating frontend .env file..."
    cp .env.example .env
    echo -e "${GREEN}✅ Frontend .env created${NC}"
else
    echo -e "${GREEN}✅ Frontend .env exists${NC}"
fi

cd ..

echo ""
echo "============================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo "============================================"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Edit environment files:"
echo "   - backend/.env (add API keys, database credentials)"
echo "   - frontend/.env (configure API URL)"
echo ""
echo "2. Start development servers:"
echo "   Backend:  cd backend && npm run dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "3. Access dashboard:"
echo "   Local: http://localhost:5173"
echo "   Prod:  https://youandinotai.online"
echo ""
echo "📚 Documentation:"
echo "   - README.md"
echo "   - ADMIN_DASHBOARD_SPEC.md"
echo "   - backend/src/database/schema.sql"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   - NEVER commit .env files"
echo "   - Keep private keys secure"
echo "   - Enable 2FA for production"
echo "   - All data is REAL (no fake data)"
echo ""
echo "🚀 Happy building!"
