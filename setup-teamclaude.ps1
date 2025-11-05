# ═══════════════════════════════════════════════════════════════════════════
# Team Claude Universal Windows Setup Script
# Run this on ALL 5 Windows systems
# TROLLZ1004 EMPIRE - Mission: AI for Good + Shriners Charity
# ═══════════════════════════════════════════════════════════════════════════

param(
    [string]$Role = "ask"
)

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎊 TEAM CLAUDE / TROLLZ1004 EMPIRE 🎊" -ForegroundColor Green
Write-Host "  Windows 10/11 Setup Script" -ForegroundColor Green
Write-Host "  Mission: Generate Revenue → Help Children → AI for Good" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Not running as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "  1. Close this window" -ForegroundColor White
    Write-Host "  2. Right-click PowerShell" -ForegroundColor White
    Write-Host "  3. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "  4. Run this script again" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Ask for system role if not specified
if ($Role -eq "ask") {
    Write-Host "Which system is this?" -ForegroundColor Cyan
    Write-Host "  1. T5500 - Backend API Server" -ForegroundColor White
    Write-Host "  2. EVGA Classified - AI Automation Hub" -ForegroundColor White
    Write-Host "  3. ASUS X79 - Database Master" -ForegroundColor White
    Write-Host "  4. OptiPlex 9020 - Frontend Server" -ForegroundColor White
    Write-Host "  5. OptiPlex i3 - Monitoring & Load Balancer" -ForegroundColor White
    Write-Host ""
    $choice = Read-Host "Enter number (1-5)"

    switch ($choice) {
        "1" { $Role = "backend"; $RoleName = "Backend API Server" }
        "2" { $Role = "ai"; $RoleName = "AI Automation Hub" }
        "3" { $Role = "database"; $RoleName = "Database Master" }
        "4" { $Role = "frontend"; $RoleName = "Frontend Server" }
        "5" { $Role = "monitoring"; $RoleName = "Monitoring & Load Balancer" }
        default { Write-Host "Invalid choice" -ForegroundColor Red; exit 1 }
    }
}

Write-Host ""
Write-Host "Setting up as: $RoleName" -ForegroundColor Green
Write-Host ""

# Step 1: Install Chocolatey
Write-Host "[1/10] Installing Chocolatey (Package Manager)..." -ForegroundColor Cyan
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "✓ Chocolatey installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Chocolatey install failed, continuing..." -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Chocolatey already installed" -ForegroundColor Green
}

# Step 2: Install Git
Write-Host "[2/10] Installing Git for Windows..." -ForegroundColor Cyan
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    try {
        choco install git -y --no-progress
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
        Write-Host "✓ Git installed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Git install failed - please install manually from https://git-scm.com" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Git already installed ($(git --version))" -ForegroundColor Green
}

# Step 3: Install Node.js
Write-Host "[3/10] Installing Node.js 20.x LTS..." -ForegroundColor Cyan
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    try {
        choco install nodejs-lts -y --no-progress
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
        Write-Host "✓ Node.js installed" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Node.js install failed - please install manually from https://nodejs.org" -ForegroundColor Yellow
    }
} else {
    Write-Host "✓ Node.js already installed ($(node --version))" -ForegroundColor Green
}

# Step 4: Check Docker Desktop
Write-Host "[4/10] Checking Docker Desktop..." -ForegroundColor Cyan
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (!$dockerInstalled) {
    Write-Host "⚠ Docker Desktop NOT installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "IMPORTANT: You must install Docker Desktop manually:" -ForegroundColor Yellow
    Write-Host "  1. Visit: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    Write-Host "  2. Download Docker Desktop for Windows" -ForegroundColor White
    Write-Host "  3. Install and restart your computer" -ForegroundColor White
    Write-Host "  4. Start Docker Desktop" -ForegroundColor White
    Write-Host "  5. Run this script again" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue without Docker? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
} else {
    Write-Host "✓ Docker Desktop installed" -ForegroundColor Green

    # Check if Docker is running
    try {
        docker ps | Out-Null
        Write-Host "✓ Docker Desktop is running" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Docker Desktop is installed but not running" -ForegroundColor Yellow
        Write-Host "  Please start Docker Desktop and run this script again" -ForegroundColor White
    }
}

