# Software Requirements by Computer

Complete software installation checklist for YouAndINotAI platform.

---

## 🖥️ Windows Desktop (DESKTOP-T47QKGG)
**IPs**: 192.168.0.101 (Ethernet), 192.168.0.106 (WiFi)

### Core Development Tools
| Software | Version | Purpose | Install Command |
|----------|---------|---------|-----------------|
| **Git** | Latest | Version control | `winget install Git.Git` |
| **Node.js** | 20 LTS | JavaScript runtime | `winget install OpenJS.NodeJS.LTS` |
| **VS Code** | Latest | Code editor | `winget install Microsoft.VisualStudioCode` |
| **PowerShell 7** | Latest | Shell | `winget install Microsoft.PowerShell` |
| **Docker Desktop** | Latest | Containerization | `winget install Docker.DockerDesktop` |

### Database & Cache
| Software | Version | Purpose | Install Command |
|----------|---------|---------|-----------------|
| **PostgreSQL** | 16 | Primary database | `winget install PostgreSQL.PostgreSQL` |
| **Redis** | Latest | Cache/sessions | `winget install Redis.Redis` |
| **pgAdmin 4** | Latest | DB GUI | `winget install PostgreSQL.pgAdmin` |

### Network & Testing Tools
| Software | Version | Purpose | Install Command |
|----------|---------|---------|-----------------|
| **Postman** | Latest | API testing | `winget install Postman.Postman` |
| **Fiddler** | Latest | HTTP debugging | `winget install Telerik.Fiddler.Everywhere` |
| **Wireshark** | Latest | Network analysis | `winget install WiresharkFoundation.Wireshark` |
| **GitHub CLI** | Latest | Git operations | `winget install GitHub.cli` |

### WSL Configuration
```powershell
# Enable WSL 2
wsl --install
wsl --set-default-version 2

# Install Ubuntu
wsl --install -d Ubuntu-22.04

# Configure port forwarding
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=127.0.0.1
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=127.0.0.1
```

### NPM Global Packages
```powershell
npm install -g `
  typescript `
  ts-node `
  nodemon `
  pm2 `
  @angular/cli `
  create-react-app `
  eslint `
  prettier
```

---

## 🐧 Kali Linux (192.168.0.106)
**Role**: Primary development and testing

### System Packages
```bash
#!/bin/bash
sudo apt update && sudo apt upgrade -y

# Core Development
sudo apt install -y \
  build-essential \
  git \
  curl \
  wget \
  vim \
  nano \
  tmux \
  htop \
  tree \
  jq \
  zip \
  unzip

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python (for scripts)
sudo apt install -y python3 python3-pip python3-venv

# PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Redis
sudo apt install -y redis-server redis-tools

# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin

# Nginx
sudo apt install -y nginx

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx

# Network Tools
sudo apt install -y \
  net-tools \
  nmap \
  tcpdump \
  wireshark \
  netcat-openbsd \
  traceroute \
  mtr \
  iperf3
```

### Database GUI Tools
```bash
# pgAdmin 4
curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo gpg --dearmor -o /usr/share/keyrings/packages-pgadmin-org.gpg
sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/packages-pgadmin-org.gpg] https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list'
sudo apt update
sudo apt install -y pgadmin4-desktop

# DBeaver (Universal DB tool)
wget -O dbeaver.deb https://dbeaver.io/files/dbeaver-ce_latest_amd64.deb
sudo dpkg -i dbeaver.deb
sudo apt-get install -f -y
rm dbeaver.deb
```

### API Testing
```bash
# HTTPie (CLI HTTP client)
sudo apt install -y httpie

# Newman (Postman CLI)
sudo npm install -g newman newman-reporter-htmlextra

# cURL alternatives
sudo apt install -y xh  # Rust-based HTTP client
```

### GitHub CLI
```bash
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list
sudo apt update
sudo apt install -y gh
```

### Process Manager & Build Tools
```bash
# PM2
sudo npm install -g pm2

# TypeScript & Tools
sudo npm install -g \
  typescript \
  ts-node \
  nodemon \
  eslint \
  prettier \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin
```

### Ollama (Self-Hosted AI)
```bash
# Run the provided script
chmod +x /home/user/Trollz1004/install-ollama.sh
bash /home/user/Trollz1004/install-ollama.sh

# Pull models
ollama pull llama3.2:3b    # 3GB - General purpose
ollama pull llama3.2:1b    # 1GB - Fast inference
ollama pull mistral:7b     # 7GB - Business tasks
ollama pull codellama:7b   # 7GB - Code generation
ollama pull nomic-embed-text  # Embeddings
```

### VS Code Extensions (via CLI)
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
code --install-extension prisma.prisma
code --install-extension GitHub.copilot
code --install-extension ms-azuretools.vscode-docker
code --install-extension ms-vscode-remote.remote-ssh
code --install-extension eamodio.gitlens
```

---

## 🌐 Production Server (71.52.23.215)
**Domains**: youandinotai.com, youandinotai.online

### Base System
```bash
#!/bin/bash
# Production Server Setup Script

sudo apt update && sudo apt upgrade -y

