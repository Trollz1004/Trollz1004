# YouAndINotAI - 100% Automated Dating Platform
## Full Deployment Guide

## Overview
Complete dating platform with 100% AI automation for:
- Customer service
- Marketing campaigns
- Content creation & posting
- Profit tracking & allocation
- Real-time business analytics dashboard

## Architecture

```
youandinotai.com (Dating App)
    ├── Frontend (React)
    ├── Backend API (Node.js/Express)
    └── PostgreSQL + Redis

youandinotai.online (Business Dashboard)
    ├── Real-time analytics
    ├── Profit tracking (50/50 split)
    └── Automation status monitoring

Automation Layer
    ├── Customer Service Agent (Perplexity AI)
    ├── Marketing Agent (Perplexity AI)
    ├── Content Creation Agent (Perplexity AI)
    └── Profit Tracker
```

## Prerequisites

1. **Server Requirements**
   - 4GB RAM minimum
   - 2 CPU cores
   - 50GB storage
   - Docker & Docker Compose

2. **API Keys Required**
   - Perplexity API Key
   - Square API credentials
   - SMTP credentials
   - Cloudflare API key
   - AWS S3 (optional)

3. **Domain Setup**
   - `youandinotai.com` → Dating app
   - `youandinotai.online` → Business dashboard
   - Both pointing to server IP via Cloudflare DNS

## Quick Start

### 1. Clone & Configure

```bash
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# Copy and edit .env file
cp .env.example .env
nano .env
```

### 2. Update .env with YOUR credentials

```bash
# API Keys
PERPLEXITY_API_KEY=your_key_here
SQUARE_ACCESS_TOKEN=your_token_here
SQUARE_LOCATION_ID=your_location_id
```

### 3. Deploy with Docker

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec postgres psql -U postgres -d youandinotai_prod -f /docker-entrypoint-initdb.d/001_automation_tables.sql
```

### 5. Verify Deployment

```bash
# Test backend
curl http://localhost:4000/health

# Test dashboard
curl http://localhost:8080
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | React dating app |
| Backend | 4000 | API server |
| Dashboard | 8080 | Business analytics |
| Postgres | 5432 | Database |
| Redis | 6379 | Cache/sessions |
| Nginx | 80/443 | Reverse proxy |

## Automation Features

### Customer Service Agent
- Auto-responds to user queries 24/7
- Processes queue every 5 minutes
- Uses user context for personalized responses
- Logs all interactions for quality assurance

### Marketing Agent
- Generates daily campaigns (9 AM)
- Creates social media posts
- Optimizes ad spend automatically
- Analyzes competitor strategies

### Content Creation Agent
- Writes blog posts daily (10 AM)
- Creates email newsletters weekly
- Generates success stories
- Schedules social media content

### Profit Tracker
- Real-time revenue tracking
- Automatic 50/50 profit split
- Tax audit trail
- Claude share auto-allocation:
  - 60% reinvest in platform
  - 30% charity (GiveDirectly)
  - 10% savings

## Dashboard Features

Access at: `https://youandinotai.online`

**Real-time Metrics:**
- Total revenue (all time)
- Active subscriptions
- Total users & matches
- Monthly recurring revenue
- Conversion rate
- Profit split (Owner 50% / Claude 50%)

**Charts:**
- Revenue over time
- User growth
- Revenue by tier
- Profit allocation history

**Activity Log:**
- New subscriptions
- New matches
- New registrations

## Business Model

### Revenue Split
```
Total Revenue: $X
├── Your Share (50%): Immediately available
└── Claude Share (50%): Auto-allocated
    ├── 60% Reinvested → Platform improvements
    ├── 30% Charity → GiveDirectly
    └── 10% Saved → Emergency fund
```

All transactions tracked for tax purposes.

## Subscription Tiers

1. **Basic** - $9.99/month
   - Unlimited likes
   - Basic matching

2. **Premium** - $19.99/month
   - Priority messaging
   - Profile boost

3. **VIP** - $49.99/month
   - Concierge service
   - All features

## Cloudflare DNS Setup

### youandinotai.com
```
Type: A
Name: @
Content: YOUR_SERVER_IP
Proxy: Enabled (orange cloud)
```

### youandinotai.online
```
Type: A
Name: @
Content: YOUR_SERVER_IP
Proxy: Enabled (orange cloud)
```

## SSL Certificates

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d youandinotai.com -d www.youandinotai.com
sudo certbot --nginx -d youandinotai.online -d www.youandinotai.online

# Auto-renewal
sudo certbot renew --dry-run
```

## Monitoring

### Health Checks
```bash
# Backend health
curl http://localhost:4000/health

# Dashboard health
curl http://localhost:8080/api/dashboard/health

# Database
docker-compose exec postgres pg_isready
```

### Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f automation
docker-compose logs -f backend
```

## Backup Strategy

### Database Backup
```bash
# Daily automated backup
docker-compose exec postgres pg_dump -U postgres youandinotai_prod > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U postgres youandinotai_prod < backup_20240101.sql
```

### Uploaded Files
```bash
# Backup uploads directory
tar -czf uploads_backup.tar.gz ./uploads
```

## Scaling

### Horizontal Scaling
```bash
# Scale backend
docker-compose up -d --scale backend=3

# Load balancer automatically distributes traffic
```

### Database Optimization
```sql
-- Add indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_matches_users ON matches(user_id_a, user_id_b);
CREATE INDEX idx_profit_tracking_created ON profit_tracking(created_at);
```

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Check database connection
docker-compose exec backend node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1')"
```

### Automation Not Running
```bash
# Check automation service
docker-compose logs automation

# Verify environment variables
docker-compose exec automation env | grep PERPLEXITY_API_KEY
```

### Dashboard Not Loading
```bash
# Check nginx
docker-compose logs nginx

# Test backend API
curl http://localhost:4000/api/dashboard/stats
```

## Security Checklist

- [ ] Change default database passwords
- [ ] Set strong JWT_SECRET (32+ chars)
- [ ] Enable Cloudflare firewall rules
- [ ] Set up rate limiting
- [ ] Enable HTTPS only
- [ ] Regular security updates
- [ ] Backup encryption
- [ ] API key rotation

## Maintenance

### Weekly
- Review automation logs
- Check profit allocation
- Monitor conversion rates

### Monthly
- Database backups
- Security updates
- Performance optimization
- Charity donation confirmation

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify env vars: `cat .env`
3. Test connections: Health check endpoints
4. Review dashboard: `https://youandinotai.online`

## Cost Estimate

**Monthly Operating Costs:**
- Server (DigitalOcean/AWS): $40-100
- Perplexity API: $50-200 (usage-based)
- Square fees: 2.9% + $0.30/transaction
- Cloudflare: Free
- **Total**: ~$100-300/month

**Break-even**: ~20 Premium subscribers

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Configure API keys
3. ✅ Test all automations
4. Set up monitoring alerts
5. Launch marketing campaigns
6. Scale based on growth

---

**Platform Status**: 🟢 Production Ready
**Automation**: 100% Automated
**Business Model**: Active
**Profit Split**: 50/50 Owner/Claude
