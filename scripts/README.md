# Platform Monitoring Script

## Overview
This script monitors the health and status of your YouAndINotAI platform deployed on Google Cloud Platform (GCP).

## Usage

### Basic Health Check
```bash
bash scripts/monitor-platform.sh
```

This will check:
- ✅ Cloud Run service health
- ✅ Cloud SQL database status  
- ✅ Redis instance status
- ✅ Enabled Google Cloud APIs
- ✅ Deployment information

### With Database Metrics
```bash
bash scripts/monitor-platform.sh --metrics
```

This includes all basic checks PLUS:
- 📊 Active users (24h)
- 💰 Revenue (24h)

**Note:** For database metrics, your IP must be whitelisted in Cloud SQL settings.

## Configuration

The script is configured for:
- **Project ID:** `pelagic-bison-476817-k7`
- **Region:** `us-central1`
- **Service Name:** `youandinotai-v8`

## Requirements

- `gcloud` CLI installed and authenticated
- `curl` for HTTP health checks
- `psql` (optional, for database metrics)

## Output

The script provides color-coded output:
- 🔵 **INFO:** General information
- 🟢 **SUCCESS:** Successful checks
- 🔴 **ERROR:** Failed checks
- 🟡 **METRIC:** Performance metrics

## Running on Cloud Shell

```bash
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004
bash scripts/monitor-platform.sh
```

## Troubleshooting

If you encounter errors:
1. Ensure you're authenticated: `gcloud auth login`
2. Set the correct project: `gcloud config set project pelagic-bison-476817-k7`
3. Check that services are deployed
4. Verify APIs are enabled

## Automated Monitoring

You can schedule this script to run periodically using cron or Cloud Scheduler:

```bash
# Run every 5 minutes
*/5 * * * * /path/to/scripts/monitor-platform.sh
```
