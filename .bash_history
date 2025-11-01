## Quick Start
## Quick Start
set -e
echo " YouAndINotAI Production Deployment"
# Install Docker if needed
if ! command -v docker &> /dev/null; then     echo "Installing Docker...";     curl -fsSL https://get.docker.com | sh;     systemctl enable docker;     systemctl start docker; fi
# Generate secrets if .env.production doesn't exist
if [ ! -f .env.production ]; then     echo "Generating secrets...";          DB_PASSWORD=$(openssl rand -base64 32);     JWT_SECRET=$(openssl rand -base64 64);     JWT_REFRESH_SECRET=$(openssl rand -base64 64);     
    cat > .env.production <<EOF
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/youandinotai_prod
REDIS_URL=redis://redis:6379
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
PORT=3000
NODE_ENV=production

# ADD YOUR REAL CREDENTIALS HERE:
SQUARE_ACCESS_TOKEN=YOUR_SQUARE_TOKEN
SQUARE_APPLICATION_ID=YOUR_SQUARE_APP_ID
SQUARE_LOCATION_ID=YOUR_SQUARE_LOCATION_ID
GEMINI_API_KEY=YOUR_GEMINI_KEY
AZURE_COGNITIVE_KEY=YOUR_AZURE_KEY
EOF
          echo "  IMPORTANT: Edit .env.production with your real API keys!";     echo "Then run this script again.";     exit 0; fi
