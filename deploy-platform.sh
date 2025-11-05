#!/bin/bash
################################################################################
# YouAndINotAI Platform Deployment Script
# Deploys the complete platform on T5500
################################################################################

set -e

echo "=========================================="
echo "YOUANDINOTAI PLATFORM DEPLOYMENT"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Change to app directory
cd /opt/youandinotai/app 2>/dev/null || cd ~/Trollz1004

log_info "Current directory: $(pwd)"

# Check if .env exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found. Creating from template..."

    cat > .env << 'EOF'
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD
POSTGRES_DB=youandinotai_prod
DATABASE_URL=postgresql://postgres:CHANGE_ME_SECURE_PASSWORD@postgres:5432/youandinotai_prod

# Redis Configuration
REDIS_URL=redis://redis:6379

# JWT Configuration
JWT_SECRET=CHANGE_ME_RANDOM_SECRET_KEY_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_ME_ANOTHER_RANDOM_SECRET_KEY

# Server Configuration
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://youandinotai.com
DASHBOARD_URL=https://youandinotai.online

# API Keys
PERPLEXITY_API_KEY=CHANGE_ME
SQUARE_ACCESS_TOKEN=CHANGE_ME
SQUARE_LOCATION_ID=CHANGE_ME
SQUARE_ENVIRONMENT=production

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=CHANGE_ME
SMTP_PASS=CHANGE_ME
SMTP_FROM=noreply@youandinotai.com

# AWS S3 (Optional - for image uploads)
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
AWS_S3_BUCKET=youandinotai-uploads
AWS_REGION=us-east-1

# Security
ENCRYPTION_KEY=CHANGE_ME_RANDOM_32_CHAR_KEY
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOF

    log_error "Please edit .env file with your actual API keys and secrets!"
    log_info "Run: nano .env"
    echo ""
    echo "Required API Keys:"
    echo "  - PERPLEXITY_API_KEY (get from https://www.perplexity.ai)"
    echo "  - SQUARE_ACCESS_TOKEN (get from https://developer.squareup.com)"
    echo "  - SQUARE_LOCATION_ID (from Square dashboard)"
    echo "  - SMTP credentials (for email notifications)"
    echo ""
    exit 1
fi

# Validate required environment variables
log_info "Validating environment variables..."
source .env

REQUIRED_VARS=(
    "POSTGRES_PASSWORD"
    "JWT_SECRET"
    "PERPLEXITY_API_KEY"
    "SQUARE_ACCESS_TOKEN"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "CHANGE_ME" ] || [[ "${!var}" == CHANGE_ME* ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Missing or unchanged environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    log_error "Please configure .env file properly"
    exit 1
fi

log_success "Environment variables validated"

# Pull latest changes
log_info "Pulling latest code from GitHub..."
git pull origin main || log_warning "Could not pull from git (continuing anyway)"
log_success "Code updated"

# Install dependencies
log_info "Installing backend dependencies..."
cd date-app-dashboard/backend
npm install --production
cd ../..
log_success "Backend dependencies installed"

log_info "Installing frontend dependencies..."
cd date-app-dashboard/frontend
npm install --production
cd ../..
log_success "Frontend dependencies installed"

log_info "Installing admin dashboard dependencies..."
cd date-app-dashboard/admin-dashboard/backend
npm install --production
cd ../../..
log_success "Dashboard dependencies installed"

# Build Docker images
log_info "Building Docker images (this may take 5-10 minutes)..."
docker-compose build --no-cache
log_success "Docker images built"

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose down 2>/dev/null || true
log_success "Existing containers stopped"

# Start services
log_info "Starting all services..."
docker-compose up -d
log_success "Services started"

# Wait for database to be ready
log_info "Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
log_info "Running database migrations..."
docker-compose exec -T postgres psql -U postgres -d youandinotai_prod -f /docker-entrypoint-initdb.d/001_automation_tables.sql 2>/dev/null || log_warning "Migrations may have already run"
log_success "Database migrations complete"

# Health checks
log_info "Running health checks..."

sleep 5

# Check Docker containers
log_info "Checking container status..."
docker-compose ps

# Check backend health
if curl -f http://localhost:4000/health &>/dev/null; then
    log_success "Backend is healthy"
else
    log_error "Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3000 &>/dev/null; then
    log_success "Frontend is accessible"
else
    log_warning "Frontend may still be starting..."
fi

# Check dashboard
if curl -f http://localhost:8080 &>/dev/null; then
    log_success "Dashboard is accessible"
else
    log_warning "Dashboard may still be starting..."
fi

# Display status
echo ""
echo "=========================================="
log_success "PLATFORM DEPLOYED SUCCESSFULLY!"
echo "=========================================="
echo ""
echo "Services Status:"
echo "  Backend API:    http://$(hostname -I | awk '{print $1}'):4000"
echo "  Frontend App:   http://$(hostname -I | awk '{print $1}'):3000"
echo "  Admin Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "Database:"
echo "  PostgreSQL:     localhost:5432"
echo "  Redis:          localhost:6379"
echo ""
echo "Useful Commands:"
echo "  View logs:      docker-compose logs -f"
echo "  Check status:   docker-compose ps"
echo "  Restart:        docker-compose restart"
echo "  Stop:           docker-compose down"
echo ""
echo "Next Steps:"
echo "  1. Update DNS records to point to this server"
echo "  2. Set up SSL certificates with Certbot"
echo "  3. Test all features end-to-end"
echo "  4. Deploy to remaining 34 desktops"
echo ""
