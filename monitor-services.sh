#!/bin/bash

# ============================================
# Continuous Service Monitor
# Real-time monitoring with auto-restart
# ============================================

echo "=== CONTINUOUS SERVICE MONITOR ==="
echo "Press Ctrl+C to stop"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

restart_service() {
    local service=$1
    echo -e "${YELLOW}🔄 Restarting $service...${NC}"

    case $service in
        "cloudedroid")
            pkill -f "node.*cloudedroid-production/server.js"
            sleep 2
            cd /home/user/Trollz1004/cloudedroid-production
            node server.js > /tmp/cloudedroid.log 2>&1 &
            ;;
        "backend")
            pkill -f "node.*date-app-dashboard/backend"
            sleep 2
            cd /home/user/Trollz1004/date-app-dashboard/backend
            npm start > /tmp/backend.log 2>&1 &
            ;;
    esac

    echo -e "${GREEN}✅ $service restarted${NC}"
}

while true; do
    clear
    date
    echo ""

    # CloudeDroid
    if curl -s http://localhost:3456/health > /dev/null 2>&1; then
        echo -e "CloudeDroid:  ${GREEN}●${NC} ONLINE"
    else
        echo -e "CloudeDroid:  ${RED}●${NC} OFFLINE"
        restart_service "cloudedroid"
    fi

    # Backend
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e "Backend API:  ${GREEN}●${NC} ONLINE"
    else
        echo -e "Backend API:  ${RED}●${NC} OFFLINE (expected if not started)"
    fi

    # Frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "Frontend:     ${GREEN}●${NC} ONLINE"
    else
        echo -e "Frontend:     ${YELLOW}●${NC} OFFLINE (expected if not started)"
    fi

    echo ""
    echo "Next check in 10 seconds..."
    sleep 10
done
