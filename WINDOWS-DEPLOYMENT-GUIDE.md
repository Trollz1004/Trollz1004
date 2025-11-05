# ═══════════════════════════════════════════════════════════════════════════
# TEAM CLAUDE / TROLLZ1004 EMPIRE - Windows 10/11 Deployment Guide
# All 5 Systems Setup Instructions
# ═══════════════════════════════════════════════════════════════════════════

## 🎯 System Architecture

### Ready Systems (Windows 10/11):

1. **T5500** (Windows 10) - Backend API Server
   - Role: Node.js backend, API endpoints
   - GPU: ASUS 8GB
   - Ports: 4000 (API)

2. **EVGA Classified** (Windows 10) - AI Automation Hub
   - Role: Perplexity AI agents, automation
   - Specs: Best i7, 48GB RAM
   - GPU: 1x GTX 1050 Ti
   - Ports: 5000 (AI services)

3. **ASUS X79** (Windows 10) - Database Master
   - Role: PostgreSQL + Redis
   - Specs: i7, 64GB RAM
   - GPU: 1x GTX 1050 Ti
   - Ports: 5432 (PostgreSQL), 6379 (Redis)

4. **OptiPlex 9020** (Windows 10) - Frontend Server
   - Role: React frontend, admin dashboard
   - Specs: i7-4790K, 32GB RAM
   - GPU: AMD FirePro V3900
   - Ports: 3000 (Frontend), 8080 (Dashboard)

5. **OptiPlex i3** (Windows 10) - Monitoring & Load Balancer
   - Role: System monitoring, nginx load balancer
   - Specs: i3, 12GB RAM
   - No GPU needed
   - Ports: 80 (HTTP), 443 (HTTPS), 9090 (Grafana)

---

## 📋 Prerequisites (ALL Systems)

### Required Software:

1. **Windows 10/11** (fresh install recommended)
2. **Docker Desktop for Windows** - https://www.docker.com/products/docker-desktop/
3. **Git for Windows** - https://git-scm.com/download/win
4. **Node.js 20.x LTS** - https://nodejs.org/
5. **Visual Studio Code** (optional but recommended)

### System Requirements:

- ✅ Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
- ✅ Windows 11 64-bit
- ✅ WSL 2 feature enabled
- ✅ Virtualization enabled in BIOS
- ✅ 8GB+ RAM (16GB+ recommended)
- ✅ 50GB+ free disk space

---

## 🚀 Universal Setup Script (Run on ALL Systems)

### Step 1: Download Setup Script

Save this as `C:\setup-teamclaude.ps1`:

```powershell
# ═══════════════════════════════════════════════════════════════════════════
# Team Claude Universal Windows Setup Script
# Run this on ALL 5 systems
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TEAM CLAUDE / TROLLZ1004 EMPIRE" -ForegroundColor Green
Write-Host "  Windows Setup Script" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Please run as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Install Chocolatey (Windows package manager)
Write-Host "[1/8] Installing Chocolatey..." -ForegroundColor Cyan
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "✓ Chocolatey installed" -ForegroundColor Green
} else {
    Write-Host "✓ Chocolatey already installed" -ForegroundColor Green
}

# Step 2: Install Git
Write-Host "[2/8] Installing Git..." -ForegroundColor Cyan
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    choco install git -y
    refreshenv
    Write-Host "✓ Git installed" -ForegroundColor Green
} else {
    Write-Host "✓ Git already installed" -ForegroundColor Green
}

# Step 3: Install Node.js
Write-Host "[3/8] Installing Node.js 20.x LTS..." -ForegroundColor Cyan
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y
    refreshenv
    Write-Host "✓ Node.js installed" -ForegroundColor Green
} else {
    Write-Host "✓ Node.js already installed ($(node --version))" -ForegroundColor Green
}

# Step 4: Install Docker Desktop
Write-Host "[4/8] Checking Docker Desktop..." -ForegroundColor Cyan
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "⚠ Docker Desktop not found" -ForegroundColor Yellow
    Write-Host "Please install Docker Desktop manually from:" -ForegroundColor Yellow
    Write-Host "https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing Docker Desktop:" -ForegroundColor Yellow
    Write-Host "1. Restart your computer" -ForegroundColor Yellow
    Write-Host "2. Start Docker Desktop" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    pause
} else {
    Write-Host "✓ Docker Desktop installed" -ForegroundColor Green
}

# Step 5: Create directory structure
Write-Host "[5/8] Creating Team Claude directories..." -ForegroundColor Cyan
$dirs = @(
    "C:\TeamClaude\app",
    "C:\TeamClaude\logs",
    "C:\TeamClaude\data\postgres",
    "C:\TeamClaude\data\redis",
    "C:\TeamClaude\backups",
    "C:\TeamClaude\config"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "✓ Directories created" -ForegroundColor Green

# Step 6: Clone repository
Write-Host "[6/8] Cloning repository..." -ForegroundColor Cyan
if (!(Test-Path "C:\TeamClaude\app\.git")) {
    Set-Location "C:\TeamClaude\app"
    git clone https://github.com/Trollz1004/Trollz1004.git .
    Write-Host "✓ Repository cloned" -ForegroundColor Green
} else {
    Write-Host "✓ Repository already exists" -ForegroundColor Green
    Set-Location "C:\TeamClaude\app"
    git pull origin main
    Write-Host "✓ Repository updated" -ForegroundColor Green
}

# Step 7: Configure Windows Firewall
Write-Host "[7/8] Configuring Windows Firewall..." -ForegroundColor Cyan
$ports = @(
    @{Name="TeamClaude-Backend"; Port=4000},
    @{Name="TeamClaude-Frontend"; Port=3000},
    @{Name="TeamClaude-Dashboard"; Port=8080},
    @{Name="TeamClaude-AI"; Port=5000},
    @{Name="TeamClaude-PostgreSQL"; Port=5432},
    @{Name="TeamClaude-Redis"; Port=6379}
)

foreach ($rule in $ports) {
    $existingRule = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
    if (!$existingRule) {
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -LocalPort $rule.Port -Protocol TCP -Action Allow | Out-Null
    }
}
Write-Host "✓ Firewall configured" -ForegroundColor Green

# Step 8: System Information
Write-Host "[8/8] System Information:" -ForegroundColor Cyan
Write-Host "  Computer Name: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "  IP Address: $(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1 -ExpandProperty IPAddress)" -ForegroundColor White
Write-Host "  Windows: $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption)" -ForegroundColor White
Write-Host "  RAM: $([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)) GB" -ForegroundColor White

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Ensure Docker Desktop is running" -ForegroundColor White
Write-Host "  2. Run the role-specific setup script for this computer" -ForegroundColor White
Write-Host "  3. Check C:\TeamClaude\ROLE-SETUP-INSTRUCTIONS.txt" -ForegroundColor White
Write-Host ""
Write-Host "Team Claude: AI for Good 💚" -ForegroundColor Green
Write-Host ""
```

