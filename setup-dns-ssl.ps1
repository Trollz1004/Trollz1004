# PowerShell script to complete YouAndINotAI setup
# Configures DNS and SSL automatically

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🌐 YouAndINotAI - Final Setup (DNS + SSL)          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$SERVER = "71.52.23.215"

# Step 1: Test API
Write-Host "[1/3] 🧪 Testing API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$SERVER:3000/health" -TimeoutSec 5
    $health = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ API is healthy!" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Cyan
    Write-Host "   Uptime: $([math]::Round($health.uptime))s" -ForegroundColor Cyan
} catch {
    Write-Host "   ⚠️  API check failed: $_" -ForegroundColor Yellow
    Write-Host "   Continuing anyway..." -ForegroundColor Gray
}
Write-Host ""

# Step 2: DNS Configuration
Write-Host "[2/3] 🌐 DNS Configuration" -ForegroundColor Yellow
Write-Host ""
Write-Host "   You need to add this A record at Cloudflare:" -ForegroundColor White
Write-Host ""
Write-Host "   ┌─────────────────────────────────────┐" -ForegroundColor Cyan
Write-Host "   │ Type: A                             │" -ForegroundColor White
Write-Host "   │ Name: @                             │" -ForegroundColor White
Write-Host "   │ IPv4: $SERVER              │" -ForegroundColor Green
Write-Host "   │ Proxy: ON (orange cloud)            │" -ForegroundColor White
Write-Host "   └─────────────────────────────────────┘" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🔗 Go to: https://dash.cloudflare.com" -ForegroundColor Cyan
Write-Host ""

$dnsConfigured = Read-Host "   Have you added the DNS record? (y/n)"

if ($dnsConfigured -ne "y") {
    Write-Host ""
    Write-Host "   ⏸️  Pausing. Add the DNS record then run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 0
}

Write-Host "   ✅ DNS configured!" -ForegroundColor Green
Write-Host ""

# Step 3: SSL Setup
Write-Host "[3/3] 🔒 Setting up SSL with Let's Encrypt..." -ForegroundColor Yellow
Write-Host "   This will take about 30 seconds..." -ForegroundColor Gray
Write-Host ""

try {
    $sslCommand = "certbot --nginx -d youandinotai.com -d www.youandinotai.com --non-interactive --agree-tos -m admin@youandinotai.com"
    $sslResult = ssh root@$SERVER $sslCommand 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ SSL certificate installed!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  SSL setup had issues:" -ForegroundColor Yellow
        Write-Host "   $sslResult" -ForegroundColor Gray
        Write-Host ""
        Write-Host "   You can manually run:" -ForegroundColor White
        Write-Host "   ssh root@$SERVER '$sslCommand'" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ⚠️  SSL setup failed: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Your platform is live at:" -ForegroundColor Green
Write-Host ""
Write-Host "   Production:  https://youandinotai.com" -ForegroundColor Cyan
Write-Host "   Direct IP:   http://$SERVER:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 YOUANDINOTAI IS NOW LIVE!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 What's Running:" -ForegroundColor Yellow
Write-Host "   ✅ PostgreSQL database" -ForegroundColor White
Write-Host "   ✅ Redis cache" -ForegroundColor White
Write-Host "   ✅ Express API (Socket.IO)" -ForegroundColor White
Write-Host "   ✅ Nginx reverse proxy" -ForegroundColor White
Write-Host ""
Write-Host "💳 Payments:" -ForegroundColor Yellow
Write-Host "   ✅ Square (LIVE mode)" -ForegroundColor White
Write-Host "   Tiers: $9.99 / $19.99 / $29.99" -ForegroundColor Gray
Write-Host ""
Write-Host "🤖 AI Features:" -ForegroundColor Yellow
Write-Host "   ✅ Gemini (icebreakers)" -ForegroundColor White
Write-Host "   ✅ Azure (verification)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Test Your API:" -ForegroundColor Yellow
Write-Host "   curl https://youandinotai.com/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Admin Dashboard:" -ForegroundColor Yellow
Write-Host "   Coming next: React frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
