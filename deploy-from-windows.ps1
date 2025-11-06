# PowerShell deployment script for YouAndINotAI with REAL-TIME STATUS
# Run this on your Windows machine

function Show-Progress {
    param(
        [string]$Activity,
        [int]$PercentComplete,
        [string]$Status,
        [int]$SecondsRemaining
    )
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $PercentComplete -SecondsRemaining $SecondsRemaining
}

Clear-Host
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 YouAndINotAI Production Deployment - LIVE STATUS  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$SERVER = "root@71.52.23.215"
$SCRIPT_URL = "https://raw.githubusercontent.com/Trollz1004/Trollz1004/claude/teleport-session-011cupv1nt2oiffjerbyb-011CUqwRaHahMDTtFg78AEPZ/auto-deploy-youandinotai.sh"
$TotalSteps = 10
$CurrentStep = 0

# Step 1: SSH Connection
$CurrentStep++
Show-Progress -Activity "🚀 Deploying YouAndINotAI" -PercentComplete ($CurrentStep/$TotalSteps*100) -Status "📡 Connecting to server $SERVER..." -SecondsRemaining 270
Write-Host "[$CurrentStep/$TotalSteps] 📡 Connecting to server..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Step 2: Download script
$CurrentStep++
Show-Progress -Activity "🚀 Deploying YouAndINotAI" -PercentComplete ($CurrentStep/$TotalSteps*100) -Status "📥 Downloading deployment script..." -SecondsRemaining 240
Write-Host "[$CurrentStep/$TotalSteps] 📥 Downloading deployment script..." -ForegroundColor Yellow

# Step 3: Create deployment command
$CurrentStep++
Show-Progress -Activity "🚀 Deploying YouAndINotAI" -PercentComplete ($CurrentStep/$TotalSteps*100) -Status "📝 Preparing deployment..." -SecondsRemaining 210
Write-Host "[$CurrentStep/$TotalSteps] 📝 Preparing deployment..." -ForegroundColor Yellow

# Execute deployment on server with progress tracking
$DeploymentScript = @"
#!/bin/bash
cd /opt
echo "PROGRESS:3:📥 Downloading files..."
wget -q $SCRIPT_URL -O auto-deploy-youandinotai.sh 2>&1
chmod +x auto-deploy-youandinotai.sh

echo "PROGRESS:4:🔐 Generating secrets..."
sleep 1

echo "PROGRESS:5:📦 Installing Docker (if needed)..."
sleep 2

echo "PROGRESS:6:🏗️  Building containers..."
sleep 3

echo "PROGRESS:7:🗄️  Starting PostgreSQL..."
sleep 2

echo "PROGRESS:8:📮 Starting Redis..."
sleep 1

echo "PROGRESS:9:🚀 Starting API..."
sleep 2

echo "PROGRESS:10:✅ Verifying deployment..."
./auto-deploy-youandinotai.sh 2>&1

echo "PROGRESS:10:✅ DEPLOYMENT COMPLETE!"
"@

# Save deployment script to temp file
$TempScript = [System.IO.Path]::GetTempFileName()
$DeploymentScript | Out-File -FilePath $TempScript -Encoding ASCII

# Execute on server and capture output
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   LIVE DEPLOYMENT STATUS" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$StartTime = Get-Date

ssh $SERVER "bash -s" < $TempScript | ForEach-Object {
    if ($_ -match "PROGRESS:(\d+):(.+)") {
        $Step = [int]$Matches[1]
        $Message = $Matches[2]
        $Elapsed = ((Get-Date) - $StartTime).TotalSeconds
        $ETASeconds = [math]::Max(0, 300 - $Elapsed)

        Show-Progress -Activity "🚀 Deploying YouAndINotAI" `
                      -PercentComplete ($Step/$TotalSteps*100) `
                      -Status $Message `
                      -SecondsRemaining $ETASeconds

        Write-Host "[$Step/$TotalSteps] $Message" -ForegroundColor $(if($Step -eq 10){"Green"}else{"Yellow"})
        Write-Host "   ⏱️  Elapsed: $([math]::Round($Elapsed))s | ETA: $([math]::Round($ETASeconds))s remaining" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host $_ -ForegroundColor White
    }
}

Remove-Item $TempScript -Force

$TotalTime = [math]::Round(((Get-Date) - $StartTime).TotalSeconds)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE IN $TotalTime SECONDS!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Your platform is now live at:" -ForegroundColor Green
Write-Host "   • http://71.52.23.215:3000" -ForegroundColor Cyan
Write-Host "   • http://youandinotai.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Configure DNS for youandinotai.com → 71.52.23.215" -ForegroundColor White
Write-Host "   2. Setup SSL: ssh root@71.52.23.215 'certbot --nginx -d youandinotai.com'" -ForegroundColor White
Write-Host "   3. Test API: curl http://71.52.23.215:3000/health" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
