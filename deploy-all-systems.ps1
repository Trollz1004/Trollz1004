# ═══════════════════════════════════════════════════════════════════════════
# TEAM CLAUDE MASTER DEPLOYMENT SCRIPT
# Deploy to ALL 5 Windows Systems Remotely from T5500
# Mission: AI for Good + Shriners Charity
# ═══════════════════════════════════════════════════════════════════════════

param(
    [switch]$AutoDetect,
    [string]$Password
)

$ErrorActionPreference = "Continue"

# Banner
Clear-Host
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🎊 TEAM CLAUDE / TROLLZ1004 EMPIRE 🎊" -ForegroundColor Green
Write-Host "  Remote Deployment to ALL 5 Systems" -ForegroundColor Green
Write-Host "  Mission: Generate Revenue → Help Children → AI for Good" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check Administrator
$currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell → 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# System configuration
$systems = @(
    @{
        Name = "T5500-Backend"
        Role = "backend"
        RoleName = "Backend API Server"
        IP = ""
        Ports = @(4000)
        Description = "Node.js backend, REST API, authentication"
    },
    @{
        Name = "EVGA-AI"
        Role = "ai"
        RoleName = "AI Automation Hub"
        IP = ""
        Ports = @(5000)
        Description = "Perplexity AI agents, automation services"
    },
    @{
        Name = "ASUS-Database"
        Role = "database"
        RoleName = "Database Master"
        IP = ""
        Ports = @(5432, 6379)
        Description = "PostgreSQL, Redis, data storage"
    },
    @{
        Name = "OptiPlex-Frontend"
        Role = "frontend"
        RoleName = "Frontend Server"
        IP = ""
        Ports = @(3000, 8080)
        Description = "React frontend, admin dashboard"
    },
    @{
        Name = "OptiPlex-Monitor"
        Role = "monitoring"
        RoleName = "Monitoring & Load Balancer"
        IP = ""
        Ports = @(80, 443, 9090)
        Description = "System monitoring, nginx load balancer"
    }
)

# Collect IP addresses
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 1: Enter IP Addresses for Each System" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if ($AutoDetect) {
    Write-Host "Auto-detecting systems on network..." -ForegroundColor Yellow
    # TODO: Implement auto-detection
} else {
    foreach ($system in $systems) {
        Write-Host "[$($system.RoleName)]" -ForegroundColor Yellow
        Write-Host "  Description: $($system.Description)" -ForegroundColor Gray
        $ip = Read-Host "  Enter IP address (e.g., 192.168.1.10)"
        $system.IP = $ip
        Write-Host ""
    }
}

# Get credentials
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 2: Enter Administrator Credentials" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Enter the Administrator username and password" -ForegroundColor White
Write-Host "(Use the same credentials for all systems if possible)" -ForegroundColor Gray
Write-Host ""

if ($Password) {
    $username = "Administrator"
    $securePassword = ConvertTo-SecureString $Password -AsPlainText -Force
} else {
    $credential = Get-Credential -Message "Enter Administrator credentials for remote systems"
    if (!$credential) {
        Write-Host "❌ Credentials required" -ForegroundColor Red
        exit 1
    }
}

# Test connectivity
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 3: Testing Connectivity" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$reachable = @()
$unreachable = @()

foreach ($system in $systems) {
    Write-Host "Testing $($system.Name) ($($system.IP))..." -NoNewline

    if (Test-Connection -ComputerName $system.IP -Count 1 -Quiet) {
        Write-Host " ✓" -ForegroundColor Green
        $reachable += $system
    } else {
        Write-Host " ✗" -ForegroundColor Red
        $unreachable += $system
    }
}

Write-Host ""
Write-Host "Reachable: $($reachable.Count) / Unreachable: $($unreachable.Count)" -ForegroundColor $(if ($unreachable.Count -eq 0) { "Green" } else { "Yellow" })

