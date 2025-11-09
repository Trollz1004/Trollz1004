# Team Claude Dashboard - 1-Click Launcher (Windows PowerShell)
# Ai-Solutions.Store Platform
# 💙 50% to Shriners Children's Hospitals

# Require Administrator privileges
#Requires -RunAsAdministrator

# Clear screen and show banner
Clear-Host

Write-Host @"
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   ████████╗███████╗ █████╗ ███╗   ███╗     ██████╗██╗         ║
║   ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║    ██╔════╝██║         ║
║      ██║   █████╗  ███████║██╔████╔██║    ██║     ██║         ║
║      ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║    ██║     ██║         ║
║      ██║   ███████╗██║  ██║██║ ╚═╝ ██║    ╚██████╗███████╗    ║
║      ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝     ╚═════╝╚══════╝    ║
║                                                                ║
║              Team Claude For The Kids - Launcher               ║
║              Ai-Solutions.Store Platform                       ║
║              💙 50% to Shriners Children's Hospitals          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

Write-Host ""
Write-Host "🚀 Team Claude Dashboard - 1-Click Launcher" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Get script directory - Handle both file execution and pasted code
if ($PSScriptRoot) {
    # Running from saved file
    $ScriptDir = $PSScriptRoot
} elseif ($MyInvocation.MyCommand.Path) {
    # Running from file (older PS versions)
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
} else {
    # Pasted into console - use current directory
    $ScriptDir = Get-Location
    Write-Host "⚠️  Script pasted into console. Using current directory: $ScriptDir" -ForegroundColor Yellow
    Write-Host "For best results, save as TEAM-CLAUDE-LAUNCHER.ps1 and run from file." -ForegroundColor Yellow
    Write-Host ""
}

$DashboardDir = Join-Path $ScriptDir "team-claude-dashboard-deploy"

# Verify dashboard directory exists
if (-not (Test-Path $DashboardDir)) {
    Write-Host "⚠️  Dashboard directory not found at: $DashboardDir" -ForegroundColor Yellow
    Write-Host "Looking in common locations..." -ForegroundColor Cyan

    # Try to find it in current user's directories
    $PossibleLocations = @(
        "C:\Users\$env:USERNAME\trollz1004\team-claude-dashboard-deploy",
        "C:\Users\$env:USERNAME\Trollz1004\team-claude-dashboard-deploy",
        "C:\Users\$env:USERNAME\projects\Trollz1004\team-claude-dashboard-deploy",
        "C:\Users\$env:USERNAME\Documents\Trollz1004\team-claude-dashboard-deploy"
    )

    foreach ($loc in $PossibleLocations) {
        if (Test-Path $loc) {
            $DashboardDir = $loc
            Write-Host "✅ Found dashboard at: $DashboardDir" -ForegroundColor Green
            break
        }
    }
}

# Function to open URL
function Open-Url {
    param([string]$Url)
    Write-Host "🌐 Opening: $Url" -ForegroundColor Blue
    Start-Process $Url
    Start-Sleep -Milliseconds 500
}

# Function to check if command exists
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Show menu
Write-Host "What would you like to do?" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1) 🚀 Deploy Dashboard to Netlify (Production)"
Write-Host "  2) 🌐 Open All Platform URLs"
Write-Host "  3) 📊 Open Dashboard (if deployed)"
Write-Host "  4) 🔧 Start Local Development Server"
Write-Host "  5) 💙 View Charity Impact"
Write-Host "  6) 📋 View Deployment Status"
Write-Host "  7) 🛠️  Run All Services (Server + Open URLs)"
Write-Host "  8) 🖥️  Create Desktop Shortcut"
Write-Host "  9) ❌ Exit"
Write-Host ""

