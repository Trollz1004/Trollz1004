# Production Deployment Guide - YouAndINotAI

## Prerequisites

Before deploying to production, ensure you have:

1. **Google Cloud Account** with billing enabled
2. **Square Account** (Production mode, not sandbox)
3. **Google Gemini API Key** (Production)
4. **Azure Cognitive Services Account** (Production)
5. **Gmail Account** with app-specific password

## Required Production Credentials

You must have the following credentials ready:

### Square Payments (Production Only)
- `SQUARE_ACCESS_TOKEN` - Production access token from Square Developer Dashboard
- `SQUARE_LOCATION_ID` - Your Square location ID
- `SQUARE_APP_ID` - Your Square application ID

### Google Gemini AI
- `GEMINI_API_KEY` - API key from Google AI Studio

### Azure Cognitive Services
- `AZURE_FACE_KEY` - Face API key from Azure Portal
- `AZURE_FACE_ENDPOINT` - Face API endpoint URL

### Email
- `GMAIL_USER` - Gmail address for sending emails
- `GMAIL_PASSWORD` - Gmail app-specific password

## Deployment Steps

### Step 1: Set Environment Variables

Export your production credentials as environment variables:

```bash
export SQUARE_ACCESS_TOKEN="your_production_square_token"
export SQUARE_LOCATION_ID="your_square_location_id"
export SQUARE_APP_ID="your_square_app_id"
export GEMINI_API_KEY="your_gemini_api_key"
export AZURE_FACE_KEY="your_azure_face_key"
export AZURE_FACE_ENDPOINT="your_azure_endpoint"
export GMAIL_USER="your_gmail@gmail.com"
export GMAIL_PASSWORD="your_app_specific_password"
```

### Step 2: Run Deployment Script

```bash
cd /home/runner/work/Trollz1004/Trollz1004
chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh
```

The script will:
- Enable required GCP APIs
- Create Cloud SQL (PostgreSQL) instance
- Create Redis (Memorystore) instance
- Set up VPC connector
- Create secrets in Secret Manager from environment variables
- Build and push Docker image
- Deploy to Cloud Run

### Step 3: Verify Deployment

Run the verification script to ensure all components are properly configured:

```bash
chmod +x scripts/verify-production.sh
./scripts/verify-production.sh
```

### Step 4: Run Database Migrations

Connect to Cloud SQL and run the schema:

```bash
gcloud sql connect youandinotai-db --user=youandinotai_user --database=youandinotai --project=pelagic-bison-476817-k7
```

Then in the PostgreSQL prompt:
```sql
\i database/schema.sql
```

### Step 5: Update Secrets (if needed)

If you need to update any secret after deployment:

```bash
echo -n 'YOUR_NEW_VALUE' | gcloud secrets versions add SECRET_NAME --data-file=- --project=pelagic-bison-476817-k7
```

Example:
```bash
echo -n 'sq0atp-XXXXX' | gcloud secrets versions add square-access-token --data-file=- --project=pelagic-bison-476817-k7
```

## Post-Deployment Configuration

### Configure Square Webhooks

1. Go to Square Developer Dashboard
2. Navigate to your application → Webhooks
3. Add webhook URL: `https://your-cloud-run-url/api/payments/webhook`
4. Subscribe to events:
   - `payment.created`
   - `payment.updated`
   - `subscription.created`
   - `subscription.updated`
   - `invoice.paid`
   - `invoice.payment_failed`

### Configure Custom Domain (Optional)

```bash
gcloud run domain-mappings create --service=youandinotai-app --domain=youandinotai.com --region=us-east1 --project=pelagic-bison-476817-k7
```

## Monitoring and Logs

### View Logs
```bash
gcloud run logs read youandinotai-app --region=us-east1 --project=pelagic-bison-476817-k7
```

### Health Check
```bash
curl https://your-cloud-run-url/health
```

### Monitor Metrics
```bash
gcloud monitoring dashboards list --project=pelagic-bison-476817-k7
```

## Production Checklist

- [ ] All environment variables are set
- [ ] Square is in PRODUCTION mode (not sandbox)
- [ ] Database schema is deployed
- [ ] All secrets are configured in Secret Manager
- [ ] Cloud Run service is deployed and healthy
- [ ] Square webhooks are configured
- [ ] Custom domain is configured (if applicable)
- [ ] Monitoring and alerts are set up

## Security Notes

- **NEVER** commit secrets to version control
- All sensitive data is stored in Google Cloud Secret Manager
- Square is configured for PRODUCTION mode only
- All API endpoints use authentication
- Rate limiting is enabled
- CORS is properly configured
- Security headers are enabled via Helmet.js

## Troubleshooting

### Service won't start
```bash
gcloud run logs read youandinotai-app --region=us-east1 --limit=50
```

### Database connection issues
```bash
gcloud sql instances describe youandinotai-db --project=pelagic-bison-476817-k7
```

### Secret not found
```bash
gcloud secrets list --project=pelagic-bison-476817-k7
```

### Update service configuration
```bash
gcloud run services update youandinotai-app --region=us-east1 --project=pelagic-bison-476817-k7
```

## Support

For issues or questions, contact the development team or refer to the main README.md.

---

**Production Ready ✓**
- No placeholders
- No sandbox mode
- 100% production code
- Square payments fully integrated
