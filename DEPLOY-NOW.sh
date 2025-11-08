#!/bin/bash

###############################################################################
# DEPLOY NOW - Quick Cloud Deployment Script
# Team Claude For The Kids
#
# This script deploys to Google Cloud Run (serverless) which doesn't
# require Docker locally - Google Cloud Build handles container building
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
╔═══════════════════════════════════════════════════════════╗
║     TEAM CLAUDE - INSTANT CLOUD DEPLOYMENT 🚀              ║
║                                                           ║
║     Deploy to Google Cloud in minutes                     ║
║     No Docker required locally!                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-team-claude-prod-$(date +%s)}"
REGION="${GCP_REGION:-us-central1}"

log_info "Project ID: $PROJECT_ID"
log_info "Region: $REGION"
echo ""

###############################################################################
# Step 1: Check Prerequisites
###############################################################################

log_info "Step 1: Checking prerequisites..."

if ! command -v gcloud &> /dev/null; then
    log_error "Google Cloud SDK not installed"
    echo ""
    echo "Install from: https://cloud.google.com/sdk/install"
    echo ""
    echo "Quick install on Linux:"
    echo "  curl https://sdk.cloud.google.com | bash"
    echo "  exec -l \$SHELL"
    echo "  gcloud init"
    exit 1
fi

log_success "Google Cloud SDK installed"

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    log_warning "Not logged into Google Cloud"
    log_info "Running: gcloud auth login"
    gcloud auth login
fi

log_success "Authenticated with Google Cloud"

###############################################################################
# Step 2: Create/Select Project
###############################################################################

log_info "Step 2: Setting up Google Cloud Project..."

# Create project if it doesn't exist
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    log_info "Creating new project: $PROJECT_ID"
    gcloud projects create $PROJECT_ID --name="Team Claude Production"
else
    log_success "Project $PROJECT_ID already exists"
fi

gcloud config set project $PROJECT_ID

log_warning "IMPORTANT: Enable billing for project $PROJECT_ID"
log_info "Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
echo ""
read -p "Press ENTER after enabling billing..."

###############################################################################
# Step 3: Enable APIs
###############################################################################

log_info "Step 3: Enabling required Google Cloud APIs..."

gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    secretmanager.googleapis.com \
    storage-api.googleapis.com \
    cloudscheduler.googleapis.com

log_success "APIs enabled"

###############################################################################
# Step 4: Create Database
###############################################################################

log_info "Step 4: Creating PostgreSQL database..."

DB_INSTANCE="teamclaude-db"
DB_PASSWORD=$(openssl rand -base64 32)

if ! gcloud sql instances describe $DB_INSTANCE --project=$PROJECT_ID &> /dev/null; then
    log_info "Creating Cloud SQL instance (this takes 5-10 minutes)..."

    gcloud sql instances create $DB_INSTANCE \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --root-password="$DB_PASSWORD" \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup \
        --backup-start-time=03:00

    log_success "Database instance created"
else
    log_success "Database instance already exists"
fi

# Create database
gcloud sql databases create teamclaude_production \
    --instance=$DB_INSTANCE \
    --project=$PROJECT_ID || true

# Create user
gcloud sql users create teamclaude \
    --instance=$DB_INSTANCE \
    --password="$DB_PASSWORD" \
    --project=$PROJECT_ID || true

log_success "Database configured"

###############################################################################
# Step 5: Create Redis Cache
###############################################################################

log_info "Step 5: Creating Redis cache..."

REDIS_INSTANCE="teamclaude-redis"

if ! gcloud redis instances describe $REDIS_INSTANCE --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_info "Creating Redis instance..."

    gcloud redis instances create $REDIS_INSTANCE \
        --size=1 \
        --region=$REGION \
        --redis-version=redis_6_x \
        --tier=basic \
        --project=$PROJECT_ID

    log_success "Redis instance created"
else
    log_success "Redis instance already exists"
fi

###############################################################################
# Step 6: Store Secrets
###############################################################################

log_info "Step 6: Storing secrets..."

