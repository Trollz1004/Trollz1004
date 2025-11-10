# Team Claude - 1-Click Launcher with AI Engine

$ErrorActionPreference = "Stop"
$REPO_ROOT = "c:\Users\T5500PRECISION\trollz1004"

Write-Host "🚀 Team Claude Fund Generator + AI Engine Starting..." -ForegroundColor Cyan

# Start Docker services
Write-Host "`n📦 Starting all Docker services..." -ForegroundColor Yellow
Set-Location $REPO_ROOT
docker-compose up -d

# Start AI Content Engine
Write-Host "`n🤖 Starting 24/7 AI Content Engine..." -ForegroundColor Yellow
Set-Location "$REPO_ROOT\automation"
docker-compose -f docker-compose-ai.yml up -d

# Start Backend
Write-Host "`n🔧 Starting Backend API..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$REPO_ROOT\date-app-dashboard\backend'; npm run start"

# Start Frontend
Write-Host "`n🎨 Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$REPO_ROOT\date-app-dashboard\frontend'; npm run dev"

# Open platforms
Start-Sleep -Seconds 5
Write-Host "`n🌐 Opening platforms..." -ForegroundColor Yellow
Start-Process "http://localhost:3000"
Start-Process "http://localhost:5173"
Start-Process "https://youandinotai.com"
Start-Process "https://squareup.com/dashboard"

Write-Host "`n✅ All systems operational!" -ForegroundColor Green
Write-Host "🤖 AI Engine running 24/7 - Auto-posting & responding" -ForegroundColor Magenta
Write-Host "💝 50% profits → Shriners Children's Hospitals" -ForegroundColor Magenta
Write-Host "`nAI Automation Active:" -ForegroundColor Cyan
Write-Host "  • Twitter: Every 2 hours" -ForegroundColor White
Write-Host "  • Facebook: Every 3 hours" -ForegroundColor White
Write-Host "  • Instagram: Every 4 hours" -ForegroundColor White
Write-Host "  • LinkedIn: Every 6 hours" -ForegroundColor White
Write-Host "  • Comments: Every 15 minutes" -ForegroundColor White
Write-Host "  • Campaigns: Weekly" -ForegroundColor White
