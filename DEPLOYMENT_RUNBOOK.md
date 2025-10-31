# YouAndINotAI - Production Deployment Runbook

**Project:** YouAndINotAI  
**GCP Project ID:** `spring-asset-476800-u6`  
**Last Updated:** October 31, 2025

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Secret Management](#secret-management)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
8. [Emergency Contacts](#emergency-contacts)

---

## Pre-Deployment Checklist

### Required Access & Credentials

- [ ] GCP Project Owner/Editor access to `spring-asset-476800-u6`
- [ ] `gcloud` CLI installed and authenticated
- [ ] Access to Secret Manager
- [ ] Database admin credentials
- [ ] Square API account access
- [ ] Gemini API key
- [ ] Azure Cognitive Services account
- [ ] Service account credentials configured

### Required External Services

- [ ] Cloud SQL (PostgreSQL) instance provisioned
- [ ] Redis instance provisioned
- [ ] Square API account active
- [ ] Gemini API quota verified
- [ ] Azure Cognitive Services quota verified

### Code & Configuration

- [ ] Latest code merged to `main` branch
- [ ] All tests passing
- [ ] Environment-specific configuration reviewed
- [ ] Database migrations prepared
- [ ] Backup strategy documented

---

## Secret Management

### Overview

All sensitive configuration is stored in GCP Secret Manager. Use the provided `setup-secrets.sh` script for management.

### Required Secrets

| Secret Name | Description | Example Format |
|------------|-------------|----------------|
| `db-password` | PostgreSQL password | `generated-32-char-string` |
| `db-url` | Database connection string | `postgresql://postgres:PASSWORD@IP:5432/youandinotai` |
| `redis-url` | Redis connection string | `redis://10.0.0.3:6379` |
| `square-token` | Square API access token | `EAAAl...` |
| `gemini-api-key` | Gemini API key | `AIza...` |
| `azure-cognitive-key` | Azure Cognitive Services key | `abcd1234...` |
| `jwt-secret` | JWT signing secret | `generated-32-char-string` |
| `jwt-refresh-secret` | JWT refresh token secret | `generated-32-char-string` |

### Initial Secret Setup

```bash
# Run interactive setup
./setup-secrets.sh setup

# Validate all secrets
./setup-secrets.sh validate

# Grant service account access
./setup-secrets.sh grant-access
```

### Updating Secrets

```bash
# Update single secret (interactive)
./setup-secrets.sh update <secret-name>

# Update from file
./setup-secrets.sh update-from-file <secret-name> <file-path>

# Retrieve secret value (for verification)
./setup-secrets.sh get <secret-name>
```

### Secret Rotation Schedule

- **JWT Secrets**: Every 90 days
- **Database Password**: Every 180 days or on suspected compromise
- **API Keys**: Per vendor recommendations
- **Service Account Keys**: Every 90 days

---

## Infrastructure Setup

### 1. Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance (if not exists)
gcloud sql instances create youandinotai-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --project=spring-asset-476800-u6

# Create database
gcloud sql databases create youandinotai \
    --instance=youandinotai-db \
    --project=spring-asset-476800-u6

# Get instance IP
gcloud sql instances describe youandinotai-db \
    --format="value(ipAddresses[0].ipAddress)" \
    --project=spring-asset-476800-u6
```

### 2. Redis Instance

```bash
# Create Memorystore Redis instance
gcloud redis instances create youandinotai-cache \
    --size=1 \
    --region=us-central1 \
    --redis-version=redis_6_x \
    --project=spring-asset-476800-u6

# Get Redis host
gcloud redis instances describe youandinotai-cache \
    --region=us-central1 \
    --format="value(host)" \
    --project=spring-asset-476800-u6
```

### 3. Service Account Permissions

```bash
# Grant Secret Manager access
./setup-secrets.sh grant-access spring-asset-476800-u6@appspot.gserviceaccount.com

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding spring-asset-476800-u6 \
    --member=serviceAccount:spring-asset-476800-u6@appspot.gserviceaccount.com \
    --role=roles/cloudsql.client

# Grant Redis access
gcloud projects add-iam-policy-binding spring-asset-476800-u6 \
    --member=serviceAccount:spring-asset-476800-u6@appspot.gserviceaccount.com \
    --role=roles/redis.editor
```

---

## Deployment Steps

### Pre-Deployment

1. **Announce Maintenance Window**
   ```bash
   # Set maintenance banner (if applicable)
   # Notify users of expected downtime
   ```

2. **Backup Current Database**
   ```bash
   gcloud sql backups create \
       --instance=youandinotai-db \
       --project=spring-asset-476800-u6
   ```

3. **Tag Release**
   ```bash
   git tag -a v1.0.0 -m "Production release v1.0.0"
   git push origin v1.0.0
   ```

### Deployment

#### Option A: App Engine Deployment

```bash
# Deploy to App Engine
gcloud app deploy app.yaml \
    --project=spring-asset-476800-u6 \
    --version=v1-0-0 \
    --no-promote

# Run smoke tests on new version

# Promote to production
gcloud app services set-traffic default \
    --splits=v1-0-0=1 \
    --project=spring-asset-476800-u6
```

#### Option B: Cloud Run Deployment

```bash
# Build container
gcloud builds submit \
    --tag gcr.io/spring-asset-476800-u6/youandinotai:v1.0.0 \
    --project=spring-asset-476800-u6

# Deploy to Cloud Run
gcloud run deploy youandinotai \
    --image gcr.io/spring-asset-476800-u6/youandinotai:v1.0.0 \
    --platform managed \
    --region us-central1 \
    --project=spring-asset-476800-u6 \
    --no-traffic

# Run smoke tests

# Route traffic to new revision
gcloud run services update-traffic youandinotai \
    --to-latest \
    --region us-central1 \
    --project=spring-asset-476800-u6
```

### Database Migrations

```bash
# Run migrations (adjust based on your migration tool)
# Example with Alembic:
alembic upgrade head

# Example with custom script:
python manage.py migrate
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check application health endpoint
curl https://youandinotai.appspot.com/health

# Expected response: {"status": "healthy"}
```

### 2. Service Connectivity Tests

```bash
# Test database connection
curl https://youandinotai.appspot.com/api/health/db

# Test Redis connection
curl https://youandinotai.appspot.com/api/health/redis

# Test external API integrations
curl https://youandinotai.appspot.com/api/health/integrations
```

### 3. Functional Tests

- [ ] User authentication flow
- [ ] Critical API endpoints
- [ ] Payment processing (Square)
- [ ] AI features (Gemini)
- [ ] Image processing (Azure Cognitive)

### 4. Performance Verification

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://youandinotai.appspot.com/

# Monitor error rates in Cloud Console
gcloud logging read "resource.type=gae_app AND severity>=ERROR" \
    --limit 50 \
    --project=spring-asset-476800-u6
```

### 5. Secret Accessibility

```bash
# Verify application can access all secrets
./setup-secrets.sh validate

# Check service account permissions
gcloud projects get-iam-policy spring-asset-476800-u6 \
    --flatten="bindings[].members" \
    --filter="bindings.members:spring-asset-476800-u6@appspot.gserviceaccount.com"
```

---

## Rollback Procedures

### Immediate Rollback (< 15 minutes)

#### App Engine

```bash
# List versions
gcloud app versions list --project=spring-asset-476800-u6

# Rollback to previous version
gcloud app services set-traffic default \
    --splits=<previous-version>=1 \
    --project=spring-asset-476800-u6
```

#### Cloud Run

```bash
# List revisions
gcloud run revisions list \
    --service=youandinotai \
    --region=us-central1 \
    --project=spring-asset-476800-u6

# Rollback to previous revision
gcloud run services update-traffic youandinotai \
    --to-revisions=<previous-revision>=100 \
    --region=us-central1 \
    --project=spring-asset-476800-u6
```

### Database Rollback

```bash
# Restore from backup (if migrations need rollback)
gcloud sql backups list \
    --instance=youandinotai-db \
    --project=spring-asset-476800-u6

gcloud sql backups restore <backup-id> \
    --backup-instance=youandinotai-db \
    --instance=youandinotai-db \
    --project=spring-asset-476800-u6
```

### Secret Rollback

```bash
# Revert to previous secret version
gcloud secrets versions enable <version-id> \
    --secret=<secret-name> \
    --project=spring-asset-476800-u6

# Example:
gcloud secrets versions list db-password --project=spring-asset-476800-u6
gcloud secrets versions enable 2 --secret=db-password --project=spring-asset-476800-u6
```

---

## Monitoring & Troubleshooting

### Key Metrics to Monitor

1. **Application Health**
   - Response time (p50, p95, p99)
   - Error rate
   - Request throughput
   - Active connections

2. **Database**
   - Connection pool usage
   - Query performance
   - CPU and memory utilization
   - Storage usage

3. **Redis**
   - Cache hit rate
   - Memory usage
   - Connection count

4. **External APIs**
   - Square API quota
   - Gemini API quota and latency
   - Azure Cognitive Services quota

### Common Issues

#### Issue: "Unable to access secret"

```bash
# Check secret exists
gcloud secrets describe <secret-name> --project=spring-asset-476800-u6

# Verify service account has access
gcloud secrets get-iam-policy <secret-name> --project=spring-asset-476800-u6

# Grant access if needed
./setup-secrets.sh grant-access
```

#### Issue: "Database connection failed"

```bash
# Verify Cloud SQL is running
gcloud sql instances describe youandinotai-db --project=spring-asset-476800-u6

# Check connection string
./setup-secrets.sh get db-url

# Test connectivity from App Engine/Cloud Run
gcloud sql connect youandinotai-db --user=postgres --project=spring-asset-476800-u6
```

#### Issue: "Redis connection timeout"

```bash
# Check Redis instance status
gcloud redis instances describe youandinotai-cache \
    --region=us-central1 \
    --project=spring-asset-476800-u6

# Verify network connectivity
# Ensure application and Redis are in same VPC
```

#### Issue: "Square API authentication failed"

```bash
# Verify Square token is current
./setup-secrets.sh get square-token

# Update token if needed
./setup-secrets.sh update square-token

# Test Square API directly
curl -H "Authorization: Bearer $(./setup-secrets.sh get square-token)" \
    https://connect.squareup.com/v2/locations
```

### Log Analysis

```bash
# View recent application logs
gcloud logging read "resource.type=gae_app" \
    --limit 100 \
    --format json \
    --project=spring-asset-476800-u6

# Filter for errors
gcloud logging read "resource.type=gae_app AND severity>=ERROR" \
    --limit 50 \
    --project=spring-asset-476800-u6

# Search specific error
gcloud logging read "resource.type=gae_app AND textPayload:\"ConnectionError\"" \
    --limit 20 \
    --project=spring-asset-476800-u6
```

### Performance Debugging

```bash
# Enable detailed monitoring
gcloud app update --split-health-checks --project=spring-asset-476800-u6

# View Cloud Trace
# Navigate to: https://console.cloud.google.com/traces/list?project=spring-asset-476800-u6

# Check Cloud Profiler
# Navigate to: https://console.cloud.google.com/profiler?project=spring-asset-476800-u6
```

---

## Emergency Contacts

### On-Call Rotation

| Role | Primary | Secondary |
|------|---------|-----------|
| Platform Engineering | TBD | TBD |
| Application Development | TBD | TBD |
| Database Administration | TBD | TBD |

### Escalation Path

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO

### External Vendor Support

- **GCP Support**: [Create support case](https://console.cloud.google.com/support)
- **Square Support**: support@squareup.com
- **Google AI Support**: [Contact via Cloud Console](https://console.cloud.google.com/apis/dashboard)
- **Azure Support**: [Azure Support Portal](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

---

## Appendix

### Useful Commands Reference

```bash
# Secret Management
./setup-secrets.sh list                    # List all secrets
./setup-secrets.sh validate                # Validate all secrets
./setup-secrets.sh get <name>              # Get secret value

# Deployment
gcloud app deploy                          # Deploy to App Engine
gcloud app versions list                   # List versions
gcloud app services set-traffic default    # Route traffic

# Monitoring
gcloud logging read                        # View logs
gcloud monitoring dashboards list          # List dashboards

# Database
gcloud sql instances list                  # List SQL instances
gcloud sql backups create                  # Create backup
gcloud sql operations list                 # View operations

# Redis
gcloud redis instances list                # List Redis instances
gcloud redis instances describe            # Get instance details
```

### Secret Rotation Playbook

1. Generate new secret value
2. Add new version to Secret Manager
3. Deploy application with dual-secret support (if applicable)
4. Monitor for errors
5. Disable old secret version after 24 hours
6. Document rotation in change log

### Disaster Recovery

- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 5 minutes
- **Backup Frequency**: Automated daily + on-demand before deployments
- **Backup Retention**: 30 days

---

**Document Version:** 1.0  
**Last Reviewed:** October 31, 2025  
**Next Review:** January 31, 2026
