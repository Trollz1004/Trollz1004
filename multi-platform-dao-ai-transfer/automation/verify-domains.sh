#!/bin/bash
# Domain Verification Script
# Checks DNS configuration and SSL certificates for all platforms

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Domains to check
DOMAINS=(
    "aidoesitall.org"
    "www.aidoesitall.org"
    "claudedroid.ai"
    "www.claudedroid.ai"
    "api.claudedroid.ai"
    "ai-solutions.store"
    "www.ai-solutions.store"
    "api.ai-solutions.store"
    "dashboard.ai-solutions.store"
)

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Multi-Platform Domain Verification Script             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get Kubernetes IP
echo -e "${YELLOW}🔍 Checking Kubernetes Load Balancer IP...${NC}"
K8S_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)

if [ -z "$K8S_IP" ]; then
    echo -e "${RED}❌ Could not get Kubernetes Load Balancer IP${NC}"
    echo -e "${YELLOW}   Make sure ingress-nginx is installed and has an EXTERNAL-IP${NC}"
    echo ""
    K8S_IP="NOT_CONFIGURED"
else
    echo -e "${GREEN}✅ Kubernetes IP: $K8S_IP${NC}"
fi
echo ""

# DNS Checks
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}DNS CONFIGURATION CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

DNS_SUCCESS=0
DNS_FAIL=0

for domain in "${DOMAINS[@]}"; do
    printf "%-35s" "$domain"

    # Check if dig is available
    if ! command -v dig &> /dev/null; then
        echo -e "${YELLOW}⚠️  dig not installed${NC}"
        continue
    fi

    # Get DNS A record
    RESOLVED_IP=$(dig +short "$domain" A | head -n 1)

    if [ -z "$RESOLVED_IP" ]; then
        echo -e "${RED}❌ NOT RESOLVED${NC}"
        ((DNS_FAIL++))
    elif [ "$RESOLVED_IP" == "$K8S_IP" ]; then
        echo -e "${GREEN}✅ $RESOLVED_IP (CORRECT)${NC}"
        ((DNS_SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  $RESOLVED_IP (Expected: $K8S_IP)${NC}"
        ((DNS_FAIL++))
    fi
done

echo ""
echo -e "${BLUE}DNS Summary: ${GREEN}$DNS_SUCCESS passed${NC}, ${RED}$DNS_FAIL failed${NC}"
echo ""

# SSL Certificate Checks
if [ "$K8S_IP" != "NOT_CONFIGURED" ]; then
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}SSL CERTIFICATE CHECK${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""

    # Check cert-manager
    echo -e "${YELLOW}🔍 Checking cert-manager installation...${NC}"
    if kubectl get pods -n cert-manager &> /dev/null; then
        CERT_MANAGER_PODS=$(kubectl get pods -n cert-manager --no-headers 2>/dev/null | wc -l)
        CERT_MANAGER_READY=$(kubectl get pods -n cert-manager --no-headers 2>/dev/null | grep "Running" | wc -l)

        if [ "$CERT_MANAGER_READY" -eq "$CERT_MANAGER_PODS" ] && [ "$CERT_MANAGER_PODS" -ge 3 ]; then
            echo -e "${GREEN}✅ cert-manager is running ($CERT_MANAGER_READY/$CERT_MANAGER_PODS pods)${NC}"
        else
            echo -e "${YELLOW}⚠️  cert-manager pods: $CERT_MANAGER_READY/$CERT_MANAGER_PODS ready${NC}"
        fi
    else
        echo -e "${RED}❌ cert-manager not installed${NC}"
        echo -e "${YELLOW}   Install with: kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml${NC}"
    fi
    echo ""

    # Check ClusterIssuer
    echo -e "${YELLOW}🔍 Checking Let's Encrypt ClusterIssuer...${NC}"
    if kubectl get clusterissuer letsencrypt-prod &> /dev/null; then
        echo -e "${GREEN}✅ letsencrypt-prod ClusterIssuer exists${NC}"
    else
        echo -e "${RED}❌ letsencrypt-prod ClusterIssuer not found${NC}"
        echo -e "${YELLOW}   See DNS-SETUP-GUIDE.md for creation instructions${NC}"
    fi
    echo ""

    # Check Certificates
    echo -e "${YELLOW}🔍 Checking SSL certificates...${NC}"
    if kubectl get certificates -n ai-solutions &> /dev/null; then
        echo ""
        kubectl get certificates -n ai-solutions
        echo ""

        CERTS_TOTAL=$(kubectl get certificates -n ai-solutions --no-headers 2>/dev/null | wc -l)
        CERTS_READY=$(kubectl get certificates -n ai-solutions --no-headers 2>/dev/null | grep "True" | wc -l)

        if [ "$CERTS_READY" -eq "$CERTS_TOTAL" ] && [ "$CERTS_TOTAL" -ge 4 ]; then
            echo -e "${GREEN}✅ All certificates are ready ($CERTS_READY/$CERTS_TOTAL)${NC}"
        else
            echo -e "${YELLOW}⚠️  Certificates: $CERTS_READY/$CERTS_TOTAL ready${NC}"
            echo -e "${YELLOW}   Certificates can take 5-10 minutes to issue after DNS propagates${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  No certificates found in ai-solutions namespace${NC}"
        echo -e "${YELLOW}   They will be created automatically after DNS propagates${NC}"
    fi
    echo ""
fi

# HTTP/HTTPS Checks
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}HTTP/HTTPS CONNECTIVITY CHECK${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

HTTP_SUCCESS=0
HTTP_FAIL=0

# Check main domains with HTTPS
MAIN_DOMAINS=(
    "https://aidoesitall.org"
    "https://claudedroid.ai"
    "https://api.claudedroid.ai"
    "https://ai-solutions.store"
    "https://dashboard.ai-solutions.store"
)

for url in "${MAIN_DOMAINS[@]}"; do
    printf "%-45s" "$url"

    # Try to connect
    if curl -s -o /dev/null -w "%{http_code}" --max-time 10 --insecure "$url" > /dev/null 2>&1; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 --insecure "$url")

        if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "301" ] || [ "$HTTP_CODE" == "302" ] || [ "$HTTP_CODE" == "404" ]; then
            echo -e "${GREEN}✅ HTTP $HTTP_CODE${NC}"
            ((HTTP_SUCCESS++))
        else
            echo -e "${YELLOW}⚠️  HTTP $HTTP_CODE${NC}"
            ((HTTP_FAIL++))
        fi
    else
        echo -e "${RED}❌ CONNECTION FAILED${NC}"
        ((HTTP_FAIL++))
    fi
