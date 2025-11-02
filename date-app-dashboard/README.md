# Date App DAO Dashboard

This repository contains the code for a production-ready, deployable dashboard for a date app DAO.

## Setup

### Prerequisites
- Google Cloud SDK
- Docker
- Node.js

### Environment Variables
Create a `.env` file in the root directory with the following variables:
```
GCP_PROJECT_ID=your-gcp-project
FIREBASE_PROJECT_ID=your-firebase-project
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FRONTEND_URL=https://yourfrontenddomain.com
BACKEND_URL=https://yourbackenddomain.com
```

### Local Development
1. Run `docker-compose build`
2. Run `docker-compose up`

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:8080`.

### Deployment
The application is automatically deployed to Google Cloud Run when changes are pushed to the `main` branch.

You need to configure the following secrets in your GitHub repository:
- `GCP_SA_KEY`: The service account key for your GCP project.
- `GCP_PROJECT_ID`: Your GCP project ID.