if ($unreachable.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠ Warning: Some systems are unreachable:" -ForegroundColor Yellow
    foreach ($sys in $unreachable) {
        Write-Host "  - $($sys.Name) ($($sys.IP))" -ForegroundColor Red
    }
    Write-Host ""
    $continue = Read-Host "Continue with reachable systems only? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Confirm deployment
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " STEP 4: Confirm Deployment" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready to deploy to $($reachable.Count) systems:" -ForegroundColor White
Write-Host ""
foreach ($sys in $reachable) {
    Write-Host "  ✓ $($sys.Name) - $($sys.RoleName) ($($sys.IP))" -ForegroundColor Green
}
Write-Host ""
$confirm = Read-Host "Proceed with deployment? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Deployment
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " DEPLOYING TO ALL SYSTEMS..." -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$deploymentResults = @()
$deploymentStartTime = Get-Date

# Create deployment script block
$deploymentScript = {
    param($SystemName, $Role, $RoleName)

    $result = @{
        System = $SystemName
        Role = $RoleName
        Success = $false
        Steps = @()
        Errors = @()
        StartTime = Get-Date
    }

    try {
        # Step 1: Create directories
        $result.Steps += "Creating directories..."
        $dirs = @(
            "C:\TeamClaude\app",
            "C:\TeamClaude\logs",
            "C:\TeamClaude\data\postgres",
            "C:\TeamClaude\data\redis",
            "C:\TeamClaude\backups",
            "C:\TeamClaude\config"
        )
        foreach ($dir in $dirs) {
            if (!(Test-Path $dir)) {
                New-Item -ItemType Directory -Path $dir -Force | Out-Null
            }
        }
        $result.Steps += "✓ Directories created"

        # Step 2: Install Chocolatey
        $result.Steps += "Installing Chocolatey..."
        if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
            Set-ExecutionPolicy Bypass -Scope Process -Force
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
            Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        }
        $result.Steps += "✓ Chocolatey ready"

        # Step 3: Install Git
        $result.Steps += "Installing Git..."
        if (!(Get-Command git -ErrorAction SilentlyContinue)) {
            choco install git -y --limit-output
        }
        $result.Steps += "✓ Git ready"

        # Step 4: Install Node.js
        $result.Steps += "Installing Node.js..."
        if (!(Get-Command node -ErrorAction SilentlyContinue)) {
            choco install nodejs-lts -y --limit-output
        }
        $result.Steps += "✓ Node.js ready"

        # Step 5: Clone repository
        $result.Steps += "Cloning repository..."
        if (!(Test-Path "C:\TeamClaude\app\.git")) {
            Set-Location "C:\TeamClaude\app"
            git clone https://github.com/Trollz1004/Trollz1004.git . 2>&1 | Out-Null
        }
        $result.Steps += "✓ Repository cloned"

        # Step 6: Configure firewall
        $result.Steps += "Configuring firewall..."
        $ports = @(4000, 3000, 8080, 5000, 5432, 6379, 80, 443)
        foreach ($port in $ports) {
            $ruleName = "TeamClaude-Port-$port"
            if (!(Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
                New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort $port -Protocol TCP -Action Allow | Out-Null
            }
        }
        $result.Steps += "✓ Firewall configured"

        # Step 7: Create role config
        $result.Steps += "Creating role configuration..."
        $configContent = @"
# Team Claude System Configuration
SystemName: $SystemName
Role: $Role
RoleName: $RoleName
SetupDate: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
        $configContent | Out-File -FilePath "C:\TeamClaude\config\system-role.txt" -Encoding UTF8
        $result.Steps += "✓ Configuration created"

        # Step 8: System info
        $result.Steps += "Gathering system info..."
        $sysInfo = @{
            ComputerName = $env:COMPUTERNAME
            OS = (Get-CimInstance Win32_OperatingSystem).Caption
            RAM_GB = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
            CPU = (Get-CimInstance Win32_Processor).Name
        }
        $result.SystemInfo = $sysInfo
        $result.Steps += "✓ System info collected"

        $result.Success = $true

    } catch {
        $result.Success = $false
        $result.Errors += $_.Exception.Message
    }

    $result.EndTime = Get-Date
    $result.Duration = ($result.EndTime - $result.StartTime).TotalSeconds

    return $result
}

# Deploy to each system in parallel
$jobs = @()

foreach ($system in $reachable) {
    Write-Host "[$($system.Name)] Starting deployment..." -ForegroundColor Cyan

    try {
        if ($Password) {
            $cred = New-Object System.Management.Automation.PSCredential($username, $securePassword)
        } else {
            $cred = $credential
        }

        $job = Invoke-Command -ComputerName $system.IP -Credential $cred -ScriptBlock $deploymentScript -ArgumentList $system.Name, $system.Role, $system.RoleName -AsJob

        $jobs += @{
            Job = $job
            System = $system
        }

        Write-Host "[$($system.Name)] Deployment job started" -ForegroundColor Green

    } catch {
        Write-Host "[$($system.Name)] Failed to start: $($_.Exception.Message)" -ForegroundColor Red
        $deploymentResults += @{
            System = $system.Name
            Success = $false
            Errors = @($_.Exception.Message)
        }
    }
}

# Wait for all jobs to complete
Write-Host ""
Write-Host "Waiting for all deployments to complete..." -ForegroundColor Yellow
Write-Host ""

$completed = 0
$total = $jobs.Count

while ($completed -lt $total) {
    foreach ($jobInfo in $jobs) {
        if ($jobInfo.Job.State -eq "Completed" -and !$jobInfo.Processed) {
            $jobInfo.Processed = $true
            $completed++

            $result = Receive-Job -Job $jobInfo.Job
            $deploymentResults += $result

            if ($result.Success) {
                Write-Host "[$($jobInfo.System.Name)] ✓ Deployment complete ($([math]::Round($result.Duration, 1))s)" -ForegroundColor Green
            } else {
                Write-Host "[$($jobInfo.System.Name)] ✗ Deployment failed" -ForegroundColor Red
            }
        }
    }
    Start-Sleep -Seconds 2
}

# Clean up jobs
$jobs | ForEach-Object { Remove-Job -Job $_.Job -Force }

$deploymentEndTime = Get-Date
$totalDuration = ($deploymentEndTime - $deploymentStartTime).TotalMinutes

# Generate Report
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$successCount = ($deploymentResults | Where-Object { $_.Success }).Count
$failCount = ($deploymentResults | Where-Object { !$_.Success }).Count

Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  ✓ Successful: $successCount" -ForegroundColor Green
Write-Host "  ✗ Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Gray" })
Write-Host "  ⏱ Total Time: $([math]::Round($totalDuration, 1)) minutes" -ForegroundColor White
Write-Host ""

