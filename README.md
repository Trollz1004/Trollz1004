# YouAndINotAI

A production-ready application deployed on Google Cloud Platform.

## Project Information

- **GCP Project ID**: `spring-asset-476800-u6`
- **Region**: `us-central1`
- **Last Updated**: October 31, 2025

## Documentation

- [**Deployment Runbook**](DEPLOYMENT_RUNBOOK.md) - Complete guide for production deployments, including:
  - Pre-deployment checklist
  - Secret management procedures
  - Infrastructure setup
  - Deployment steps (App Engine & Cloud Run)
  - Post-deployment verification
  - Rollback procedures
  - Monitoring and troubleshooting

## Quick Start

### Prerequisites

- GCP Project access to `spring-asset-476800-u6`
- `gcloud` CLI installed and authenticated
- Access to GCP Secret Manager

### Secret Management

Use the provided `setup-secrets.sh` script to manage secrets:

```bash
# Interactive setup for all secrets
./setup-secrets.sh setup

# Validate all required secrets exist
./setup-secrets.sh validate

# Grant service account access to secrets
./setup-secrets.sh grant-access

# Get a specific secret value
./setup-secrets.sh get <secret-name>

# Update a secret
./setup-secrets.sh update <secret-name>
```

### Deployment

#### App Engine

```bash
gcloud app deploy app.yaml \
    --project=spring-asset-476800-u6 \
    --version=v1-0-0
```

#### Cloud Run

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
    --project=spring-asset-476800-u6
```

## Infrastructure Components

- **Cloud SQL (PostgreSQL)**: Database instance for application data
- **Redis (Memorystore)**: Caching and session management
- **Secret Manager**: Secure storage for credentials and API keys
- **Square API**: Payment processing integration
- **Gemini API**: AI/ML capabilities
- **Azure Cognitive Services**: Image processing and analysis

## Required Secrets

The following secrets must be configured in GCP Secret Manager:

| Secret Name | Description |
|------------|-------------|
| `db-password` | PostgreSQL database password |
| `db-url` | Database connection string |
| `redis-url` | Redis connection string |
| `square-token` | Square API access token |
| `gemini-api-key` | Gemini API key |
| `azure-cognitive-key` | Azure Cognitive Services key |
| `jwt-secret` | JWT signing secret |
| `jwt-refresh-secret` | JWT refresh token secret |

## Support

For detailed operational procedures, troubleshooting, and emergency contacts, refer to the [Deployment Runbook](DEPLOYMENT_RUNBOOK.md).

## License

Copyright © 2025 YouAndINotAI. All rights reserved.
