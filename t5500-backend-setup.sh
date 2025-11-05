#!/bin/bash
################################################################################
# T5500 BACKEND API SERVER SETUP
# Team Claude / TROLLZ1004 EMPIRE
# Role: Backend API Server (Node.js + PostgreSQL + Redis)
################################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

clear
echo -e "${PURPLE}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║            🎊 TEAM CLAUDE / TROLLZ1004 EMPIRE 🎊            ║
║                                                              ║
║              T5500 Backend API Server Setup                 ║
║                                                              ║
║    Mission: Generate Revenue → Help Children → AI for Good  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root: sudo bash t5500-backend-setup.sh"
    exit 1
fi

log_step "System Information"
echo "  Hostname: $(hostname)"
echo "  User: $(whoami)"
echo "  Date: $(date)"
echo ""

# Get the actual user (if running with sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
ACTUAL_HOME=$(getent passwd "$ACTUAL_USER" | cut -d: -f6)

log_info "Detected user: $ACTUAL_USER"
log_info "Home directory: $ACTUAL_HOME"
echo ""

# Confirm before proceeding
read -p "Continue with T5500 Backend API setup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Setup cancelled"
    exit 0
fi

################################################################################
# STEP 1: System Update
################################################################################
log_step "1/10 Updating System Packages"
apt-get update -qq || log_warning "Update had warnings (continuing)"
apt-get upgrade -y -qq || log_warning "Upgrade had warnings (continuing)"
log_success "System updated"

################################################################################
# STEP 2: Install Essential Packages
################################################################################
log_step "2/10 Installing Essential Packages"
apt-get install -y -qq \
    curl \
    wget \
    git \
    vim \
    htop \
    net-tools \
    ca-certificates \
    gnupg \
    lsb-release \
    software-properties-common \
    build-essential \
    ufw \
    fail2ban 2>/dev/null || log_warning "Some packages may have warnings"
log_success "Essential packages installed"

################################################################################
# STEP 3: Install Docker
################################################################################
log_step "3/10 Installing Docker"
if command -v docker &> /dev/null; then
    log_success "Docker already installed ($(docker --version))"
else
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start Docker
    systemctl start docker
    systemctl enable docker

    log_success "Docker installed and started"
fi

# Install Docker Compose standalone
if command -v docker-compose &> /dev/null; then
    log_success "Docker Compose already installed ($(docker-compose --version))"
else
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
fi

################################################################################
# STEP 4: Install Node.js 20.x LTS
################################################################################
log_step "4/10 Installing Node.js 20.x LTS"
if command -v node &> /dev/null; then
    log_success "Node.js already installed ($(node -v))"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    log_success "Node.js $(node -v) installed"
fi

# Update npm and install global packages
npm install -g npm@latest -q 2>/dev/null
npm install -g pm2 typescript ts-node -q 2>/dev/null
log_success "Global npm packages installed"

################################################################################
# STEP 5: Configure Firewall
################################################################################
log_step "5/10 Configuring Firewall (UFW)"
ufw --force reset >/dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 4000/tcp comment 'Backend API'
ufw allow 5432/tcp comment 'PostgreSQL'
ufw allow 6379/tcp comment 'Redis'
ufw --force enable
log_success "Firewall configured (SSH, API, DB, Redis)"

################################################################################
# STEP 6: System Optimization
################################################################################
log_step "6/10 Optimizing System for Production"

# Increase file limits
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Kernel tuning
cat >> /etc/sysctl.conf << 'EOF'

# Team Claude Backend Optimization
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65000
net.ipv4.tcp_tw_reuse = 1
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOF

sysctl -p > /dev/null 2>&1

log_success "System optimized for production workloads"

################################################################################
# STEP 7: Create Application Structure
################################################################################
log_step "7/10 Creating Application Directories"

# Create directories
mkdir -p /opt/teamclaudee/app
mkdir -p /opt/teamclaude/logs
mkdir -p /opt/teamclaude/data/postgres
mkdir -p /opt/teamclaude/data/redis
mkdir -p /opt/teamclaude/backups

# Set ownership to actual user
chown -R $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude

# Add user to docker group
usermod -aG docker $ACTUAL_USER

log_success "Application directories created"

################################################################################
# STEP 8: Clone Repository
################################################################################
log_step "8/10 Setting Up Repository"

cd /opt/teamclaude/app

# If already cloned, pull latest
if [ -d ".git" ]; then
    log_info "Repository exists, pulling latest changes..."
    sudo -u $ACTUAL_USER git pull origin main 2>/dev/null || log_warning "Could not pull (will continue)"
else
    # Check if we're already in the repo
    if [ -f "$ACTUAL_HOME/Trollz1004/date-app-dashboard/backend/package.json" ]; then
        log_info "Using existing repository from $ACTUAL_HOME/Trollz1004"
        rsync -a "$ACTUAL_HOME/Trollz1004/" /opt/teamclaude/app/ 2>/dev/null
        chown -R $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude/app
    else
        log_warning "Repository not found locally"
        log_info "Please clone manually: cd /opt/teamclaude/app && git clone <your-repo>"
    fi
fi

log_success "Repository ready"

################################################################################
# STEP 9: Setup Environment Configuration
################################################################################
log_step "9/10 Creating Environment Configuration"

# Create .env file if it doesn't exist
if [ ! -f "/opt/teamclaude/app/.env" ]; then
    cat > /opt/teamclaude/app/.env << 'ENVEOF'
# ═══════════════════════════════════════════════════════════════════════════
# TEAM CLAUDE / TROLLZ1004 EMPIRE
# T5500 Backend API Server Configuration
# Mission: Generate Revenue → Help Children → AI for Good
# ═══════════════════════════════════════════════════════════════════════════

