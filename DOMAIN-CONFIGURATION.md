# 🌐 TEAM CLAUDE DOMAIN CONFIGURATION

**Date:** November 6, 2025
**Owner:** Team Claude
**Server IP:** 71.52.23.215

---

## 📋 ALL OWNED DOMAINS

### Dating Platform Domains (5):
1. **youandinotai.com** (Primary)
2. **youandinotai.online** (Dashboard)
3. **uandinotai.com** (Redirect/Alternative)
4. **uandinotai.lol** (Fun/Marketing)
5. **uandinotai.online** (Alternative)

### AI Services Domains (2):
6. **ai-solutions.store** (AI Marketplace)
7. **aidoesitall.org** (Grant System/AI Tools)

---

## 🎯 STRATEGIC DOMAIN MAPPING

### **youandinotai.com** - Main Dating Platform
**Purpose:** Primary dating app frontend
**Points to:** Dating Platform Frontend (Port 5173)
**Status:** Ready to configure

**Configuration:**
```
Service: Dating Platform (YouAndINotAI)
Port: 5173 (Frontend) + 3000 (Backend)
SSL: Required (Let's Encrypt)
Features:
  - User sign-up/login
  - Matching algorithm
  - Video chat
  - Square payments
  - Age verification
```

---

### **youandinotai.online** - Business Dashboard
**Purpose:** Analytics and admin dashboard
**Points to:** Admin Dashboard (Port 8080 or dedicated)
**Status:** Ready to configure

**Configuration:**
```
Service: Business Analytics Dashboard
Port: 8080 (or separate instance)
SSL: Required (Let's Encrypt)
Features:
  - Revenue tracking ($1.2M-50M)
  - User analytics
  - Payment monitoring
  - System health
  - Admin controls
```

---

### **uandinotai.com** - Alternative Spelling
**Purpose:** Catch typos, redirect to main site
**Points to:** Redirect → youandinotai.com
**Status:** Configure 301 redirect

**Configuration:**
```nginx
server {
    listen 80;
    server_name uandinotai.com;
    return 301 https://youandinotai.com$request_uri;
}
```

---

### **uandinotai.lol** - Fun Marketing Domain
**Purpose:** Meme/viral marketing landing page
**Points to:** Marketing page or redirect
**Status:** Optional - marketing campaign

**Ideas:**
- Landing page: "U and I, Not AI... LOL (but actually yes AI)"
- Viral marketing content
- Social media link hub
- Redirect to main site with tracking

---

### **uandinotai.online** - Alternative TLD
**Purpose:** Backup/alternative access
**Points to:** Mirror or redirect → youandinotai.com
**Status:** Configure 301 redirect or mirror

---

### **ai-solutions.store** - AI Marketplace
**Purpose:** ClaudeDroid AI Marketplace (Commission-based)
**Points to:** CloudeDroid Platform (Port 3456)
**Status:** LIVE - Currently at unimanus-desdpotm.manus.space

**Configuration:**
```
Service: ClaudeDroid AI Marketplace + DAO
Port: 3456
SSL: Required (Let's Encrypt)
Current: http://71.52.23.215:3456
Features:
  - AI agent marketplace
  - DAO governance
  - Commission sales (10-30%)
  - Enterprise AI solutions
  - Grant automation system
  - Revenue: $1.8M-40M annually
```

**Branding:**
- "AI Solutions Store - Enterprise AI Marketplace"
- "Powered by Team Claude"
- "50% profits to Shriners Children's Hospitals"

---

### **aidoesitall.org** - Grant System & AI Tools
**Purpose:** Public-facing grant automation & AI tools
**Points to:** Grant Dashboard + Public API (Port 3457 or new)
**Status:** New service - needs deployment

**Configuration:**
```
Service: Grant Automation Public Portal
Port: 3457 (Health Dashboard) or new port
SSL: Required (Let's Encrypt)
Features:
  - Grant discovery showcase
  - Public AI tools (free tier)
  - Federal compliance info
  - DAO participation portal
  - Community education
  - Social good mission page
```

**Mission Page:**
- Feature: "AI Does It All for Good"
- Highlight: $500K-2M grant funding pipeline
- Showcase: 50% profit donation to Shriners
- Call-to-action: Join DAO, use AI tools

---

## 🔧 DNS CONFIGURATION (All Domains)

