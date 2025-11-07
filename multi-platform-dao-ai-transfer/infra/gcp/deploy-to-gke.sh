#!/bin/bash
# Google Cloud GKE Deployment - Fully Automated
# FOR THE KIDS! 💙 Charity-focused deployment
# Project: elevated-module-462113-f0

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="elevated-module-462113-f0"
REGION="us-central1"
ZONE="us-central1-a"
CLUSTER_NAME="charity-platform-cluster"
CLUSTER_VERSION="1.28"

# Database
DB_INSTANCE_NAME="charity-platform-db"
DB_NAME="multi_platform"
DB_USER="aisolutions"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   Google Cloud GKE Deployment - FOR THE KIDS! 💙        ║${NC}"
echo -e "${PURPLE}║   Automated Charity Platform Deployment                 ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not installed${NC}"
    echo -e "${YELLOW}Install from: https://cloud.google.com/sdk/install${NC}"
    exit 1
fi

# Set project
echo -e "${BLUE}🔧 Setting active project: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID
echo ""

# Enable required APIs
echo -e "${BLUE}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable \
    container.googleapis.com \
    sqladmin.googleapis.com \
    compute.googleapis.com \
    servicenetworking.googleapis.com \
    cloudresourcemanager.googleapis.com \
    iam.googleapis.com
echo -e "${GREEN}✅ APIs enabled${NC}"
echo ""

# Create GKE cluster with auto-scaling
echo -e "${BLUE}🚀 Creating GKE cluster: $CLUSTER_NAME${NC}"
echo -e "${YELLOW}⏱️  This takes 5-10 minutes...${NC}"

if gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE &> /dev/null; then
    echo -e "${YELLOW}⚠️  Cluster already exists, skipping creation${NC}"
else
    gcloud container clusters create $CLUSTER_NAME \
        --zone=$ZONE \
        --cluster-version=$CLUSTER_VERSION \
        --machine-type=e2-medium \
        --num-nodes=2 \
        --enable-autoscaling \
        --min-nodes=1 \
        --max-nodes=10 \
        --enable-autorepair \
        --enable-autoupgrade \
        --enable-ip-alias \
        --network="default" \
        --subnetwork="default" \
        --addons=HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
        --workload-pool=$PROJECT_ID.svc.id.goog

    echo -e "${GREEN}✅ GKE cluster created successfully!${NC}"
fi
echo ""

# Get cluster credentials
echo -e "${BLUE}🔑 Getting cluster credentials...${NC}"
gcloud container clusters get-credentials $CLUSTER_NAME --zone=$ZONE
echo -e "${GREEN}✅ Credentials configured${NC}"
echo ""

# Create Cloud SQL PostgreSQL instance
echo -e "${BLUE}🗄️  Creating Cloud SQL PostgreSQL instance...${NC}"

if gcloud sql instances describe $DB_INSTANCE_NAME &> /dev/null; then
    echo -e "${YELLOW}⚠️  Database instance already exists${NC}"
else
    # Generate random password
    DB_PASSWORD=$(openssl rand -base64 32)
    echo "$DB_PASSWORD" > /tmp/db-password.txt

    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --network=default \
        --no-assign-ip \
        --enable-google-private-path \
        --backup-start-time=03:00

    # Set root password
    gcloud sql users set-password postgres \
        --instance=$DB_INSTANCE_NAME \
        --password=$DB_PASSWORD

    # Create application database
    gcloud sql databases create $DB_NAME --instance=$DB_INSTANCE_NAME

    # Create application user
    gcloud sql users create $DB_USER \
        --instance=$DB_INSTANCE_NAME \
        --password=$DB_PASSWORD

    echo -e "${GREEN}✅ Cloud SQL instance created${NC}"
    echo -e "${YELLOW}📝 Database password saved to: /tmp/db-password.txt${NC}"
fi
echo ""

# Install NGINX Ingress Controller
echo -e "${BLUE}🌐 Installing NGINX Ingress Controller...${NC}"
kubectl create namespace ingress-nginx --dry-run=client -o yaml | kubectl apply -f -

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --set controller.service.type=LoadBalancer \
    --set controller.metrics.enabled=true \
    --wait