# Step 5: Create directory structure
Write-Host "[5/10] Creating Team Claude directories..." -ForegroundColor Cyan
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
Write-Host "✓ Directories created at C:\TeamClaude\" -ForegroundColor Green

# Step 6: Clone/Update repository
Write-Host "[6/10] Setting up repository..." -ForegroundColor Cyan
if (Test-Path "C:\TeamClaude\app\.git") {
    Write-Host "  Repository exists, pulling latest..." -ForegroundColor White
    Set-Location "C:\TeamClaude\app"
    try {
        git pull origin main 2>&1 | Out-Null
        Write-Host "✓ Repository updated" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not update repository" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Cloning repository..." -ForegroundColor White
    try {
        git clone https://github.com/Trollz1004/Trollz1004.git "C:\TeamClaude\app" 2>&1 | Out-Null
        Write-Host "✓ Repository cloned" -ForegroundColor Green
    } catch {
        Write-Host "⚠ Could not clone repository - check internet connection" -ForegroundColor Yellow
    }
}

# Step 7: Configure Windows Firewall
Write-Host "[7/10] Configuring Windows Firewall..." -ForegroundColor Cyan
$ports = @(
    @{Name="TeamClaude-Backend"; Port=4000; Protocol="TCP"},
    @{Name="TeamClaude-Frontend"; Port=3000; Protocol="TCP"},
    @{Name="TeamClaude-Dashboard"; Port=8080; Protocol="TCP"},
    @{Name="TeamClaude-AI"; Port=5000; Protocol="TCP"},
    @{Name="TeamClaude-PostgreSQL"; Port=5432; Protocol="TCP"},
    @{Name="TeamClaude-Redis"; Port=6379; Protocol="TCP"},
    @{Name="TeamClaude-HTTP"; Port=80; Protocol="TCP"},
    @{Name="TeamClaude-HTTPS"; Port=443; Protocol="TCP"}
)

$rulesAdded = 0
foreach ($rule in $ports) {
    try {
        $existingRule = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue
        if (!$existingRule) {
            New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -LocalPort $rule.Port -Protocol $rule.Protocol -Action Allow | Out-Null
            $rulesAdded++
        }
    } catch {
        # Silently continue if firewall rules fail
    }
}
Write-Host "✓ Firewall configured ($rulesAdded new rules)" -ForegroundColor Green

# Step 8: Create role-specific docker-compose
Write-Host "[8/10] Creating role-specific configuration..." -ForegroundColor Cyan

$composeFile = "C:\TeamClaude\config\docker-compose-$Role.yml"

switch ($Role) {
    "backend" {
        $composeContent = @"
version: '3.8'
services:
  backend:
    build: ../app/date-app-dashboard/backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://teamclaude:changeme@192.168.1.12:5432/trollz1004_empire
      - REDIS_URL=redis://192.168.1.12:6379
    restart: unless-stopped
"@
    }

    "database" {
        $composeContent = @"
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: teamclaude
      POSTGRES_PASSWORD: changeme_secure_password
      POSTGRES_DB: trollz1004_empire
    volumes:
      - C:\TeamClaude\data\postgres:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - C:\TeamClaude\data\redis:/data
    restart: unless-stopped
"@
    }

    "frontend" {
        $composeContent = @"
version: '3.8'
services:
  frontend:
    build: ../app/date-app-dashboard/frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://192.168.1.10:4000
    restart: unless-stopped

  dashboard:
    build: ../app/date-app-dashboard/admin-dashboard/frontend
    ports:
      - "8080:8080"
    restart: unless-stopped
"@
    }

    default {
        $composeContent = "# Role-specific configuration for $Role"
    }
}

$composeContent | Out-File -FilePath $composeFile -Encoding UTF8
Write-Host "✓ Created $composeFile" -ForegroundColor Green

# Step 9: Create startup script
Write-Host "[9/10] Creating startup script..." -ForegroundColor Cyan
$startScript = @"
# Team Claude Startup Script - $RoleName
Set-Location C:\TeamClaude\config
docker-compose -f docker-compose-$Role.yml up -d
Write-Host "Services started!" -ForegroundColor Green
docker-compose -f docker-compose-$Role.yml ps
"@

$startScript | Out-File -FilePath "C:\TeamClaude\start-$Role.ps1" -Encoding UTF8
Write-Host "✓ Created C:\TeamClaude\start-$Role.ps1" -ForegroundColor Green

# Step 10: System Information
Write-Host "[10/10] Gathering system information..." -ForegroundColor Cyan

$computerName = $env:COMPUTERNAME
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*VMware*'} | Select-Object -First 1).IPAddress
$os = (Get-CimInstance Win32_OperatingSystem).Caption
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
$cpu = (Get-CimInstance Win32_Processor).Name

$sysInfo = @"
═══════════════════════════════════════════════════════════════════════════
TEAM CLAUDE SYSTEM INFORMATION
═══════════════════════════════════════════════════════════════════════════

System Role: $RoleName
Computer Name: $computerName
IP Address: $ipAddress
Windows: $os
CPU: $cpu
RAM: $ram GB
Setup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

═══════════════════════════════════════════════════════════════════════════
INSTALLED SOFTWARE
═══════════════════════════════════════════════════════════════════════════

$(if (Get-Command git -ErrorAction SilentlyContinue) { "✓ Git: $(git --version)" } else { "✗ Git: Not installed" })
$(if (Get-Command node -ErrorAction SilentlyContinue) { "✓ Node.js: $(node --version)" } else { "✗ Node.js: Not installed" })
$(if (Get-Command npm -ErrorAction SilentlyContinue) { "✓ npm: $(npm --version)" } else { "✗ npm: Not installed" })
$(if (Get-Command docker -ErrorAction SilentlyContinue) { "✓ Docker: $(docker --version)" } else { "✗ Docker: Not installed" })

═══════════════════════════════════════════════════════════════════════════
NETWORK CONFIGURATION
═══════════════════════════════════════════════════════════════════════════

Recommended Static IPs:
  T5500 (Backend):        192.168.1.10
  EVGA (AI Hub):          192.168.1.11
  ASUS X79 (Database):    192.168.1.12
  OptiPlex 9020 (Frontend): 192.168.1.13
  OptiPlex i3 (Monitor):  192.168.1.14

Current IP: $ipAddress
$(if ($ipAddress -notmatch "192.168.1.1[0-4]") { "⚠ WARNING: Configure static IP for production use" })

═══════════════════════════════════════════════════════════════════════════
NEXT STEPS
═══════════════════════════════════════════════════════════════════════════

$(if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
"1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Restart computer
3. Run this script again"
} else {
"1. Ensure Docker Desktop is running
2. Edit C:\TeamClaude\config\docker-compose-$Role.yml (configure passwords, IPs)
3. Run: C:\TeamClaude\start-$Role.ps1
4. Verify services: docker-compose ps"
})

