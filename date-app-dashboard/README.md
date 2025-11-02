# Date App DAO Dashboard

This is a production-ready, full-stack dashboard for a hypothetical "Date App DAO". It includes a backend API and a frontend application, with features like user authentication, a shop with payment integration, a fundraiser, and marketing automation placeholders.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Zustand, Axios, Firebase Client SDK
- **Backend:** Node.js, Express, TypeScript, Firebase Admin SDK, Square SDK
- **Database:** Google Cloud Firestore
- **Authentication:** Firebase Authentication
- **Payments:** Square
- **Deployment:** Docker, GitHub Actions, Google Cloud Run

## Prerequisites

Before you begin, you will need:
- [Node.js](https://nodejs.org/) (v18 or later)
- [Docker](https://www.docker.com/)
- A [Google Cloud Platform](https://cloud.google.com/) project
- A [Firebase](https://firebase.google.com/) project
- A [Square](https://developer.squareup.com/) developer account

## Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd date-app-dashboard
    ```

2.  **Set up environment variables:**
    -   Make a copy of `.env.example` and name it `.env`.
    -   Fill in the values for each variable:
        -   **`GCP_PROJECT_ID`**: Your Google Cloud project ID.
        -   **`FIREBASE_SERVICE_ACCOUNT_KEY`**: A JSON service account key from your Firebase project. Go to Project settings > Service accounts > Generate new private key.
        -   **`VITE_FIREBASE_...`**: Your Firebase project's web app configuration. Go to Project settings > General > Your apps > Web app > SDK setup and configuration.
        -   **`SQUARE_ACCESS_TOKEN`** and **`SQUARE_LOCATION_ID`**: Your Square application's credentials. Find these in your Square Developer Dashboard.
        -   **`FRONTEND_URL`** and **`BACKEND_URL`**: For local development, these are `http://localhost:5173` and `http://localhost:8080`.

3.  **Install dependencies and run the application:**
    ```bash
    docker-compose up --build
    ```
    This will build the Docker images for the frontend and backend and start the services. The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:8080`.

## Testing the Application

1.  **User Registration:**
    -   Go to `http://localhost:5173`.
    -   You should see a registration form.
    -   Create a new user account.

2.  **User Login:**
    -   After registering, you can log in with your new credentials.
    -   Upon successful login, you should see a welcome message.

3.  **Payment Flow:**
    -   Navigate to the "Shop" section.
    -   Click the "Purchase" button.
    -   You will be redirected to a Square checkout page to complete a test payment. (Ensure your Square account is in Sandbox mode).

## Deployment

This project is configured for continuous deployment to Google Cloud Run using GitHub Actions.

1.  **GitHub Secrets:**
    -   In your GitHub repository, go to Settings > Secrets and variables > Actions.
    -   Create the following secrets:
        -   `GCP_PROJECT_ID`: Your Google Cloud project ID.
        -   `GCP_SA_KEY`: The content of your Google Cloud service account key JSON file. This service account should have the "Cloud Run Admin" and "Storage Admin" roles.

2.  **Push to `main`:**
    -   When you push changes to the `main` branch, the GitHub Actions workflow in `.github/workflows/deploy.yml` will automatically trigger.
    -   The workflow will build and push the Docker images to Google Container Registry and then deploy the services to Google Cloud Run.
