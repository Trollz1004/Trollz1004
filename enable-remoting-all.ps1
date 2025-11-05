# ═══════════════════════════════════════════════════════════════════════════
# Enable PowerShell Remoting on Current PC
# Run this script on EACH PC (one at a time)
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Enable PowerShell Remoting" -ForegroundColor Green
Write-Host "  Run this on EACH PC" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/5] Enabling PowerShell Remoting..." -ForegroundColor Cyan
try {
    Enable-PSRemoting -Force -SkipNetworkProfileCheck | Out-Null
    Write-Host "✓ PowerShell Remoting enabled" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "[2/5] Configuring Trusted Hosts..." -ForegroundColor Cyan
try {
    Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
    Write-Host "✓ Trusted hosts configured" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "[3/5] Restarting WinRM service..." -ForegroundColor Cyan
try {
    Restart-Service WinRM -Force
    Write-Host "✓ WinRM restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "[4/5] Configuring Windows Firewall..." -ForegroundColor Cyan
try {
    Enable-NetFirewallRule -DisplayGroup "Windows Remote Management" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayName "Windows Remote Management (HTTP-In)" -ErrorAction SilentlyContinue
    Write-Host "✓ Firewall configured" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "[5/5] Testing remoting..." -ForegroundColor Cyan
try {
    $test = Test-WSMan -ErrorAction Stop
    Write-Host "✓ Remoting is working!" -ForegroundColor Green
} catch {
    Write-Host "✗ Remoting test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✓ Setup Complete on This PC!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Info:" -ForegroundColor Yellow
Write-Host "  Computer Name: $env:COMPUTERNAME" -ForegroundColor White
Write-Host "  IP Address: $(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1 -ExpandProperty IPAddress)" -ForegroundColor White
Write-Host ""
Write-Host "Next: Run this script on the other 4 PCs" -ForegroundColor Yellow
Write-Host ""