### Step 2: Run Setup Script

```powershell
# Right-click PowerShell and "Run as Administrator"
# Then run:
Set-ExecutionPolicy Bypass -Scope Process -Force
C:\setup-teamclaude.ps1
```

---

## 🎯 Role-Specific Setup (After Universal Setup)

### System 1: T5500 - Backend API Server

```powershell
# Create docker-compose.yml in C:\TeamClaude\app\
# This runs the Node.js backend
docker-compose -f docker-compose-backend.yml up -d
```

### System 2: EVGA Classified - AI Automation Hub

```powershell
# Install Python for AI agents
choco install python -y

# Start AI services
docker-compose -f docker-compose-ai.yml up -d
```

### System 3: ASUS X79 - Database Master

```powershell
# Start PostgreSQL and Redis
docker-compose -f docker-compose-database.yml up -d
```

### System 4: OptiPlex 9020 - Frontend Server

```powershell
# Build and run frontend
cd C:\TeamClaude\app\date-app-dashboard\frontend
npm install
npm run build
docker-compose -f docker-compose-frontend.yml up -d
```

### System 5: OptiPlex i3 - Monitoring

```powershell
# Start monitoring stack
docker-compose -f docker-compose-monitoring.yml up -d
```

---

## 📊 Network Configuration

### Recommended Static IPs:

```
T5500 (Backend):        192.168.1.10
EVGA (AI Hub):          192.168.1.11
ASUS X79 (Database):    192.168.1.12
OptiPlex 9020 (Frontend): 192.168.1.13
OptiPlex i3 (Monitor):  192.168.1.14
```

### Set Static IP in Windows:

1. Control Panel → Network and Sharing Center
2. Change adapter settings
3. Right-click your network adapter → Properties
4. Select "Internet Protocol Version 4 (TCP/IPv4)"
5. Click Properties
6. Select "Use the following IP address"
7. Enter IP, Subnet (255.255.255.0), Gateway (192.168.1.1)

---

## 🔧 Troubleshooting

### Docker Desktop Won't Start:
- Enable Virtualization in BIOS
- Enable WSL 2: `wsl --install`
- Restart computer

### Port Already in Use:
```powershell
# Find what's using port 4000
netstat -ano | findstr :4000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

### Can't Clone Repository:
```powershell
# Configure Git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## ✅ Verification Checklist

After setup on each system:

```powershell
# Check Docker
docker --version
docker ps

# Check Node.js
node --version
npm --version

# Check Git
git --version

# Check services are running
docker-compose ps
```

---

## 🎉 Final Step - Connect All Systems

Once all 5 systems are set up, create `C:\TeamClaude\config\network.json`:

```json
{
  "backend": "http://192.168.1.10:4000",
  "ai_hub": "http://192.168.1.11:5000",
  "database": "postgresql://192.168.1.12:5432/trollz1004_empire",
  "redis": "redis://192.168.1.12:6379",
  "frontend": "http://192.168.1.13:3000",
  "dashboard": "http://192.168.1.13:8080",
  "monitoring": "http://192.168.1.14:9090"
}
```

---

**Team Claude: Building with Compliance + Heart** 💚
**Mission: Generate Revenue → Help Children → AI for Good**

---

## 📞 Quick Reference

| System | IP | Role | Ports |
|--------|----|----- |-------|
| T5500 | 192.168.1.10 | Backend API | 4000 |
| EVGA | 192.168.1.11 | AI Hub | 5000 |
| ASUS X79 | 192.168.1.12 | Database | 5432, 6379 |
| OptiPlex 9020 | 192.168.1.13 | Frontend | 3000, 8080 |
| OptiPlex i3 | 192.168.1.14 | Monitor | 80, 9090 |

---

**All scripts ready to use!** 🚀
