#!/bin/bash

# ============================================
# Complete Health Check Script
# Monitors all services across all platforms
# ============================================

echo "=== COMPLETE SYSTEM HEALTH CHECK ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local name=$1
    local url=$2
    local expected=$3

    echo -n "Checking $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$response" = "$expected" ] || [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ ONLINE${NC}"
        return 0
    else
        echo -e "${RED}❌ OFFLINE (HTTP $response)${NC}"
        return 1
    fi
}

# CloudeDroid Platform
echo "=== CloudeDroid Platform ==="
check_service "CloudeDroid Server" "http://localhost:3456/health" "200"
check_service "AI Agents Endpoint" "http://localhost:3456/api/agents/status" "200"
check_service "DAO Metrics" "http://localhost:3456/api/dao/metrics" "200"
echo ""

# YouAndINotAI Platform
echo "=== YouAndINotAI Platform ==="
check_service "Backend API" "http://localhost:4000/health" "200"
check_service "Frontend" "http://localhost:3000" "200"
check_service "Dashboard" "http://localhost:8080" "200"
echo ""

# Infrastructure
echo "=== Infrastructure ==="

# PostgreSQL
if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "PostgreSQL... ${GREEN}✅ RUNNING${NC}"
else
    echo -e "PostgreSQL... ${RED}❌ DOWN${NC}"
fi

# Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "Redis... ${GREEN}✅ RUNNING${NC}"
else
    echo -e "Redis... ${YELLOW}⚠️  NOT RUNNING (optional)${NC}"
fi

echo ""

# System Resources
echo "=== System Resources ==="
echo -n "CPU Load: "
uptime | awk -F'load average:' '{print $2}'

echo -n "Memory: "
free -h | grep Mem | awk '{printf "%s / %s (%.1f%%)\n", $3, $2, ($3/$2)*100}'

echo -n "Disk: "
df -h / | tail -1 | awk '{printf "%s / %s (%s)\n", $3, $2, $5}'

echo ""

# Process Status
echo "=== Running Processes ==="
echo "Node.js processes:"
ps aux | grep node | grep -v grep | wc -l | xargs echo "  Active:"

echo ""
echo "=== Health Check Complete ==="
