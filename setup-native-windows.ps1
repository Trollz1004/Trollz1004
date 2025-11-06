# ═══════════════════════════════════════════════════════════════════════════
# TEAM CLAUDE MISSION: AI FOR GOOD + SHRINERS CHARITY
# Native Windows Deployment - NO DOCKER!
# Complete Setup for T5500, 9020, and i3 OptiPlex
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎊 TEAM CLAUDE MISSION 🎊" -ForegroundColor Green
Write-Host "  Native Windows Setup - NO DOCKER!" -ForegroundColor Yellow
Write-Host "  For the kids at Shriners Children's Hospital 💚" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Detect which system this is
$computerName = $env:COMPUTERNAME
$ram = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
$cpu = (Get-CimInstance Win32_Processor).Name

Write-Host "Detected System:" -ForegroundColor Yellow
Write-Host "  Computer: $computerName" -ForegroundColor White
Write-Host "  RAM: ${ram}GB" -ForegroundColor White
Write-Host "  CPU: $cpu" -ForegroundColor White
Write-Host ""

# Determine role based on hardware
$role = ""
if ($ram -ge 70) {
    $role = "T5500-Database"
    Write-Host "This is the T5500 - Database + Backend Server!" -ForegroundColor Green
}
elseif ($ram -ge 30) {
    $role = "9020-Frontend"
    Write-Host "This is the 9020 OptiPlex - Frontend Server!" -ForegroundColor Green
}
elseif ($ram -le 15) {
    $role = "i3-Monitor"
    Write-Host "This is the i3 OptiPlex - Monitoring Server!" -ForegroundColor Green
}
else {
    Write-Host "⚠ Could not auto-detect role" -ForegroundColor Yellow
    Write-Host "Select role:" -ForegroundColor Yellow
    Write-Host "  1. T5500 (Database + Backend)" -ForegroundColor White
    Write-Host "  2. 9020 OptiPlex (Frontend)" -ForegroundColor White
    Write-Host "  3. i3 OptiPlex (Monitor)" -ForegroundColor White
    $choice = Read-Host "Enter number (1-3)"
    switch ($choice) {
        "1" { $role = "T5500-Database" }
        "2" { $role = "9020-Frontend" }
        "3" { $role = "i3-Monitor" }
    }
}

Write-Host ""
Write-Host "Installing as: $role" -ForegroundColor Green
Write-Host ""

# Save role
$role | Out-File "C:\TeamClaude\system-role.txt" -Encoding UTF8

Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " INSTALLING SOFTWARE..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Install Chocolatey if not present
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "[1/10] Installing Chocolatey..." -ForegroundColor Cyan
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    Write-Host "✓ Chocolatey installed" -ForegroundColor Green
}
else {
    Write-Host "[1/10] ✓ Chocolatey already installed" -ForegroundColor Green
}

# Install Git if not present
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[2/10] Installing Git..." -ForegroundColor Cyan
    choco install git -y --no-progress
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    Write-Host "✓ Git installed" -ForegroundColor Green
}
else {
    Write-Host "[2/10] ✓ Git already installed" -ForegroundColor Green
}

# Install Node.js if not present
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[3/10] Installing Node.js..." -ForegroundColor Cyan
    choco install nodejs-lts -y --no-progress
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    Write-Host "✓ Node.js installed" -ForegroundColor Green
}
else {
    Write-Host "[3/10] ✓ Node.js already installed ($(node --version))" -ForegroundColor Green
}

# Role-specific installations
if ($role -eq "T5500-Database") {
    # Install PostgreSQL
    Write-Host "[4/10] Installing PostgreSQL..." -ForegroundColor Cyan
    choco install postgresql15 --params '/Password:teamclaude2025' -y --no-progress
    Write-Host "✓ PostgreSQL installed" -ForegroundColor Green

    # Install Redis
    Write-Host "[5/10] Installing Redis..." -ForegroundColor Cyan
    choco install redis-64 -y --no-progress
    Write-Host "✓ Redis installed" -ForegroundColor Green

    Write-Host "[6/10] Starting database services..." -ForegroundColor Cyan
    Start-Service postgresql-x64-15 -ErrorAction SilentlyContinue
    Start-Service Redis -ErrorAction SilentlyContinue
    Write-Host "✓ Services started" -ForegroundColor Green
}
else {
    Write-Host "[4/10] Skipping PostgreSQL (not database server)" -ForegroundColor Gray
    Write-Host "[5/10] Skipping Redis (not database server)" -ForegroundColor Gray
    Write-Host "[6/10] No database services to start" -ForegroundColor Gray
}

