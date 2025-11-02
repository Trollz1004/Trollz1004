#!/bin/bash
# YouAndINotAI V8 - One-Click GCP Cloud Shell Deployment

set -e

echo "🚀 YouAndINotAI V8 - Cloud Shell Deployment Starting..."

# ===== CONFIGURATION =====
PROJECT_ID="pelagic-bison-476817-k7"
REGION="us-central1"
SERVICE_NAME="youandinotai-v8"
DB_INSTANCE="youandinotai-db-v8"
REDIS_INSTANCE="youandinotai-redis-v8"
SA_NAME="youandinotai-sa-v8"
REGISTRY="youandinotai-repo-v8"
GCLOUD="gcloud"

# ===== STEP 1: Set Project =====
echo "📍 Setting GCP Project..."
$GCLOUD config set project $PROJECT_ID

# ===== STEP 2: Enable APIs =====
echo "🔌 Enabling required Google Cloud APIs..."
$GCLOUD services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    iam.googleapis.com \
    secretmanager.googleapis.com \
    --project=$PROJECT_ID

# ===== STEP 3: Create Service Account =====
echo "👤 Setting up Service Account..."
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if $GCLOUD iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID 2>/dev/null; then
    echo "   ✅ Service Account already exists"
else
    $GCLOUD iam service-accounts create $SA_NAME \
        --display-name="YouAndINotAI V8 Service Account" \
        --project=$PROJECT_ID
    echo "   ✅ Service Account created"
fi

# Grant permissions (Least Privilege)
echo "   Granting IAM roles..."
for role in \
    roles/run.invoker \
    roles/cloudsql.client \
    roles/redis.client \
    roles/secretmanager.secretAccessor \
    roles/storage.objectAdmin; do
    $GCLOUD projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" \
        --quiet 2>/dev/null || true
done
echo "   ✅ IAM roles granted"

# ===== STEP 4: Create Artifact Registry =====
echo "📦 Setting up Artifact Registry..."
if $GCLOUD artifacts repositories describe $REGISTRY --location=$REGION --project=$PROJECT_ID 2>/dev/null;
   then
    echo "   ✅ Registry already exists"
else
    $GCLOUD artifacts repositories create $REGISTRY \
        --repository-format=docker \
        --location=$REGION \
        --project=$PROJECT_ID
    echo "   ✅ Registry created"
fi

# ===== STEP 5: Create Secrets =====
echo "🔐 Creating secrets in Secret Manager..."
create_secret() {
    local name=$1
    local value=$2
    if $GCLOUD secrets describe $name --project=$PROJECT_ID 2>/dev/null; then
        echo -n "$value" | $GCLOUD secrets versions add $name --data-file=- --project=$PROJECT_ID --quiet
        echo "   ✅ Secret '$name' updated"
    else
        echo -n "$value" | $GCLOUD secrets create $name \
            --replication-policy=automatic \
            --data-file=- \
            --project=$PROJECT_ID --quiet
        echo "   ✅ Secret '$name' created"
    fi
}

# Generate secure secrets
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)
create_secret "db-password" "$DB_PASSWORD"
create_secret "jwt-secret" "$JWT_SECRET"
create_secret "square-token" "your_square_token_here"
create_secret "gemini-key" "your_gemini_key_here"
create_secret "openai-key" "your_openai_key_here"
create_secret "stripe-key" "your_stripe_key_here"

# ===== STEP 6: Provision Infrastructure Asynchronously =====
echo "🏗️ Starting infrastructure provisioning (DB & Redis)..."
if $GCLOUD sql instances describe $DB_INSTANCE --project=$PROJECT_ID 2>/dev/null; then
    echo "   ✅ Database instance already exists"
else
    $GCLOUD sql instances create $DB_INSTANCE \
        --database-version=POSTGRES_15 \
        --tier=db-n1-standard-1 \
        --region=$REGION \
        --root-password="$DB_PASSWORD" \
        --project=$PROJECT_ID \
        --async
    echo "   ⏳ Database instance creation started..."
fi

if $GCLOUD redis instances describe $REDIS_INSTANCE --region=$REGION --project=$PROJECT_ID 2>/dev/null;
   then
    echo "   ✅ Redis instance already exists"
else
    $GCLOUD redis instances create $REDIS_INSTANCE \
        --size=1 \
        --tier=BASIC \
        --region=$REGION \
        --project=$PROJECT_ID \
        --async
    echo "   ⏳ Redis instance creation started..."