$choice = Read-Host "Enter choice [1-9]"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🚀 Starting Netlify Deployment..." -ForegroundColor Green
        Write-Host ""

        if (-not (Test-Path $DashboardDir)) {
            Write-Host "❌ Dashboard directory not found!" -ForegroundColor Red
            Write-Host "Expected: $DashboardDir"
            pause
            exit
        }

        Set-Location $DashboardDir

        if (Test-Path "deploy-netlify.sh") {
            if (Test-CommandExists "bash") {
                bash ./deploy-netlify.sh
            } else {
                Write-Host "⚠️  Bash not found. Installing via WSL or Git Bash recommended." -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Manual deployment steps:" -ForegroundColor Cyan
                Write-Host "  1. Install Netlify CLI: npm install -g netlify-cli"
                Write-Host "  2. Login: netlify login"
                Write-Host "  3. Deploy: netlify deploy --prod --dir=."
            }
        } else {
            Write-Host "❌ deploy-netlify.sh not found!" -ForegroundColor Red
        }
    }

    "2" {
        Write-Host ""
        Write-Host "🌐 Opening All Platform URLs..." -ForegroundColor Green
        Write-Host ""

        Open-Url "https://youandinotai.com"
        Open-Url "https://www.youandinotai.com"
        Open-Url "https://dashboard.youandinotai.com"

        Write-Host ""
        Write-Host "✅ All URLs opened in your browser!" -ForegroundColor Green
    }

    "3" {
        Write-Host ""
        Write-Host "📊 Opening Dashboard..." -ForegroundColor Green
        Write-Host ""

        if (Test-Path (Join-Path $DashboardDir ".netlify\state.json")) {
            Set-Location $DashboardDir

            if (Test-CommandExists "netlify") {
                $netlifyStatus = netlify status 2>&1 | Out-String
                if ($netlifyStatus -match 'https://[^\s]+\.netlify\.app') {
                    $netlifyUrl = $matches[0]
                    Write-Host "Found deployed dashboard: $netlifyUrl" -ForegroundColor Green
                    Open-Url $netlifyUrl
                } else {
                    Write-Host "⚠️  Dashboard URL not found. Trying common URLs..." -ForegroundColor Yellow
                    Open-Url "https://dashboard.youandinotai.com"
                }
            } else {
                Open-Url "https://dashboard.youandinotai.com"
            }
        } else {
            Write-Host "⚠️  Dashboard not deployed yet. Run option 1 to deploy." -ForegroundColor Yellow
        }
    }

    "4" {
        Write-Host ""
        Write-Host "🔧 Starting Local Development Server..." -ForegroundColor Green
        Write-Host ""

        if (-not (Test-Path $DashboardDir)) {
            Write-Host "❌ Dashboard directory not found!" -ForegroundColor Red
            pause
            exit
        }

        Set-Location $DashboardDir

        if (Test-CommandExists "python") {
            Write-Host "Starting Python HTTP server on port 8000..." -ForegroundColor Blue
            Write-Host "Dashboard will be available at: http://localhost:8000" -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
            Write-Host ""
            Start-Sleep -Seconds 2
            Open-Url "http://localhost:8000"
            python -m http.server 8000
        } elseif (Test-CommandExists "php") {
            Write-Host "Starting PHP built-in server on port 8000..." -ForegroundColor Blue
            Write-Host "Dashboard will be available at: http://localhost:8000" -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
            Write-Host ""
            Start-Sleep -Seconds 2
            Open-Url "http://localhost:8000"
            php -S localhost:8000
        } else {
            Write-Host "❌ No suitable HTTP server found!" -ForegroundColor Red
            Write-Host "Please install Python or use http-server:" -ForegroundColor Yellow
            Write-Host "  npm install -g http-server"
            Write-Host "  http-server -p 8000"
        }
    }

    "5" {
        Write-Host ""
        Write-Host "💙 Team Claude For The Kids - Charity Impact" -ForegroundColor Magenta
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
        Write-Host ""
        Write-Host "Mission:" -ForegroundColor Cyan
        Write-Host "  50% of all profits go directly to Shriners Children's Hospitals"
        Write-Host ""
        Write-Host "Impact:" -ForegroundColor Cyan
        Write-Host "  • Every subscription helps children receive world-class medical care"
        Write-Host "  • Every user brings us closer to our charity goals"
        Write-Host "  • 100% transparent profit sharing"
        Write-Host ""
        Write-Host "Platform Revenue Model:" -ForegroundColor Cyan
        Write-Host "  • 50% → Shriners Children's Hospitals"
        Write-Host "  • 50% → Platform operations & growth"
        Write-Host ""
        Write-Host "Together, we're proving that technology and compassion can change the world!" -ForegroundColor Green
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
        Write-Host ""
        pause
    }

    "6" {
        Write-Host ""
        Write-Host "📋 Deployment Status" -ForegroundColor Green
        Write-Host ""

        if (Test-Path (Join-Path $DashboardDir "DEPLOYMENT_INFO.txt")) {
            Get-Content (Join-Path $DashboardDir "DEPLOYMENT_INFO.txt")
        } else {
            Write-Host "⚠️  No deployment info found." -ForegroundColor Yellow
            Write-Host "Dashboard may not be deployed yet."
            Write-Host ""
            Write-Host "Run option 1 to deploy the dashboard."
        }

        Write-Host ""

        if (Test-Path (Join-Path $DashboardDir ".netlify\state.json")) {
            Write-Host "Netlify Status:" -ForegroundColor Green
            if (Test-CommandExists "netlify") {
                Set-Location $DashboardDir
                netlify status
            }
        }

        Write-Host ""
        pause
    }

    "7" {
        Write-Host ""
        Write-Host "🛠️  Starting All Services..." -ForegroundColor Green
        Write-Host ""

        Write-Host "Step 1: Opening all platform URLs..." -ForegroundColor Blue
        Open-Url "https://youandinotai.com"
        Open-Url "https://dashboard.youandinotai.com"

        if (Test-Path (Join-Path $DashboardDir ".netlify")) {
            Set-Location $DashboardDir
            if (Test-CommandExists "netlify") {
                $netlifyStatus = netlify status 2>&1 | Out-String
                if ($netlifyStatus -match 'https://[^\s]+\.netlify\.app') {
                    Open-Url $matches[0]
                }
            }
        }

        Write-Host ""
        Write-Host "Step 2: Starting local development server..." -ForegroundColor Blue
        Write-Host ""

        if (-not (Test-Path $DashboardDir)) {
            Write-Host "❌ Dashboard directory not found!" -ForegroundColor Red
            pause
            exit
        }

        Set-Location $DashboardDir

        if (Test-CommandExists "python") {
            Write-Host "Local dashboard: http://localhost:8000" -ForegroundColor Yellow
            Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
            Write-Host ""
            Start-Sleep -Seconds 2
            Open-Url "http://localhost:8000"
            python -m http.server 8000
        } else {
            Write-Host "❌ Python not found. Cannot start local server." -ForegroundColor Red
        }
    }

    "8" {
        Write-Host ""
        Write-Host "🖥️  Creating Desktop Shortcut..." -ForegroundColor Green
        Write-Host ""

        $DesktopPath = [Environment]::GetFolderPath("Desktop")
        $ShortcutPath = Join-Path $DesktopPath "Team Claude Dashboard.lnk"

        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = "powershell.exe"
        $Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$($MyInvocation.MyCommand.Path)`""
        $Shortcut.WorkingDirectory = $ScriptDir
        $Shortcut.Description = "Team Claude Dashboard - 1-Click Launcher"
        $Shortcut.Save()

        Write-Host "✅ Desktop shortcut created!" -ForegroundColor Green
        Write-Host "Location: $ShortcutPath" -ForegroundColor Cyan
        Write-Host ""
        pause
    }

    "9" {
        Write-Host ""
        Write-Host "Thank you for using Team Claude Dashboard!" -ForegroundColor Cyan
        Write-Host "💙 50% to Shriners Children's Hospitals" -ForegroundColor Magenta
        Write-Host ""
        exit
    }

    default {
        Write-Host ""
        Write-Host "❌ Invalid choice. Please run the script again." -ForegroundColor Red
        pause
        exit
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "Thank you for using Team Claude Dashboard!" -ForegroundColor Cyan
Write-Host "💙 50% to Shriners Children's Hospitals" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
pause