echo -e "${GREEN}✅ NGINX Ingress installed${NC}"
echo ""

# Install cert-manager for SSL
echo -e "${BLUE}🔒 Installing cert-manager for automatic SSL...${NC}"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
echo -e "${YELLOW}⏱️  Waiting for cert-manager to be ready...${NC}"
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-webhook -n cert-manager
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
echo -e "${GREEN}✅ cert-manager installed${NC}"
echo ""

# Create Let's Encrypt ClusterIssuer
echo -e "${BLUE}🔒 Creating Let's Encrypt ClusterIssuer...${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@youandinotai.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
echo -e "${GREEN}✅ ClusterIssuer created${NC}"
echo ""

# Create namespaces
echo -e "${BLUE}📁 Creating Kubernetes namespaces...${NC}"
kubectl apply -f ../../infra/k8s/namespace.yaml
echo -e "${GREEN}✅ Namespaces created${NC}"
echo ""

# Create secrets
echo -e "${BLUE}🔐 Creating Kubernetes secrets...${NC}"

# Get database connection details
DB_IP=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(ipAddresses[0].ipAddress)")
DB_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)")
DB_PASSWORD=$(cat /tmp/db-password.txt 2>/dev/null || echo "CHANGE_ME")

kubectl create secret generic multi-platform-secrets \
    --from-literal=DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_IP:5432/$DB_NAME" \
    --from-literal=POSTGRES_PASSWORD="$DB_PASSWORD" \
    --from-literal=JWT_SECRET="$(openssl rand -base64 32)" \
    --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" \
    --namespace=ai-solutions \
    --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ Secrets created${NC}"
echo ""

# Get Load Balancer IP
echo -e "${BLUE}🌐 Getting Load Balancer IP...${NC}"
echo -e "${YELLOW}⏱️  Waiting for external IP assignment...${NC}"
sleep 30

EXTERNAL_IP=""
for i in {1..30}; do
    EXTERNAL_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$EXTERNAL_IP" ]; then
        break
    fi
    echo -e "${YELLOW}   Attempt $i/30: Waiting for IP...${NC}"
    sleep 10
done

if [ -n "$EXTERNAL_IP" ]; then
    echo -e "${GREEN}✅ Load Balancer IP: $EXTERNAL_IP${NC}"
else
    echo -e "${YELLOW}⚠️  Could not get external IP yet. Check later with:${NC}"
    echo -e "${YELLOW}   kubectl get svc -n ingress-nginx ingress-nginx-controller${NC}"
    EXTERNAL_IP="PENDING"
fi
echo ""

# Summary
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║              🎉 DEPLOYMENT COMPLETE! 🎉                  ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ GKE Cluster:${NC} $CLUSTER_NAME"
echo -e "${GREEN}✅ Cloud SQL:${NC} $DB_INSTANCE_NAME"
echo -e "${GREEN}✅ Load Balancer IP:${NC} $EXTERNAL_IP"
echo -e "${GREEN}✅ Region:${NC} $REGION"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Configure DNS records:${NC}"
echo -e "   - aidoesitall.org → $EXTERNAL_IP"
echo -e "   - ai-solutions.store → $EXTERNAL_IP"
echo -e "   - *.ai-solutions.store → $EXTERNAL_IP"
echo ""
echo -e "2. ${YELLOW}Deploy applications:${NC}"
echo -e "   helm install multi-platform ../../infra/helm/multi-platform \\"
echo -e "     --namespace ai-solutions \\"
echo -e "     --values ../../infra/helm/multi-platform/values-prod.yaml"
echo ""
echo -e "3. ${YELLOW}Verify SSL certificates (after DNS propagates):${NC}"
echo -e "   kubectl get certificates -n ai-solutions"
echo ""
echo -e "4. ${YELLOW}Monitor deployment:${NC}"
echo -e "   kubectl get pods -n ai-solutions --watch"
echo ""
echo -e "${GREEN}💙 FOR THE KIDS! Every deployment helps raise money for charity! 💙${NC}"
echo ""
echo -e "${BLUE}📖 Full documentation: docs/GKE-DEPLOYMENT-GUIDE.md${NC}"
echo ""
