#!/bin/bash

###############################################################################
# RAILWAY API AUTOMATED DEPLOYMENT
# Team Claude For The Kids
#
# This script uses Railway CLI and API to deploy automatically
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║     🚂 RAILWAY AUTOMATED DEPLOYMENT 🚂                        ║
║                                                               ║
║     Deploy Team Claude For The Kids via Railway API          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

###############################################################################
# STEP 1: Install Railway CLI
###############################################################################

log_info "Step 1: Installing Railway CLI..."

if ! command -v railway &> /dev/null; then
    log_info "Railway CLI not found. Installing..."

    # Install Railway CLI
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        log_info "Detected macOS. Installing via Homebrew..."
        brew install railway
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        log_info "Detected Linux. Installing via npm..."
        npm install -g @railway/cli
    else
        # Windows or other
        log_warning "Please install Railway CLI manually:"
        echo "npm install -g @railway/cli"
        echo "Or visit: https://docs.railway.app/develop/cli"
        exit 1
    fi

    log_success "Railway CLI installed"
else
    log_success "Railway CLI already installed"
fi

###############################################################################
# STEP 2: Get API Token
###############################################################################

log_info "Step 2: Setting up Railway authentication..."

# Check if already logged in
if railway whoami &> /dev/null; then
    log_success "Already logged in to Railway"
else
    log_warning "Not logged in to Railway"
    log_info "Opening Railway login..."
    echo ""
    echo "Please follow these steps:"
    echo "1. You'll be redirected to Railway website"
    echo "2. Log in with GitHub (or create account)"
    echo "3. Authorize the CLI"
    echo "4. Return here when done"
    echo ""
    read -p "Press ENTER to open login page..."

    railway login

    if railway whoami &> /dev/null; then
        log_success "Successfully logged in to Railway"
    else
        log_error "Login failed. Please try again."
        exit 1
    fi
fi

###############################################################################
# STEP 3: Check Environment Variables
###############################################################################

log_info "Step 3: Checking environment variables..."

if [ ! -f ".env.production" ]; then
    log_error ".env.production not found!"
    log_info "Creating from template..."
    cp .env.production.example .env.production

    echo ""
    log_warning "Please edit .env.production with your credentials:"
    echo ""
    echo "Required variables:"
    echo "  - SQUARE_ACCESS_TOKEN (get from https://developer.squareup.com/apps)"
    echo "  - SQUARE_APP_ID (same location)"
    echo "  - PERPLEXITY_API_KEY (get from https://perplexity.ai/settings/api)"
    echo ""
    read -p "Press ENTER after you've configured .env.production..."
fi

# Load environment variables
source .env.production

# Validate required variables
if [ -z "$SQUARE_ACCESS_TOKEN" ] || [ "$SQUARE_ACCESS_TOKEN" = "your_square_production_token" ]; then
    log_error "SQUARE_ACCESS_TOKEN not configured!"
    log_info "Get it from: https://developer.squareup.com/apps"
    exit 1
fi

if [ -z "$SQUARE_APP_ID" ] || [ "$SQUARE_APP_ID" = "your_app_id" ]; then
    log_error "SQUARE_APP_ID not configured!"
    log_info "Get it from: https://developer.squareup.com/apps"
    exit 1
fi

if [ -z "$PERPLEXITY_API_KEY" ] || [ "$PERPLEXITY_API_KEY" = "your_perplexity_key" ]; then
    log_warning "PERPLEXITY_API_KEY not configured"
    log_info "Marketing automation won't work without it"
    log_info "Get it from: https://perplexity.ai/settings/api"
fi

log_success "Environment variables configured"

###############################################################################
# STEP 4: Initialize Railway Project
###############################################################################

log_info "Step 4: Initializing Railway project..."

# Check if railway.json or railway.toml exists
if [ -f "railway.json" ] || [ -f "railway.toml" ]; then
    log_success "Railway project already initialized"
else
    log_info "Creating new Railway project..."

    railway init

    if [ $? -eq 0 ]; then
        log_success "Railway project created"
    else
        log_error "Failed to create Railway project"
        exit 1
    fi
fi

###############################################################################
# STEP 5: Add PostgreSQL Database
###############################################################################

log_info "Step 5: Adding PostgreSQL database..."

# Check if database already exists
if railway variables | grep -q "DATABASE_URL"; then
    log_success "Database already configured"
else
    log_info "Adding PostgreSQL database..."

    railway add --database postgres

    if [ $? -eq 0 ]; then
        log_success "PostgreSQL database added"
    else
        log_warning "Database add failed or already exists"
    fi
fi

###############################################################################
# STEP 6: Set Environment Variables
###############################################################################

log_info "Step 6: Setting environment variables..."

