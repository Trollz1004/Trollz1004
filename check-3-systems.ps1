# Check status of 3-system deployment

Write-Host "Team Claude 3-System Status Check" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Load deployment info
if (Test-Path "C:\TeamClaude\deployment-3systems.txt") {
    $info = Get-Content "C:\TeamClaude\deployment-3systems.txt" -Raw

    # Extract IPs using regex
    if ($info -match "T5500 Backend: ([\d.]+)") { $ip1 = $matches[1] } else { $ip1 = "192.168.1.?" }
    if ($info -match "i3 Monitor: ([\d.]+)") { $ip2 = $matches[1] } else { $ip2 = "192.168.1.?" }
    if ($info -match "9020 Frontend: ([\d.]+)") { $ip3 = $matches[1] } else { $ip3 = "192.168.1.?" }
} else {
    Write-Host "⚠ Deployment info not found. Please enter IPs:" -ForegroundColor Yellow
    $ip1 = Read-Host "T5500 IP"
    $ip2 = Read-Host "i3 IP"
    $ip3 = Read-Host "9020 IP"
}

$systems = @(
    @{Name="T5500-Backend"; IP=$ip1; Port=4000},
    @{Name="i3-Monitor"; IP=$ip2; Port=80},
    @{Name="9020-Frontend"; IP=$ip3; Port=3000}
)

foreach ($sys in $systems) {
    Write-Host "[$($sys.Name)]" -NoNewline -ForegroundColor Yellow
    Write-Host " $($sys.IP):$($sys.Port) " -NoNewline -ForegroundColor Gray

    if (Test-Connection -ComputerName $sys.IP -Count 1 -Quiet) {
        Write-Host "✓ ONLINE" -ForegroundColor Green
    } else {
        Write-Host "✗ OFFLINE" -ForegroundColor Red
    }
}

Write-Host ""
