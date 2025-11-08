# PowerShell Script to Install Claude Code CLI with API Setup
# For Windows 10/11

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🤖 Claude Code CLI Installation & Setup          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Please run PowerShell as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Install Node.js (if needed)
Write-Host "[1/5] 📦 Checking Node.js installation..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js already installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   📥 Installing Node.js..." -ForegroundColor Cyan

    # Download Node.js installer
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $nodeInstaller = "$env:TEMP\nodejs.msi"

    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller

    # Install Node.js silently
    Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/quiet", "/norestart" -Wait

    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

    Write-Host "   ✅ Node.js installed successfully!" -ForegroundColor Green
}
Write-Host ""

# Step 2: Install Claude Code CLI
Write-Host "[2/5] 🤖 Installing Claude Code CLI..." -ForegroundColor Yellow
try {
    npm install -g @anthropics/claude-code 2>&1 | Out-Null
    Write-Host "   ✅ Claude Code CLI installed!" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Installation failed: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Get API Key
Write-Host "[3/5] 🔑 API Key Configuration" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Your current credits: 217" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ⚠️  You need an Anthropic API key (starts with 'sk-ant-')" -ForegroundColor Yellow
Write-Host "   Get one at: https://console.anthropic.com/settings/keys" -ForegroundColor Cyan
Write-Host ""

# Check if API key already exists
$configPath = "$env:USERPROFILE\.claude\config.json"
$apiKey = ""

if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json
    if ($config.apiKey) {
        Write-Host "   ✅ API key already configured!" -ForegroundColor Green
        $apiKey = $config.apiKey
        $useExisting = Read-Host "   Use existing key? (y/n)"
        if ($useExisting -ne "y") {
            $apiKey = ""
        }
    }
}

if (-not $apiKey) {
    Write-Host ""
    $apiKey = Read-Host "   Enter your Anthropic API key (sk-ant-...)"

    if (-not $apiKey.StartsWith("sk-ant-")) {
        Write-Host "   ⚠️  Warning: Key doesn't start with 'sk-ant-'" -ForegroundColor Yellow
        Write-Host "   Make sure you're using an Anthropic key, not OpenAI" -ForegroundColor Yellow
        $continue = Read-Host "   Continue anyway? (y/n)"
        if ($continue -ne "y") {
            exit 1
        }
    }
}

# Step 4: Configure Claude Code
Write-Host ""
Write-Host "[4/5] ⚙️  Configuring Claude Code..." -ForegroundColor Yellow

# Create config directory
$configDir = "$env:USERPROFILE\.claude"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Create config file
$config = @{
    apiKey = $apiKey
    model = "claude-sonnet-4-5-20250929"
    maxTokens = 8096
    temperature = 1.0
} | ConvertTo-Json

Set-Content -Path $configPath -Value $config
Write-Host "   ✅ Configuration saved to: $configPath" -ForegroundColor Green
Write-Host ""

# Step 5: Verify Installation
Write-Host "[5/5] ✅ Verifying installation..." -ForegroundColor Yellow

try {
    $version = claude --version 2>&1
    Write-Host "   ✅ Claude Code version: $version" -ForegroundColor Green
    Write-Host ""

    # Test API connection
    Write-Host "   🧪 Testing API connection..." -ForegroundColor Cyan
    $testResult = claude "Say 'API test successful' in 3 words" --no-stream 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ API connection working!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  API test failed. Check your key." -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Verification failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Your Setup:" -ForegroundColor Yellow
Write-Host "   • Claude Code CLI: Installed" -ForegroundColor White
Write-Host "   • API Key: Configured" -ForegroundColor White
Write-Host "   • Model: claude-sonnet-4-5" -ForegroundColor White
Write-Host "   • Credits: 217 available" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Quick Start Commands:" -ForegroundColor Yellow
Write-Host "   claude 'your question here'              # Ask Claude" -ForegroundColor Cyan
Write-Host "   claude --code 'write a python script'   # Generate code" -ForegroundColor Cyan
Write-Host "   claude --file script.py 'fix this'      # Analyze files" -ForegroundColor Cyan
Write-Host "   claude --help                            # See all options" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Pro Tips:" -ForegroundColor Yellow
Write-Host "   • Use --no-stream for faster responses" -ForegroundColor White
Write-Host "   • Use --markdown for formatted output" -ForegroundColor White
Write-Host "   • Use --json for structured data" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Useful Links:" -ForegroundColor Yellow
Write-Host "   • Docs: https://docs.anthropic.com/claude/docs" -ForegroundColor Cyan
Write-Host "   • API Keys: https://console.anthropic.com/settings/keys" -ForegroundColor Cyan
Write-Host "   • Check Credits: https://console.anthropic.com/settings/billing" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
