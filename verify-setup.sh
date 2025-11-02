#!/bin/bash
# Pre-deployment verification script for YouAndINotAI V8

echo "=========================================="
echo "YouAndINotAI V8 - Pre-Deployment Check"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ID="pelagic-bison-476817-k7"
REQUIRED_APIS=(
    "run.googleapis.com"
    "artifactregistry.googleapis.com"
    "cloudbuild.googleapis.com"
    "sqladmin.googleapis.com"
    "redis.googleapis.com"
    "iam.googleapis.com"
    "secretmanager.googleapis.com"
)

# Check if gcloud is installed
echo "1. Checking gcloud CLI..."
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✓${NC} gcloud CLI is installed"
    GCLOUD_VERSION=$(gcloud version --format="value(core)" 2>/dev/null)
    echo "  Version: $GCLOUD_VERSION"
else
    echo -e "${RED}✗${NC} gcloud CLI is not installed"
    echo "  Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
echo ""

# Check authentication
echo "2. Checking authentication..."
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -n "$ACCOUNT" ]; then
    echo -e "${GREEN}✓${NC} Authenticated as: $ACCOUNT"
else
    echo -e "${RED}✗${NC} Not authenticated"
    echo "  Run: gcloud auth login"
    exit 1
fi
echo ""

# Check project access
echo "3. Checking project access..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
echo "  Current project: $CURRENT_PROJECT"

if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo -e "${GREEN}✓${NC} Access to project: $PROJECT_ID"
else
    echo -e "${RED}✗${NC} Cannot access project: $PROJECT_ID"
    echo "  Make sure you have permissions to this project"
    exit 1
fi
echo ""

# Check billing
echo "4. Checking billing status..."
BILLING_ENABLED=$(gcloud beta billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "unknown")
if [ "$BILLING_ENABLED" = "True" ]; then
    echo -e "${GREEN}✓${NC} Billing is enabled"
else
    echo -e "${YELLOW}⚠${NC} Billing status: $BILLING_ENABLED"
    echo "  Ensure billing is enabled at:"
    echo "  https://console.cloud.google.com/billing?project=$PROJECT_ID"
fi
echo ""

# Check Docker
echo "5. Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    DOCKER_VERSION=$(docker --version 2>/dev/null)
    echo "  $DOCKER_VERSION"
else
    echo -e "${YELLOW}⚠${NC} Docker is not installed"
    echo "  Cloud Build will be used instead (recommended for Cloud Shell)"
fi
echo ""

# Check required APIs
echo "6. Checking required APIs..."
echo "  Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID &>/dev/null

MISSING_APIS=()
for API in "${REQUIRED_APIS[@]}"; do
    if gcloud services list --enabled --filter="name:$API" --format="value(name)" 2>/dev/null | grep -q "$API"; then
        echo -e "  ${GREEN}✓${NC} $API"
    else
        echo -e "  ${RED}✗${NC} $API (not enabled)"
        MISSING_APIS+=("$API")
    fi
done

if [ ${#MISSING_APIS[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Note:${NC} The deployment script will enable missing APIs automatically"
fi
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
if [ ${#MISSING_APIS[@]} -eq 0 ] && [ "$BILLING_ENABLED" = "True" ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You are ready to deploy. Run:"
    echo "  ./deploy-v8-enhanced.sh"
else
    echo -e "${YELLOW}⚠ Some checks need attention${NC}"
    echo ""
    echo "The deployment script can still run and will attempt to:"
    echo "  - Enable missing APIs"
    echo "  - Configure necessary resources"
    echo ""
    echo "To proceed with deployment, run:"
    echo "  ./deploy-v8-enhanced.sh"
fi
echo ""
echo "=========================================="
echo "Resources:"
echo "  Console: https://console.cloud.google.com/home/dashboard?project=$PROJECT_ID"
echo "  Cloud Run: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "  Cloud SQL: https://console.cloud.google.com/sql?project=$PROJECT_ID"
echo "=========================================="
echo ""
