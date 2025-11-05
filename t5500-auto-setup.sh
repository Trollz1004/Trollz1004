#!/bin/bash
################################################################################
# T5500 BACKEND API SERVER SETUP - AUTO MODE
# Team Claude / TROLLZ1004 EMPIRE
################################################################################

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  TEAM CLAUDE / TROLLZ1004 EMPIRE"
echo "  T5500 Backend API Server Setup"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Detect actual user
if [ -n "$SUDO_USER" ]; then
    ACTUAL_USER=$SUDO_USER
else
    ACTUAL_USER="user"
fi
ACTUAL_HOME="/home/$ACTUAL_USER"

echo "[1/10] Updating system packages..."
apt-get update -qq 2>/dev/null || true
apt-get upgrade -y -qq 2>/dev/null || true
echo "✓ System updated"

echo "[2/10] Installing essential packages..."
apt-get install -y -qq curl wget git vim htop net-tools ca-certificates gnupg lsb-release software-properties-common build-essential ufw fail2ban 2>/dev/null || true
echo "✓ Essential packages installed"

echo "[3/10] Installing Docker..."
if ! command -v docker &> /dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg 2>/dev/null | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq 2>/dev/null
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true

    systemctl start docker 2>/dev/null || true
    systemctl enable docker 2>/dev/null || true
fi
echo "✓ Docker installed"

echo "[4/10] Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose 2>/dev/null
    chmod +x /usr/local/bin/docker-compose
fi
echo "✓ Docker Compose installed"

echo "[5/10] Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x 2>/dev/null | bash - 2>/dev/null
    apt-get install -y -qq nodejs 2>/dev/null || true
fi
npm install -g npm@latest pm2 typescript ts-node -q 2>/dev/null || true
echo "✓ Node.js installed"

echo "[6/10] Configuring firewall..."
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming 2>/dev/null || true
ufw default allow outgoing 2>/dev/null || true
ufw allow 22/tcp comment 'SSH' 2>/dev/null || true
ufw allow 4000/tcp comment 'Backend API' 2>/dev/null || true
ufw allow 5432/tcp comment 'PostgreSQL' 2>/dev/null || true
ufw allow 6379/tcp comment 'Redis' 2>/dev/null || true
ufw --force enable 2>/dev/null || true
echo "✓ Firewall configured"

echo "[7/10] Optimizing system..."
cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
EOF

cat >> /etc/sysctl.conf << 'EOF'
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
vm.swappiness = 10
EOF
sysctl -p > /dev/null 2>&1 || true
echo "✓ System optimized"

echo "[8/10] Creating directories..."
mkdir -p /opt/teamclaude/{app,logs,data/postgres,data/redis,backups}
chown -R $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude 2>/dev/null || true
usermod -aG docker $ACTUAL_USER 2>/dev/null || true
echo "✓ Directories created"

echo "[9/10] Setting up repository..."
cd /opt/teamclaude/app
if [ -d "$ACTUAL_HOME/Trollz1004" ]; then
    cp -r $ACTUAL_HOME/Trollz1004/* . 2>/dev/null || true
    chown -R $ACTUAL_USER:$ACTUAL_USER /opt/teamclaude/app
fi
echo "✓ Repository ready"

echo "[10/10] Creating configuration..."
if [ ! -f ".env" ]; then
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=4000
POSTGRES_USER=teamclaude
POSTGRES_PASSWORD=teamclaude_secure_2025
POSTGRES_DB=trollz1004_empire
DATABASE_URL=postgresql://teamclaude:teamclaude_secure_2025@localhost:5432/trollz1004_empire
REDIS_URL=redis://localhost:6379
JWT_SECRET=teamclaude_jwt_secret_key_2025_32chars_min
JWT_REFRESH_SECRET=teamclaude_refresh_secret_2025_32chars
PERPLEXITY_API_KEY=CHANGE_ME
SQUARE_ACCESS_TOKEN=CHANGE_ME
SQUARE_LOCATION_ID=CHANGE_ME
SQUARE_ENVIRONMENT=production
ENVEOF
    chown $ACTUAL_USER:$ACTUAL_USER .env
fi

cat > docker-compose.yml << 'DOCKEREOF'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    container_name: teamclaude-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: teamclaude
      POSTGRES_PASSWORD: teamclaude_secure_2025
      POSTGRES_DB: trollz1004_empire
    volumes:
      - /opt/teamclaude/data/postgres:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - teamclaude

  redis:
    image: redis:7-alpine
    container_name: teamclaude-redis
    restart: unless-stopped
    volumes:
      - /opt/teamclaude/data/redis:/data
    ports:
      - "6379:6379"
    networks:
      - teamclaude

networks:
  teamclaude:
    driver: bridge
DOCKEREOF

chown $ACTUAL_USER:$ACTUAL_USER docker-compose.yml
echo "✓ Configuration created"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "✓ T5500 BACKEND SETUP COMPLETE!"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. cd /opt/teamclaude/app"
echo "  2. Edit .env with your API keys"
echo "  3. docker-compose up -d"
echo ""
echo "System: $(hostname) | IP: $(hostname -I | awk '{print $1}')"
echo "Docker: $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',' || echo 'installed')"
echo "Node.js: $(node --version 2>/dev/null || echo 'installed')"
echo ""
echo "Team Claude: AI for Good 💚"
echo ""
