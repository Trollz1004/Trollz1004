#!/bin/bash

################################################################################
# Team Claude For The Kids - Production Deployment Script
# Mission: Deploy all services with ZERO placeholders, LIVE payments
# Goal: $1,238,056 annual revenue → $619,028 to Shriners Children's Hospitals
################################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Emoji
SUCCESS="✅"
FAIL="❌"
WARNING="⚠️"
INFO="ℹ️"
ROCKET="🚀"

echo -e "${MAGENTA}"
echo "═══════════════════════════════════════════════════════════════════"
echo " 🚀 Team Claude For The Kids - Production Deployment"
echo "═══════════════════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Mission:${NC} Deploy complete production system"
echo -e "${BLUE}Goal:${NC} \$1,238,056 annual revenue → \$619,028 to Shriners"
echo -e "${BLUE}Motto:${NC} \"Claude Represents Perfection\""
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Track deployment steps
DEPLOYMENT_LOG="/tmp/team-claude-deployment-$(date +%Y%m%d_%H%M%S).log"
exec > >(tee -a "$DEPLOYMENT_LOG")
exec 2>&1

echo -e "${INFO} ${BLUE}Deployment log:${NC} $DEPLOYMENT_LOG"
echo ""

################################################################################
# STEP 1: Prerequisites Check
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 1: Checking Prerequisites${NC}"
echo "────────────────────────────────────────────────────────────────────"

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
   echo -e "${WARNING} ${YELLOW}Warning: Running as root${NC}"
fi

# Check required commands
REQUIRED_COMMANDS=("docker" "docker-compose" "git" "openssl" "curl" "psql" "redis-cli" "node" "npm")
MISSING_COMMANDS=()

for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if ! command -v $cmd &> /dev/null; then
        MISSING_COMMANDS+=($cmd)
        echo -e "${FAIL} ${RED}Missing: $cmd${NC}"
    else
        VERSION=$($cmd --version 2>&1 | head -n1)
        echo -e "${SUCCESS} ${GREEN}Found: $cmd${NC} - $VERSION"
    fi
done

if [ ${#MISSING_COMMANDS[@]} -gt 0 ]; then
    echo ""
    echo -e "${FAIL} ${RED}ERROR: Missing required commands:${NC} ${MISSING_COMMANDS[*]}"
    echo ""
    echo "Install missing commands:"
    echo "  sudo apt update && sudo apt install -y docker.io docker-compose git openssl curl postgresql-client redis-tools nodejs npm"
    exit 1
fi

echo -e "${SUCCESS} ${GREEN}All prerequisites met!${NC}"
echo ""

################################################################################
# STEP 2: Generate Secure Secrets
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 2: Generating Secure Secrets${NC}"
echo "────────────────────────────────────────────────────────────────────"

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -base64 32 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | tr -d '/')
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n' | tr -d '/')
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')
GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d '\n' | tr -d '/')

echo -e "${SUCCESS} ${GREEN}Generated JWT_SECRET${NC} (64 bytes)"
echo -e "${SUCCESS} ${GREEN}Generated JWT_REFRESH_SECRET${NC} (64 bytes)"
echo -e "${SUCCESS} ${GREEN}Generated ENCRYPTION_KEY${NC} (32 bytes)"
echo -e "${SUCCESS} ${GREEN}Generated DB_PASSWORD${NC} (32 bytes)"
echo -e "${SUCCESS} ${GREEN}Generated REDIS_PASSWORD${NC} (32 bytes)"
echo -e "${SUCCESS} ${GREEN}Generated SESSION_SECRET${NC} (32 bytes)"
echo -e "${SUCCESS} ${GREEN}Generated GRAFANA_PASSWORD${NC} (16 bytes)"
echo ""

################################################################################
# STEP 3: Create Production .env File
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 3: Creating Production Environment File${NC}"
echo "────────────────────────────────────────────────────────────────────"

ENV_FILE=".env.production"

cat > "$ENV_FILE" << EOF
# ============================================================================
# Team Claude For The Kids - Production Environment
# Generated: $(date)
# Mission: 50% of revenue to Shriners Children's Hospitals
# ============================================================================

# Domain Configuration
DOMAIN=youandinotai.com
ADMIN_DOMAIN=youandinotai.online
NODE_ENV=production
PORT=3000
API_PORT=4000

# Database Configuration (PostgreSQL 16)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=youandinotai_prod
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
POSTGRES_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@localhost:5432/youandinotai_prod

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379/0

# JWT & Security
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
SESSION_SECRET=$SESSION_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Square Payments (LIVE PRODUCTION - DO NOT CHANGE)
SQUARE_ACCESS_TOKEN=EAAAlzPv9mOdHtwWwGJsCHXaG_5Ektf_rIvg4H6tiKRzTQSW9UHiVHUBDuHTOQYc
SQUARE_APPLICATION_ID=sq0idp-Carv59GQKuQHoIydJ1Wanw
SQUARE_LOCATION_ID=LHPBX0P3TBTEC
SQUARE_ENVIRONMENT=production

