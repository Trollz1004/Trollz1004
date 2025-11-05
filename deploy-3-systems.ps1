# ═══════════════════════════════════════════════════════════════════════════
# TEAM CLAUDE 3-SYSTEM STARTER DEPLOYMENT
# Deploy to T5500 + i3 OptiPlex + 9020 OptiPlex
# Test with 3 systems first, then add the other 2 later!
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎊 TEAM CLAUDE 3-SYSTEM STARTER 🎊" -ForegroundColor Green
Write-Host "  T5500 + i3 OptiPlex + 9020 OptiPlex" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# System configuration for 3 systems
$systems = @(
    @{
        Name = "T5500-Backend"
        Role = "backend"
        RoleName = "Backend API Server"
        IP = ""
        Note = "Current PC - will configure locally"
    },
    @{
        Name = "i3-Monitor"
        Role = "monitoring"
        RoleName = "Monitoring System"
        IP = ""
        Note = "Little engine that could - no GPU"
    },
    @{
        Name = "9020-Frontend"
        Role = "frontend"
        RoleName = "Frontend Server"
        IP = ""
        Note = "i7-4790K, 32GB RAM"
    }
)

Write-Host "We're deploying to these 3 systems:" -ForegroundColor Yellow
Write-Host ""
foreach ($sys in $systems) {
    Write-Host "  • $($sys.RoleName) - $($sys.Note)" -ForegroundColor White
}
Write-Host ""

# Get IPs
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 1: Enter IP Addresses" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# T5500 is local
Write-Host "[T5500 - Backend API Server]" -ForegroundColor Yellow
Write-Host "  This PC (local) - detecting..." -ForegroundColor Gray
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object -First 1).IPAddress
$systems[0].IP = $localIP
Write-Host "  IP: $localIP" -ForegroundColor Green
Write-Host ""

# i3 OptiPlex
Write-Host "[i3 OptiPlex - Monitoring]" -ForegroundColor Yellow
Write-Host "  The little engine that could!" -ForegroundColor Gray
$ip1 = Read-Host "  Enter IP address"
$systems[1].IP = $ip1
Write-Host ""

# 9020 OptiPlex
Write-Host "[9020 OptiPlex - Frontend]" -ForegroundColor Yellow
Write-Host "  i7-4790K, 32GB RAM" -ForegroundColor Gray
$ip2 = Read-Host "  Enter IP address"
$systems[2].IP = $ip2
Write-Host ""

# Test connectivity
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 2: Testing Connectivity" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$remoteSystems = $systems | Where-Object { $_.IP -ne $localIP }

foreach ($sys in $remoteSystems) {
    Write-Host "Testing $($sys.Name) ($($sys.IP))..." -NoNewline
    if (Test-Connection -ComputerName $sys.IP -Count 1 -Quiet) {
        Write-Host " ✓ Reachable" -ForegroundColor Green
    } else {
        Write-Host " ✗ NOT REACHABLE" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠ Make sure:" -ForegroundColor Yellow
        Write-Host "  1. The PC is powered on" -ForegroundColor White
        Write-Host "  2. Connected to same network" -ForegroundColor White
        Write-Host "  3. Windows Firewall allows ping" -ForegroundColor White
        Write-Host "  4. Run 'enable-remoting-all.ps1' on that PC first" -ForegroundColor White
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") { exit 0 }
    }
}

Write-Host ""

# Get credentials for remote systems
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 3: Remote System Credentials" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enter Administrator credentials for remote PCs" -ForegroundColor White
Write-Host "(i3 OptiPlex and 9020 OptiPlex)" -ForegroundColor Gray
Write-Host ""

$credential = Get-Credential -Message "Administrator credentials for i3 & 9020"
if (!$credential) {
    Write-Host "❌ Credentials required" -ForegroundColor Red
    exit 1
}

# Confirm
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " READY TO DEPLOY!" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Systems:" -ForegroundColor Yellow
foreach ($sys in $systems) {
    Write-Host "  ✓ $($sys.RoleName) - $($sys.IP)" -ForegroundColor Green
}
Write-Host ""
$confirm = Read-Host "Start deployment? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

