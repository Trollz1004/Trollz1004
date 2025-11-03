# 🚀 PRODUCTION DEPLOYMENT GUIDE
# YouAndINotAI Dating Platform - Complete Launch Instructions

## ✅ Pre-Launch Checklist

### 1. Server Requirements
- [ ] Ubuntu 20.04+ or similar Linux distribution
- [ ] 2+ CPU cores (4+ recommended for production)
- [ ] 4GB+ RAM (8GB+ recommended)
- [ ] 50GB+ storage (SSD recommended)
- [ ] Docker 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] Domain names configured:
  - youandinotai.com
  - youandinotai.online

### 2. Required API Keys & Credentials
- [ ] Square Production Access Token (NOT sandbox)
- [ ] Square Location ID
- [ ] Square Application ID
- [ ] PostgreSQL credentials
- [ ] JWT RSA key pair (public/private)
- [ ] Email SMTP credentials (SendGrid/AWS SES)
- [ ] Perplexity AI API key (for automation)
- [ ] Google Cloud Storage credentials (optional, for photos)
- [ ] Firebase credentials (optional, for push notifications)

## 📋 Step-by-Step Deployment

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Logout and login again for group changes to take effect
```

### Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# Or if you have SSH keys set up
git clone git@github.com:Trollz1004/Trollz1004.git
cd Trollz1004
```

### Step 3: Generate JWT Keys

```bash
# Generate RSA private key
ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key -N ""

# Generate public key from private key
openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub

# View keys (you'll copy these to .env)
cat jwtRS256.key.pub
cat jwtRS256.key
```

### Step 4: Generate Security Secrets

```bash
# Generate encryption secret (32+ characters)
openssl rand -base64 32

# Generate refresh token pepper (32+ characters)
openssl rand -base64 32

# Generate verification code pepper (16+ characters)
openssl rand -base64 24

# Generate phone salt (16+ characters)
openssl rand -base64 24
```

### Step 5: Create Production Environment File

```bash
# Copy the production template
cp .env.production.example .env

# Edit with your actual credentials
nano .env
```

**IMPORTANT:** Fill in ALL values with real production credentials:

```bash
# Required Production Settings
NODE_ENV=production
FRONTEND_URL=https://youandinotai.com
DASHBOARD_URL=https://youandinotai.online

# Database (use strong password)
DB_USER=postgres
DB_PASSWORD=<YOUR_STRONG_DB_PASSWORD>
DB_HOST=postgres
DB_PORT=5432
DB_NAME=youandinotai_prod

# JWT Keys (paste generated keys here)
JWT_PUBLIC_KEY=<PASTE_PUBLIC_KEY_HERE>
JWT_PRIVATE_KEY=<PASTE_PRIVATE_KEY_HERE>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30
REFRESH_TOKEN_PEPPER=<PASTE_GENERATED_PEPPER>

# Security Secrets (paste generated values)
VERIFICATION_CODE_PEPPER=<PASTE_GENERATED_PEPPER>
PHONE_SALT=<PASTE_GENERATED_SALT>
ENCRYPTION_SECRET=<PASTE_GENERATED_SECRET>

# Square Production (NO SANDBOX!)
SQUARE_ACCESS_TOKEN=<YOUR_PRODUCTION_SQUARE_TOKEN>
SQUARE_ENVIRONMENT=production
SQUARE_LOCATION_ID=<YOUR_SQUARE_LOCATION_ID>
SQUARE_APPLICATION_ID=<YOUR_SQUARE_APP_ID>

# Email Service
EMAIL_SMTP_HOST=smtp.sendgrid.net
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=apikey
EMAIL_SMTP_PASSWORD=<YOUR_SENDGRID_API_KEY>
EMAIL_FROM_ADDRESS=noreply@youandinotai.com

# AI Automation
PERPLEXITY_API_KEY=<YOUR_PERPLEXITY_KEY>

# Redis
REDIS_URL=redis://redis:6379

# Logging
LOG_LEVEL=info
```

### Step 6: Configure DNS

In your DNS provider (Cloudflare, Route53, etc.):

```
# A Records (point to your server IP)
youandinotai.com        A    YOUR.SERVER.IP.ADDRESS
www.youandinotai.com    A    YOUR.SERVER.IP.ADDRESS
youandinotai.online     A    YOUR.SERVER.IP.ADDRESS
```