done

echo ""
echo -e "${BLUE}HTTP Summary: ${GREEN}$HTTP_SUCCESS reachable${NC}, ${RED}$HTTP_FAIL unreachable${NC}"
echo ""

# Final Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}FINAL SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

TOTAL_CHECKS=$((DNS_SUCCESS + HTTP_SUCCESS))
TOTAL_FAILS=$((DNS_FAIL + HTTP_FAIL))

if [ "$TOTAL_FAILS" -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED! 🎉${NC}"
    echo -e "${GREEN}   Your domains are properly configured and ready to use!${NC}"
    echo ""
    echo -e "${BLUE}Access your platforms:${NC}"
    echo -e "   🏛️  DAO: https://aidoesitall.org"
    echo -e "   🤖 AI:  https://claudedroid.ai"
    echo -e "   🛒 Marketplace: https://ai-solutions.store"
    echo -e "   📊 Dashboard: https://dashboard.ai-solutions.store"
elif [ "$DNS_FAIL" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  DNS CONFIGURATION INCOMPLETE${NC}"
    echo -e "${YELLOW}   Follow the instructions in DNS-SETUP-GUIDE.md${NC}"
    echo -e "${YELLOW}   DNS propagation can take 5-30 minutes${NC}"
elif [ "$HTTP_FAIL" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  SERVICES NOT FULLY DEPLOYED${NC}"
    echo -e "${YELLOW}   Make sure Kubernetes pods are running:${NC}"
    echo -e "${YELLOW}   kubectl get pods -n ai-solutions${NC}"
fi

echo ""
echo -e "${BLUE}For detailed troubleshooting, see: ${NC}docs/DNS-SETUP-GUIDE.md"
echo ""