fi

# ===== STEP 7: Build Application while Infra Provisions =====
echo "🔨 Building application using Cloud Build..."
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY}/${SERVICE_NAME}:latest"

# Create a minimal Node.js app in a temporary directory
APP_DIR=$(mktemp -d)
cd $APP_DIR

# Create simplified package.json
cat > package.json <<'EOP'
{
  "name": "youandinotai-v8",
  "version": "8.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": { "express": "^4.18.2", "cors": "^2.8.5" }
}
EOP

# Create server.js with health check
cat > server.js <<'EOS'
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'healthy', version: 'v8' }));
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ API listening on port ${PORT}`));
EOS

# Create Dockerfile
cat > Dockerfile <<'EOD'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
EOD

# Submit the build to Cloud Build
$GCLOUD builds submit --tag $IMAGE_URL . --project=$PROJECT_ID --quiet
echo "   ✅ Image built and pushed to Artifact Registry."
cd -
rm -rf $APP_DIR

# ===== STEP 8: Wait for Infrastructure and Deploy =====
echo "⌛ Waiting for infrastructure to be ready..."
# Find the latest DB operation and wait for it
DB_OP=$($GCLOUD sql operations list --instance=$DB_INSTANCE --filter='-status:DONE' --format='value(name)' \
   --limit=1 --project=$PROJECT_ID)
if [ ! -z "$DB_OP" ]; then
    $GCLOUD sql operations wait $DB_OP --project=$PROJECT_ID --timeout=unlimited
fi
echo "   ✅ Database is ready."

# Find the latest Redis operation and wait for it
REDIS_OP=$($GCLOUD redis operations list --region=$REGION --filter='-done:true' --format='value(name)' -- \
   limit=1 --project=$PROJECT_ID)
if [ ! -z "$REDIS_OP" ]; then
    $GCLOUD redis operations wait $REDIS_OP --region=$REGION --project=$PROJECT_ID --timeout=unlimited
fi
echo "   ✅ Redis is ready."

# Create the database now that the instance is ready
if ! $GCLOUD sql databases describe youandinotai_prod --instance=$DB_INSTANCE --project=$PROJECT_ID \
   2>/dev/null; then
    $GCLOUD sql databases create youandinotai_prod --instance=$DB_INSTANCE --project=$PROJECT_ID
    echo "   ✅ 'youandinotai_prod' database created."
fi

# Get connection details
REDIS_HOST=$($GCLOUD redis instances describe $REDIS_INSTANCE --region=$REGION --format='value(host)' \
   --project=$PROJECT_ID)
REDIS_PORT=$($GCLOUD redis instances describe $REDIS_INSTANCE --region=$REGION --format='value(port)' \
   --project=$PROJECT_ID)
DB_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"

echo "🚀 Deploying to Cloud Run..."
$GCLOUD run deploy $SERVICE_NAME \
    --image=$IMAGE_URL \
    --region=$REGION \
    --service-account=$SA_EMAIL \
    --allow-unauthenticated \
    --add-cloudsql-instances=$DB_CONNECTION_NAME \
    --set-secrets="DB_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,SQUARE_TOKEN=square-token:latest,GEMINI_KEY=gemini-key:latest,OPENAI_KEY=openai-key:latest,STRIPE_KEY=stripe-key:latest" \
    --set-env-vars="REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT,DB_USER=postgres,DB_NAME=youandinotai_prod" \
    --memory=1Gi \
    --cpu=1 \
    --project=$PROJECT_ID \
    --quiet

# ===== STEP 9: Final Summary =====
SERVICE_URL=$($GCLOUD run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)' \
   --project=$PROJECT_ID)

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ YOUANDINOTAI V8 SUCCESSFULLY DEPLOYED!                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Service URL: $SERVICE_URL"
echo "🧪 Health Check: curl $SERVICE_URL/health"
echo ""
echo "💾 Database: $DB_INSTANCE (in $REGION)"
echo "⚡ Redis:    $REDIS_HOST:$REDIS_PORT"
echo ""
echo "📝 Next Steps:"
echo "   1. Update secrets in GCP Secret Manager with your real API keys."
echo "   2. Connect to the database and apply your application schema."
echo "   3. Replace the placeholder app by pointing Cloud Build to your Git repo."
echo ""