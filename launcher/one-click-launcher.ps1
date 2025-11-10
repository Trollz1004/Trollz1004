# Team Claude For The Kids - 1-Click Fund Generator Launcher
# Automated startup for all revenue streams

$ErrorActionPreference = "Stop"
$REPO_ROOT = "c:\Users\T5500PRECISION\trollz1004"

Write-Host "🚀 Team Claude For The Kids - Fund Generator Starting..." -ForegroundColor Cyan
Write-Host "💰 Automated Revenue Streams Initializing..." -ForegroundColor Green

# Start Docker services
Write-Host "`n📦 Starting Docker services..." -ForegroundColor Yellow
Set-Location $REPO_ROOT
docker-compose up -d

# Start Backend API
Write-Host "`n🔧 Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$REPO_ROOT\date-app-dashboard\backend'; npm run start"

# Start Frontend
Write-Host "`n🎨 Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$REPO_ROOT\date-app-dashboard\frontend'; npm run dev"

# Start Admin Dashboard
Write-Host "`n📊 Starting Admin Dashboard..." -ForegroundColor Yellow
if (Test-Path "$REPO_ROOT\admin-dashboard") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$REPO_ROOT\admin-dashboard'; npm run dev"
}

# Open browser tabs
Start-Sleep -Seconds 5
Write-Host "`n🌐 Opening platforms..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"
Start-Process "http://localhost:5173"
Start-Process "https://youandinotai.com"

Write-Host "`n✅ All systems operational!" -ForegroundColor Green
Write-Host "💝 50% of profits → Shriners Children's Hospitals" -ForegroundColor Magenta
Write-Host "`nPress any key to view status dashboard..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Start-Process "https://squareup.com/dashboard"