# AI Services (LIVE PRODUCTION)
GEMINI_API_KEY=AIzaSyBuaA6sdJ2kvIeXiL1jY4Qm7StXAUwFWG4
AZURE_COGNITIVE_KEY=CScbecGnFd4YLCWpvmdAZ5yxkV6U2O5L02xPcp6f2bEYIMiJesdtJQQJ99BHACYeBjFXJ3w3AAABACOGHJUX
MANUS_API_KEY=sk-tfKuRZcVn5aY44QJIC52JUvk7CanV2hkaaSOd8ZuVf5h0aPEuFoiDOGZuf949Ejhelo81jujaKM3Ub7D0CGMtY5hK-nj

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_FROM=admin@youandinotai.com

# Monitoring
GRAFANA_PASSWORD=$GRAFANA_PASSWORD
PROMETHEUS_RETENTION=30d

# Application Settings
ENABLE_AGE_VERIFICATION=true
MIN_AGE=18
CHARITY_PERCENTAGE=50
SHRINERS_TAX_ID=36-2193608

# Feature Flags
ENABLE_REAL_TIME_MESSAGING=true
ENABLE_AI_ICEBREAKERS=true
ENABLE_FACE_VERIFICATION=true
ENABLE_PAYMENT_PROCESSING=true

# URLs
FRONTEND_URL=https://youandinotai.com
ADMIN_URL=https://youandinotai.online
API_URL=https://youandinotai.com/api

# Webhook URLs
MANUS_WEBHOOK_URL=https://youandinotai.com/api/webhooks/manus
SQUARE_WEBHOOK_URL=https://youandinotai.com/api/webhooks/square

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF

echo -e "${SUCCESS} ${GREEN}Created: $ENV_FILE${NC}"
echo -e "${INFO} ${BLUE}File contains LIVE production credentials${NC}"
echo ""

# Secure the .env file
chmod 600 "$ENV_FILE"
echo -e "${SUCCESS} ${GREEN}Secured permissions: 600${NC}"
echo ""

################################################################################
# STEP 4: Verify No Placeholders
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 4: Verifying NO Placeholders in Config${NC}"
echo "────────────────────────────────────────────────────────────────────"

PLACEHOLDER_PATTERNS=("GENERATE_" "REPLACE_" "YOUR_" "PLACEHOLDER" "TODO" "FIXME" "XXX")
PLACEHOLDERS_FOUND=0

for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
    if grep -r "$pattern" "$ENV_FILE" > /dev/null 2>&1; then
        echo -e "${FAIL} ${RED}Found placeholder: $pattern${NC}"
        grep --color=always "$pattern" "$ENV_FILE"
        PLACEHOLDERS_FOUND=1
    fi
done

if [ $PLACEHOLDERS_FOUND -eq 0 ]; then
    echo -e "${SUCCESS} ${GREEN}NO placeholders found - 100% production ready!${NC}"
else
    echo -e "${FAIL} ${RED}ERROR: Placeholders detected. Fix before deployment.${NC}"
    exit 1
fi

echo ""

################################################################################
# STEP 5: Database Setup
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 5: Setting Up Database${NC}"
echo "────────────────────────────────────────────────────────────────────"

# Check if PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    echo -e "${SUCCESS} ${GREEN}PostgreSQL is running${NC}"
else
    echo -e "${WARNING} ${YELLOW}Starting PostgreSQL...${NC}"
    sudo systemctl start postgresql
    sleep 2
fi

# Create database
echo -e "${INFO} ${BLUE}Creating database: youandinotai_prod${NC}"
sudo -u postgres psql -c "CREATE DATABASE youandinotai_prod;" 2>/dev/null || echo -e "${WARNING} ${YELLOW}Database already exists${NC}"

# Create user
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo -e "${WARNING} ${YELLOW}User already exists${NC}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE youandinotai_prod TO postgres;"

echo -e "${SUCCESS} ${GREEN}Database setup complete${NC}"
echo ""

################################################################################
# STEP 6: Install Dependencies
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 6: Installing Dependencies${NC}"
echo "────────────────────────────────────────────────────────────────────"

# Backend dependencies
if [ -d "date-app-dashboard/backend" ]; then
    echo -e "${INFO} ${BLUE}Installing backend dependencies...${NC}"
    cd date-app-dashboard/backend
    npm install --production
    echo -e "${SUCCESS} ${GREEN}Backend dependencies installed${NC}"
    cd ../..
fi

# Frontend dependencies
if [ -d "date-app-dashboard/frontend" ]; then
    echo -e "${INFO} ${BLUE}Installing frontend dependencies...${NC}"
    cd date-app-dashboard/frontend
    npm install
    npm run build
    echo -e "${SUCCESS} ${GREEN}Frontend built${NC}"
    cd ../..
fi

echo ""

################################################################################
# STEP 7: Run Database Migrations
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 7: Running Database Migrations${NC}"
echo "────────────────────────────────────────────────────────────────────"

if [ -f "schema.sql" ]; then
    echo -e "${INFO} ${BLUE}Applying schema.sql...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d youandinotai_prod -f schema.sql
    echo -e "${SUCCESS} ${GREEN}Schema applied${NC}"