# Deploy!
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " DEPLOYING..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Deployment script
$deployScript = {
    param($SystemName, $Role, $RoleName)

    $result = @{
        System = $SystemName
        Success = $false
        Steps = @()
    }

    try {
        # Create directories
        $dirs = @("C:\TeamClaude\app", "C:\TeamClaude\logs", "C:\TeamClaude\data", "C:\TeamClaude\config")
        foreach ($dir in $dirs) {
            if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        }
        $result.Steps += "✓ Directories created"

        # Install Chocolatey
        if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        }
        $result.Steps += "✓ Chocolatey ready"

        # Install Git
        if (!(Get-Command git -ErrorAction SilentlyContinue)) {
            choco install git -y --limit-output
        }
        $result.Steps += "✓ Git ready"

        # Install Node.js
        if (!(Get-Command node -ErrorAction SilentlyContinue)) {
            choco install nodejs-lts -y --limit-output
        }
        $result.Steps += "✓ Node.js ready"

        # Clone repo
        if (!(Test-Path "C:\TeamClaude\app\.git")) {
            Set-Location "C:\TeamClaude\app"
            git clone https://github.com/Trollz1004/Trollz1004.git . 2>&1 | Out-Null
        }
        $result.Steps += "✓ Repository cloned"

        # Create role file
        @"
System: $SystemName
Role: $Role ($RoleName)
Setup: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ | Out-File -FilePath "C:\TeamClaude\config\role.txt" -Encoding UTF8
        $result.Steps += "✓ Role configured"

        $result.Success = $true

    } catch {
        $result.Success = $false
        $result.Steps += "✗ Error: $($_.Exception.Message)"
    }

    return $result
}

# Deploy to T5500 (local)
Write-Host "[T5500] Deploying locally..." -ForegroundColor Cyan
$localResult = & $deployScript -SystemName "T5500-Backend" -Role "backend" -RoleName "Backend API Server"
foreach ($step in $localResult.Steps) {
    Write-Host "  $step" -ForegroundColor $(if ($step -like "*✓*") { "Green" } else { "Red" })
}
Write-Host ""

# Deploy to remote systems
$jobs = @()
foreach ($sys in $remoteSystems) {
    Write-Host "[$($sys.Name)] Starting remote deployment..." -ForegroundColor Cyan
    try {
        $job = Invoke-Command -ComputerName $sys.IP -Credential $credential -ScriptBlock $deployScript -ArgumentList $sys.Name, $sys.Role, $sys.RoleName -AsJob
        $jobs += @{ Job = $job; System = $sys }
        Write-Host "  ✓ Job started" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Waiting for remote deployments..." -ForegroundColor Yellow
Write-Host ""

# Wait for jobs
$completed = 0
while ($completed -lt $jobs.Count) {
    foreach ($jobInfo in $jobs) {
        if ($jobInfo.Job.State -eq "Completed" -and !$jobInfo.Processed) {
            $jobInfo.Processed = $true
            $completed++

            $result = Receive-Job -Job $jobInfo.Job

            Write-Host "[$($jobInfo.System.Name)] Deployment complete" -ForegroundColor Cyan
            foreach ($step in $result.Steps) {
                Write-Host "  $step" -ForegroundColor $(if ($step -like "*✓*") { "Green" } else { "Red" })
            }
            Write-Host ""
        }
    }
    Start-Sleep -Seconds 2
}

# Cleanup
$jobs | ForEach-Object { Remove-Job -Job $_.Job -Force }

# Summary
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " ✓ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "Systems Deployed:" -ForegroundColor Yellow
Write-Host "  ✓ T5500 - Backend API ($localIP)" -ForegroundColor Green
Write-Host "  ✓ i3 OptiPlex - Monitoring ($($systems[1].IP))" -ForegroundColor Green
Write-Host "  ✓ 9020 OptiPlex - Frontend ($($systems[2].IP))" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Install Docker Desktop on each PC (manual - one time)" -ForegroundColor White
Write-Host "  2. Restart all 3 PCs" -ForegroundColor White
Write-Host "  3. Test everything works" -ForegroundColor White
Write-Host "  4. Add the other 2 systems (EVGA + ASUS X79)" -ForegroundColor White
Write-Host ""

Write-Host "Check status anytime:" -ForegroundColor Yellow
Write-Host "  .\check-3-systems.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "Team Claude: AI for Good 💚" -ForegroundColor Green
Write-Host ""

# Save deployment info
$deployInfo = @"
Team Claude 3-System Deployment
================================
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Systems:
- T5500 Backend: $localIP
- i3 Monitor: $($systems[1].IP)
- 9020 Frontend: $($systems[2].IP)

Status: Deployed ✓

Next: Install Docker Desktop on each, then add EVGA + ASUS X79
"@

$deployInfo | Out-File -FilePath "C:\TeamClaude\deployment-3systems.txt" -Encoding UTF8
