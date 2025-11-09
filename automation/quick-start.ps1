<![CDATA[# ═══════════════════════════════════════════════════════════════════════════════
# ⚡ TEAM CLAUDE FOR THE KIDS - QUICK START
# ═══════════════════════════════════════════════════════════════════════════════
#
# One-command setup for local development
# Run: .\automation\quick-start.ps1
#
# ═══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "⚡ TEAM CLAUDE FOR THE KIDS - QUICK START" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check for Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not installed. Please install Node.js 20+ first." -ForegroundColor Red
    Write-Host "   Download: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

# Frontend
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location "date-app-dashboard\frontend"
npm install
Pop-Location

# Backend
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Push-Location "date-app-dashboard\backend"
npm install
Pop-Location

Write-Host ""
Write-Host "✅ Dependencies installed!" -ForegroundColor Green
Write-Host ""

# Setup environment files
Write-Host "🔧 Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path "date-app-dashboard\backend\.env")) {
    Write-Host "Creating backend .env..." -ForegroundColor Cyan
    Copy-Item "date-app-dashboard\backend\.env.example" "date-app-dashboard\backend\.env"
    Write-Host "⚠️  Remember to update date-app-dashboard\backend\.env with your credentials!" -ForegroundColor Yellow
}

if (-not (Test-Path "date-app-dashboard\frontend\.env")) {
    Write-Host "Creating frontend .env..." -ForegroundColor Cyan
    @"
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Team Claude Dating
"@ | Out-File -FilePath "date-app-dashboard\frontend\.env" -Encoding UTF8
}

Write-Host ""
Write-Host "✅ Environment files ready!" -ForegroundColor Green
Write-Host ""

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
Write-Host ""

$backendJob = Start-Job -ScriptBlock {
    Set-Location "date-app-dashboard\backend"
    npm run dev
}

$frontendJob = Start-Job -ScriptBlock {
    Set-Location "date-app-dashboard\frontend"
    npm run dev
}

Write-Host "⏳ Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "🎉 TEAM CLAUDE FOR THE KIDS IS RUNNING!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access your platform:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:   http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Backend Job ID:  $($backendJob.Id)" -ForegroundColor Gray
Write-Host "  Frontend Job ID: $($frontendJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To stop services:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Stop-Job $($backendJob.Id),$($frontendJob.Id)" -ForegroundColor White
Write-Host "  Remove-Job $($backendJob.Id),$($frontendJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "💜 Happy coding! Team Claude For The Kids!" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green

# Open browser
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"

# Keep script running
Write-Host ""
Write-Host "Press Ctrl+C to stop all services..." -ForegroundColor Gray
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Job $backendJob,$frontendJob
    Remove-Job $backendJob,$frontendJob
    Write-Host "✅ Services stopped" -ForegroundColor Green
}