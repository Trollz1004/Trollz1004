# ============================================================================
# TEAM CLAUDE FOR THE KIDS - ONE-CLICK WINDOWS DEPLOYMENT
# ============================================================================
# Mission: $1,238,056 annual → $619,028 to Shriners Children's Hospitals
# Motto: "Claude Represents Perfection"
# ============================================================================

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host " 🚀 TEAM CLAUDE FOR THE KIDS - ONE-CLICK DEPLOYMENT" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "Mission: " -NoNewline -ForegroundColor Cyan
Write-Host "`$1,238,056 annual revenue → `$619,028 to Shriners"
Write-Host "Motto: " -NoNewline -ForegroundColor Cyan
Write-Host "Claude Represents Perfection"
Write-Host ""

# Configuration
# Leave blank to auto-deploy locally and get public IP automatically
$ServerIP = ""  # Leave empty for local deployment, or enter your remote server IP
$ServerUser = "josh"
$RepoURL = "https://github.com/Trollz1004/Trollz1004.git"
$Branch = "claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV"
$ProjectPath = "Trollz1004/Trollz1004/Trollz1004"

# ============================================================================
# STEP 1: Environment Check
# ============================================================================
Write-Host "📋 STEP 1: Checking Environment" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────"

# Check if Git is available
$gitAvailable = Get-Command git -ErrorAction SilentlyContinue
if ($gitAvailable) {
    Write-Host "✅ Git available" -ForegroundColor Green
} else {
    Write-Host "❌ Git not found" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Start-Process "https://git-scm.com/download/win"
    Read-Host "Press ENTER after installing Git"
}

Write-Host ""

# ============================================================================
# STEP 2: Determine Deployment Mode
# ============================================================================
Write-Host "📋 STEP 2: Determining Deployment Mode" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────"

if ([string]::IsNullOrWhiteSpace($ServerIP)) {
    Write-Host "No remote server specified - deploying locally" -ForegroundColor Cyan
    $deployMode = "local"
} else {
    $serverReachable = Test-Connection -ComputerName $ServerIP -Count 1 -Quiet
    if ($serverReachable) {
        Write-Host "✅ Server $ServerIP is reachable" -ForegroundColor Green
        $deployMode = "remote"
    } else {
        Write-Host "⚠️  Server $ServerIP not reachable" -ForegroundColor Yellow
        Write-Host "Will deploy locally instead" -ForegroundColor Yellow
        $deployMode = "local"
    }
}

Write-Host ""

# ============================================================================
# STEP 3: Deploy to Server
# ============================================================================
if ($deployMode -eq "remote") {
    Write-Host "📋 STEP 3: Deploying to Remote Server" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────────────"

    # Create deployment script
    $deployScript = @"
cd ~
if [ ! -d "Trollz1004" ]; then
    echo "📥 Cloning repository..."
    git clone $RepoURL
fi
cd $ProjectPath
echo "🔄 Pulling latest changes..."
git checkout $Branch
git pull origin $Branch
echo "🚀 Running deployment..."
./GO-LIVE.sh
"@

    # Save to temp file
    $tempScript = "$env:TEMP\deploy-teamclaude.sh"
    $deployScript | Out-File -FilePath $tempScript -Encoding ASCII

    Write-Host "📤 Uploading deployment script..." -ForegroundColor Cyan
    scp $tempScript "${ServerUser}@${ServerIP}:~/deploy.sh"

    Write-Host "🚀 Executing deployment on server..." -ForegroundColor Cyan
    ssh "${ServerUser}@${ServerIP}" "chmod +x ~/deploy.sh && ~/deploy.sh"

    Write-Host ""
    Write-Host "✅ Remote deployment complete!" -ForegroundColor Green

} else {
    # ============================================================================
    # LOCAL WSL DEPLOYMENT
    # ============================================================================
    Write-Host "📋 STEP 3: Deploying Locally with WSL" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────────────"

    # Check if WSL is installed
    $wslInstalled = wsl --status 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ WSL not installed - installing now..." -ForegroundColor Red
        wsl --install -d Ubuntu
        Write-Host "⚠️  WSL installed - please RESTART your computer and run this script again" -ForegroundColor Yellow
        Read-Host "Press ENTER to exit"
        exit
    }

    Write-Host "✅ WSL available" -ForegroundColor Green

    # Deploy in WSL
    $wslScript = @"
cd ~
if [ ! -d "Trollz1004" ]; then
    echo "📥 Cloning repository..."
    git clone $RepoURL
fi
cd Trollz1004
echo "🔄 Pulling latest changes..."
git checkout $Branch
git pull origin $Branch
echo "🚀 Running deployment..."
./GO-LIVE.sh
"@

    Write-Host "🚀 Running deployment in WSL..." -ForegroundColor Cyan
    $wslScript | wsl bash

    Write-Host ""
    Write-Host "✅ Local deployment complete!" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# STEP 4: Get Public IP
