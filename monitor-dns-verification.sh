#!/bin/bash

# Monitor DNS verification for GitHub domain verification
# Team Claude For The Kids - github.com/Ai-Solutions-Store

echo "🔍 GitHub Domain Verification Monitor"
echo "======================================"
echo ""
echo "Checking DNS TXT records every 30 seconds..."
echo "Press Ctrl+C to stop"
echo ""

domains=(
    "youandinotai.com"
    "ai-solutions.store"
    "aidoesitall.org"
    "onlinerecycle.org"
    "youandinotai.online"
)

verified_count=0
total_domains=${#domains[@]}

while [ $verified_count -lt $total_domains ]; do
    clear
    echo "🔍 GitHub Domain Verification Monitor"
    echo "======================================"
    echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""

    verified_count=0

    for domain in "${domains[@]}"; do
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📌 Domain: $domain"

        # Check for GitHub challenge record
        result=$(dig +short TXT "_github-challenge-ai-solutions-store.$domain" 2>/dev/null | tr -d '"')

        if [ -z "$result" ]; then
            echo "   Status: ❌ NOT FOUND"
            echo "   Action: Add TXT record in Cloudflare"
            echo "   Name:   _github-challenge-ai-solutions-store"
        else
            echo "   Status: ✅ VERIFIED"
            echo "   Value:  $result"
            echo "   Action: Click 'Verify' in GitHub!"
            ((verified_count++))
        fi
        echo ""
    done

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Progress: $verified_count/$total_domains domains ready"
    echo ""

    if [ $verified_count -eq $total_domains ]; then
        echo "🎉 ALL DOMAINS VERIFIED!"
        echo ""
        echo "Next step:"
        echo "1. Go to: https://github.com/organizations/Ai-Solutions-Store/settings/verified_domains"
        echo "2. Click 'Verify' for each domain"
        echo "3. All done!"
        break
    fi

    echo "Checking again in 30 seconds..."
    sleep 30
done