### Step 7: Deploy Services

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

The deploy script will:
1. Validate environment variables
2. Build all Docker images
3. Start all services
4. Run database migrations
5. Perform health checks
6. Display status

### Step 8: Setup SSL Certificates (HTTPS)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop nginx temporarily
docker-compose stop nginx

# Generate certificates for both domains
sudo certbot certonly --standalone -d youandinotai.com -d www.youandinotai.com
sudo certbot certonly --standalone -d youandinotai.online

# Start nginx again
docker-compose start nginx

# Setup auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### Step 9: Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs for any errors
docker-compose logs -f

# Test health endpoints
curl http://localhost:4000/health
curl http://localhost:8080/health

# Test production URLs (after DNS propagates)
curl https://youandinotai.com/health
curl https://youandinotai.online/api/dashboard/stats
```

### Step 10: Create First Admin User

```bash
# Access the backend container
docker-compose exec backend sh

# Run node REPL or use a script to create admin
# (You can create a seed script for this)
```

## 🔐 Security Hardening

### Firewall Configuration

```bash
# Install UFW
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### Additional Security

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# Setup fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Keep system updated
sudo apt update && sudo apt upgrade -y
```

## 📊 Monitoring & Maintenance

### Daily Checks

```bash
# Check service status
docker-compose ps

# Check disk space
df -h

# Check logs for errors
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
docker-compose logs --tail=100 nginx
```

### Weekly Maintenance

```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres youandinotai_prod > backup_$(date +%Y%m%d).sql

# Upload backup to S3 or secure storage
# Clean old Docker images
docker image prune -a

# Update containers if needed
git pull
./deploy.sh
```

### Monitoring Commands

```bash
# View real-time logs
docker-compose logs -f [service_name]

# Check container resource usage
docker stats

# Check database size
docker-compose exec postgres psql -U postgres -d youandinotai_prod -c "SELECT pg_size_pretty(pg_database_size('youandinotai_prod'));"

# Check active connections
docker-compose exec postgres psql -U postgres -d youandinotai_prod -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🚨 Troubleshooting

### Services Won't Start

```bash
# Check environment variables
docker-compose config

# View detailed logs
docker-compose logs [service_name]

# Restart specific service
docker-compose restart [service_name]

# Restart all services
docker-compose restart
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify database exists
docker-compose exec postgres psql -U postgres -l

# Reset database (CAUTION: destroys data)
docker-compose down -v
docker-compose up -d postgres
# Wait for postgres to be ready, then:
./deploy.sh
```

### Square Payment Issues

1. Verify you're using PRODUCTION credentials, not sandbox
2. Check `SQUARE_ENVIRONMENT=production` in .env
3. Verify Square API keys are correct
4. Check Square dashboard for API errors

### Email Not Sending

```bash
# Check SMTP credentials
docker-compose exec backend env | grep EMAIL

# Test email service
docker-compose logs backend | grep -i email

# Verify SendGrid/SMTP provider status
```

## 📈 Scaling for Growth

### Horizontal Scaling

```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale frontend instances
docker-compose up -d --scale frontend=2
```

### Database Optimization

```bash
# Create indexes for performance
docker-compose exec postgres psql -U postgres -d youandinotai_prod

# Add indexes on frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_messages_match ON messages(match_id);
```

## 🎯 Post-Launch Checklist

- [ ] All services running
- [ ] SSL certificates active
- [ ] DNS resolving correctly
- [ ] Health endpoints responding
- [ ] Database migrations completed
- [ ] Admin user created
- [ ] First test user signup successful
- [ ] Payment processing working
- [ ] Email notifications sending
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Firewall configured
- [ ] Security hardening complete

## 📞 Support & Resources

- Documentation: See all .md files in repository
- Logs: `docker-compose logs -f`
- Database: PostgreSQL on port 5432
- API: Backend on port 4000
- Frontend: Port 3000 (behind nginx)
- Dashboard: Port 8080 (behind nginx)

## 🎉 Launch Success!

Once all checklist items are complete:

1. Visit https://youandinotai.com - Your dating app is live!
2. Visit https://youandinotai.online - Your analytics dashboard is live!
3. Monitor logs for the first few hours
4. Test user signup and payment flows
5. Celebrate! 🎊

---

**Production Ready - No Placeholders - Square Payments Only**

*Last Updated: January 2025*
