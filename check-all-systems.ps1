# ═══════════════════════════════════════════════════════════════════════════
# Check Status of All Team Claude Systems
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Team Claude System Status Check" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# System list - Update IPs as needed
$systems = @(
    @{Name="T5500-Backend"; IP="192.168.1.10"; Port=4000; Role="Backend API"},
    @{Name="EVGA-AI"; IP="192.168.1.11"; Port=5000; Role="AI Hub"},
    @{Name="ASUS-Database"; IP="192.168.1.12"; Port=5432; Role="Database"},
    @{Name="OptiPlex-Frontend"; IP="192.168.1.13"; Port=3000; Role="Frontend"},
    @{Name="OptiPlex-Monitor"; IP="192.168.1.14"; Port=80; Role="Monitor"}
)

$onlineCount = 0
$offlineCount = 0

foreach ($system in $systems) {
    Write-Host "[$($system.Name)]" -NoNewline -ForegroundColor Yellow
    Write-Host " $($system.Role) - " -NoNewline -ForegroundColor Gray
    Write-Host "$($system.IP):$($system.Port) " -NoNewline -ForegroundColor Gray

    if (Test-Connection -ComputerName $system.IP -Count 1 -Quiet) {
        Write-Host "✓ ONLINE" -ForegroundColor Green
        $onlineCount++
    } else {
        Write-Host "✗ OFFLINE" -ForegroundColor Red
        $offlineCount++
    }
}

Write-Host ""
Write-Host "Summary: $onlineCount online / $offlineCount offline" -ForegroundColor $(if ($offlineCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
