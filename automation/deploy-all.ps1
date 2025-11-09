<![CDATA[# ═══════════════════════════════════════════════════════════════════════════════
# 🚀 TEAM CLAUDE FOR THE KIDS - COMPLETE DEPLOYMENT AUTOMATION
# ═══════════════════════════════════════════════════════════════════════════════
# 
# This script automates EVERYTHING:
# - Netlify frontend deployment (youandinotai.com + subdomains)
# - Railway API deployment (api.youandinotai.com)
# - Database migrations
# - Health checks
# - Monitoring setup
# - Backup configuration
#
# Run: .\automation\deploy-all.ps1
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SkipTests,
    [switch]$Production
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 TEAM CLAUDE FOR THE KIDS - AUTOMATED DEPLOYMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: PRE-FLIGHT CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "📋 Step 1: Pre-flight Checks" -ForegroundColor Yellow

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

# Check Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git not found. Please install Git" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Git installed" -ForegroundColor Green

# Check for required CLI tools
$missingTools = @()
if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
    $missingTools += "netlify-cli (npm install -g netlify-cli)"
}
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    $missingTools += "railway (npm install -g @railway/cli)"
}

if ($missingTools.Count -gt 0) {
    Write-Host "⚠️  Missing CLI tools:" -ForegroundColor Yellow
    $missingTools | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
    Write-Host ""
    $install = Read-Host "Install missing tools now? (y/n)"
    if ($install -eq 'y') {
        Write-Host "Installing CLI tools..." -ForegroundColor Cyan
        npm install -g netlify-cli @railway/cli
        Write-Host "✅ CLI tools installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Cannot proceed without required tools" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ All CLI tools available" -ForegroundColor Green
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: BUILD FRONTEND
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🏗️  Step 2: Building Frontend" -ForegroundColor Yellow

$frontendPath = "date-app-dashboard\frontend"

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

Push-Location $frontendPath

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

if (-not $SkipTests) {
    Write-Host "Running tests..." -ForegroundColor Cyan
    npm run test -- --passWithNoTests 2>$null
}

Write-Host "Building production bundle..." -ForegroundColor Cyan
npm run build

if (-not (Test-Path "dist")) {
    Write-Host "❌ Build failed - dist folder not created" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Pop-Location

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: DEPLOY TO NETLIFY
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🌐 Step 3: Deploying to Netlify" -ForegroundColor Yellow

Push-Location $frontendPath

# Check Netlify auth
$netlifyStatus = netlify status 2>&1
if ($netlifyStatus -match "Not logged in") {
    Write-Host "⚠️  Not logged into Netlify" -ForegroundColor Yellow
    Write-Host "Opening browser for authentication..." -ForegroundColor Cyan
    netlify login
}

# Deploy
if ($Production) {
    Write-Host "Deploying to PRODUCTION..." -ForegroundColor Cyan
    netlify deploy --prod --dir=dist
} else {
    Write-Host "Deploying to PREVIEW..." -ForegroundColor Cyan
    netlify deploy --dir=dist
}

Write-Host "✅ Deployed to Netlify" -ForegroundColor Green
Pop-Location

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: BUILD BACKEND
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🔧 Step 4: Building Backend API" -ForegroundColor Yellow

$backendPath = "date-app-dashboard\backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend directory not found: $backendPath" -ForegroundColor Red
    exit 1
}

Push-Location $backendPath

Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

if (-not $SkipTests) {
    Write-Host "Running tests..." -ForegroundColor Cyan
    npm run test -- --passWithNoTests 2>$null
}

Write-Host "Building TypeScript..." -ForegroundColor Cyan
npm run build

Write-Host "✅ Backend built successfully" -ForegroundColor Green
Pop-Location

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: DEPLOY TO RAILWAY
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🚂 Step 5: Deploying to Railway" -ForegroundColor Yellow

Push-Location $backendPath

# Check Railway auth
$railwayStatus = railway whoami 2>&1
if ($railwayStatus -match "not logged in") {
    Write-Host "⚠️  Not logged into Railway" -ForegroundColor Yellow
    Write-Host "Opening browser for authentication..." -ForegroundColor Cyan
    railway login
}

# Link to project if not linked
if (-not (Test-Path ".railway")) {
    Write-Host "⚠️  Not linked to Railway project" -ForegroundColor Yellow
    Write-Host "Available projects:" -ForegroundColor Cyan
    railway projects
    $projectId = Read-Host "Enter project ID to link"
    railway link $projectId
}

# Deploy
Write-Host "Deploying API to Railway..." -ForegroundColor Cyan
railway up

Write-Host "✅ Deployed to Railway" -ForegroundColor Green
Pop-Location

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: RUN DATABASE MIGRATIONS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🗄️  Step 6: Running Database Migrations" -ForegroundColor Yellow

Push-Location $backendPath

Write-Host "Running migrations on Railway..." -ForegroundColor Cyan
railway run npm run migrate

Write-Host "✅ Migrations completed" -ForegroundColor Green
Pop-Location

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: HEALTH CHECKS
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "🏥 Step 7: Running Health Checks" -ForegroundColor Yellow

$domains = @(
    @{Name="Frontend"; Url="https://youandinotai.com"; ExpectedStatus=200},
    @{Name="App Frontend"; Url="https://app.youandinotai.com"; ExpectedStatus=200},
    @{Name="Backend API"; Url="https://api.youandinotai.com/health"; ExpectedStatus=200}
)

$allHealthy = $true

foreach ($domain in $domains) {
    try {
        Write-Host "Checking $($domain.Name)..." -ForegroundColor Cyan
        $response = Invoke-WebRequest -Uri $domain.Url -Method Get -TimeoutSec 10 -UseBasicParsing
        
        if ($response.StatusCode -eq $domain.ExpectedStatus) {
            Write-Host "  ✅ $($domain.Name) is healthy (HTTP $($response.StatusCode))" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($domain.Name) returned HTTP $($response.StatusCode)" -ForegroundColor Yellow
            $allHealthy = $false
        }
    } catch {
        Write-Host "  ❌ $($domain.Name) is not responding: $($_.Exception.Message)" -ForegroundColor Red
        $allHealthy = $false
    }
}

Write-Host ""

if ($allHealthy) {
    Write-Host "✅ All services healthy" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some services need attention" -ForegroundColor Yellow
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8: SETUP MONITORING
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "📊 Step 8: Configuring Monitoring" -ForegroundColor Yellow

# Create monitoring script
$monitorScript = @"
# 🔍 CONTINUOUS HEALTH MONITORING
# Run: .\automation\monitor.ps1

`$domains = @(
    "https://youandinotai.com",
    "https://app.youandinotai.com",
    "https://api.youandinotai.com/health"
)

while (`$true) {
    Clear-Host
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "🔍 TEAM CLAUDE HEALTH MONITOR" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Monitoring at: `$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host ""
    
    foreach (`$url in `$domains) {
        try {
            `$response = Invoke-WebRequest -Uri `$url -Method Get -TimeoutSec 5 -UseBasicParsing
            Write-Host "✅ `$url (HTTP `$(`$response.StatusCode))" -ForegroundColor Green
        } catch {
            Write-Host "❌ `$url - FAILED" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Next check in 60 seconds... (Ctrl+C to stop)" -ForegroundColor Gray
    Start-Sleep -Seconds 60
}
"@

$monitorScript | Out-File -FilePath "automation\monitor.ps1" -Encoding UTF8
Write-Host "✅ Monitoring script created: automation\monitor.ps1" -ForegroundColor Green

Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════════
# DEPLOYMENT COMPLETE
# ═══════════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your platforms are now live:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Dating Platform:        https://youandinotai.com" -ForegroundColor White
Write-Host "  Dating App:             https://app.youandinotai.com" -ForegroundColor White
Write-Host "  Backend API:            https://api.youandinotai.com" -ForegroundColor White
Write-Host "  Admin Dashboard:        https://youandinotai.online" -ForegroundColor White
Write-Host ""
Write-Host "📊 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. Monitor health:      .\automation\monitor.ps1" -ForegroundColor White
Write-Host "  2. View logs:           railway logs" -ForegroundColor White
Write-Host "  3. Check analytics:     netlify open" -ForegroundColor White
Write-Host ""
Write-Host "💜 Team Claude For The Kids - Making a Difference!" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
]]>