Write-Host "Successful Deployments:" -ForegroundColor Green
foreach ($result in ($deploymentResults | Where-Object { $_.Success })) {
    Write-Host "  ✓ $($result.System) - $($result.Role)" -ForegroundColor Green
}

if ($failCount -gt 0) {
    Write-Host ""
    Write-Host "Failed Deployments:" -ForegroundColor Red
    foreach ($result in ($deploymentResults | Where-Object { !$_.Success })) {
        Write-Host "  ✗ $($result.System)" -ForegroundColor Red
        foreach ($error in $result.Errors) {
            Write-Host "    Error: $error" -ForegroundColor Yellow
        }
    }
}

# Save report
$reportPath = "C:\TeamClaude\deployment-report.txt"
$reportContent = @"
═══════════════════════════════════════════════════════════════════════════
TEAM CLAUDE DEPLOYMENT REPORT
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
═══════════════════════════════════════════════════════════════════════════

SUMMARY:
--------
Total Systems: $($systems.Count)
Successful: $successCount
Failed: $failCount
Total Duration: $([math]::Round($totalDuration, 1)) minutes

SYSTEM DETAILS:
---------------
$($deploymentResults | ForEach-Object {
    "System: $($_.System)
Role: $($_.Role)
Status: $(if ($_.Success) { 'SUCCESS' } else { 'FAILED' })
Duration: $($_.Duration) seconds
Steps: $($_.Steps -join '; ')
$(if ($_.Errors) { "Errors: $($_.Errors -join '; ')" })

"
})

═══════════════════════════════════════════════════════════════════════════
NEXT STEPS:
═══════════════════════════════════════════════════════════════════════════

1. Install Docker Desktop on each system:
   - Download: https://www.docker.com/products/docker-desktop/
   - Install and restart each PC
   - Start Docker Desktop

2. Configure static IP addresses (recommended):
   - T5500 (Backend):     192.168.1.10
   - EVGA (AI):           192.168.1.11
   - ASUS (Database):     192.168.1.12
   - OptiPlex (Frontend): 192.168.1.13
   - OptiPlex (Monitor):  192.168.1.14

3. Start services on each system:
   - Run: C:\TeamClaude\start-<role>.ps1

4. Verify all systems:
   - Run: .\check-all-systems.ps1

═══════════════════════════════════════════════════════════════════════════
Team Claude: Building with Compliance + Heart 💚
Mission: Generate Revenue → Help Children → AI for Good
═══════════════════════════════════════════════════════════════════════════
"@

$reportContent | Out-File -FilePath $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Report saved to: $reportPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Install Docker Desktop on each system (manual)" -ForegroundColor White
Write-Host "  2. Restart all systems" -ForegroundColor White
Write-Host "  3. Run: .\start-all-services.ps1" -ForegroundColor White
Write-Host "════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Team Claude: AI for Good 💚" -ForegroundColor Green
Write-Host ""
