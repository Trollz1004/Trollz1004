#!/bin/bash

# ============================================================================
# YouAndINotAI - GCP Production Deployment Script
# Version: 2.0.0
# ============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-pelagic-bison-476817-k7}"
REGION="${GCP_REGION:-us-east1}"
SERVICE_NAME="youandinotai-app"
SERVICE_ACCOUNT_NAME="youandinotai-sa"
DB_INSTANCE_NAME="youandinotai-db"
REDIS_INSTANCE_NAME="youandinotai-redis"
VPC_CONNECTOR_NAME="youandinotai-connector"
REPOSITORY_NAME="youandinotai-repo"

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        exit 1
    fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

log_info "Starting YouAndINotAI deployment to GCP..."
log_info "Project: $PROJECT_ID"
log_info "Region: $REGION"

# Check required commands
check_command gcloud
check_command docker

# Verify gcloud authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    log_error "Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Check billing
log_info "Checking billing status..."
BILLING_ENABLED=$(gcloud beta billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "false")

if [ "$BILLING_ENABLED" != "True" ]; then
    log_error "Billing is not enabled for project $PROJECT_ID"
    log_error "Enable billing at: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    exit 1
fi

log_success "Billing is enabled"

# ============================================================================
# Enable Required APIs
# ============================================================================

log_info "Enabling required GCP APIs..."

REQUIRED_APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "redis.googleapis.com"
    "vpcaccess.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
    "compute.googleapis.com"
)

for api in "${REQUIRED_APIS[@]}"; do
    log_info "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID 2>&1 | grep -v "already enabled" || true
done

log_success "All APIs enabled"

# ============================================================================
# Setup Artifact Registry
# ============================================================================

log_info "Setting up Artifact Registry..."

if ! gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create $REPOSITORY_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="YouAndINotAI Docker images" \
        --project=$PROJECT_ID
    log_success "Artifact Registry created"
else
    log_info "Artifact Registry already exists"
fi

# ============================================================================
# Setup Cloud SQL (PostgreSQL)
# ============================================================================

log_info "Setting up Cloud SQL PostgreSQL..."

if ! gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
    log_info "Creating Cloud SQL instance (this may take 5-10 minutes)..."

    # Generate strong password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_16 \
        --tier=db-f1-micro \
        --region=$REGION \
        --network=default \
        --backup \
        --backup-start-time=03:00 \
        --retained-backups-count=7 \
        --transaction-log-retention-days=7 \
        --enable-bin-log \
        --database-flags=cloudsql.enable_pgaudit=on \
        --project=$PROJECT_ID

    # Set root password
    gcloud sql users set-password postgres \
        --instance=$DB_INSTANCE_NAME \
        --password="$DB_PASSWORD" \
        --project=$PROJECT_ID

    # Create application database
    gcloud sql databases create youandinotai \
        --instance=$DB_INSTANCE_NAME \
        --project=$PROJECT_ID

    # Create application user
    gcloud sql users create youandinotai_user \
        --instance=$DB_INSTANCE_NAME \
        --password="$DB_PASSWORD" \
        --project=$PROJECT_ID

    # Store password in Secret Manager
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password \
        --data-file=- \
        --replication-policy=automatic \
        --project=$PROJECT_ID

    log_success "Cloud SQL instance created"
else
    log_info "Cloud SQL instance already exists"
fi

# Get Cloud SQL connection name
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)" --project=$PROJECT_ID)

# ============================================================================
# Setup Redis (Memorystore)
# ============================================================================

log_info "Setting up Redis (Memorystore)..."

if ! gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_info "Creating Redis instance (this may take 3-5 minutes)..."

    gcloud redis instances create $REDIS_INSTANCE_NAME \
        --size=1 \
        --region=$REGION \
        --redis-version=redis_7_0 \
        --tier=basic \
        --project=$PROJECT_ID

    log_success "Redis instance created"
else
    log_info "Redis instance already exists"
fi

# Get Redis host and port
REDIS_HOST=$(gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(host)" --project=$PROJECT_ID)
REDIS_PORT=$(gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --format="value(port)" --project=$PROJECT_ID)

# ============================================================================
# Setup VPC Connector
# ============================================================================

log_info "Setting up VPC Connector..."

if ! gcloud compute networks vpc-access connectors describe $VPC_CONNECTOR_NAME --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_info "Creating VPC connector..."

    gcloud compute networks vpc-access connectors create $VPC_CONNECTOR_NAME \
        --region=$REGION \
        --range=10.8.0.0/28 \
        --network=default \
        --project=$PROJECT_ID

    log_success "VPC connector created"
else
    log_info "VPC connector already exists"
fi

# ============================================================================
# Setup Secrets in Secret Manager
# ============================================================================

log_info "Setting up secrets in Secret Manager..."

create_or_update_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2

    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
        # Secret exists, add new version
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME \
            --data-file=- \
            --project=$PROJECT_ID
        log_info "Updated secret: $SECRET_NAME"
    else
        # Create new secret
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME \
            --data-file=- \
            --replication-policy=automatic \
            --project=$PROJECT_ID
        log_info "Created secret: $SECRET_NAME"
    fi
}

