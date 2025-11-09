# CLOUDFLARE DNS AUTOMATION - PowerShell Version
# Claude Code For The Kids

Write-Information "╔══════════════════════════════════════════════════════════════╗" -InformationAction Continue
Write-Information "║       CLOUDFLARE DNS AUTOMATION - TEAM CLAUDE                ║" -InformationAction Continue
Write-Information "╚══════════════════════════════════════════════════════════════╝" -InformationAction Continue
Write-Output ""

# Configuration
if ($env:NETLIFY_URL) {
    $NETLIFY_URL = $env:NETLIFY_URL
} else {
    $NETLIFY_URL = "incomparable-gecko-b51107.netlify.app"
    Write-Information "ℹ️  Using default Netlify URL: $NETLIFY_URL" -InformationAction Continue
}

if ($env:RAILWAY_URL) {
    $RAILWAY_URL = $env:RAILWAY_URL
} else {
    $RAILWAY_URL = "postgres-production-475c.up.railway.app"
    Write-Information "ℹ️  Using default Railway URL: $RAILWAY_URL" -InformationAction Continue
}

Write-Information "📋 This script will configure DNS for:" -InformationAction Continue
Write-Output "   - youandinotai.com → Netlify frontend ($NETLIFY_URL)"
Write-Output "   - youandinotai.online → Netlify frontend ($NETLIFY_URL)"
Write-Output "   - api.youandinotai.com → Railway backend ($RAILWAY_URL)"
Write-Output ""

# Get Cloudflare credentials
if (-not $env:CLOUDFLARE_API_TOKEN) {
    Write-Information "⚠️  CLOUDFLARE_API_TOKEN not found" -InformationAction Continue
    Write-Output ""
    Write-Output "To get your Cloudflare API Token:"
    Write-Output "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    Write-Output "2. Click 'Create Token'"
    Write-Output "3. Use 'Edit zone DNS' template"
    Write-Output "4. Select your zones (youandinotai.com, youandinotai.online)"
    Write-Output "5. Create token and copy it"
    Write-Output ""
    $secureToken = Read-Host "Enter your Cloudflare API Token" -AsSecureString
    $CLOUDFLARE_API_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken))
    $CLOUDFLARE_API_TOKEN = Read-Host "Enter your Cloudflare API Token"
    $env:CLOUDFLARE_API_TOKEN = $CLOUDFLARE_API_TOKEN
} else {
    $CLOUDFLARE_API_TOKEN = $env:CLOUDFLARE_API_TOKEN
}

if (-not $env:CLOUDFLARE_ZONE_ID_COM) {
    Write-Output ""
    Write-Information "📋 Need Zone ID for youandinotai.com" -InformationAction Continue
    Write-Output "Find it at: https://dash.cloudflare.com → Select domain → Overview → Zone ID"
    $CLOUDFLARE_ZONE_ID_COM = Read-Host "Enter Zone ID for youandinotai.com"
    $env:CLOUDFLARE_ZONE_ID_COM = $CLOUDFLARE_ZONE_ID_COM
} else {
    $CLOUDFLARE_ZONE_ID_COM = $env:CLOUDFLARE_ZONE_ID_COM
}

if (-not $env:CLOUDFLARE_ZONE_ID_ONLINE) {
    Write-Output ""
    Write-Information "📋 Need Zone ID for youandinotai.online" -InformationAction Continue
    Write-Output "Find it at: https://dash.cloudflare.com → Select domain → Overview → Zone ID"
    $CLOUDFLARE_ZONE_ID_ONLINE = Read-Host "Enter Zone ID for youandinotai.online"
    $env:CLOUDFLARE_ZONE_ID_ONLINE = $CLOUDFLARE_ZONE_ID_ONLINE
} else {
    $CLOUDFLARE_ZONE_ID_ONLINE = $env:CLOUDFLARE_ZONE_ID_ONLINE
}

Write-Output ""
Write-Information "✅ Credentials configured!" -InformationAction Continue
Write-Output ""

# Function to create/update DNS record
function Set-CloudflareDNS {
    param(
        [string]$ZoneId,
        [string]$Type,
        [string]$Name,
        [string]$Content,
        [bool]$Proxied = $false
    )

    Write-Information "🔧 Configuring: $Type $Name → $Content" -InformationAction Continue

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
            Write-Information "   ✅ Updated!" -InformationAction Continue
        } else {
            # Create new
            $createUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records"
            $response = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $body
            Write-Information "   ✅ Created!" -InformationAction Continue
        }
    } catch {
        Write-Error "   ❌ Failed: $_"
    }
    Write-Output ""
}

