# YouAndINotAI - Complete Network Setup Guide

**Last Updated**: 2025-11-07
**Network**: 192.168.0.x (Local) + 71.52.23.215 (Production)

---

## 🌐 Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET (Public)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Production   │  │ youandinotai │  │ Cloudflare   │
│ Server       │  │   Domains    │  │     DNS      │
│71.52.23.215  │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
                         │
                         │
        ┌────────────────┴────────────────┐
        │    Gateway: 192.168.0.1         │
        │    DNS: 8.8.8.8, 8.8.4.4       │
        └────────────────┬────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Windows PC  │  │   Kali Linux │  │  WSL Ubuntu  │
│192.168.0.101 │  │192.168.0.106 │  │  localhost   │
│(Ethernet)    │  │  (WiFi)      │  │  Port 3000   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 💻 Computer Configuration

### 1. Windows Desktop (DESKTOP-T47QKGG)

**Network Adapters:**
- **Ethernet (Broadcom NetXtreme 57xx)**
  - IP: `192.168.0.101`
  - MAC: `18-03-73-18-E5-86`
  - Speed: 1000 Mbps
  - DNS: 8.8.8.8, 8.8.4.4

- **WiFi (Intel Dual Band AC 8265)**
  - IP: `192.168.0.106`
  - MAC: `F8-34-41-59-6A-BE`
  - SSID: "this shit ain't free"
  - Protocol: WiFi 5 (802.11ac)
  - Band: 5 GHz (Channel 36)
  - Speed: 585 Mbps

**WSL Configuration:**
- Port: 80
- vEthernet: Enabled
- Localhost: 3000

**Required Software:**
```powershell
# Package Manager
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install Microsoft.VisualStudioCode
winget install Microsoft.PowerShell
winget install Docker.DockerDesktop

# Database Tools
winget install PostgreSQL.PostgreSQL
winget install Redis.Redis

# Network Tools
winget install Telerik.Fiddler.Everywhere
winget install WiresharkFoundation.Wireshark

# Development Tools
winget install Postman.Postman
winget install GitHub.cli
```

**Port Mapping:**
- `80` → WSL (HTTP)
- `443` → WSL (HTTPS)
- `3000` → Node.js Backend (localhost)
- `4000` → Express API
- `5432` → PostgreSQL
- `6379` → Redis
- `11434` → Ollama

---

### 2. Kali Linux Machine (192.168.0.106)

**Network Configuration:**
- **Interface**: WiFi (Intel AC 8265)
- **IP**: `192.168.0.106`
- **Gateway**: `192.168.0.1`
- **DNS**: `8.8.8.8`, `8.8.4.4`

**Required Software:**

```bash
#!/bin/bash
# Complete Kali Linux Setup Script

# Update system
sudo apt update && sudo apt upgrade -y

# Core Development Tools
sudo apt install -y \
  build-essential \
  git \
  curl \
  wget \
  vim \
  tmux \
  htop

# Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16
sudo apt install -y postgresql-16 postgresql-contrib-16

# Redis
sudo apt install -y redis-server

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Nginx
sudo apt install -y nginx

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Ollama (Self-hosted AI)
bash /home/user/Trollz1004/install-ollama.sh

# Database Tools
sudo apt install -y pgadmin4 dbeaver-ce

# Network Tools
sudo apt install -y \
  net-tools \
  nmap \
  tcpdump \
  wireshark \
  netcat

# API Testing
sudo apt install -y httpie
npm install -g newman newman-reporter-htmlextra

# GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install -y gh

# PM2 (Process Manager)
sudo npm install -g pm2

# TypeScript & Development Tools
sudo npm install -g typescript ts-node nodemon

echo "✅ Kali Linux setup complete!"
```

**Service Ports:**
- `4000` → Express Backend API
- `3000` → React Frontend (Dev)
- `5432` → PostgreSQL
- `6379` → Redis
- `11434` → Ollama API
- `80/443` → Nginx (Production)

---

### 3. Production Server (71.52.23.215)

**Domains:**
- **Primary**: `youandinotai.com` → Main dating app
- **Admin**: `youandinotai.online` → Admin dashboard
- **Testing**: `youandinotai.duckdns.org` → Development

**Required Software:**

```bash
#!/bin/bash
# Production Server Setup

# System Update
sudo apt update && sudo apt upgrade -y

# Essential Packages
sudo apt install -y \
  build-essential \
  git \
  curl \
  wget \
  ufw \
  fail2ban

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Redis 7
sudo apt install -y redis-server

# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin

# Nginx
sudo apt install -y nginx

# Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2
pm2 startup

# Firewall Configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Fail2Ban (Security)
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

echo "✅ Production server setup complete!"
```

**Security Configuration:**
```bash
# SSH Hardening
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Auto-updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🚀 Deployment Steps

### Step 1: Clone Repository (All Machines)

```bash
# SSH Setup
ssh-keygen -t ed25519 -C "joshlcoleman@gmail.com"
cat ~/.ssh/id_ed25519.pub
# Add to: https://github.com/settings/keys

