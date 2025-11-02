# YouAndINotAI V8 - Google Cloud Platform Deployment

## Quick Start

Deploy the YouAndINotAI V8 dating platform to Google Cloud Platform in minutes.

**Project:** `pelagic-bison-476817-k7` (The Bisen Project)

### Deploy Now

```bash
# 1. Open Google Cloud Shell
# Go to: https://console.cloud.google.com/?project=pelagic-bison-476817-k7

# 2. Clone this repository
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# 3. (Optional) Verify your environment
./verify-setup.sh

# 4. Run deployment
./deploy-v8-enhanced.sh
```

**Deployment Time:** ~15-20 minutes

---

## What Gets Deployed

The deployment script automatically sets up:

✅ **Cloud Run** - Containerized application hosting  
✅ **Cloud SQL** - PostgreSQL 15 database  
✅ **Redis** - Memorystore for caching  
✅ **Secret Manager** - Secure API key storage  
✅ **Artifact Registry** - Docker image repository  
✅ **Service Account** - With least-privilege permissions  

---

## Files

- **`deploy-v8-enhanced.sh`** - Main deployment script
- **`verify-setup.sh`** - Pre-deployment environment checker
- **`DEPLOYMENT-GUIDE.md`** - Comprehensive deployment documentation
- **`Dockerfile`** - Container configuration
- **`package.json`** - Node.js application dependencies

---

## Requirements

- Google Cloud account with access to project `pelagic-bison-476817-k7`
- Billing enabled on the project
- Project Editor or Owner role

---

## Post-Deployment

After deployment completes:

1. **Test the service:**
   ```bash
   curl $(gcloud run services describe youandinotai-v8 --region=us-central1 --format='value(status.url)')/health
   ```

2. **Update API keys:**
   ```bash
   echo -n "your_actual_key" | gcloud secrets versions add square-token --data-file=-
   ```

3. **View logs:**
   ```bash
   gcloud run services logs read youandinotai-v8 --region=us-central1 --follow
   ```

---

## Cost Estimate

**~$50-100/month**

- Cloud Run: $10-30/month
- Cloud SQL: $50-70/month  
- Redis: $25/month
- Networking: $5-10/month

---

## Documentation

📖 **[Full Deployment Guide](DEPLOYMENT-GUIDE.md)** - Step-by-step instructions, troubleshooting, and advanced configuration

---

## Support

For deployment issues:

1. Check `DEPLOYMENT-GUIDE.md` for troubleshooting
2. Run `./verify-setup.sh` to diagnose environment issues
3. Review deployment logs for error messages

---

## Project Structure

```
.
├── deploy-v8-enhanced.sh    # Automated deployment script
├── verify-setup.sh          # Environment verification
├── DEPLOYMENT-GUIDE.md      # Detailed documentation
├── Dockerfile               # Container configuration
├── package.json             # Application dependencies
└── README.md               # This file
```

---

**Ready to deploy?** Run `./deploy-v8-enhanced.sh` in Google Cloud Shell.
