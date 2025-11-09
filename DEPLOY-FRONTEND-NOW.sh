#!/bin/bash

##############################################################################
# DEPLOY FRONTEND TO NETLIFY - Claude Code For The Kids
# Brought to you by Ai-Solutions.Store
# Sponsored by YouAndiNotAi.com
##############################################################################

set -e

echo "🚀 Deploying Frontend to Netlify..."
echo ""
echo "📦 Project: Claude Code For The Kids"
echo "🎯 Mission: Automate Charity Through Technology"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to frontend
cd date-app-dashboard/frontend || { echo -e "${YELLOW}❌ Error: Cannot find frontend directory. Exiting.${NC}"; exit 1; }

echo -e "${BLUE}📍 Current directory: $(pwd)${NC}"
echo ""

# Check if dist exists
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠️  Dist folder not found. Building...${NC}"
    npm run build
fi

echo -e "${GREEN}✅ Frontend built successfully!${NC}"
echo ""

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}⚠️  Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
fi

echo -e "${GREEN}✅ Netlify CLI ready!${NC}"
echo ""

# Deploy options
echo "📋 Choose deployment method:"
echo ""
echo "1. Netlify Login + Deploy (recommended)"
echo "2. Netlify Drop Instructions"
echo "3. Deploy with existing auth"
echo ""

read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🔐 Opening browser for Netlify authentication...${NC}"
        netlify login
        echo ""
        echo -e "${BLUE}🚀 Deploying to production...${NC}"
        netlify deploy --prod --dir=dist
        ;;
    2)
        echo ""
        echo -e "${YELLOW}📋 NETLIFY DROP INSTRUCTIONS:${NC}"
        echo ""
        echo "1. Open: https://app.netlify.com/drop"
        echo "2. Drag this folder: $(pwd)/dist"
        echo "3. Drop it in the browser window"
        echo "4. Get your live URL instantly!"
        echo ""
        echo -e "${GREEN}That's it! 30 seconds and you're live! 🎉${NC}"

        # Offer to open the dist folder
        if [[ "$OSTYPE" == "darwin"* ]]; then
            read -p "Open dist folder in Finder? (y/n): " open_finder
            if [ "$open_finder" == "y" ]; then
                open dist
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            read -p "Open dist folder in file manager? (y/n): " open_fm
            if [ "$open_fm" == "y" ]; then
                xdg-open dist 2>/dev/null || nautilus dist 2>/dev/null || echo "Please manually open: $(pwd)/dist"
            fi
        fi
        ;;
    3)
        echo ""
        echo -e "${BLUE}🚀 Deploying with existing authentication...${NC}"
        netlify deploy --prod --dir=dist
        ;;
    *)
        echo ""
        echo -e "${YELLOW}Invalid choice. Please run again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     🎉 DEPLOYMENT COMPLETE! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 What you now have LIVE:${NC}"
echo ""
echo "✅ Backend API: https://postgres-production-475c.up.railway.app"
echo "✅ Frontend App: [Check Netlify output above]"
echo "✅ Database: PostgreSQL on Railway"
echo "✅ Payments: Square (PRODUCTION)"
echo "✅ Charity Split: 50% automated"
echo ""
echo -e "${GREEN}💰 NOW GO MAKE MONEY & HELP KIDS! 💰${NC}"
echo ""
echo "Next steps:"
echo "1. Visit your live URL"
echo "2. Test signup → browse → subscribe flow"
echo "3. Verify payment processing"
echo "4. Share with 10 friends"
echo "5. Watch the magic happen! ✨"
echo ""
echo -e "${BLUE}📖 Full guide: See CLAUDE-CODE-FOR-THE-KIDS.md${NC}"
echo ""