#!/bin/bash
# GCP Setup Verification Script for YouAndINotAI
# Run this in Google Cloud Shell to verify everything is ready
set -e
echo "=========================================="
echo "Google Cloud Platform Setup Verification"
echo "YouAndINotAI Dating Platform"
echo "=========================================="
echo ""
# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
# Check functions
check_pass() {     echo -e "${GREEN}✓${NC} $1"; }
check_fail() {     echo -e "${RED}✗${NC} $1"; }
check_warn() {     echo -e "${YELLOW}⚠${NC} $1"; }
# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
# Build and start services
echo "Starting services..."
docker-compose down
docker-compose up -d --build
# Wait for database
echo "Waiting for database..."
sleep 15
# Check health
echo "Checking services..."
docker-compose ps
# SSL (optional - requires domain pointed to server)
if command -v certbot &> /dev/null; then     echo "Setting up SSL...";     certbot --nginx -d youandinotai.com -d www.youandinotai.com       --non-interactive --agree-tos -m admin@youandinotai.com || true; fi
echo ""
echo " Deployment complete!"
echo " API: http://localhost:3000/health"
echo " DB Admin: http://localhost:8080 (if adminer enabled)"
echo ""
echo "Next steps:"
echo "1. Verify services: docker-compose ps"
echo "2. Check logs: docker-compose logs -f api"
echo "3. Test API: curl http://localhost:3000/health"
https://claude.ai/public/artifacts/b903fe13-4383-48f7-97fe-d2349ae2e50a
./deploy-gcp.sh
[200~bash deploy-live-production.s~
C:\Users\joshl\Downloads\files\youandinotai-production\deploy-live-production.sh
#!/bin/bash
set -e
# --- Configuration ---
# IMPORTANT: Set these variables in your CI/CD environment or local shell
# Do not hardcode them here if this file is committed to version control.
PROJECT_ID="spring-asset-476800-u6"
REGION="us-central1"
SERVICE_NAME="youandinotai-app"
REPO_NAME="youandinotai-repo"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
# Cloud SQL Configuration
DB_INSTANCE_NAME="youandinotai-db"
DB_TIER="db-custom-2-7680" # Production Tier
# Redis Configuration
REDIS_INSTANCE_NAME="youandinotai-redis"
REDIS_TIER="STANDARD_HA" # Production Tier (Standard HA)
# VPC Connector
VPC_CONNECTOR_NAME="youandinotai-connector"
# --- Helper Functions ---
# Function to create a secret in GCP Secret Manager
create_secret() {   local NAME=$1;   local VALUE=$2;   if gcloud secrets describe $NAME --project=$PROJECT_ID &>/dev/null; then     echo "Updating secret: $NAME";     echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=- --project=$PROJECT_ID --quiet;   else     echo "Creating secret: $NAME";     echo -n "$VALUE" | gcloud secrets create $NAME --data-file=- --replication-policy=\"automatic\" --project=$PROJECT_ID --quiet;   fi; }
# --- Main Deployment Logic ---
echo "🚀 Starting production deployment for project: $PROJECT_ID"
# 1. Build Docker image using Cloud Build
echo "
--- Building Docker image ---"
gcloud builds submit .   --config=cloudbuild.yaml   --substitutions=_PROJECT_ID=$PROJECT_ID,_REPO_NAME=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME,_TAG_NAME=latest   --project=$PROJECT_ID
#!/bin/bash
set -e
# --- Configuration ---
# IMPORTANT: Set these variables in your CI/CD environment or local shell
# Do not hardcode them here if this file is committed to version control.
PROJECT_ID="spring-asset-476800-u6"
REGION="us-central1"
SERVICE_NAME="youandinotai-app"
REPO_NAME="youandinotai-repo"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
# Cloud SQL Configuration
DB_INSTANCE_NAME="youandinotai-db"
DB_TIER="db-custom-2-7680" # Production Tier
# Redis Configuration
REDIS_INSTANCE_NAME="youandinotai-redis"
REDIS_TIER="STANDARD_HA" # Production Tier (Standard HA)
# VPC Connector
VPC_CONNECTOR_NAME="youandinotai-connector"
# --- Helper Functions ---
# Function to create a secret in GCP Secret Manager
create_secret() {   local NAME=$1;   local VALUE=$2;   if gcloud secrets describe $NAME --project=$PROJECT_ID &>/dev/null; then     echo "Updating secret: $NAME";     echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=- --project=$PROJECT_ID --quiet;   else     echo "Creating secret: $NAME";     echo -n "$VALUE" | gcloud secrets create $NAME --data-file=- --replication-policy=\"automatic\" --project=$PROJECT_ID --quiet;   fi; }
# --- Main Deployment Logic ---
echo "🚀 Starting production deployment for project: $PROJECT_ID"
# 1. Build Docker image using Cloud Build
echo "
--- Building Docker image ---"
gcloud builds submit .   --config=cloudbuild.yaml   --substitutions=_PROJECT_ID=$PROJECT_ID,_REPO_NAME=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME,_TAG_NAME=latest   --project=$PROJECT_ID
#!/bin/bash
set -e
# --- Configuration ---
# IMPORTANT: Set these variables in your CI/CD environment or local shell
# Do not hardcode them here if this file is committed to version control.
PROJECT_ID="spring-asset-476800-u6"
REGION="us-central1"
SERVICE_NAME="youandinotai-app"
REPO_NAME="youandinotai-repo"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
# Cloud SQL Configuration
DB_INSTANCE_NAME="youandinotai-db"
DB_TIER="db-custom-2-7680" # Production Tier
# Redis Configuration
REDIS_INSTANCE_NAME="youandinotai-redis"
REDIS_TIER="STANDARD_HA" # Production Tier (Standard HA)
# VPC Connector
VPC_CONNECTOR_NAME="youandinotai-connector"
# --- Helper Functions ---
# Function to create a secret in GCP Secret Manager
create_secret() {   local NAME=$1;   local VALUE=$2;   if gcloud secrets describe $NAME --project=$PROJECT_ID &>/dev/null; then     echo "Updating secret: $NAME";     echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=- --project=$PROJECT_ID --quiet;   else     echo "Creating secret: $NAME";     echo -n "$VALUE" | gcloud secrets create $NAME --data-file=- --replication-policy=\"automatic\" --project=$PROJECT_ID --quiet;   fi; }
# --- Main Deployment Logic ---
echo "🚀 Starting production deployment for project: $PROJECT_ID"
# 1. Build Docker image using Cloud Build
echo "
--- Building Docker image ---"
gcloud builds submit .   --config=cloudbuild.yaml   --substitutions=_PROJECT_ID=$PROJECT_ID,_REPO_NAME=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME,_TAG_NAME=latest   --project=$PROJECT_ID
#!/bin/bash
set -e
# --- Configuration ---
# IMPORTANT: Set these variables in your CI/CD environment or local shell
# Do not hardcode them here if this file is committed to version control.
PROJECT_ID="spring-asset-476800-u6"
REGION="us-central1"
SERVICE_NAME="youandinotai-app"
REPO_NAME="youandinotai-repo"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:latest"
# Cloud SQL Configuration
DB_INSTANCE_NAME="youandinotai-db"
DB_TIER="db-custom-2-7680" # Production Tier
# Redis Configuration
REDIS_INSTANCE_NAME="youandinotai-redis"
REDIS_TIER="STANDARD_HA" # Production Tier (Standard HA)
# VPC Connector
VPC_CONNECTOR_NAME="youandinotai-connector"
# --- Helper Functions ---
# Function to create a secret in GCP Secret Manager
create_secret() {   local NAME=$1;   local VALUE=$2;   if gcloud secrets describe $NAME --project=$PROJECT_ID &>/dev/null; then     echo "Updating secret: $NAME";     echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=- --project=$PROJECT_ID --quiet;   else     echo "Creating secret: $NAME";     echo -n "$VALUE" | gcloud secrets create $NAME --data-file=- --replication-policy=\"automatic\" --project=$PROJECT_ID --quiet;   fi; }
# --- Main Deployment Logic ---
echo "🚀 Starting production deployment for project: $PROJECT_ID"
# 1. Build Docker image using Cloud Build
echo "
--- Building Docker image ---"
gcloud builds submit .   --config=cloudbuild.yaml   --substitutions=_PROJECT_ID=$PROJECT_ID,_REPO_NAME=$REPO_NAME,_SERVICE_NAME=$SERVICE_NAME,_TAG_NAME=latest   --project=$PROJECT_ID