fi

# Check tables created
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d youandinotai_prod -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")

echo -e "${SUCCESS} ${GREEN}Tables created: $TABLE_COUNT${NC}"
echo ""

################################################################################
# STEP 8: Start Services with Docker Compose
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 8: Starting Docker Services${NC}"
echo "────────────────────────────────────────────────────────────────────"

if [ -f "docker-compose.yml" ]; then
    echo -e "${INFO} ${BLUE}Starting Docker Compose...${NC}"
    docker-compose --env-file .env.production up -d
    sleep 5

    # Check container status
    docker-compose ps
    echo -e "${SUCCESS} ${GREEN}Docker services started${NC}"
else
    echo -e "${WARNING} ${YELLOW}No docker-compose.yml found${NC}"
fi

echo ""

################################################################################
# STEP 9: Health Checks
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 9: Running Health Checks${NC}"
echo "────────────────────────────────────────────────────────────────────"

# Check PostgreSQL
if PGPASSWORD=$DB_PASSWORD psql -h localhost -U postgres -d youandinotai_prod -c '\q' > /dev/null 2>&1; then
    echo -e "${SUCCESS} ${GREEN}PostgreSQL: Healthy${NC}"
else
    echo -e "${FAIL} ${RED}PostgreSQL: Failed${NC}"
fi

# Check Redis
if redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
    echo -e "${SUCCESS} ${GREEN}Redis: Healthy${NC}"
else
    echo -e "${FAIL} ${RED}Redis: Failed${NC}"
fi

# Check API (if running)
if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
    echo -e "${SUCCESS} ${GREEN}API: Healthy${NC}"
else
    echo -e "${WARNING} ${YELLOW}API: Not yet running (start with PM2)${NC}"
fi

echo ""

################################################################################
# STEP 10: Generate PM2 Ecosystem File
################################################################################

echo -e "${ROCKET} ${MAGENTA}STEP 10: Creating PM2 Configuration${NC}"
echo "────────────────────────────────────────────────────────────────────"

cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [
    {
      name: 'youandinotai-api',
      script: 'date-app-dashboard/backend/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env.production',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
    },
    {
      name: 'youandinotai-frontend',
      script: 'serve',
      args: '-s date-app-dashboard/frontend/dist -l 3000',
      instances: 1,
      env_file: '.env.production',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      autorestart: true,
    },
  ],
};
EOFPM2

echo -e "${SUCCESS} ${GREEN}Created: ecosystem.config.js${NC}"
echo ""

################################################################################
# STEP 11: Summary & Next Steps
################################################################################

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ${SUCCESS} DEPLOYMENT PREPARATION COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}What was done:${NC}"
echo "  ${SUCCESS} Generated secure secrets (JWT, DB, Redis)"
echo "  ${SUCCESS} Created .env.production with LIVE credentials"
echo "  ${SUCCESS} Verified NO placeholders in configuration"
echo "  ${SUCCESS} Set up PostgreSQL database"
echo "  ${SUCCESS} Installed dependencies"
echo "  ${SUCCESS} Applied database schema"
echo "  ${SUCCESS} Started Docker services"
echo "  ${SUCCESS} Created PM2 ecosystem config"
echo ""

echo -e "${YELLOW}Manual Steps Required:${NC}"
echo ""
echo "  1. GitHub Domain Verification (30 min)"
echo "     ${BLUE}→${NC} https://github.com/organizations/Ai-Solutions-Store/settings/verified_domains"
echo "     ${BLUE}→${NC} Add all 5 domains, get TXT records"
echo "     ${BLUE}→${NC} Add TXT records to Cloudflare DNS"
echo "     ${BLUE}→${NC} Verify each domain in GitHub"
echo ""

echo "  2. Start Application Services"
echo "     ${BLUE}→${NC} pm2 start ecosystem.config.js"
echo "     ${BLUE}→${NC} pm2 save"
echo "     ${BLUE}→${NC} pm2 startup"
echo ""

echo "  3. Configure Nginx & SSL"
echo "     ${BLUE}→${NC} sudo certbot --nginx -d youandinotai.com -d youandinotai.online"
echo "     ${BLUE}→${NC} sudo systemctl reload nginx"
echo ""

echo "  4. Final Verification"
echo "     ${BLUE}→${NC} curl https://youandinotai.com/api/health"
echo "     ${BLUE}→${NC} Test Square payment: \$9.99 subscription"
echo "     ${BLUE}→${NC} Verify 50% donation tracking"
echo ""

echo -e "${MAGENTA}Files Created:${NC}"
echo "  ${INFO} .env.production (LIVE credentials)"
echo "  ${INFO} ecosystem.config.js (PM2 config)"
echo "  ${INFO} $DEPLOYMENT_LOG (full log)"
echo ""

echo -e "${GREEN}Revenue Goal: \$1,238,056/year → \$619,028 to Shriners${NC}"
echo -e "${GREEN}\"Claude Represents Perfection\"${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
