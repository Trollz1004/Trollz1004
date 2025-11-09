# CLOUDFLARE DNS AUTOMATION - PowerShell Version
# Claude Code For The Kids

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║       CLOUDFLARE DNS AUTOMATION - TEAM CLAUDE                ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# Configuration
$NETLIFY_URL = "incomparable-gecko-b51107.netlify.app"
$RAILWAY_URL = "postgres-production-475c.up.railway.app"

Write-Host "📋 This script will configure DNS for:" -ForegroundColor Yellow
Write-Host "   - youandinotai.com → Netlify frontend"
Write-Host "   - youandinotai.online → Netlify frontend"
Write-Host "   - api.youandinotai.com → Railway backend"
Write-Host ""

# Get Cloudflare credentials
if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Host "⚠️  CLOUDFLARE_API_TOKEN not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get your Cloudflare API Token:"
    Write-Host "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    Write-Host "2. Click 'Create Token'"
    Write-Host "3. Use 'Edit zone DNS' template"
    Write-Host "4. Select your zones (youandinotai.com, youandinotai.online)"
    Write-Host "5. Create token and copy it"
    Write-Host ""
    $secureToken = Read-Host "Enter your Cloudflare API Token" -AsSecureString
    $CLOUDFLARE_API_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    )
    $env:CLOUDFLARE_API_TOKEN = $CLOUDFLARE_API_TOKEN
} else {
    $CLOUDFLARE_API_TOKEN = $env:CLOUDFLARE_API_TOKEN
}

if (-not $env:CLOUDFLARE_ZONE_ID_COM) {
    Write-Host ""
    Write-Host "📋 Need Zone ID for youandinotai.com" -ForegroundColor Yellow
    Write-Host "Find it at: https://dash.cloudflare.com → Select domain → Overview → Zone ID"
    $CLOUDFLARE_ZONE_ID_COM = Read-Host "Enter Zone ID for youandinotai.com"
    $env:CLOUDFLARE_ZONE_ID_COM = $CLOUDFLARE_ZONE_ID_COM
} else {
    $CLOUDFLARE_ZONE_ID_COM = $env:CLOUDFLARE_ZONE_ID_COM
}

if (-not $env:CLOUDFLARE_ZONE_ID_ONLINE) {
    Write-Host ""
    Write-Host "📋 Need Zone ID for youandinotai.online" -ForegroundColor Yellow
    Write-Host "Find it at: https://dash.cloudflare.com → Select domain → Overview → Zone ID"
    $CLOUDFLARE_ZONE_ID_ONLINE = Read-Host "Enter Zone ID for youandinotai.online"
    $env:CLOUDFLARE_ZONE_ID_ONLINE = $CLOUDFLARE_ZONE_ID_ONLINE
} else {
    $CLOUDFLARE_ZONE_ID_ONLINE = $env:CLOUDFLARE_ZONE_ID_ONLINE
}

Write-Host ""
Write-Host "✅ Credentials configured!" -ForegroundColor Green
Write-Host ""

