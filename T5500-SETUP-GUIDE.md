# Dell Precision T5500 Setup Guide
## YouAndINotAI Platform - 35 Desktop Deployment

---

## 🎯 Overview

This guide covers setting up **35 Dell Precision T5500 workstations** to run the YouAndINotAI dating platform in a distributed production environment.

### Architecture

- **35 Dell Precision T5500 Desktops**
- Each desktop runs the full platform stack:
  - PostgreSQL database
  - Redis cache
  - Node.js backend (API)
  - React frontend
  - Admin dashboard
  - AI automation agents

### Deployment Strategy

1. **Desktop #1** (Master): Manual setup + testing
2. **Desktops #2-35**: Automated bulk deployment

---

## 📋 Prerequisites

### Hardware Requirements (Per Desktop)

- **CPU**: Dual Intel Xeon (6-12 cores recommended)
- **RAM**: 16GB minimum (32GB+ recommended)
- **Storage**: 500GB+ SSD/HDD
- **Network**: Gigabit Ethernet

### Software Requirements

- **OS**: Ubuntu Server 22.04 LTS (or compatible)
- **Network**: Static IP or DHCP reservation
- **SSH**: Enabled and accessible

### Access Requirements

- Root/sudo access to all desktops
- SSH keys configured (recommended) or passwords
- Network connectivity between machines

---

## 🚀 Quick Start - Desktop #1 (T5500-01)

### Step 1: Install Base System

```bash
# On the T5500 desktop
cd ~
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# Run base setup (installs Docker, Node.js, etc.)
sudo bash setup-t5500-base.sh
```

**What this does:**
- Updates system packages
- Installs Docker + Docker Compose
- Installs Node.js 20.x LTS
- Configures firewall (UFW)
- Creates application user and directories
- Clones GitHub repository
- Optimizes system for production

**Time:** ~10 minutes

### Step 2: Configure Environment

```bash
# Edit .env file with your API keys
cd /opt/youandinotai/app
sudo nano .env
```

**Required API Keys:**

```bash
# Critical - Must change these!
POSTGRES_PASSWORD=your_secure_password_here
JWT_SECRET=your_random_32char_secret_here
JWT_REFRESH_SECRET=another_random_secret_here
PERPLEXITY_API_KEY=pplx-xxxxxx  # Get from perplexity.ai
SQUARE_ACCESS_TOKEN=sq0atp-xxx  # Get from developer.squareup.com
SQUARE_LOCATION_ID=your_location_id
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

**Optional (for image uploads):**
```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=youandinotai-uploads
```

### Step 3: Deploy Platform

```bash
# Run deployment script
sudo -u youandinotai bash deploy-platform.sh
```

**What this does:**
- Validates environment variables
- Installs npm dependencies
- Builds Docker images
- Starts all services (database, backend, frontend, dashboard)
- Runs database migrations
- Performs health checks

**Time:** ~15-20 minutes

### Step 4: Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Check backend health
curl http://localhost:4000/health

# Check logs
docker-compose logs -f backend
```

**Access services:**
- Frontend: `http://<T5500-IP>:3000`
- Backend API: `http://<T5500-IP>:4000`
- Dashboard: `http://<T5500-IP>:8080`

---

## 🔄 Automated Deployment - Desktops #2-35

Once Desktop #1 is working, deploy to remaining 34 desktops automatically.

### Step 1: Create Desktop Inventory

```bash
# Edit inventory file with your desktop IPs
nano desktops-inventory.txt
```

**Format:**
```
DESKTOP_NUMBER,HOSTNAME,IP_ADDRESS,SSH_USER,SSH_PORT,STATUS

1,t5500-01,192.168.1.101,root,22,deployed
2,t5500-02,192.168.1.102,root,22,pending
3,t5500-03,192.168.1.103,root,22,pending
...
35,t5500-35,192.168.1.135,root,22,pending
```

**Tips:**
- Use static IPs or DHCP reservations
- Ensure SSH is enabled on all machines
- Test SSH connectivity first

### Step 2: Setup SSH Keys (Recommended)

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -C "youandinotai@deployment"

# Copy to all desktops (example for one desktop)
ssh-copy-id root@192.168.1.102

# Or use a loop for all 35
for i in {101..135}; do
    ssh-copy-id root@192.168.1.$i
done
```

### Step 3: Run Bulk Deployment

**Sequential Deployment (safer, slower):**
```bash
./bulk-deploy.sh
```

**Parallel Deployment (faster, deploy 5 at a time):**
```bash
./bulk-deploy.sh --parallel --max-parallel 5
```

**Resume from specific desktop:**
```bash
# If deployment failed at desktop 15, resume from there
./bulk-deploy.sh --start-from 15
```

**What this does for each desktop:**
1. Tests SSH connectivity
2. Copies setup scripts
3. Copies .env configuration
4. Runs base system setup
5. Deploys platform
6. Verifies deployment
7. Updates inventory status

**Time:**
- Sequential: ~25 min × 34 = 14 hours
- Parallel (5): ~3 hours

### Step 4: Monitor Progress

```bash
# Watch deployment logs in real-time
tail -f deployment-logs-*/desktop-*.log

# Check summary
cat deployment-logs-*/results.txt
```

---

## 🔍 Verification & Testing

### Test Individual Desktop

```bash
# SSH into desktop
ssh root@192.168.1.102

# Check services
docker-compose ps
docker-compose logs --tail=50

