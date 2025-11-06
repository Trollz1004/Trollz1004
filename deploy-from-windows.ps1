# PowerShell deployment script for YouAndINotAI
# Run this on your Windows machine

Write-Host "🚀 YouAndINotAI Deployment from Windows" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

$SERVER = "root@71.52.23.215"
$SCRIPT_URL = "https://raw.githubusercontent.com/Trollz1004/Trollz1004/claude/teleport-session-011cupv1nt2oiffjerbyb-011CUqwRaHahMDTtFg78AEPZ/auto-deploy-youandinotai.sh"

Write-Host "📡 Connecting to server: $SERVER" -ForegroundColor Cyan

# SSH into server and run deployment
ssh $SERVER @"
cd /opt
echo '📥 Downloading deployment script...'
wget -q $SCRIPT_URL -O auto-deploy-youandinotai.sh
chmod +x auto-deploy-youandinotai.sh
echo '🚀 Running deployment...'
./auto-deploy-youandinotai.sh
"@

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