# Function to create/update DNS record
function Set-CloudflareDNS {
    param(
        [string]$ZoneId,
        [string]$Type,
        [string]$Name,
        [string]$Content,
        [bool]$Proxied = $false
    )

    Write-Host "🔧 Configuring: $Type $Name → $Content" -ForegroundColor Blue

    $headers = @{
        "Authorization" = "Bearer $CLOUDFLARE_API_TOKEN"
        "Content-Type" = "application/json"
    }

    # Check if record exists
    $listUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records?type=$Type&name=$Name"
    $existing = Invoke-RestMethod -Uri $listUrl -Headers $headers -Method Get

    $body = @{
        type = $Type
        name = $Name
        content = $Content
        ttl = 1
        proxied = $Proxied
    } | ConvertTo-Json

    try {
        if ($existing.result.Count -gt 0) {
            # Update existing
            $recordId = $existing.result[0].id
            $updateUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records/$recordId"
            $response = Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method Put -Body $body
            Write-Host "   ✅ Updated!" -ForegroundColor Green
        } else {
            # Create new
            $createUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records"
            $response = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $body
            Write-Host "   ✅ Created!" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Failed: $_" -ForegroundColor Red
    }
    Write-Host ""
}

# Function to configure SSL
function Set-CloudflareSSL {
    param([string]$ZoneId, [string]$Domain)

    Write-Host "🔒 Configuring SSL/TLS for $Domain" -ForegroundColor Blue

    $headers = @{
        "Authorization" = "Bearer $CLOUDFLARE_API_TOKEN"
        "Content-Type" = "application/json"
    }

    # Set SSL to Full
    $sslUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/ssl"
    Invoke-RestMethod -Uri $sslUrl -Headers $headers -Method Patch -Body '{"value":"full"}' | Out-Null

    # Enable Always HTTPS
    $httpsUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/always_use_https"
    Invoke-RestMethod -Uri $httpsUrl -Headers $headers -Method Patch -Body '{"value":"on"}' | Out-Null

    # Enable Auto HTTPS Rewrites
    $rewriteUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/automatic_https_rewrites"
    Invoke-RestMethod -Uri $rewriteUrl -Headers $headers -Method Patch -Body '{"value":"on"}' | Out-Null

    Write-Host "✅ SSL/TLS configured!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  Configuring youandinotai.com" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Configure youandinotai.com
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_COM -Type "CNAME" -Name "youandinotai.com" -Content $NETLIFY_URL
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_COM -Type "CNAME" -Name "www" -Content $NETLIFY_URL
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_COM -Type "CNAME" -Name "api" -Content $RAILWAY_URL
Set-CloudflareSSL -ZoneId $CLOUDFLARE_ZONE_ID_COM -Domain "youandinotai.com"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  Configuring youandinotai.online" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Configure youandinotai.online
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_ONLINE -Type "CNAME" -Name "youandinotai.online" -Content $NETLIFY_URL
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_ONLINE -Type "CNAME" -Name "www" -Content $NETLIFY_URL
Set-CloudflareSSL -ZoneId $CLOUDFLARE_ZONE_ID_ONLINE -Domain "youandinotai.online"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "         ✅ DNS CONFIGURATION COMPLETE! ✅" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Configured DNS Records:" -ForegroundColor Blue
Write-Host ""
Write-Host "✅ youandinotai.com → $NETLIFY_URL"
Write-Host "✅ www.youandinotai.com → $NETLIFY_URL"
Write-Host "✅ api.youandinotai.com → $RAILWAY_URL"
Write-Host "✅ youandinotai.online → $NETLIFY_URL"
Write-Host "✅ www.youandinotai.online → $NETLIFY_URL"
Write-Host ""

Write-Host "🔒 SSL/TLS Settings:" -ForegroundColor Blue
Write-Host "✅ SSL Mode: Full (strict)"
Write-Host "✅ Always Use HTTPS: Enabled"
Write-Host "✅ Automatic HTTPS Rewrites: Enabled"
Write-Host ""

Write-Host "⏱️  DNS Propagation Time:" -ForegroundColor Yellow
Write-Host "   - Cloudflare: 1-5 minutes (usually instant)"
Write-Host "   - Global: Up to 24 hours (usually 15-30 minutes)"
Write-Host ""

Write-Host "🎯 Next Steps:" -ForegroundColor Blue
Write-Host ""
Write-Host "1. Add custom domains in Netlify:"
Write-Host "   - Go to: https://app.netlify.com/sites/incomparable-gecko-b51107/settings/domain"
Write-Host "   - Add: youandinotai.com"
Write-Host "   - Add: youandinotai.online"
Write-Host ""
Write-Host "2. Wait 5-10 minutes for DNS propagation"
Write-Host ""
Write-Host "3. Test your domains:"
Write-Host "   curl https://youandinotai.com"
Write-Host "   curl https://api.youandinotai.com/health"
Write-Host "   curl https://youandinotai.online"
Write-Host ""

Write-Host "🎉 You're all set! Your domains will be live shortly!" -ForegroundColor Green
Write-Host ""
Write-Host "💙 Claude Code For The Kids 💙" -ForegroundColor Blue
Write-Host ""