# Test API
curl http://localhost:4000/health
curl http://localhost:4000/api/stats

# Test frontend
curl http://localhost:3000
```

### Test All Desktops

```bash
# Check status of all 35 desktops
./check-all-desktops.sh
```

Creates `check-all-desktops.sh`:

```bash
#!/bin/bash
# Check all 35 desktops

while IFS=',' read -r num host ip user port status; do
    [[ "$num" =~ ^#.*$ ]] && continue
    [[ -z "$num" ]] && continue

    echo -n "Desktop #$num ($host): "

    if curl -sf http://$ip:4000/health &>/dev/null; then
        echo "✅ HEALTHY"
    else
        echo "❌ DOWN"
    fi
done < desktops-inventory.txt
```

---

## 🌐 Load Balancing (Optional)

To distribute traffic across all 35 desktops, set up a load balancer.

### Option 1: HAProxy

```bash
# Install HAProxy on separate machine
apt-get install haproxy

# Configure /etc/haproxy/haproxy.cfg
frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    server t5500-01 192.168.1.101:3000 check
    server t5500-02 192.168.1.102:3000 check
    # ... add all 35 desktops
    server t5500-35 192.168.1.135:3000 check

# Restart HAProxy
systemctl restart haproxy
```

### Option 2: Nginx Load Balancer

```bash
# /etc/nginx/nginx.conf
upstream backend_pool {
    least_conn;
    server 192.168.1.101:3000;
    server 192.168.1.102:3000;
    # ... all 35 desktops
}

server {
    listen 80;
    server_name youandinotai.com;

    location / {
        proxy_pass http://backend_pool;
    }
}
```

---

## 📊 Monitoring

### Monitor All Desktops

Create `monitor-desktops.sh`:

```bash
#!/bin/bash
# Real-time monitoring of all 35 desktops

watch -n 5 './check-all-desktops.sh'
```

### Collect Metrics

```bash
# Get CPU/Memory usage from all desktops
for i in {101..135}; do
    echo "=== Desktop 192.168.1.$i ==="
    ssh root@192.168.1.$i "top -bn1 | head -n 20"
    echo ""
done
```

### Centralized Logging (Optional)

Set up ELK stack or Grafana to collect logs from all 35 desktops.

---

## 🔧 Maintenance

### Update All Desktops

```bash
#!/bin/bash
# update-all-desktops.sh

while IFS=',' read -r num host ip user port status; do
    [[ "$num" =~ ^#.*$ ]] && continue
    [[ -z "$num" ]] && continue

    echo "Updating Desktop #$num..."
    ssh -p "$port" "$user@$ip" "cd /opt/youandinotai/app && git pull && docker-compose down && docker-compose up -d --build"
done < desktops-inventory.txt
```

### Restart All Desktops

```bash
#!/bin/bash
# restart-all.sh

for i in {101..135}; do
    echo "Restarting 192.168.1.$i..."
    ssh root@192.168.1.$i "cd /opt/youandinotai/app && docker-compose restart"
done
```

---

## 🐛 Troubleshooting

### Desktop Won't Boot

```bash
# Check SSH connectivity
ping 192.168.1.102

# Check SSH service
ssh root@192.168.1.102 "systemctl status sshd"
```

### Docker Issues

```bash
# Restart Docker
ssh root@192.168.1.102 "systemctl restart docker"

# Check Docker logs
ssh root@192.168.1.102 "journalctl -u docker --since today"
```

### Database Connection Errors

```bash
# Check PostgreSQL container
ssh root@192.168.1.102 "docker-compose logs postgres"

# Restart database
ssh root@192.168.1.102 "docker-compose restart postgres"
```

### Port Conflicts

```bash
# Check if ports are already in use
ssh root@192.168.1.102 "netstat -tuln | grep -E ':(3000|4000|5432|6379|8080)'"
```

---

## 📈 Scaling Tips

### Database Clustering

- Use PostgreSQL replication across multiple desktops
- Set up master-slave or master-master replication

### Redis Clustering

- Configure Redis Sentinel for high availability
- Or use Redis Cluster mode

### Shared Storage

- Use NFS or GlusterFS for shared uploads/media
- Mount on all 35 desktops

---

## 🎉 Success Criteria

After completing setup, you should have:

- ✅ 35 Dell Precision T5500 desktops running
- ✅ Full platform deployed on each desktop
- ✅ All services healthy (PostgreSQL, Redis, Backend, Frontend, Dashboard)
- ✅ Load balancer distributing traffic
- ✅ Monitoring in place
- ✅ Automated deployment scripts working

---

## 📞 Quick Reference

### File Locations

- **Setup Script**: `setup-t5500-base.sh`
- **Deploy Script**: `deploy-platform.sh`
- **Bulk Deploy**: `bulk-deploy.sh`
- **Inventory**: `desktops-inventory.txt`
- **App Directory**: `/opt/youandinotai/app`
- **Logs**: `/var/log/youandinotai`
- **Data**: `/var/lib/youandinotai`

### Useful Commands

```bash
# Single desktop deployment
sudo bash setup-t5500-base.sh
sudo -u youandinotai bash deploy-platform.sh

# Bulk deployment
./bulk-deploy.sh --parallel --max-parallel 5

# Check status
docker-compose ps
docker-compose logs -f

# Restart services
docker-compose restart
docker-compose down && docker-compose up -d
```

---

**Ready to deploy!** Start with Desktop #1, verify it works, then roll out to all 35 machines. 🚀
