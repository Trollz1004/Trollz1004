#!/bin/bash

# ============================================================================
# YouAndINotAI - GCP Platform Monitoring Script
# Version: 1.0.0
# ============================================================================

set -eo pipefail # Exit on any error and handle pipes correctly

# --- Configuration ---
# Updated to use your actual project ID
PROJECT_ID="pelagic-bison-476817-k7"
REGION="us-central1"
SERVICE_NAME="youandinotai-v8"
DB_INSTANCE_NAME="youandinotai-db"
REDIS_INSTANCE_NAME="youandinotai-redis"
DB_USER="youandinotai_user"
DB_NAME="youandinotai"

# --- Colors for output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Helper Functions ---
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_metric() { echo -e "${YELLOW}[METRIC]${NC} $1: ${GREEN}$2${NC}"; }

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed. Please install it to run this script."
        exit 1
    fi
}

# --- Monitoring Functions ---

check_cloud_run_health() {
    log_info "Checking Cloud Run service ($SERVICE_NAME) health..."
    local SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)
    if [ -z "$SERVICE_URL" ]; then
        log_error "Could not retrieve Cloud Run service URL. Service may not be deployed yet."
        return 1
    fi

    local response=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" 2>/dev/null || echo "000")
    if [ "$response" -eq 200 ]; then
        log_success "Cloud Run service is healthy (HTTP 200 OK)."
        log_metric "Service URL" "$SERVICE_URL"
    else
        log_error "Cloud Run service is unhealthy (HTTP $response)."
        return 1
    fi
}

check_cloud_sql_status() {
    log_info "Checking Cloud SQL instance ($DB_INSTANCE_NAME) status..."
    local status=$(gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID --format='value(state)' 2>/dev/null)
    
    if [ -z "$status" ]; then
        log_error "Cloud SQL instance not found. It may not be created yet."
        return 1
    elif [ "$status" == "RUNNABLE" ]; then
        log_success "Cloud SQL instance is running."
    else
        log_error "Cloud SQL instance is not runnable. Current state: $status"
        return 1
    fi
}

check_redis_status() {
    log_info "Checking Redis instance ($REDIS_INSTANCE_NAME) status..."
    local status=$(gcloud redis instances describe $REDIS_INSTANCE_NAME --region=$REGION --project=$PROJECT_ID --format='value(state)' 2>/dev/null)

    if [ -z "$status" ]; then
        log_error "Redis instance not found. It may not be created yet."
        return 1
    elif [ "$status" == "READY" ]; then
        log_success "Redis instance is ready."
    else
        log_error "Redis instance is not ready. Current state: $status"
        return 1
    fi
}

check_enabled_apis() {
    log_info "Checking enabled Google Cloud APIs..."
    local required_apis=("run.googleapis.com" "cloudbuild.googleapis.com" "sqladmin.googleapis.com" "redis.googleapis.com" "secretmanager.googleapis.com")
    local all_enabled=true
    
    for api in "${required_apis[@]}"; do
        if gcloud services list --enabled --project=$PROJECT_ID --filter="name:$api" --format="value(name)" 2>/dev/null | grep -q "$api"; then
            log_success "$api is enabled"
        else
            log_error "$api is NOT enabled"
            all_enabled=false
        fi
    done
    
    if [ "$all_enabled" = false ]; then
        log_error "Some required APIs are not enabled."
        return 1
    fi
}

fetch_key_metrics() {
    log_info "Fetching key metrics from the database..."
    
    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Cannot connect to the database to fetch metrics."
        log_info "You can install it with 'sudo apt-get install postgresql-client' or similar."
        return 1
    fi

    log_info "Retrieving database password from Secret Manager..."
    local DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password --project=$PROJECT_ID 2>/dev/null)
    if [ -z "$DB_PASSWORD" ]; then
        log_error "Failed to retrieve database password. Secret may not exist yet."
        return 1
    fi

    export PGPASSWORD=$DB_PASSWORD
    local DB_HOST_IP=$(gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID --format='value(ipAddresses[0].ipAddress)' 2>/dev/null)

    if [ -z "$DB_HOST_IP" ]; then
        log_error "Failed to retrieve database IP address."
        unset PGPASSWORD
        return 1
    fi

    # Define SQL queries
    # Assuming a `users` table with a `last_login` timestamp
    local active_users_query="SELECT COUNT(*) FROM users WHERE last_login >= NOW() - INTERVAL '24 hours';"
    # Assuming a `payments` table with `amount` and `created_at` timestamp
    local daily_revenue_query="SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_at >= NOW() - INTERVAL '24 hours';"

    log_info "Connecting to database to run queries..."
    
    # Execute queries (with error handling)
    local active_users=$(psql -h $DB_HOST_IP -U $DB_USER -d $DB_NAME -t -c "$active_users_query" 2>/dev/null | xargs || echo "N/A")
    local daily_revenue=$(psql -h $DB_HOST_IP -U $DB_USER -d $DB_NAME -t -c "$daily_revenue_query" 2>/dev/null | xargs || echo "N/A")

    # Unset password from environment
    unset PGPASSWORD

    log_metric "Active Users (24h)" "$active_users"
    log_metric "Revenue (24h)" "\$${daily_revenue}"
}

show_deployment_info() {
    log_info "Fetching deployment information..."
    
    # Cloud Run service info
    local service_url=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.url)' 2>/dev/null)
    if [ -n "$service_url" ]; then
        log_metric "Service URL" "$service_url"
        log_metric "Health Endpoint" "$service_url/health"
        log_metric "API Endpoint" "$service_url/api/status"
    fi
    
    # Get latest deployment time
    local last_deployed=$(gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(metadata.annotations."run.googleapis.com/lastModifier")' 2>/dev/null)
    if [ -n "$last_deployed" ]; then
        log_metric "Last Modified By" "$last_deployed"
    fi
}

# --- Main Execution ---

main() {
    log_info "============================================================"
    log_info "       YouAndINotAI Platform Health & Metrics Monitor       "
    log_info "============================================================"
    log_info "Project: $PROJECT_ID"
    log_info "Region: $REGION"
    log_info "============================================================"
    
    # Pre-flight checks
    check_command gcloud
    check_command curl

    # Set project for gcloud
    gcloud config set project $PROJECT_ID --quiet

    # Run checks
    log_info ""
    log_info "Running health checks..."
    log_info ""
    
    check_enabled_apis
    echo ""
    
    check_cloud_run_health
    echo ""
    
    check_cloud_sql_status
    echo ""
    
    check_redis_status
    echo ""
    
    show_deployment_info
    echo ""
    
    # Fetch metrics (optional, requires psql and IP whitelisting)
    if [[ " $@ " =~ " --metrics " ]]; then
        fetch_key_metrics
    else
        log_info "To fetch database metrics, run with the --metrics flag."
        log_info "Note: Your IP must be whitelisted in Cloud SQL to connect."
    fi

    log_info ""
    log_info "============================================================"
    log_info "                      Monitoring Complete                     "
    log_info "============================================================"
}

main "$@"