### Point ALL domains to your server:
```
A Records (All domains):
─────────────────────────────────────────
youandinotai.com         →  71.52.23.215
www.youandinotai.com     →  71.52.23.215
youandinotai.online      →  71.52.23.215
www.youandinotai.online  →  71.52.23.215

uandinotai.com           →  71.52.23.215
www.uandinotai.com       →  71.52.23.215
uandinotai.lol           →  71.52.23.215
www.uandinotai.lol       →  71.52.23.215
uandinotai.online        →  71.52.23.215
www.uandinotai.online    →  71.52.23.215

ai-solutions.store       →  71.52.23.215
www.ai-solutions.store   →  71.52.23.215

aidoesitall.org          →  71.52.23.215
www.aidoesitall.org      →  71.52.23.215
```

---

## 🚀 NGINX REVERSE PROXY CONFIGURATION

Create `/etc/nginx/sites-available/team-claude-domains`:

```nginx
# ============================================
# DATING PLATFORM - youandinotai.com (Primary)
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name youandinotai.com www.youandinotai.com;

    # SSL redirect
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name youandinotai.com www.youandinotai.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/youandinotai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/youandinotai.com/privkey.pem;

    # Frontend (Port 5173)
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API (Port 3000)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket for video chat
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# ============================================
# BUSINESS DASHBOARD - youandinotai.online
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name youandinotai.online www.youandinotai.online;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name youandinotai.online www.youandinotai.online;

    ssl_certificate /etc/letsencrypt/live/youandinotai.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/youandinotai.online/privkey.pem;

    # Admin Dashboard (Port 8080 or separate)
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# ============================================
# REDIRECTS - Alternative Spellings
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name uandinotai.com www.uandinotai.com;
    return 301 https://youandinotai.com$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name uandinotai.online www.uandinotai.online;
    return 301 https://youandinotai.com$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name uandinotai.lol www.uandinotai.lol;
    return 301 https://youandinotai.com$request_uri;
}

# ============================================
# AI MARKETPLACE - ai-solutions.store
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name ai-solutions.store www.ai-solutions.store;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ai-solutions.store www.ai-solutions.store;

    ssl_certificate /etc/letsencrypt/live/ai-solutions.store/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai-solutions.store/privkey.pem;

    # CloudeDroid Platform (Port 3456)
    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# ============================================
# GRANT SYSTEM - aidoesitall.org
# ============================================
server {
    listen 80;
    listen [::]:80;
    server_name aidoesitall.org www.aidoesitall.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name aidoesitall.org www.aidoesitall.org;

    ssl_certificate /etc/letsencrypt/live/aidoesitall.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/aidoesitall.org/privkey.pem;

    # Health Dashboard / Grant Portal (Port 3457)
    location / {
        proxy_pass http://localhost:3457;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔒 SSL CERTIFICATES (Let's Encrypt)

### Install Certbot:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Generate SSL Certificates:
```bash
# Dating platform - youandinotai.com
sudo certbot --nginx -d youandinotai.com -d www.youandinotai.com

# Dashboard - youandinotai.online
sudo certbot --nginx -d youandinotai.online -d www.youandinotai.online

# AI Marketplace - ai-solutions.store
sudo certbot --nginx -d ai-solutions.store -d www.ai-solutions.store

# Grant System - aidoesitall.org
sudo certbot --nginx -d aidoesitall.org -d www.aidoesitall.org
```

### Auto-Renewal:
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically creates cron job for renewal
```

---

## 📊 DOMAIN → SERVICE MAPPING SUMMARY

| Domain | Service | Port | Revenue |
|--------|---------|------|---------|
| **youandinotai.com** | Dating App | 5173+3000 | $1.2M-50M |
| **youandinotai.online** | Dashboard | 8080 | N/A |
| **ai-solutions.store** | AI Marketplace | 3456 | $1.8M-40M |
| **aidoesitall.org** | Grant Portal | 3457 | $500K-3M |
| uandinotai.com | Redirect | → youandinotai.com | N/A |
| uandinotai.lol | Redirect | → youandinotai.com | N/A |
| uandinotai.online | Redirect | → youandinotai.com | N/A |

**Total Ecosystem Revenue:** $3.92M - $95M annually
**50% to Shriners:** $1.96M - $47.5M annually

---

## 🚀 DEPLOYMENT STEPS

### 1. Configure DNS (Do this first!)
```bash
# Go to your domain registrar (GoDaddy, Namecheap, etc.)
# For each domain, add A record:
#   Type: A
#   Name: @ (root domain)
#   Value: 71.52.23.215
#   TTL: 300 (5 minutes)
#
# Also add www subdomain:
#   Type: A
#   Name: www
#   Value: 71.52.23.215
#   TTL: 300
```

