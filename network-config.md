# Network Configuration Guide

## 🌐 Multi-PC Network Setup

### Your 3-PC Architecture

```
Internet → Router → Local Network
                    │
                    ├─→ T5500 Precision (Backend Hub)
                    │   IP: 192.168.1.100 (recommended)
                    │   ├─ Port 3456: CloudeDroid
                    │   ├─ Port 4000: YouAndINotAI API
                    │   ├─ Port 5432: PostgreSQL
                    │   └─ Port 6379: Redis
                    │
                    ├─→ OptiPlex 9020 (Frontend)
                    │   IP: 192.168.1.101 (recommended)
                    │   ├─ Port 3000: Dating App
                    │   ├─ Port 8080: Dashboard
                    │   └─ Port 80/443: Nginx (public)
                    │
                    └─→ OptiPlex 3060 (Monitor)
                        IP: 192.168.1.102 (recommended)
                        └─ Port 3001: Grafana
```

## 🔧 Setup Steps

### 1. Assign Static IPs

**On Each PC (Windows):**
```powershell
# Open Network Settings
ncpa.cpl

# Right-click network adapter → Properties
# Select "Internet Protocol Version 4 (TCP/IPv4)" → Properties

# T5500:
IP: 192.168.1.100
Subnet: 255.255.255.0
Gateway: 192.168.1.1
DNS: 8.8.8.8

# 9020:
IP: 192.168.1.101
Subnet: 255.255.255.0
Gateway: 192.168.1.1
DNS: 8.8.8.8

# 3060:
IP: 192.168.1.102
Subnet: 255.255.255.0
Gateway: 192.168.1.1
DNS: 8.8.8.8
```

### 2. Configure Firewall Rules

**On T5500 (Backend):**
```powershell
# Allow inbound connections
New-NetFirewallRule -DisplayName "CloudeDroid" -Direction Inbound -LocalPort 3456 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Backend API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Redis" -Direction Inbound -LocalPort 6379 -Protocol TCP -Action Allow
```

**On 9020 (Frontend):**
```powershell
New-NetFirewallRule -DisplayName "Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Dashboard" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

### 3. Update Environment Variables

**On 9020 (Frontend) - Update .env:**
```bash
# Point to backend PC
VITE_API_URL=http://192.168.1.100:4000
VITE_WS_URL=ws://192.168.1.100:4000
```

**On 3060 (Monitor) - For monitoring:**
```bash
# URLs to monitor
BACKEND_URL=http://192.168.1.100:4000
FRONTEND_URL=http://192.168.1.101:3000
DASHBOARD_URL=http://192.168.1.101:8080
CLOUDEDROID_URL=http://192.168.1.100:3456
```

### 4. Test Connectivity

**From 9020, test backend:**
```powershell
Test-NetConnection -ComputerName 192.168.1.100 -Port 4000
Test-NetConnection -ComputerName 192.168.1.100 -Port 3456
```

**From any PC, test frontend:**
```powershell
Test-NetConnection -ComputerName 192.168.1.101 -Port 3000
```

### 5. Configure PostgreSQL for Network Access

**On T5500, edit `pg_hba.conf`:**
```
# Location: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Add:
host    all             all             192.168.1.0/24          md5
```

**Edit `postgresql.conf`:**
```
# Location: C:\Program Files\PostgreSQL\15\data\postgresql.conf
listen_addresses = '*'
```

**Restart PostgreSQL:**
```powershell
Restart-Service postgresql-x64-15
```

## 🌍 External Access (Optional)

### Port Forwarding on Router

If you want to access from internet:
```
External Port → Internal IP:Port

80   → 192.168.1.101:80   (Frontend)
443  → 192.168.1.101:443  (Frontend HTTPS)
3456 → 192.168.1.100:3456 (CloudeDroid API)
```

### Dynamic DNS (Recommended)

Use services like:
- No-IP: https://www.noip.com/
- DuckDNS: https://www.duckdns.org/
- Cloudflare Tunnel (free): https://www.cloudflare.com/products/tunnel/

## 🔒 Security Recommendations

1. **Use VPN**: Set up Tailscale or WireGuard for secure remote access
2. **Strong passwords**: Use the generated secrets from .env
3. **Firewall**: Only allow trusted IP ranges
4. **HTTPS**: Use Let's Encrypt for SSL certificates
5. **Regular updates**: Keep Node.js and dependencies updated

## 📊 Network Testing Script

Save as `test-network.ps1`:
```powershell
Write-Host "=== NETWORK TEST ===" -ForegroundColor Cyan

$endpoints = @{
    "CloudeDroid"     = "http://192.168.1.100:3456/health"
    "Backend API"     = "http://192.168.1.100:4000/health"
    "Frontend"        = "http://192.168.1.101:3000"
    "Dashboard"       = "http://192.168.1.101:8080"
}

foreach ($service in $endpoints.Keys) {
    $url = $endpoints[$service]
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ $service" -ForegroundColor Green
    } catch {
        Write-Host "❌ $service" -ForegroundColor Red
    }
}
```

## 🚀 Quick Start Commands

**Start all services in correct order:**

1. **T5500 (Backend)** - Run first:
   ```powershell
   cd C:\TeamClaude\Trollz1004
   .\start-all-services.ps1 -Role backend
   ```

2. **9020 (Frontend)** - Run second:
   ```powershell
   cd C:\TeamClaude\Trollz1004
   .\start-all-services.ps1 -Role frontend
   ```

3. **Access from any PC:**
   - Dating App: http://192.168.1.101:3000
   - Dashboard: http://192.168.1.101:8080
   - CloudeDroid: http://192.168.1.100:3456
   - API: http://192.168.1.100:4000

## 🔍 Troubleshooting

**Can't connect between PCs:**
- Check firewall rules
- Verify static IPs are set
- Test ping: `ping 192.168.1.100`
- Check services are running

**API requests fail:**
- Verify CORS settings in backend .env
- Check API_URL in frontend .env
- Ensure PostgreSQL allows network connections

**Performance issues:**
- Check network speed: `Test-Connection -ComputerName 192.168.1.100 -Count 10`
- Monitor resource usage on T5500
- Consider using wired connection instead of WiFi