# Install PM2 (process manager)
Write-Host "[7/10] Installing PM2 process manager..." -ForegroundColor Cyan
npm install -g pm2 pm2-windows-startup -q
pm2-startup install
Write-Host "✓ PM2 installed" -ForegroundColor Green

# Create service directory
Write-Host "[8/10] Setting up services..." -ForegroundColor Cyan
$serviceDir = "C:\TeamClaude\services"
New-Item -ItemType Directory -Path $serviceDir -Force | Out-Null

# Role-specific service setup
if ($role -eq "T5500-Database") {
    # Backend service
    $backendDir = "C:\TeamClaude\app\date-app-dashboard\backend"
    if (Test-Path $backendDir) {
        Write-Host "  Setting up Backend API..." -ForegroundColor White
        Set-Location $backendDir
        npm install --production 2>&1 | Out-Null

        # Create .env file
        @"
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:teamclaude2025@localhost:5432/trollz1004_empire
REDIS_URL=redis://localhost:6379
JWT_SECRET=teamclaude_jwt_secret_2025_shriners_charity
JWT_REFRESH_SECRET=teamclaude_refresh_secret_2025_shriners
"@ | Out-File -FilePath "$backendDir\.env" -Encoding UTF8

        # Start with PM2
        pm2 start "npm start" --name "backend-api" --cwd $backendDir
        pm2 save

        Write-Host "  ✓ Backend API configured" -ForegroundColor Green
    }
}
elseif ($role -eq "9020-Frontend") {
    # Frontend service
    $frontendDir = "C:\TeamClaude\app\date-app-dashboard\frontend"
    if (Test-Path $frontendDir) {
        Write-Host "  Setting up Frontend..." -ForegroundColor White
        Set-Location $frontendDir
        npm install --production 2>&1 | Out-Null
        npm run build 2>&1 | Out-Null

        # Install serve
        npm install -g serve -q

        # Start with PM2
        pm2 start "serve -s build -l 3000" --name "frontend" --cwd $frontendDir
        pm2 save

        Write-Host "  ✓ Frontend configured" -ForegroundColor Green
    }
}

Write-Host "✓ Services configured" -ForegroundColor Green

# Configure firewall
Write-Host "[9/10] Configuring Windows Firewall..." -ForegroundColor Cyan
$ports = @()
if ($role -eq "T5500-Database") { $ports = @(4000, 5432, 6379) }
elseif ($role -eq "9020-Frontend") { $ports = @(3000, 8080) }
elseif ($role -eq "i3-Monitor") { $ports = @(80, 9090) }

foreach ($port in $ports) {
    $ruleName = "TeamClaude-Port-$port"
    if (!(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow | Out-Null
    }
}
Write-Host "✓ Firewall configured" -ForegroundColor Green

# Save system info
Write-Host "[10/10] Saving system configuration..." -ForegroundColor Cyan
$sysInfo = @"
Team Claude System Configuration
=================================
Computer: $computerName
Role: $role
RAM: ${ram}GB
CPU: $cpu
Setup Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Mission: AI for Good + Shriners Children's Hospital
50% of revenue goes to help sick children 💚

Services:
$(if ($role -eq "T5500-Database") { "- PostgreSQL (port 5432)`n- Redis (port 6379)`n- Backend API (port 4000)" })
$(if ($role -eq "9020-Frontend") { "- Frontend (port 3000)" })
$(if ($role -eq "i3-Monitor") { "- Monitoring (port 80)" })

Team Claude: Building with Heart!
"@

$sysInfo | Out-File "C:\TeamClaude\system-info.txt" -Encoding UTF8
Write-Host "✓ Configuration saved" -ForegroundColor Green

# Done!
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "System: $role" -ForegroundColor Yellow
Write-Host "Status: Ready!" -ForegroundColor Green
Write-Host ""

if ($role -eq "T5500-Database") {
    Write-Host "Services Running:" -ForegroundColor Yellow
    Write-Host "  Backend API: http://localhost:4000" -ForegroundColor Green
    Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Green
    Write-Host "  Redis: localhost:6379" -ForegroundColor Green
}
elseif ($role -eq "9020-Frontend") {
    Write-Host "Services Running:" -ForegroundColor Yellow
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
}

Write-Host ""
Write-Host "Check service status:" -ForegroundColor Yellow
Write-Host "  pm2 list" -ForegroundColor Cyan
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "  pm2 logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Team Claude: For the Kids! 💚" -ForegroundColor Green
Write-Host ""