# Clone repo
git clone git@github.com:Trollz1004/Trollz1004.git
cd Trollz1004
```

### Step 2: Environment Configuration

```bash
# Copy production env file
cp .env.production.complete .env.production

# Generate secure secrets
openssl rand -base64 64 > jwt_secret.txt
openssl rand -base64 64 > jwt_refresh_secret.txt
openssl rand -base64 32 > db_password.txt
openssl rand -base64 32 > encryption_secret.txt

# Edit .env.production with generated secrets
nano .env.production
```

### Step 3: Database Setup

```bash
# PostgreSQL
sudo -u postgres psql
CREATE DATABASE youandinotai_prod;
CREATE USER youandinotai WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE youandinotai_prod TO youandinotai;
\q

# Run migrations
cd date-app-dashboard/backend
npm install
npm run migrate

# Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Step 4: Install AI Models (Ollama)

```bash
# Install Ollama
bash /home/user/Trollz1004/install-ollama.sh

# Pull models
ollama pull llama3.2:3b
ollama pull llama3.2:1b
ollama pull mistral:7b
ollama pull codellama:7b
ollama pull nomic-embed-text

# Verify
ollama list
```

### Step 5: Start Services

**Development (Kali Linux):**
```bash
cd /home/user/Trollz1004/date-app-dashboard/backend
npm run dev
```

**Production (71.52.23.215):**
```bash
cd /home/user/Trollz1004

# Build
cd date-app-dashboard/backend
npm install --production
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/youandinotai
sudo ln -s /etc/nginx/sites-available/youandinotai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL Certificate
sudo certbot --nginx -d youandinotai.com -d www.youandinotai.com
```

---

## 🔗 Access URLs

### Production
- **Main App**: https://youandinotai.com
- **Admin Dashboard**: https://youandinotai.online
- **API**: https://youandinotai.com/api
- **Health Check**: https://youandinotai.com/health

### Development (Local)
- **Backend API**: http://localhost:4000
- **Frontend Dev**: http://localhost:3000
- **Ollama API**: http://localhost:11434
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### External Services
- **Anthropic Console**: https://console.anthropic.com
- **Google Cloud Console**: https://console.cloud.google.com
- **Square Dashboard**: https://squareup.com/dashboard
- **Manus Dashboard**: https://manus.im/app
- **GitHub Repo**: https://github.com/Trollz1004/Trollz1004

---

## 🔐 Credentials & API Keys

All credentials are stored in `.env.production.complete`. Key services:

| Service | Key Location | Description |
|---------|--------------|-------------|
| **Square** | SQUARE_ACCESS_TOKEN | Payment processing |
| **Google Cloud** | GCP_API_KEY_1 | Cloud services |
| **Gemini AI** | GEMINI_API_KEY | AI text generation |
| **Azure** | AZURE_COGNITIVE_KEY | Face verification |
| **Anthropic** | ANTHROPIC_API_KEY | Claude AI |
| **Manus** | MANUS_API_KEY | Task automation |
| **Database** | DB_PASSWORD | PostgreSQL access |

**⚠️ Security Note**: Never commit `.env.production.complete` to git!

---

## 📊 Service Health Checks

```bash
# Check all services
curl http://localhost:4000/api/orchestrator/health

# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis-server

# Ollama
curl http://localhost:11434/api/tags

# Nginx (Production)
sudo systemctl status nginx

# PM2 (Production)
pm2 status
pm2 logs
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port
sudo lsof -i :4000
sudo kill -9 <PID>
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql
\l
\conninfo
```

### Ollama Not Responding
```bash
# Restart Ollama
sudo systemctl restart ollama

# Check logs
journalctl -u ollama -f
```

### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run
```

---

## 📝 Maintenance Tasks

### Daily
- Monitor PM2 logs: `pm2 logs`
- Check disk space: `df -h`
- Review error logs: `tail -f /var/log/youandinotai/error.log`

### Weekly
- Database backup: `pg_dump youandinotai_prod > backup.sql`
- Check SSL expiry: `sudo certbot certificates`
- Review API usage: Check Anthropic/Google Cloud consoles

### Monthly
- Update dependencies: `npm audit fix`
- System updates: `sudo apt update && sudo apt upgrade`
- Security audit: Review fail2ban logs

---

## 🎯 Quick Reference

**Start Everything (Development):**
```bash
# Terminal 1: Database
sudo systemctl start postgresql redis-server

# Terminal 2: Ollama
ollama serve

# Terminal 3: Backend
cd date-app-dashboard/backend && npm run dev

# Terminal 4: Frontend
cd date-app-dashboard/frontend && npm run dev
```

**Deploy to Production:**
```bash
git pull origin main
cd date-app-dashboard/backend
npm install --production
npm run build
pm2 restart all
```

---

## 📞 Support Resources

- **Documentation**: `/home/user/Trollz1004/docs/`
- **OAuth Guide**: `docs/ANTHROPIC_OAUTH_SETUP.md`
- **Orchestrator Guide**: `docs/AGENT_ORCHESTRATOR_GUIDE.md`
- **Manus Integration**: `MANUS_INTEGRATION.md`
- **GitHub Issues**: https://github.com/Trollz1004/Trollz1004/issues