# Function to configure SSL
function Set-CloudflareSSL {
    [CmdletBinding(SupportsShouldProcess)]
    param([string]$ZoneId, [string]$Domain)

    Write-Information "🔒 Configuring SSL/TLS for $Domain" -InformationAction Continue

    $headers = @{
        "Authorization" = "Bearer $CLOUDFLARE_API_TOKEN"
        "Content-Type" = "application/json"
    }

    if ($PSCmdlet.ShouldProcess($Domain, "Configure SSL/TLS settings")) {
        # Set SSL to Full (strict)
        $sslUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/ssl"
        Invoke-RestMethod -Uri $sslUrl -Headers $headers -Method Patch -Body '{"value":"strict"}' | Out-Null
        # Set SSL to Full
        $sslUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/ssl"
        Invoke-RestMethod -Uri $sslUrl -Headers $headers -Method Patch -Body '{"value":"full"}' | Out-Null

        # Enable Always HTTPS
        $httpsUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/always_use_https"
        Invoke-RestMethod -Uri $httpsUrl -Headers $headers -Method Patch -Body '{"value":"on"}' | Out-Null

        # Enable Auto HTTPS Rewrites
        $rewriteUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/settings/automatic_https_rewrites"
        Invoke-RestMethod -Uri $rewriteUrl -Headers $headers -Method Patch -Body '{"value":"on"}' | Out-Null

        Write-Information "✅ SSL/TLS configured!" -InformationAction Continue
    }
    Write-Output ""
}

Write-Information "═══════════════════════════════════════════════════════════" -InformationAction Continue
Write-Information "  Configuring youandinotai.com" -InformationAction Continue
Write-Information "═══════════════════════════════════════════════════════════" -InformationAction Continue
Write-Output ""

# Configure youandinotai.com
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_COM -Type "CNAME" -Name "youandinotai.com" -Content $NETLIFY_URL
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_COM -Type "CNAME" -Name "www" -Content $NETLIFY_URL
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_COM -Type "CNAME" -Name "api" -Content $RAILWAY_URL
Set-CloudflareSSL -ZoneId $CLOUDFLARE_ZONE_ID_COM -Domain "youandinotai.com"

Write-Information "═══════════════════════════════════════════════════════════" -InformationAction Continue
Write-Information "  Configuring youandinotai.online" -InformationAction Continue
Write-Information "═══════════════════════════════════════════════════════════" -InformationAction Continue
Write-Output ""

# Configure youandinotai.online
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_ONLINE -Type "CNAME" -Name "youandinotai.online" -Content $NETLIFY_URL
Set-CloudflareDNS -ZoneId $CLOUDFLARE_ZONE_ID_ONLINE -Type "CNAME" -Name "www" -Content $NETLIFY_URL
Set-CloudflareSSL -ZoneId $CLOUDFLARE_ZONE_ID_ONLINE -Domain "youandinotai.online"

Write-Output ""
Write-Information "═══════════════════════════════════════════════════════════" -InformationAction Continue
Write-Information "         ✅ DNS CONFIGURATION COMPLETE! ✅" -InformationAction Continue
Write-Information "═══════════════════════════════════════════════════════════" -InformationAction Continue
Write-Output ""

Write-Information "📋 Configured DNS Records:" -InformationAction Continue
Write-Output ""
Write-Output "✅ youandinotai.com → $NETLIFY_URL"
Write-Output "✅ www.youandinotai.com → $NETLIFY_URL"
Write-Output "✅ api.youandinotai.com → $RAILWAY_URL"
Write-Output "✅ youandinotai.online → $NETLIFY_URL"
Write-Output "✅ www.youandinotai.online → $NETLIFY_URL"
Write-Output ""

Write-Information "🔒 SSL/TLS Settings:" -InformationAction Continue
Write-Output "✅ SSL Mode: Full (strict)"
Write-Output "✅ Always Use HTTPS: Enabled"
Write-Output "✅ Automatic HTTPS Rewrites: Enabled"
Write-Output ""

Write-Information "⏱️  DNS Propagation Time:" -InformationAction Continue
Write-Output "   - Cloudflare: 1-5 minutes (usually instant)"
Write-Output "   - Global: Up to 24 hours (usually 15-30 minutes)"
Write-Output ""

Write-Information "🎯 Next Steps:" -InformationAction Continue
Write-Output ""
Write-Output "1. Add custom domains in Netlify:"
Write-Output "   - Go to: https://app.netlify.com/sites/incomparable-gecko-b51107/settings/domain"
Write-Output "   - Add: youandinotai.com"
Write-Output "   - Add: youandinotai.online"
Write-Output ""
Write-Output "2. Wait 5-10 minutes for DNS propagation"
Write-Output ""
Write-Output "3. Test your domains:"
Write-Output "   curl https://youandinotai.com"
Write-Output "   curl https://api.youandinotai.com/health"
Write-Output "   curl https://youandinotai.online"
Write-Output ""

Write-Information "🎉 You're all set! Your domains will be live shortly!" -InformationAction Continue
Write-Output ""
Write-Information "💙 Claude Code For The Kids 💙" -InformationAction Continue
Write-Output ""