# Essential packages
sudo apt install -y \
  build-essential \
  git \
  curl \
  wget \
  ufw \
  fail2ban \
  vim \
  htop \
  zip \
  unzip

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 16
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc
sudo apt update
sudo apt install -y postgresql-16 postgresql-contrib-16

# Redis 7
sudo apt install -y redis-server redis-tools

# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin
sudo usermod -aG docker $USER

# Nginx (Web server)
sudo apt install -y nginx

# Certbot (SSL certificates)
sudo apt install -y certbot python3-certbot-nginx

# PM2 (Process manager)
sudo npm install -g pm2
pm2 startup
```

### Security Tools
```bash
# Firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw allow 4000/tcp  # API
sudo ufw enable

# Fail2Ban (Intrusion prevention)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure Fail2Ban for SSH
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

### Monitoring Tools
```bash
# System monitoring
sudo apt install -y \
  sysstat \
  iotop \
  nethogs \
  iftop

# Log management
sudo apt install -y logrotate

# Configure logrotate for app logs
sudo tee /etc/logrotate.d/youandinotai > /dev/null <<EOF
/var/log/youandinotai/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
}
EOF
```

### Backup Configuration
```bash
# Install backup tools
sudo apt install -y postgresql-client awscli

# Create backup script
sudo tee /usr/local/bin/backup-youandinotai.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/youandinotai"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U youandinotai youandinotai_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# App files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /opt/youandinotai

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/ s3://youandinotai-backups/ --recursive

# Keep only last 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-youandinotai.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-youandinotai.sh") | crontab -
```

### Ollama (Optional - for production AI)
```bash
# Install Ollama on production (optional)
curl -fsSL https://ollama.com/install.sh | sh

# Pull only essential models
ollama pull llama3.2:1b  # Lightweight for production

# Configure as systemd service
sudo systemctl enable ollama
sudo systemctl start ollama
```

---

## 📦 Repository Setup (All Computers)

### Clone Repository
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "joshlcoleman@gmail.com"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub: https://github.com/settings/keys

# Clone
git clone git@github.com:Trollz1004/Trollz1004.git
cd Trollz1004
```

### Install Dependencies
```bash
# Backend
cd date-app-dashboard/backend
npm install

# Frontend (if applicable)
cd ../frontend
npm install
```

### Configure Environment
```bash
# Copy production env
cp .env.production.complete .env.production

# Generate secrets
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 64  # JWT_REFRESH_SECRET
openssl rand -base64 32  # DB_PASSWORD
openssl rand -base64 32  # ENCRYPTION_SECRET

# Edit .env.production with secrets
nano .env.production
```

---

## 🔗 Important Links

### Development
- **GitHub Repo**: https://github.com/Trollz1004/Trollz1004
- **Issues**: https://github.com/Trollz1004/Trollz1004/issues
- **Pull Requests**: https://github.com/Trollz1004/Trollz1004/pulls

### Cloud Services
- **Google Cloud Console**: https://console.cloud.google.com
- **Anthropic Console**: https://console.anthropic.com
- **Azure Portal**: https://portal.azure.com
- **Square Dashboard**: https://squareup.com/dashboard
- **Manus Dashboard**: https://manus.im/app

### Documentation
- **Anthropic Docs**: https://docs.anthropic.com
- **Ollama Docs**: https://ollama.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/16/
- **Redis Docs**: https://redis.io/docs

### Network Tools
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Let's Encrypt**: https://letsencrypt.org
- **DNS Checker**: https://dnschecker.org

---

## ✅ Verification Checklist

### After Installation (All Computers)
- [ ] Git configured: `git config --list`
- [ ] Node.js installed: `node --version` (should be v20.x)
- [ ] npm working: `npm --version`
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] Redis running: `sudo systemctl status redis-server`
- [ ] Repository cloned: `cd Trollz1004 && git status`
- [ ] Dependencies installed: `npm list` (no errors)
- [ ] Environment configured: `.env.production` exists
- [ ] Ports available: `sudo lsof -i :4000,3000,5432,6379`

### Additional Checks (Kali Linux)
- [ ] Ollama installed: `ollama --version`
- [ ] Models pulled: `ollama list`
- [ ] Docker working: `docker run hello-world`
- [ ] GitHub CLI: `gh auth status`

### Production Server Only
- [ ] Firewall enabled: `sudo ufw status`
- [ ] Fail2Ban running: `sudo systemctl status fail2ban`
- [ ] SSL certificate: `sudo certbot certificates`
- [ ] PM2 configured: `pm2 list`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] Backups scheduled: `crontab -l`

---

## 🆘 Common Issues

### Port Already in Use
```bash
# Find process
sudo lsof -i :4000
sudo kill -9 <PID>
```

### Permission Denied (Docker)
```bash
sudo usermod -aG docker $USER
newgrp docker
```

### PostgreSQL Connection Failed
```bash
sudo systemctl restart postgresql
sudo -u postgres psql
```

### Ollama Not Found
```bash
export PATH=$PATH:/usr/local/bin
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
```

### npm Install Failures
```bash
sudo npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```