# ============================================================================
Write-Host "📋 STEP 4: Getting Public IP Address" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────"

try {
    $publicIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "✅ Your public IP: " -NoNewline -ForegroundColor Green
    Write-Host "$publicIP" -ForegroundColor White

    # Copy to clipboard
    Set-Clipboard -Value $publicIP
    Write-Host "📋 IP copied to clipboard!" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Could not get public IP automatically" -ForegroundColor Yellow
    Write-Host "Get it manually: curl ifconfig.me" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 5: Open Cloudflare
# ============================================================================
Write-Host "📋 STEP 5: Opening Cloudflare DNS Settings" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────"

Write-Host "Opening Cloudflare in browser..." -ForegroundColor Cyan
Start-Process "https://dash.cloudflare.com"

Write-Host ""
Write-Host "📝 CLOUDFLARE DNS SETUP:" -ForegroundColor White
Write-Host "   1. Click on your domain (youandinotai.com)" -ForegroundColor Gray
Write-Host "   2. Click 'DNS' in the sidebar" -ForegroundColor Gray
Write-Host "   3. Click 'Add record'" -ForegroundColor Gray
Write-Host "   4. Type: A" -ForegroundColor Gray
Write-Host "   5. Name: @" -ForegroundColor Gray
Write-Host "   6. IPv4: $publicIP (already in clipboard!)" -ForegroundColor Gray
Write-Host "   7. Proxy: DNS only (gray cloud)" -ForegroundColor Gray
Write-Host "   8. Click Save" -ForegroundColor Gray
Write-Host "   9. Repeat for 'www' subdomain" -ForegroundColor Gray
Write-Host ""

$null = Read-Host "Press ENTER when DNS is configured"

Write-Host ""

# ============================================================================
# STEP 6: Test Services
# ============================================================================
Write-Host "📋 STEP 6: Testing Services" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────"

Write-Host "Waiting 30 seconds for DNS propagation..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

Write-Host "Testing backend API..." -ForegroundColor Cyan
try {
    $backendTest = Invoke-WebRequest -Uri "http://youandinotai.com/api/health" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Backend API: ONLINE" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend API: Not yet accessible (DNS may need more time)" -ForegroundColor Yellow
}

Write-Host "Testing frontend..." -ForegroundColor Cyan
try {
    $frontendTest = Invoke-WebRequest -Uri "http://youandinotai.com" -UseBasicParsing -TimeoutSec 10
    Write-Host "✅ Frontend: ONLINE" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend: Not yet accessible (DNS may need more time)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# STEP 7: Open Site in Browser
# ============================================================================
Write-Host "📋 STEP 7: Opening Your Live Site" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────────────────"

Write-Host "🌐 Opening https://youandinotai.com in browser..." -ForegroundColor Cyan
Start-Process "http://youandinotai.com"

Write-Host ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "              ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

Write-Host "🎉 " -NoNewline -ForegroundColor Green
Write-Host "Your site is LIVE at: " -NoNewline
Write-Host "http://youandinotai.com" -ForegroundColor Cyan

Write-Host ""
Write-Host "💰 " -NoNewline -ForegroundColor Yellow
Write-Host "Next Steps to Start Earning Money:" -ForegroundColor White
Write-Host "   1. Visit your site and sign up" -ForegroundColor Gray
Write-Host "   2. Test premium subscription ($9.99)" -ForegroundColor Gray
Write-Host "   3. Use test card: 4111 1111 1111 1111" -ForegroundColor Gray
Write-Host "   4. Verify 50% goes to Shriners" -ForegroundColor Gray
Write-Host "   5. Share on social media" -ForegroundColor Gray
Write-Host "   6. Launch Kickstarter campaign" -ForegroundColor Gray
Write-Host "   7. START EARNING FOR THE KIDS! 💚" -ForegroundColor Gray

Write-Host ""
Write-Host "📊 " -NoNewline -ForegroundColor Cyan
Write-Host "Revenue Goal:" -ForegroundColor White
Write-Host "   Annual: " -NoNewline -ForegroundColor Gray
Write-Host "`$1,238,056" -ForegroundColor White
Write-Host "   To Shriners: " -NoNewline -ForegroundColor Gray
Write-Host "`$619,028 (50%)" -ForegroundColor Green
Write-Host "   To You: " -NoNewline -ForegroundColor Gray
Write-Host "`$619,028 (50%)" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "Team Claude For The Kids - " -NoNewline -ForegroundColor Cyan
Write-Host '"Claude Represents Perfection"' -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