# Server Configuration
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Frontend URLs
FRONTEND_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:8080

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=teamclaude
POSTGRES_PASSWORD=CHANGE_ME_SECURE_PASSWORD_HERE
POSTGRES_DB=trollz1004_empire
DATABASE_URL=postgresql://teamclaude:CHANGE_ME_SECURE_PASSWORD_HERE@localhost:5432/trollz1004_empire

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=CHANGE_ME_RANDOM_SECRET_KEY_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_ME_ANOTHER_RANDOM_SECRET_KEY_32_CHARS
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d

# Security
ENCRYPTION_KEY=CHANGE_ME_RANDOM_32_CHAR_ENCRYPTION_KEY
BCRYPT_ROUNDS=12

# API Keys
PERPLEXITY_API_KEY=CHANGE_ME_GET_FROM_PERPLEXITY_AI

# Square Payment (Production)
SQUARE_ACCESS_TOKEN=CHANGE_ME_FROM_SQUARE_DEVELOPER
SQUARE_LOCATION_ID=CHANGE_ME_FROM_SQUARE_DASHBOARD
SQUARE_ENVIRONMENT=production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=CHANGE_ME_YOUR_EMAIL
SMTP_PASS=CHANGE_ME_YOUR_APP_PASSWORD
SMTP_FROM=noreply@trollz1004empire.com

# AWS S3 (Optional - for image uploads)
AWS_ACCESS_KEY_ID=CHANGE_ME_OPTIONAL
AWS_SECRET_ACCESS_KEY=CHANGE_ME_OPTIONAL
AWS_S3_BUCKET=trollz1004-uploads
AWS_REGION=us-east-1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/teamclaude/logs/backend.log

# Team Claude Mission
CHARITY_ENABLED=true
CHARITY_NAME=Shriners Children's Hospital
CHARITY_PERCENTAGE=50
REINVESTMENT_PERCENTAGE=50

ENVEOF

    chown $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude/app/.env

    log_warning "⚠️  IMPORTANT: Edit /opt/teamclaude/app/.env with your API keys!"
    log_info "Required: POSTGRES_PASSWORD, JWT_SECRET, PERPLEXITY_API_KEY, SQUARE_ACCESS_TOKEN"
else
    log_success ".env file already exists"
fi

################################################################################
# STEP 10: Create Docker Compose Configuration
################################################################################
log_step "10/10 Creating Docker Compose Configuration"

cat > /opt/teamclaude/app/docker-compose-backend.yml << 'DOCKEREOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: teamclaude-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-teamclaude}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-trollz1004_empire}
    volumes:
      - /opt/teamclaude/data/postgres:/var/lib/postgresql/data
      - ./date-app-dashboard/backend/src/database:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    networks:
      - teamclaude-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-teamclaude}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: teamclaude-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - /opt/teamclaude/data/redis:/data
    ports:
      - "6379:6379"
    networks:
      - teamclaude-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./date-app-dashboard/backend
      dockerfile: Dockerfile
    container_name: teamclaude-backend
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./date-app-dashboard/backend:/app
      - /opt/teamclaude/logs:/app/logs
      - /app/node_modules
    networks:
      - teamclaude-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  teamclaude-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
DOCKEREOF

chown $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude/app/docker-compose-backend.yml

log_success "Docker Compose configuration created"

################################################################################
# Summary & Next Steps
################################################################################
echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ T5500 BACKEND API SERVER SETUP COMPLETE!${NC}"
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}System Information:${NC}"
echo "  Role: Backend API Server"
echo "  Hostname: $(hostname)"
echo "  IP: $(hostname -I | awk '{print $1}')"
echo "  OS: $(lsb_release -d | cut -f2)"
echo "  Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo ""
echo -e "${YELLOW}⚠️  NEXT STEPS (IMPORTANT):${NC}"
echo ""
echo "1. Edit environment configuration:"
echo "   ${BLUE}nano /opt/teamclaude/app/.env${NC}"
echo ""
echo "   Required changes:"
echo "   - POSTGRES_PASSWORD (create secure password)"
echo "   - JWT_SECRET (generate random 32+ char string)"
echo "   - JWT_REFRESH_SECRET (generate another random string)"
echo "   - PERPLEXITY_API_KEY (get from perplexity.ai)"
echo "   - SQUARE_ACCESS_TOKEN (from developer.squareup.com)"
echo "   - SMTP credentials (for email notifications)"
echo ""
echo "2. Install backend dependencies:"
echo "   ${BLUE}cd /opt/teamclaude/app/date-app-dashboard/backend${NC}"
echo "   ${BLUE}npm install --production${NC}"
echo ""
echo "3. Start services:"
echo "   ${BLUE}cd /opt/teamclaude/app${NC}"
echo "   ${BLUE}docker-compose -f docker-compose-backend.yml up -d${NC}"
echo ""
echo "4. Check logs:"
echo "   ${BLUE}docker-compose -f docker-compose-backend.yml logs -f${NC}"
echo ""
echo "5. Test backend:"
echo "   ${BLUE}curl http://localhost:4000/health${NC}"
echo ""
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Team Claude Mission: AI for Good 💚${NC}"
echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Save system info
cat > /opt/teamclaude/SYSTEM_INFO.txt << EOF
T5500 Backend API Server
========================
Hostname: $(hostname)
IP Address: $(hostname -I | awk '{print $1}')
Role: Backend API Server
OS: $(lsb_release -d | cut -f2)
Kernel: $(uname -r)
Docker: $(docker --version)
Node.js: $(node --version)
Setup Date: $(date)

Team Claude / TROLLZ1004 EMPIRE
Mission: Generate Revenue → Help Children → AI for Good
EOF

chown $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude/SYSTEM_INFO.txt

log_success "System information saved to /opt/teamclaude/SYSTEM_INFO.txt"
echo ""
