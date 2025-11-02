# YouAndINotAI V8 - Google Cloud Deployment Guide

## Quick Start - Google Cloud Shell Deployment

This guide helps you deploy the YouAndINotAI V8 application to Google Cloud Platform using the automated deployment script.

### Project Configuration

**Project ID:** `pelagic-bison-476817-k7` (The Bisen Project)
**Region:** `us-central1`
**Service Name:** `youandinotai-v8`

---

## Prerequisites

Before running the deployment script, ensure you have:

1. **Google Cloud Account** with access to project `pelagic-bison-476817-k7`
2. **Billing Enabled** on the project
3. **Required Permissions:**
   - Project Owner or Editor role
   - Service Account Admin
   - Cloud Run Admin
   - Cloud SQL Admin

---

## Deployment Steps

### Step 1: Open Google Cloud Shell

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `pelagic-bison-476817-k7`
3. Click the **Cloud Shell** icon (>_) in the top-right corner

### Step 2: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004
```

### Step 3: Run the Deployment Script

```bash
# Make sure the script is executable
chmod +x deploy-v8-enhanced.sh

# Run the deployment
./deploy-v8-enhanced.sh
```

### Step 4: Monitor Deployment

The script will:
- ✅ Set the correct GCP project
- ✅ Enable required Google Cloud APIs
- ✅ Create service account with proper permissions
- ✅ Set up Artifact Registry
- ✅ Create secrets in Secret Manager
- ✅ Provision Cloud SQL (PostgreSQL) database
- ✅ Provision Redis instance
- ✅ Build and deploy the application to Cloud Run

**Estimated Time:** 15-20 minutes

---

## Post-Deployment

### Access Your Application

After successful deployment, the script will display your service URL:

```
🌐 Service URL: https://youandinotai-v8-xxxxx-uc.a.run.app
```

### Test the Deployment

```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe youandinotai-v8 \
  --region=us-central1 \
  --format='value(status.url)' \
  --project=pelagic-bison-476817-k7)

# Test health endpoint
curl $SERVICE_URL/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "v8"
}
```

---

## Update API Keys

The deployment creates placeholder secrets. Update them with your actual API keys:

```bash
# Update Square token
echo -n "your_actual_square_token" | gcloud secrets versions add square-token --data-file=- --project=pelagic-bison-476817-k7

# Update Gemini API key
echo -n "your_actual_gemini_key" | gcloud secrets versions add gemini-key --data-file=- --project=pelagic-bison-476817-k7

# Update OpenAI key
echo -n "your_actual_openai_key" | gcloud secrets versions add openai-key --data-file=- --project=pelagic-bison-476817-k7

# Update Stripe key
echo -n "your_actual_stripe_key" | gcloud secrets versions add stripe-key --data-file=- --project=pelagic-bison-476817-k7
```

After updating secrets, restart the Cloud Run service:

```bash
gcloud run services update youandinotai-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7
```

---

## Troubleshooting

### Permission Denied Errors

If you get permission errors:

```bash
# Check your current account
gcloud auth list

# Re-authenticate if needed
gcloud auth login

# Set the correct project
gcloud config set project pelagic-bison-476817-k7
```

### API Not Enabled Errors

If you get "API not enabled" errors:

```bash
# Enable all required APIs manually
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com \
  --project=pelagic-bison-476817-k7
```

### Service Account Issues

If service account creation fails:

```bash
# Check existing service accounts
gcloud iam service-accounts list --project=pelagic-bison-476817-k7

# If the service account already exists, you can skip its creation
# The script handles this automatically
```

### Database Connection Issues

To check database status:

```bash
# List SQL instances
gcloud sql instances list --project=pelagic-bison-476817-k7

# Check specific instance
gcloud sql instances describe youandinotai-db-v8 --project=pelagic-bison-476817-k7
```

### Redis Connection Issues

To check Redis status:

```bash
# List Redis instances
gcloud redis instances list --region=us-central1 --project=pelagic-bison-476817-k7

# Check specific instance
gcloud redis instances describe youandinotai-redis-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7
```

---

## View Logs

Monitor your application logs:

```bash
# Stream logs in real-time
gcloud run services logs read youandinotai-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7 \
  --follow

# View recent logs
gcloud run services logs read youandinotai-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7 \
  --limit=50
```

---

## Useful Commands

### Check Deployment Status

```bash
# Service status
gcloud run services describe youandinotai-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7

# Database operations
gcloud sql operations list \
  --instance=youandinotai-db-v8 \
  --project=pelagic-bison-476817-k7

# Redis operations
gcloud redis operations list \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7
```

### Update the Application

To redeploy after code changes:

```bash
# The script handles redeployment automatically
./deploy-v8-enhanced.sh
```

### Delete Resources

If you need to clean up:

```bash
# Delete Cloud Run service
gcloud run services delete youandinotai-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7

# Delete SQL instance (careful - this deletes data!)
gcloud sql instances delete youandinotai-db-v8 \
  --project=pelagic-bison-476817-k7

# Delete Redis instance
gcloud redis instances delete youandinotai-redis-v8 \
  --region=us-central1 \
  --project=pelagic-bison-476817-k7
```

---

## Cost Estimation

**Estimated Monthly Cost:** $50-100

- Cloud Run (512MB, 1 CPU): $10-30/month
- Cloud SQL (db-n1-standard-1): $50-70/month
- Redis (1GB): $25/month
- Networking: $5-10/month

**Cost Optimization Tips:**
1. Set `--min-instances=0` for Cloud Run to scale to zero
2. Use smaller database tier if traffic is low
3. Enable Cloud SQL automatic backups only if needed
4. Monitor usage with Cloud Billing reports

---

## Support

For issues with deployment:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review deployment logs for error messages
3. Verify all prerequisites are met
4. Ensure billing is enabled on the project

---

## Next Steps

After successful deployment:

1. ✅ Test the health endpoint
2. ✅ Update API keys in Secret Manager
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring and alerts
5. ✅ Review security settings
6. ✅ Configure Cloud CDN (optional)

---

**Script Location:** `deploy-v8-enhanced.sh`
**Project:** pelagic-bison-476817-k7 (The Bisen Project)
**Region:** us-central1
