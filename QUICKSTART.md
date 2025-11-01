# Quick Start - Production Deployment

## ⚡ Fast Track to Production

### 1️⃣ Export Your Credentials
```bash
export SQUARE_ACCESS_TOKEN="sq0atp-XXXX"  # Production Square token
export SQUARE_LOCATION_ID="LXXX"          # Square location ID
export SQUARE_APP_ID="sq0idp-XXXX"        # Square app ID
export GEMINI_API_KEY="AIzaSyXXXX"        # Gemini API key
export AZURE_FACE_KEY="xxxxx"             # Azure Face API key
export AZURE_FACE_ENDPOINT="https://xxx"  # Azure endpoint
export GMAIL_USER="your@gmail.com"        # Gmail address
export GMAIL_PASSWORD="xxxx xxxx xxxx"    # Gmail app password
```

### 2️⃣ Deploy to GCP
```bash
./scripts/deploy-gcp.sh
```

### 3️⃣ Verify Deployment
```bash
./scripts/verify-production.sh
```

### 4️⃣ Run Database Migrations
```bash
gcloud sql connect youandinotai-db --user=youandinotai_user --database=youandinotai
\i database/schema.sql
\q
```

### 5️⃣ Configure Square Webhooks
1. Go to https://developer.squareup.com/apps
2. Select your app → Webhooks
3. Add webhook URL: `https://YOUR-APP-URL/api/payments/webhook`
4. Subscribe to events:
   - payment.created
   - payment.updated
   - subscription.created
   - subscription.updated
   - invoice.paid
   - invoice.payment_failed

## ✅ Done!

Your app is now live at: `https://youandinotai-app-XXXX.run.app`

---

## 🔐 Security Checklist

- ✅ All credentials stored in Secret Manager
- ✅ Square in Production mode (no sandbox)
- ✅ HTTPS only
- ✅ Rate limiting enabled
- ✅ Authentication on all endpoints
- ✅ No secrets in version control

## 📊 Monitor Your App

```bash
# View logs
gcloud run logs read youandinotai-app --region=us-east1

# Health check
curl https://YOUR-APP-URL/health

# View metrics
gcloud run services describe youandinotai-app --region=us-east1
```

## 🆘 Need Help?

See [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) for detailed instructions.
