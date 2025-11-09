#!/bin/bash
# Enhanced Netlify Deployment Script for Team Claude Dashboard
# Ai-Solutions.Store Platform
# Mission: 50% to Shriners Children's Hospitals

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Team Claude Dashboard - Netlify Deployment         ║"
echo "║   Ai-Solutions.Store Platform                         ║"
echo "║   💙 50% to Shriners Children's Hospitals            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Check for Netlify CLI
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}⚠️  Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
    echo -e "${GREEN}✅ Netlify CLI installed${NC}"
else
    echo -e "${GREEN}✅ Netlify CLI found: $(netlify --version)${NC}"
fi

# Verify we're in the correct directory
if [ ! -f "index.html" ]; then
    echo -e "${RED}❌ index.html not found!${NC}"
    echo "Please run this script from the team-claude-dashboard-deploy directory"
    exit 1
fi

# Display files to be deployed
echo ""
echo -e "${BLUE}📋 Files to deploy:${NC}"
ls -lh --color=auto | grep -v total

# File verification
echo ""
echo -e "${BLUE}🔍 Verifying deployment files...${NC}"
REQUIRED_FILES=("index.html" "styles.css" "script.js")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✓ $file${NC}"
    else
        echo -e "${RED}  ✗ $file - MISSING!${NC}"
        exit 1
    fi
done

# Get file sizes
HTML_SIZE=$(stat -c%s "index.html" 2>/dev/null || stat -f%z "index.html" 2>/dev/null)
CSS_SIZE=$(stat -c%s "styles.css" 2>/dev/null || stat -f%z "styles.css" 2>/dev/null)
JS_SIZE=$(stat -c%s "script.js" 2>/dev/null || stat -f%z "script.js" 2>/dev/null)

echo -e "${BLUE}"
echo "File sizes:"
echo "  - index.html: $(numfmt --to=iec-i --suffix=B $HTML_SIZE 2>/dev/null || echo ${HTML_SIZE} bytes)"
echo "  - styles.css: $(numfmt --to=iec-i --suffix=B $CSS_SIZE 2>/dev/null || echo ${CSS_SIZE} bytes)"
echo "  - script.js: $(numfmt --to=iec-i --suffix=B $JS_SIZE 2>/dev/null || echo ${JS_SIZE} bytes)"
echo -e "${NC}"

# Authentication
echo -e "${GREEN}🔐 Authenticating with Netlify...${NC}"
netlify status &> /dev/null || {
    echo -e "${YELLOW}Please login to Netlify...${NC}"
    netlify login
}

echo -e "${GREEN}✅ Authenticated${NC}"

# Check if already linked to a site
if [ ! -f ".netlify/state.json" ]; then
    echo -e "${BLUE}🌐 No Netlify site found. Creating new site...${NC}"
    echo ""
    echo "Site configuration:"
    echo "  - Suggested name: team-claude-dashboard"
    echo "  - Alternative names: team-claude, claude-dashboard, ai-solutions-dashboard"
    echo ""

    # Initialize new site
    netlify init
else
    echo -e "${GREEN}✅ Found existing Netlify site configuration${NC}"
    netlify status
fi

# Create a simple netlify.toml if it doesn't exist
if [ ! -f "netlify.toml" ]; then
    echo -e "${BLUE}📝 Creating netlify.toml configuration...${NC}"
    cat > netlify.toml << 'EOF'
[build]
  publish = "."

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
EOF
    echo -e "${GREEN}✅ netlify.toml created${NC}"
fi

# Deployment confirmation
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}   Ready to deploy Team Claude Dashboard${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
read -p "Deploy to PRODUCTION now? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    echo "To deploy later, run: netlify deploy --prod --dir=. --message=\"Production deploy\""
    exit 0
fi

# Deploy to production
echo ""
echo -e "${GREEN}🚀 Deploying to Netlify Production...${NC}"
DEPLOY_MESSAGE="Team Claude Dashboard - Production Deploy - $(date '+%Y-%m-%d %H:%M:%S')"

netlify deploy --prod --dir=. --message="$DEPLOY_MESSAGE"

# Get deployment info
DEPLOY_INFO=$(netlify status)

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   ✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 Your dashboard is now live!${NC}"
echo ""
echo "Next steps:"
echo "  1. Visit your dashboard URL (shown above)"
echo "  2. Configure custom domain (optional):"
echo "     - Recommended: dashboard.youandinotai.com"
echo "     - Alternative: team.youandinotai.com"
echo "  3. Set up DNS in Cloudflare:"
echo "     - Type: CNAME"
echo "     - Name: dashboard"
echo "     - Target: [your-site].netlify.app"
echo "     - Proxy: DNS only"
echo ""
echo -e "${BLUE}💙 Team Claude For The Kids${NC}"
echo -e "${BLUE}   50% of profits to Shriners Children's Hospitals${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Save deployment info
cat > DEPLOYMENT_INFO.txt << EOF
Team Claude Dashboard - Deployment Info
Generated: $(date)

Deployment Status: SUCCESS
Deploy Time: $(date '+%Y-%m-%d %H:%M:%S')
Deploy Message: $DEPLOY_MESSAGE

Files Deployed:
- index.html ($(numfmt --to=iec-i --suffix=B $HTML_SIZE 2>/dev/null || echo ${HTML_SIZE} bytes))
- styles.css ($(numfmt --to=iec-i --suffix=B $CSS_SIZE 2>/dev/null || echo ${CSS_SIZE} bytes))
- script.js ($(numfmt --to=iec-i --suffix=B $JS_SIZE 2>/dev/null || echo ${JS_SIZE} bytes))

Platform: Netlify
Mission: 50% to Shriners Children's Hospitals

Next Steps:
1. Configure custom domain
2. Integrate with main platform
3. Set up monitoring
4. Enable analytics

For updates, run: ./deploy-netlify.sh
EOF

echo -e "${GREEN}✅ Deployment info saved to DEPLOYMENT_INFO.txt${NC}"
echo ""
echo "🎉 Deployment complete! Your dashboard is live and helping kids!"
