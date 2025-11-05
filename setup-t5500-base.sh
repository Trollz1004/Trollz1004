#!/bin/bash
################################################################################
# T5500 Base System Setup Script
# Sets up Dell Precision T5500 for YouAndINotAI Platform
# Desktop #1 of 35
################################################################################

set -e

echo "=========================================="
echo "T5500 BASE SYSTEM SETUP"
echo "Desktop #1 of 35"
echo "=========================================="

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo ./setup-t5500-base.sh)"
    exit 1
fi

log_info "Starting base system setup..."

# Update system
log_info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
log_success "System updated"

# Install essential packages
log_info "Installing essential packages..."
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
    software-properties-common
log_success "Essential packages installed"

# Install Docker
log_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    log_success "Docker installed and started"
else
    log_success "Docker already installed"
fi

# Install Docker Compose standalone
log_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose installed"
else
    log_success "Docker Compose already installed"
fi

# Install Node.js 20.x LTS
log_info "Installing Node.js 20.x LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    log_success "Node.js $(node -v) installed"
else
    log_success "Node.js $(node -v) already installed"
fi

# Install npm global packages
log_info "Installing global npm packages..."
npm install -g npm@latest typescript ts-node pm2 -q
log_success "Global npm packages installed"

# Configure firewall (UFW)
log_info "Configuring firewall..."
apt-get install -y -qq ufw
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Frontend
ufw allow 4000/tcp  # Backend
ufw allow 8080/tcp  # Dashboard
ufw --force enable
log_success "Firewall configured"

# Create application user
log_info "Creating application user..."
if ! id "youandinotai" &>/dev/null; then
    useradd -m -s /bin/bash youandinotai
    usermod -aG docker youandinotai
    log_success "User 'youandinotai' created and added to docker group"
else
    log_success "User 'youandinotai' already exists"
fi

# Create application directories
log_info "Creating application directories..."
mkdir -p /opt/youandinotai
mkdir -p /var/log/youandinotai
mkdir -p /var/lib/youandinotai/postgres
mkdir -p /var/lib/youandinotai/redis
chown -R youandinotai:youandinotai /opt/youandinotai
chown -R youandinotai:youandinotai /var/log/youandinotai
chown -R youandinotai:youandinotai /var/lib/youandinotai
log_success "Application directories created"

# Clone repository
log_info "Cloning YouAndINotAI repository..."
if [ ! -d "/opt/youandinotai/app" ]; then
    cd /opt/youandinotai
    sudo -u youandinotai git clone https://github.com/Trollz1004/Trollz1004.git app
    chown -R youandinotai:youandinotai /opt/youandinotai/app
    log_success "Repository cloned"
else
    log_success "Repository already exists"
fi

# System optimization for production
log_info "Optimizing system for production..."

# Increase file limits
cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF

# Kernel optimization
cat >> /etc/sysctl.conf << EOF
# Network optimization
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 10000 65000
net.ipv4.tcp_tw_reuse = 1

# Memory optimization
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
EOF

sysctl -p > /dev/null 2>&1

log_success "System optimized"

# Get system information
log_info "System Information:"
echo "  Hostname: $(hostname)"
echo "  IP Address: $(hostname -I | awk '{print $1}')"
echo "  OS: $(lsb_release -d | cut -f2)"
echo "  Kernel: $(uname -r)"
echo "  Docker: $(docker --version)"
echo "  Docker Compose: $(docker-compose --version)"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"

# Display next steps
echo ""
echo "=========================================="
log_success "T5500 BASE SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "  1. Run: sudo -u youandinotai ./deploy-platform.sh"
echo "  2. Configure .env file with API keys"
echo "  3. Test platform deployment"
echo "  4. Use bulk-deploy.sh for remaining 34 desktops"
echo ""
echo "Application Directory: /opt/youandinotai/app"
echo "Logs Directory: /var/log/youandinotai"
echo "Data Directory: /var/lib/youandinotai"
echo ""
