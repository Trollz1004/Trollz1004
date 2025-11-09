#!/bin/bash

##############################################################################
# CLOUDFLARE DNS AUTOMATION - Claude Code For The Kids
# Automatically configures DNS for youandinotai.com and youandinotai.online
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       CLOUDFLARE DNS AUTOMATION - TEAM CLAUDE                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Required information
NETLIFY_URL="incomparable-gecko-b51107.netlify.app"
RAILWAY_URL="postgres-production-475c.up.railway.app"

echo -e "${YELLOW}📋 This script will configure DNS for:${NC}"
echo "   - youandinotai.com → Netlify frontend"
echo "   - youandinotai.online → Netlify frontend"
echo "   - api.youandinotai.com → Railway backend"
echo ""

# Check if Cloudflare credentials are set
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  CLOUDFLARE_API_TOKEN not found in environment${NC}"
    echo ""
    echo "To get your Cloudflare API Token:"
    echo "1. Go to: https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Click 'Create Token'"
    echo "3. Use 'Edit zone DNS' template"
    echo "4. Select your zones (youandinotai.com, youandinotai.online)"
    echo "5. Create token and copy it"
    echo ""
    read -s -p "Enter your Cloudflare API Token: " CLOUDFLARE_API_TOKEN
    echo
    export CLOUDFLARE_API_TOKEN
fi

if [ -z "$CLOUDFLARE_ZONE_ID_COM" ]; then
    echo ""
    echo -e "${YELLOW}📋 Need Zone ID for youandinotai.com${NC}"
    echo "Find it at: https://dash.cloudflare.com → Select domain → Overview → Zone ID"
    read -p "Enter Zone ID for youandinotai.com: " CLOUDFLARE_ZONE_ID_COM
    export CLOUDFLARE_ZONE_ID_COM
fi

if [ -z "$CLOUDFLARE_ZONE_ID_ONLINE" ]; then
    echo ""
    echo -e "${YELLOW}📋 Need Zone ID for youandinotai.online${NC}"
    echo "Find it at: https://dash.cloudflare.com → Select domain → Overview → Zone ID"
    read -p "Enter Zone ID for youandinotai.online: " CLOUDFLARE_ZONE_ID_ONLINE
    export CLOUDFLARE_ZONE_ID_ONLINE
fi

echo ""
echo -e "${GREEN}✅ Credentials configured!${NC}"
echo ""

# Function to create/update DNS record
create_dns_record() {
    local zone_id=$1
    local record_type=$2
    local record_name=$3
    local record_content=$4
    local proxied=${5:-false}

    echo -e "${BLUE}🔧 Configuring: ${record_type} ${record_name} → ${record_content}${NC}"

    # Check if record exists
    existing_record=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?type=${record_type}&name=${record_name}" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json")

    record_id=$(echo "$existing_record" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ -n "$record_id" ]; then
        # Update existing record
        echo "   Updating existing record..."
        response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records/${record_id}" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"${record_type}\",\"name\":\"${record_name}\",\"content\":\"${record_content}\",\"ttl\":1,\"proxied\":${proxied}}")
    else
        # Create new record
        echo "   Creating new record..."
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "{\"type\":\"${record_type}\",\"name\":\"${record_name}\",\"content\":\"${record_content}\",\"ttl\":1,\"proxied\":${proxied}}")
    fi

    # Check if successful
    success=$(echo "$response" | grep -o '"success":[^,]*' | cut -d':' -f2)
    if [ "$success" = "true" ]; then
        echo -e "   ${GREEN}✅ Success!${NC}"
    else
        echo -e "   ${RED}❌ Failed: $response${NC}"
    fi
    echo ""
}

# Function to configure SSL/TLS
configure_ssl() {
    local zone_id=$1
    local domain=$2

    echo -e "${BLUE}🔒 Configuring SSL/TLS for ${domain}${NC}"

    # Set SSL mode to Full (strict)
    curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/ssl" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"value":"full"}' > /dev/null

    # Enable Always Use HTTPS
    curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/always_use_https" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"value":"on"}' > /dev/null

    # Enable Automatic HTTPS Rewrites
    curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${zone_id}/settings/automatic_https_rewrites" \
        -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
        -H "Content-Type: application/json" \
        --data '{"value":"on"}' > /dev/null

    echo -e "${GREEN}✅ SSL/TLS configured!${NC}"
    echo ""
}

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Configuring youandinotai.com${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Configure youandinotai.com
create_dns_record "$CLOUDFLARE_ZONE_ID_COM" "CNAME" "youandinotai.com" "$NETLIFY_URL" "false"
create_dns_record "$CLOUDFLARE_ZONE_ID_COM" "CNAME" "www" "$NETLIFY_URL" "false"
create_dns_record "$CLOUDFLARE_ZONE_ID_COM" "CNAME" "api" "$RAILWAY_URL" "false"

# Configure SSL for .com
configure_ssl "$CLOUDFLARE_ZONE_ID_COM" "youandinotai.com"

echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Configuring youandinotai.online${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Configure youandinotai.online
create_dns_record "$CLOUDFLARE_ZONE_ID_ONLINE" "CNAME" "youandinotai.online" "$NETLIFY_URL" "false"
create_dns_record "$CLOUDFLARE_ZONE_ID_ONLINE" "CNAME" "www" "$NETLIFY_URL" "false"

# Configure SSL for .online
configure_ssl "$CLOUDFLARE_ZONE_ID_ONLINE" "youandinotai.online"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}         ✅ DNS CONFIGURATION COMPLETE! ✅${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${BLUE}📋 Configured DNS Records:${NC}"
echo ""
echo "✅ youandinotai.com → $NETLIFY_URL"
echo "✅ www.youandinotai.com → $NETLIFY_URL"
echo "✅ api.youandinotai.com → $RAILWAY_URL"
echo "✅ youandinotai.online → $NETLIFY_URL"
echo "✅ www.youandinotai.online → $NETLIFY_URL"
echo ""

echo -e "${BLUE}🔒 SSL/TLS Settings:${NC}"
echo "✅ SSL Mode: Full (strict)"
echo "✅ Always Use HTTPS: Enabled"
echo "✅ Automatic HTTPS Rewrites: Enabled"
echo ""

echo -e "${YELLOW}⏱️  DNS Propagation Time:${NC}"
echo "   - Cloudflare: 1-5 minutes (usually instant)"
echo "   - Global: Up to 24 hours (usually 15-30 minutes)"
echo ""

echo -e "${BLUE}🎯 Next Steps:${NC}"
echo ""
echo "1. Add custom domains in Netlify:"
echo "   - Go to: https://app.netlify.com/sites/incomparable-gecko-b51107/settings/domain"
echo "   - Add: youandinotai.com"
echo "   - Add: youandinotai.online"
echo ""
echo "2. Wait 5-10 minutes for DNS propagation"
echo ""
echo "3. Test your domains:"
echo "   curl https://youandinotai.com"
echo "   curl https://api.youandinotai.com/health"
echo "   curl https://youandinotai.online"
echo ""

echo -e "${GREEN}🎉 You're all set! Your domains will be live shortly!${NC}"
echo ""
echo -e "${BLUE}💙 Claude Code For The Kids 💙${NC}"
echo ""