# Generate JWT secrets if they don't exist
if ! gcloud secrets describe jwt-secret --project=$PROJECT_ID &> /dev/null; then
    JWT_SECRET=$(openssl rand -base64 32)
    create_or_update_secret "jwt-secret" "$JWT_SECRET"
fi

if ! gcloud secrets describe jwt-refresh-secret --project=$PROJECT_ID &> /dev/null; then
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    create_or_update_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET"
fi

# Create production-ready secrets from environment variables
log_info "============================================================================"
log_info "PRODUCTION SECRETS CONFIGURATION"
log_info "============================================================================"

PRODUCTION_SECRETS=(
    "square-access-token"
    "square-location-id"
    "square-app-id"
    "gemini-api-key"
    "azure-face-key"
    "azure-face-endpoint"
    "gmail-user"
    "gmail-password"
)

for secret_name in "${PRODUCTION_SECRETS[@]}"; do
    # Convert secret name to environment variable format (e.g., square-access-token -> SQUARE_ACCESS_TOKEN)
    env_var=$(echo "$secret_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
    env_value="${!env_var}"
    
    if [ -n "$env_value" ]; then
        create_or_update_secret "$secret_name" "$env_value"
        log_success "Configured: $secret_name from environment"
    else
        # Check if secret already exists
        if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
            log_info "Secret already exists: $secret_name"
        else
            log_warning "Missing environment variable: $env_var"
            log_warning "Create secret manually: echo -n 'YOUR_VALUE' | gcloud secrets versions add $secret_name --data-file=- --project=$PROJECT_ID"
        fi
    fi
done

log_success "Secrets configured"

# ============================================================================
# Build and Push Docker Image
# ============================================================================

log_info "Building Docker image..."

IMAGE_NAME="$REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY_NAME/$SERVICE_NAME:latest"

# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker $REGION-docker.pkg.dev --quiet

# Build image
docker build \
    -t $IMAGE_NAME \
    -f Dockerfile \
    .

log_info "Pushing Docker image..."
docker push $IMAGE_NAME

log_success "Docker image built and pushed"

# ============================================================================
# Deploy to Cloud Run
# ============================================================================

log_info "Deploying to Cloud Run..."

gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE_NAME \
    --region=$REGION \
    --platform=managed \
    --allow-unauthenticated \
    --memory=2Gi \
    --cpu=2 \
    --min-instances=1 \
    --max-instances=10 \
    --concurrency=80 \
    --timeout=300 \
    --vpc-connector=$VPC_CONNECTOR_NAME \
    --vpc-egress=private-ranges-only \
    --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$PROJECT_ID,GCP_REGION=$REGION,REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT" \
    --set-secrets="DATABASE_URL=db-password:latest,JWT_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-refresh-secret:latest,SQUARE_ACCESS_TOKEN=square-access-token:latest,SQUARE_LOCATION_ID=square-location-id:latest,GEMINI_API_KEY=gemini-api-key:latest,AZURE_FACE_KEY=azure-face-key:latest,GMAIL_PASSWORD=gmail-password:latest" \
    --add-cloudsql-instances=$DB_CONNECTION_NAME \
    --project=$PROJECT_ID

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)

log_success "Deployed to Cloud Run"

# ============================================================================
# Run Database Migrations
# ============================================================================

log_info "Setting up database schema..."
log_warning "Manual step required: Connect to Cloud SQL and run database/schema.sql"
log_info "Connection command: gcloud sql connect $DB_INSTANCE_NAME --user=youandinotai_user --database=youandinotai --project=$PROJECT_ID"

# ============================================================================
# Deployment Complete
# ============================================================================

log_success "============================================================================"
log_success "                    DEPLOYMENT COMPLETE!"
log_success "============================================================================"
log_success ""
log_success "Your application is live at: $SERVICE_URL"
log_success ""
log_info "Next Steps:"
log_info "1. Update secrets with actual production values (see warnings above)"
log_info "2. Run database migrations (schema.sql)"
log_info "3. Configure custom domain (if needed)"
log_info "4. Set up monitoring and alerts"
log_info ""
log_info "Health check: $SERVICE_URL/health"
log_info "Admin dashboard: $SERVICE_URL/admin"
log_success "============================================================================"