### 2. Install Nginx
```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3. Configure Nginx
```bash
# Copy the configuration above to:
sudo nano /etc/nginx/sites-available/team-claude-domains

# Enable the site:
sudo ln -s /etc/nginx/sites-available/team-claude-domains /etc/nginx/sites-enabled/

# Test configuration:
sudo nginx -t

# If OK, reload:
sudo systemctl reload nginx
```

### 4. Install SSL Certificates
```bash
# Run certbot for each domain (see SSL section above)
sudo certbot --nginx -d youandinotai.com -d www.youandinotai.com
sudo certbot --nginx -d youandinotai.online -d www.youandinotai.online
sudo certbot --nginx -d ai-solutions.store -d www.ai-solutions.store
sudo certbot --nginx -d aidoesitall.org -d www.aidoesitall.org
```

### 5. Verify Services Running
```bash
# Check PM2 services:
pm2 list

# Should show:
# - cloudedroid (port 3456) → ai-solutions.store
# - health-dashboard (port 3457) → aidoesitall.org
# - dating backend (port 3000) → youandinotai.com/api
# - dating frontend (port 5173) → youandinotai.com
```

### 6. Test Domains
```bash
# Test HTTP redirects to HTTPS:
curl -I http://youandinotai.com
curl -I http://ai-solutions.store
curl -I http://aidoesitall.org

# Test HTTPS (after SSL setup):
curl -I https://youandinotai.com
curl -I https://ai-solutions.store
curl -I https://aidoesitall.org
```

---

## 🎨 BRANDING PER DOMAIN

### youandinotai.com
**Tagline:** "Real Connections, Real People - Not AI"
**Subtext:** "(But powered by AI for better matching)"
**Mission:** "50% profits to Shriners Children's Hospitals"

### ai-solutions.store
**Tagline:** "Enterprise AI Solutions Marketplace"
**Subtext:** "Powered by Team Claude - AI for The Greater Good"
**Mission:** "Every purchase supports pediatric healthcare"

### aidoesitall.org
**Tagline:** "AI Does It All - For Good"
**Features:**
- Federal grant automation ($500K-2M annually)
- Free AI tools for nonprofits
- DAO community governance
- Mission: 50% profits to Shriners

---

## 📈 EXPECTED TRAFFIC

| Domain | Expected Users | Primary Audience |
|--------|---------------|------------------|
| youandinotai.com | 10K-100K | Dating users (18-55) |
| youandinotai.online | 5-50 | Business admins |
| ai-solutions.store | 1K-10K | Enterprise clients |
| aidoesitall.org | 500-5K | Grant seekers, nonprofits |

---

## 💡 NEXT STEPS

1. ✅ **Update DNS records** at your registrar
2. ✅ **Install Nginx** on server
3. ✅ **Configure reverse proxy** (use config above)
4. ✅ **Install SSL certificates** (Let's Encrypt)
5. ✅ **Update environment files** with production domains
6. ✅ **Test all domains** (HTTP → HTTPS redirect)
7. ✅ **Launch services** on appropriate ports
8. ✅ **Monitor logs** for any issues

---

## 🔍 VERIFICATION CHECKLIST

```bash
# After setup, verify each domain:

□ https://youandinotai.com → Dating app loads
□ https://youandinotai.com/api/health → API responds
□ https://youandinotai.online → Dashboard loads
□ https://ai-solutions.store → CloudeDroid marketplace
□ https://aidoesitall.org → Grant portal / health dashboard
□ http://uandinotai.com → Redirects to youandinotai.com
□ http://uandinotai.lol → Redirects to youandinotai.com
□ SSL certificates valid (green padlock)
□ PM2 services running (pm2 list)
□ Nginx status OK (systemctl status nginx)
```

---

## 📞 DNS PROPAGATION

After updating DNS:
- **Local test:** 5-10 minutes
- **Full propagation:** 24-48 hours
- **Check propagation:** https://dnschecker.org

---

**Status:** 📋 Configuration Ready
**Server IP:** 71.52.23.215
**Total Domains:** 7
**Primary Services:** 4 (Dating, Dashboard, AI Marketplace, Grant Portal)

**🌐 Let's launch your multi-domain Team Claude ecosystem! 💚🚀**
