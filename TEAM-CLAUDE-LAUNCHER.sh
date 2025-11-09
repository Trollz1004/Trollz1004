#!/bin/bash
# Team Claude Dashboard - 1-Click Launcher
# Ai-Solutions.Store Platform
# 💙 50% to Shriners Children's Hospitals

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
clear
echo -e "${GREEN}"
cat << "EOF"
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
EOF
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
DASHBOARD_DIR="$SCRIPT_DIR/team-claude-dashboard-deploy"

echo -e "${CYAN}🚀 Team Claude Dashboard - 1-Click Launcher${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to open URL
open_url() {
    local url=$1
    echo -e "${BLUE}🌐 Opening: $url${NC}"

    if command_exists xdg-open; then
        xdg-open "$url" &>/dev/null &
    elif command_exists gnome-open; then
        gnome-open "$url" &>/dev/null &
    elif command_exists kde-open; then
        kde-open "$url" &>/dev/null &
    elif command_exists open; then
        open "$url" &>/dev/null &
    else
        echo -e "${YELLOW}⚠️  Please manually open: $url${NC}"
    fi
    sleep 1
}

# Menu
echo -e "${YELLOW}What would you like to do?${NC}"
echo ""
echo "  1) 🚀 Deploy Dashboard to Netlify (Production)"
echo "  2) 🌐 Open All Platform URLs"
echo "  3) 📊 Open Dashboard (if deployed)"
echo "  4) 🔧 Start Local Development Server"
echo "  5) 💙 View Charity Impact"
echo "  6) 📋 View Deployment Status"
echo "  7) 🛠️  Run All Services (Server + Open URLs)"
echo "  8) ❌ Exit"
echo ""
read -p "Enter choice [1-8]: " choice

