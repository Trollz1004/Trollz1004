#!/bin/bash

# ============================================================================
# Production Verification Script
# Verifies all required secrets and configurations are in place
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ID="${GCP_PROJECT_ID:-spring-asset-476800-u6}"
REGION="${GCP_REGION:-us-central1}"

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

# ============================================================================
# Verify Required Secrets
# ============================================================================

log_info "Verifying production secrets in Google Cloud Secret Manager..."
log_info "Project: $PROJECT_ID"
echo ""

REQUIRED_SECRETS=(
    "square-access-token:Square production access token"
    "square-location-id:Square location ID"
    "square-app-id:Square application ID"
    "gemini-api-key:Google Gemini AI API key"
    "azure-face-key:Azure Face Recognition key"
    "jwt-secret:JWT signing secret"
    "jwt-refresh-secret:JWT refresh secret"
    "db-password:Database password"
)

ALL_VALID=true

for secret_pair in "${REQUIRED_SECRETS[@]}"; do
    IFS=':' read -r secret_name description <<< "$secret_pair"
    
    if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
        # Get the latest version
        latest_version=$(gcloud secrets versions list $secret_name --project=$PROJECT_ID --limit=1 --format="value(name)")
        
        # Check if secret has a value (not empty)
        secret_value=$(gcloud secrets versions access $latest_version --secret=$secret_name --project=$PROJECT_ID 2>/dev/null || echo "")
        
        if [ -n "$secret_value" ] && [ ${#secret_value} -gt 5 ]; then
            log_success "$secret_name - ✓"
        else
            log_error "$secret_name - Secret exists but appears empty or invalid"
            ALL_VALID=false
        fi
    else
        log_error "$secret_name - NOT FOUND ($description)"
        log_warning "Create with: echo -n 'YOUR_VALUE' | gcloud secrets create $secret_name --data-file=- --project=$PROJECT_ID"
        ALL_VALID=false
    fi
done

echo ""

# ============================================================================
# Verify Infrastructure
# ============================================================================

log_info "Verifying infrastructure..."

# Check Cloud SQL
if gcloud sql instances describe youandinotai-db --project=$PROJECT_ID &> /dev/null; then
    log_success "Cloud SQL instance - ✓"
else
    log_error "Cloud SQL instance - NOT FOUND"
    ALL_VALID=false
fi

# Check Redis
if gcloud redis instances describe youandinotai-redis --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_success "Redis instance - ✓"
else
    log_error "Redis instance - NOT FOUND"
    ALL_VALID=false
fi

# Check VPC Connector
if gcloud compute networks vpc-access connectors describe youandinotai-connector --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_success "VPC connector - ✓"
else
    log_error "VPC connector - NOT FOUND"
    ALL_VALID=false
fi

# Check Cloud Run service
if gcloud run services describe youandinotai-app --region=$REGION --project=$PROJECT_ID &> /dev/null; then
    log_success "Cloud Run service - ✓"
    SERVICE_URL=$(gcloud run services describe youandinotai-app --region=$REGION --format="value(status.url)" --project=$PROJECT_ID)
    log_info "Service URL: $SERVICE_URL"
else
    log_warning "Cloud Run service - NOT DEPLOYED YET"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

if [ "$ALL_VALID" = true ]; then
    log_success "============================================================================"
    log_success "All production requirements verified! ✓"
    log_success "Your application is ready for production deployment."
    log_success "============================================================================"
    exit 0
else
    log_error "============================================================================"
    log_error "Production verification FAILED!"
    log_error "Please fix the issues above before deploying to production."
    log_error "============================================================================"
    exit 1
fi