═══════════════════════════════════════════════════════════════════════════
Team Claude: Building with Compliance + Heart 💚
Mission: Generate Revenue → Help Children → AI for Good
═══════════════════════════════════════════════════════════════════════════
"@

$sysInfo | Out-File -FilePath "C:\TeamClaude\SYSTEM_INFO.txt" -Encoding UTF8

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Information:" -ForegroundColor Yellow
Write-Host "  Role: $RoleName" -ForegroundColor White
Write-Host "  Computer: $computerName" -ForegroundColor White
Write-Host "  IP Address: $ipAddress" -ForegroundColor White
Write-Host "  OS: $os" -ForegroundColor White
Write-Host "  RAM: $ram GB" -ForegroundColor White
Write-Host ""

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✓ Docker is installed" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start services:" -ForegroundColor Yellow
    Write-Host "  .\C:\TeamClaude\start-$Role.ps1" -ForegroundColor Cyan
} else {
    Write-Host "⚠ Docker Desktop is NOT installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor White
    Write-Host "  2. Restart computer" -ForegroundColor White
    Write-Host "  3. Run this script again" -ForegroundColor White
}

Write-Host ""
Write-Host "Full system info saved to: C:\TeamClaude\SYSTEM_INFO.txt" -ForegroundColor Green
Write-Host ""
Write-Host "Team Claude: AI for Good 💚" -ForegroundColor Green
Write-Host ""