# Set production environment variables
railway variables set NODE_ENV=production
railway variables set SQUARE_ENVIRONMENT=production
railway variables set SQUARE_ACCESS_TOKEN="$SQUARE_ACCESS_TOKEN"
railway variables set SQUARE_APP_ID="$SQUARE_APP_ID"

if [ -n "$PERPLEXITY_API_KEY" ] && [ "$PERPLEXITY_API_KEY" != "your_perplexity_key" ]; then
    railway variables set PERPLEXITY_API_KEY="$PERPLEXITY_API_KEY"
fi

# Optional variables
if [ -n "$GOOGLE_ADS_API_KEY" ]; then
    railway variables set GOOGLE_ADS_API_KEY="$GOOGLE_ADS_API_KEY"
fi

if [ -n "$SENDGRID_API_KEY" ]; then
    railway variables set SENDGRID_API_KEY="$SENDGRID_API_KEY"
fi

log_success "Environment variables set"

###############################################################################
# STEP 7: Deploy Application
###############################################################################

log_info "Step 7: Deploying application..."

log_info "This will build and deploy your application (takes 3-5 minutes)..."

railway up

if [ $? -eq 0 ]; then
    log_success "Deployment successful!"
else
    log_error "Deployment failed"
    log_info "Check logs with: railway logs"
    exit 1
fi

###############################################################################
# STEP 8: Get Deployment Information
###############################################################################

log_info "Step 8: Getting deployment information..."

# Get project info
echo ""
log_success "Deployment Information:"
echo ""

# Get domain
DOMAIN=$(railway domain)
if [ -n "$DOMAIN" ]; then
    echo "🌐 Frontend URL: https://$DOMAIN"
else
    log_warning "No domain configured yet"
    log_info "Run: railway domain to generate one"
fi

# Get project ID
PROJECT_ID=$(railway status --json | grep -o '"projectId":"[^"]*' | cut -d'"' -f4)
if [ -n "$PROJECT_ID" ]; then
    echo "📦 Project ID: $PROJECT_ID"
fi

# Get environment
ENVIRONMENT=$(railway status --json | grep -o '"environment":"[^"]*' | cut -d'"' -f4)
if [ -n "$ENVIRONMENT" ]; then
    echo "🏗️  Environment: $ENVIRONMENT"
fi

echo ""

###############################################################################
# STEP 9: Run Database Migrations (Optional)
###############################################################################

log_info "Step 9: Database migrations..."

if [ -d "database/migrations" ]; then
    log_info "Found database migrations directory"
    read -p "Run migrations now? (y/n): " RUN_MIGRATIONS

    if [ "$RUN_MIGRATIONS" = "y" ]; then
        log_info "Running migrations..."
        railway run npm run migrate
        log_success "Migrations completed"
    else
        log_warning "Skipping migrations. Run manually with: railway run npm run migrate"
    fi
else
    log_info "No migrations directory found, skipping"
fi

###############################################################################
# STEP 10: Display Next Steps
###############################################################################

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           🎉 DEPLOYMENT COMPLETE! 🎉                           ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

log_success "Your application is now live on Railway!"
echo ""

if [ -n "$DOMAIN" ]; then
    echo "🌐 Visit your platform: https://$DOMAIN"
else
    log_warning "Generate a domain with: railway domain"
fi

echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Visit your platform URL"
echo "2. Create a test account"
echo "3. Test payment with test card: 4111 1111 1111 1111"
echo "4. Verify payment in Square Dashboard: https://squareup.com/dashboard"
echo "5. Share on social media and start growing!"
echo ""

echo "🛠️  USEFUL COMMANDS:"
echo ""
echo "  railway logs          # View application logs"
echo "  railway open          # Open Railway dashboard"
echo "  railway status        # Check deployment status"
echo "  railway domain        # Generate/view domain"
echo "  railway variables     # List environment variables"
echo "  railway run [command] # Run command in Railway environment"
echo ""

echo "💰 REVENUE TRACKING:"
echo ""
echo "  Square Dashboard: https://squareup.com/dashboard"
echo "  Railway Dashboard: https://railway.app/dashboard"
echo ""

echo "💚 CHARITY IMPACT:"
echo ""
echo "  50% of all revenue → Shriners Children's Hospitals"
echo "  Target: $1.2M+ Year 1 = $600K+ donated to kids!"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

log_success "Deployment script completed successfully!"
echo ""
log_info "Need help? Check the documentation:"
echo "  - DEPLOY-RAILWAY.md"
echo "  - CLOUD-DEPLOYMENT-README.md"
echo "  - deploy.html (open in browser)"
echo ""

log_success "🚀 You're live! Start making money for charity! 💚"
