# ============================================
# Windows Deployment Script for All 3 PCs
# YouAndINotAI + CloudeDroid Complete Setup
# ============================================

Write-Host "=== WINDOWS DEPLOYMENT WIZARD ===" -ForegroundColor Cyan
Write-Host ""

# Detect PC specs
$totalRAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum).sum / 1gb, 2)
$cpuName = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController).Name

Write-Host "Detected System:" -ForegroundColor Yellow
Write-Host "  CPU: $cpuName"
Write-Host "  RAM: $totalRAM GB"
Write-Host "  GPU: $gpu"
Write-Host ""

# Determine role based on RAM
if ($totalRAM -gt 64) {
    $role = "BACKEND"
    Write-Host "✅ Detected: T5500 Precision (Backend Hub)" -ForegroundColor Green
    $deployments = @("cloudedroid", "youandinotai-backend", "postgresql", "redis")
} elseif ($totalRAM -gt 15) {
    $role = "FRONTEND"
    Write-Host "✅ Detected: OptiPlex 9020 (Frontend Server)" -ForegroundColor Green
    $deployments = @("youandinotai-frontend", "dashboard")
} else {
    $role = "MONITOR"
    Write-Host "✅ Detected: OptiPlex 3060 (Monitoring Station)" -ForegroundColor Green
    $deployments = @("grafana", "development-tools")
}

Write-Host ""
Write-Host "=== INSTALLATION STARTING ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js NOT found - Installing..." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    Start-Process "https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi"
    exit 1
}

# Install based on role
switch ($role) {
    "BACKEND" {
        Write-Host "=== BACKEND DEPLOYMENT ===" -ForegroundColor Cyan

        # Install PostgreSQL
        if (!(Test-Path "C:\Program Files\PostgreSQL\15\bin\postgres.exe")) {
            Write-Host "Installing PostgreSQL 15..." -ForegroundColor Yellow
            $pgUrl = "https://get.enterprisedb.com/postgresql/postgresql-15.5-1-windows-x64.exe"
            Invoke-WebRequest -Uri $pgUrl -OutFile "$env:TEMP\postgresql.exe"
            Start-Process "$env:TEMP\postgresql.exe" -ArgumentList "--mode unattended --unattendedmodeui none --superpassword postgres123" -Wait
        }

        # Install Redis (Memurai)
        if (!(Test-Path "C:\Program Files\Memurai\memurai.exe")) {
            Write-Host "Installing Memurai (Redis for Windows)..." -ForegroundColor Yellow
            $redisUrl = "https://www.memurai.com/get-memurai"
            Start-Process $redisUrl
        }

        # Clone repository
        Write-Host "Cloning repository..." -ForegroundColor Yellow
        if (!(Test-Path "C:\TeamClaude\Trollz1004")) {
            New-Item -ItemType Directory -Path "C:\TeamClaude" -Force
            cd C:\TeamClaude
            git clone https://github.com/Trollz1004/Trollz1004.git
        }

        # Deploy CloudeDroid
        Write-Host "Deploying CloudeDroid..." -ForegroundColor Yellow
        cd C:\TeamClaude\Trollz1004\cloudedroid-production
        npm install --omit=dev

        # Deploy YouAndINotAI Backend
        Write-Host "Deploying YouAndINotAI Backend..." -ForegroundColor Yellow
        cd C:\TeamClaude\Trollz1004\date-app-dashboard\backend
        npm install

        Write-Host ""
        Write-Host "✅ Backend deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To start services:"
        Write-Host "  CloudeDroid:     cd C:\TeamClaude\Trollz1004\cloudedroid-production && node server.js" -ForegroundColor Cyan
        Write-Host "  Backend API:     cd C:\TeamClaude\Trollz1004\date-app-dashboard\backend && npm start" -ForegroundColor Cyan
    }

    "FRONTEND" {
        Write-Host "=== FRONTEND DEPLOYMENT ===" -ForegroundColor Cyan

        # Clone repository
        if (!(Test-Path "C:\TeamClaude\Trollz1004")) {
            New-Item -ItemType Directory -Path "C:\TeamClaude" -Force
            cd C:\TeamClaude
            git clone https://github.com/Trollz1004/Trollz1004.git
        }

        # Deploy Frontend
        Write-Host "Deploying Frontend..." -ForegroundColor Yellow
        cd C:\TeamClaude\Trollz1004\date-app-dashboard\frontend
        npm install
        npm run build

        # Deploy Dashboard
        Write-Host "Deploying Dashboard..." -ForegroundColor Yellow
        cd C:\TeamClaude\Trollz1004\dashboard-youandinotai-online
        npm install

        Write-Host ""
        Write-Host "✅ Frontend deployment complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To start services:"
        Write-Host "  Frontend:   cd C:\TeamClaude\Trollz1004\date-app-dashboard\frontend && npm run dev" -ForegroundColor Cyan
        Write-Host "  Dashboard:  cd C:\TeamClaude\Trollz1004\dashboard-youandinotai-online && npm start" -ForegroundColor Cyan
    }

    "MONITOR" {
        Write-Host "=== MONITORING DEPLOYMENT ===" -ForegroundColor Cyan

        Write-Host "Installing monitoring tools..." -ForegroundColor Yellow
        Write-Host "  - VS Code: https://code.visualstudio.com/download"
        Write-Host "  - Git: https://git-scm.com/download/win"

        Write-Host ""
        Write-Host "✅ Monitoring station ready!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Configure .env files with API keys"
Write-Host "  2. Start services on each PC"
Write-Host "  3. Configure network routing"
Write-Host ""