case $choice in
    1)
        echo ""
        echo -e "${GREEN}🚀 Starting Netlify Deployment...${NC}"
        echo ""

        if [ ! -d "$DASHBOARD_DIR" ]; then
            echo -e "${RED}❌ Dashboard directory not found!${NC}"
            echo "Expected: $DASHBOARD_DIR"
            exit 1
        fi

        cd "$DASHBOARD_DIR"

        if [ -f "deploy-netlify.sh" ]; then
            ./deploy-netlify.sh
        else
            echo -e "${RED}❌ deploy-netlify.sh not found!${NC}"
            exit 1
        fi
        ;;

    2)
        echo ""
        echo -e "${GREEN}🌐 Opening All Platform URLs...${NC}"
        echo ""

        # Main platform URLs
        open_url "https://youandinotai.com"
        open_url "https://www.youandinotai.com"

        # Dashboard URLs (try multiple potential URLs)
        open_url "https://dashboard.youandinotai.com"

        # Dating platform
        echo -e "${BLUE}Main Platform: youandinotai.com${NC}"
        echo -e "${BLUE}Dashboard: dashboard.youandinotai.com${NC}"

        echo ""
        echo -e "${GREEN}✅ All URLs opened in your browser!${NC}"
        ;;

    3)
        echo ""
        echo -e "${GREEN}📊 Opening Dashboard...${NC}"
        echo ""

        # Try to get Netlify URL
        if [ -d "$DASHBOARD_DIR" ]; then
            cd "$DASHBOARD_DIR"

            if [ -f ".netlify/state.json" ]; then
                # Get the site URL from Netlify
                NETLIFY_URL=$(netlify status 2>/dev/null | grep -oP 'https://[^/]+\.netlify\.app' | head -1)

                if [ -n "$NETLIFY_URL" ]; then
                    echo -e "${GREEN}Found deployed dashboard: $NETLIFY_URL${NC}"
                    open_url "$NETLIFY_URL"
                else
                    echo -e "${YELLOW}⚠️  Dashboard URL not found. Trying common URLs...${NC}"
                    open_url "https://dashboard.youandinotai.com"
                fi
            else
                echo -e "${YELLOW}⚠️  Dashboard not deployed yet. Run option 1 to deploy.${NC}"
            fi
        else
            echo -e "${RED}❌ Dashboard directory not found!${NC}"
        fi
        ;;

    4)
        echo ""
        echo -e "${GREEN}🔧 Starting Local Development Server...${NC}"
        echo ""

        if [ ! -d "$DASHBOARD_DIR" ]; then
            echo -e "${RED}❌ Dashboard directory not found!${NC}"
            exit 1
        fi

        cd "$DASHBOARD_DIR"

        # Check for python3
        if command_exists python3; then
            echo -e "${BLUE}Starting Python HTTP server on port 8000...${NC}"
            echo -e "${YELLOW}Dashboard will be available at: http://localhost:8000${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
            echo ""
            sleep 2
            open_url "http://localhost:8000"
            python3 -m http.server 8000
        elif command_exists python; then
            echo -e "${BLUE}Starting Python HTTP server on port 8000...${NC}"
            echo -e "${YELLOW}Dashboard will be available at: http://localhost:8000${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
            echo ""
            sleep 2
            open_url "http://localhost:8000"
            python -m SimpleHTTPServer 8000
        elif command_exists php; then
            echo -e "${BLUE}Starting PHP built-in server on port 8000...${NC}"
            echo -e "${YELLOW}Dashboard will be available at: http://localhost:8000${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
            echo ""
            sleep 2
            open_url "http://localhost:8000"
            php -S localhost:8000
        else
            echo -e "${RED}❌ No suitable HTTP server found!${NC}"
            echo "Please install Python or PHP to run local server."
            echo ""
            echo "Alternative: Install http-server globally:"
            echo "  npm install -g http-server"
            echo "  Then run: http-server -p 8000"
        fi
        ;;

    5)
        echo ""
        echo -e "${MAGENTA}💙 Team Claude For The Kids - Charity Impact${NC}"
        echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${CYAN}Mission:${NC}"
        echo "  50% of all profits go directly to Shriners Children's Hospitals"
        echo ""
        echo -e "${CYAN}Impact:${NC}"
        echo "  • Every subscription helps children receive world-class medical care"
        echo "  • Every user brings us closer to our charity goals"
        echo "  • 100% transparent profit sharing"
        echo ""
        echo -e "${CYAN}Platform Revenue Model:${NC}"
        echo "  • 50% → Shriners Children's Hospitals"
        echo "  • 50% → Platform operations & growth"
        echo ""
        echo -e "${GREEN}Together, we're proving that technology and compassion can change the world!${NC}"
        echo ""
        echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -p "Press Enter to continue..."
        ;;

    6)
        echo ""
        echo -e "${GREEN}📋 Deployment Status${NC}"
        echo ""

        if [ -d "$DASHBOARD_DIR" ]; then
            cd "$DASHBOARD_DIR"

            if [ -f "DEPLOYMENT_INFO.txt" ]; then
                cat DEPLOYMENT_INFO.txt
            else
                echo -e "${YELLOW}⚠️  No deployment info found.${NC}"
                echo "Dashboard may not be deployed yet."
                echo ""
                echo "Run option 1 to deploy the dashboard."
            fi

            echo ""

            if [ -f ".netlify/state.json" ]; then
                echo -e "${GREEN}Netlify Status:${NC}"
                netlify status 2>/dev/null || echo "Unable to get status"
            fi
        else
            echo -e "${RED}❌ Dashboard directory not found!${NC}"
        fi

        echo ""
        read -p "Press Enter to continue..."
        ;;

    7)
        echo ""
        echo -e "${GREEN}🛠️  Starting All Services...${NC}"
        echo ""

        # Open all URLs first
        echo -e "${BLUE}Step 1: Opening all platform URLs...${NC}"
        open_url "https://youandinotai.com"
        open_url "https://dashboard.youandinotai.com"

        # Try to open deployed dashboard
        if [ -d "$DASHBOARD_DIR/.netlify" ]; then
            cd "$DASHBOARD_DIR"
            NETLIFY_URL=$(netlify status 2>/dev/null | grep -oP 'https://[^/]+\.netlify\.app' | head -1)
            if [ -n "$NETLIFY_URL" ]; then
                open_url "$NETLIFY_URL"
            fi
        fi

        echo ""
        echo -e "${BLUE}Step 2: Starting local development server...${NC}"
        echo ""

        if [ ! -d "$DASHBOARD_DIR" ]; then
            echo -e "${RED}❌ Dashboard directory not found!${NC}"
            exit 1
        fi

        cd "$DASHBOARD_DIR"

        if command_exists python3; then
            echo -e "${YELLOW}Local dashboard: http://localhost:8000${NC}"
            echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
            echo ""
            sleep 2
            open_url "http://localhost:8000"
            python3 -m http.server 8000
        else
            echo -e "${RED}❌ Python not found. Cannot start local server.${NC}"
        fi
        ;;

    8)
        echo ""
        echo -e "${CYAN}Thank you for using Team Claude Dashboard!${NC}"
        echo -e "${MAGENTA}💙 50% to Shriners Children's Hospitals${NC}"
        echo ""
        exit 0
        ;;

    *)
        echo ""
        echo -e "${RED}❌ Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Thank you for using Team Claude Dashboard!${NC}"
echo -e "${MAGENTA}💙 50% to Shriners Children's Hospitals${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
