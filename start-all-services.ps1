# ============================================
# Start All Services - Windows
# Run this on each PC to start services
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("backend", "frontend", "monitor")]
    [string]$Role = "auto"
)

Write-Host "=== STARTING SERVICES ===" -ForegroundColor Cyan

# Auto-detect role if not specified
if ($Role -eq "auto") {
    $totalRAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum).sum / 1gb, 2)
    if ($totalRAM -gt 64) {
        $Role = "backend"
    } elseif ($totalRAM -gt 15) {
        $Role = "frontend"
    } else {
        $Role = "monitor"
    }
}

Write-Host "Role: $Role" -ForegroundColor Yellow
Write-Host ""

switch ($Role) {
    "backend" {
        Write-Host "Starting Backend Services..." -ForegroundColor Cyan

        # Start PostgreSQL
        Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
        Start-Service postgresql-x64-15

        # Start Redis
        Write-Host "Starting Redis..." -ForegroundColor Yellow
        Start-Service Memurai

        # Start CloudeDroid
        Write-Host "Starting CloudeDroid on port 3456..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\TeamClaude\Trollz1004\cloudedroid-production; node server.js"

        Start-Sleep -Seconds 3

        # Start YouAndINotAI Backend
        Write-Host "Starting YouAndINotAI Backend on port 4000..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\TeamClaude\Trollz1004\date-app-dashboard\backend; npm start"

        Write-Host ""
        Write-Host "✅ Backend services started!" -ForegroundColor Green
        Write-Host "   CloudeDroid:  http://localhost:3456"
        Write-Host "   Backend API:  http://localhost:4000"
    }

    "frontend" {
        Write-Host "Starting Frontend Services..." -ForegroundColor Cyan

        # Start Frontend
        Write-Host "Starting Frontend on port 3000..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\TeamClaude\Trollz1004\date-app-dashboard\frontend; npm run dev"

        Start-Sleep -Seconds 3

        # Start Dashboard
        Write-Host "Starting Dashboard on port 8080..." -ForegroundColor Yellow
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\TeamClaude\Trollz1004\dashboard-youandinotai-online; npm start"

        Write-Host ""
        Write-Host "✅ Frontend services started!" -ForegroundColor Green
        Write-Host "   Frontend:   http://localhost:3000"
        Write-Host "   Dashboard:  http://localhost:8080"
    }

    "monitor" {
        Write-Host "Opening monitoring tools..." -ForegroundColor Cyan

        # Open VS Code
        code C:\TeamClaude\Trollz1004

        Write-Host ""
        Write-Host "✅ Monitoring station ready!" -ForegroundColor Green
    }
}
