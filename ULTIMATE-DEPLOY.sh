export GOOGLE_API_KEY=AIzaSyBuaA6sdJ2kvIeXiL1jY4Qm7StXAUwFWG4
#!/bin/bash
# YouAndINotAI V8 - Ultimate Self-Contained Deployment
# Paste this ENTIRE script into Google Cloud Shell and press ENTER

set -e

PROJECT_ID="pelagic-bison-476817-k7"
REGION="us-central1"
SERVICE="youandinotai-v8"

echo "🚀 YouAndINotAI V8 - Ultimate Deploy Starting..."

# Set project
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com storage.googleapis.com --quiet

# Fix permissions
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" --role="roles/storage.admin" --quiet
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" --role="roles/storage.objectViewer" --quiet

# Create deployment directory
mkdir -p ~/youandinotai-deploy && cd ~/youandinotai-deploy

# Create server.js
cat > server.js << 'SERVERJS'
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'YouAndINotAI V8',
    ein: '33-4655313',
    domain: 'youandinotai.com',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    service: 'YouAndINotAI V8',
    version: '8.0.0',
    domain: 'youandinotai.com',
    ein: '33-4655313',
    business: 'Trash or Treasure Online Recycler LLC',
    email: 'joshlcoleman@gmail.com',
    phone: '+1 352 9735909'
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'YouAndINotAI V8',
    message: 'Dating with AI - Production Ready',
    version: '8.0.0',
    endpoints: {
      health: '/health',
      status: '/api/status'
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server running on port ' + PORT);
});
SERVERJS

# Create package.json
cat > package.json << 'PKGJSON'
{
  "name": "youandinotai-v8",
  "version": "8.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
PKGJSON

# Create Dockerfile
cat > Dockerfile << 'DFILE'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production --quiet
COPY . .
EXPOSE 8080
ENV NODE_ENV=production PORT=8080
CMD ["npm", "start"]
DFILE

# Create .dockerignore
cat > .dockerignore << 'DIGN'
node_modules
.git
*.md
DIGN

echo "✅ Files created"

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE \
  --source . \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=2Gi \
  --cpu=2 \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,APP_VERSION=8.0.0,EIN=33-4655313,DOMAIN=youandinotai.com" \
  --quiet

# Get URL
URL=$(gcloud run services describe $SERVICE --region=$REGION --format="value(status.url)")

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Service URL: $URL"
echo "🏥 Health: $URL/health"
echo "📊 Status: $URL/api/status"
echo ""
echo "Testing..."
curl -s $URL/health | head -5
echo ""
echo "✅ LIVE AND RUNNING!"