if [ -f ".env.production" ]; then
    source .env.production

    # Store Square token
    if [ -n "$SQUARE_ACCESS_TOKEN" ]; then
        echo -n "$SQUARE_ACCESS_TOKEN" | gcloud secrets create square-token \
            --data-file=- \
            --replication-policy=automatic \
            --project=$PROJECT_ID || true
        log_success "Square token stored"
    fi

    # Store Perplexity key
    if [ -n "$PERPLEXITY_API_KEY" ]; then
        echo -n "$PERPLEXITY_API_KEY" | gcloud secrets create perplexity-key \
            --data-file=- \
            --replication-policy=automatic \
            --project=$PROJECT_ID || true
        log_success "Perplexity key stored"
    fi
fi

# Store database password
echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
    --data-file=- \
    --replication-policy=automatic \
    --project=$PROJECT_ID || true

###############################################################################
# Step 7: Build and Deploy Backend
###############################################################################

log_info "Step 7: Building and deploying backend API..."

cd /home/user/Trollz1004/date-app-dashboard/backend

# Build and deploy using Cloud Build (no local Docker needed!)
gcloud run deploy teamclaude-backend \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 10 \
    --cpu 1 \
    --memory 2Gi \
    --timeout 300 \
    --set-env-vars "NODE_ENV=production,SQUARE_ENVIRONMENT=production" \
    --project=$PROJECT_ID

BACKEND_URL=$(gcloud run services describe teamclaude-backend --region=$REGION --format='value(status.url)' --project=$PROJECT_ID)
log_success "Backend deployed: $BACKEND_URL"

cd /home/user/Trollz1004

###############################################################################
# Step 8: Build and Deploy Frontend
###############################################################################

log_info "Step 8: Building and deploying frontend..."

cd /home/user/Trollz1004/date-app-dashboard/frontend

# Set backend URL in environment
cat > .env.production << EOF
VITE_API_URL=$BACKEND_URL
VITE_SQUARE_APP_ID=$SQUARE_APP_ID
EOF

gcloud run deploy teamclaude-frontend \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 5 \
    --cpu 1 \
    --memory 1Gi \
    --project=$PROJECT_ID

FRONTEND_URL=$(gcloud run services describe teamclaude-frontend --region=$REGION --format='value(status.url)' --project=$PROJECT_ID)
log_success "Frontend deployed: $FRONTEND_URL"

cd /home/user/Trollz1004

###############################################################################
# Step 9: Deploy Marketing Automation
###############################################################################

log_info "Step 9: Deploying marketing automation..."

cd /home/user/Trollz1004/automation

gcloud run jobs create marketing-automation \
    --source . \
    --region $REGION \
    --tasks 1 \
    --max-retries 3 \
    --task-timeout 30m \
    --set-env-vars "NODE_ENV=production" \
    --project=$PROJECT_ID || true

# Schedule to run every 6 hours
gcloud scheduler jobs create http marketing-automation-schedule \
    --location $REGION \
    --schedule "0 */6 * * *" \
    --uri "https://$REGION-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/$PROJECT_ID/jobs/marketing-automation:run" \
    --http-method POST \
    --oauth-service-account-email "$PROJECT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
    --project=$PROJECT_ID || true

log_success "Marketing automation scheduled"

cd /home/user/Trollz1004

###############################################################################
# Step 10: Summary
###############################################################################

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}           DEPLOYMENT COMPLETE! 🎉                          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "🌐 Your Application URLs:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo ""
echo "📊 Resources Created:"
echo "   • Cloud Run Services (Backend + Frontend)"
echo "   • Cloud SQL PostgreSQL Database"
echo "   • Redis Cache"
echo "   • Marketing Automation Job"
echo ""
echo "💰 Estimated Monthly Cost:"
echo "   • Cloud Run: \$0-50 (pay per use)"
echo "   • Cloud SQL: \$7-15 (micro instance)"
echo "   • Redis: \$48 (basic tier 1GB)"
echo "   • Total: ~\$55-115/month"
echo ""
echo "📋 Next Steps:"
echo "   1. Visit $FRONTEND_URL to test"
echo "   2. Configure custom domain (optional)"
echo "   3. Run database migrations"
echo "   4. Test payment flow"
echo ""
echo "🚀 Marketing automation runs every 6 hours automatically!"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
