# Date App DAO Dashboard

This is a production-ready, full-stack dashboard for a hypothetical "Date App DAO". It includes a backend API and a frontend application, with comprehensive features including authentication, e-commerce, fundraising, analytics, and security features.

## Technology Stack

- **Frontend:** React, TypeScript, Vite, Zustand, Axios, Firebase Client SDK, Material-UI, Recharts
- **Backend:** Node.js, Express, TypeScript, Firebase Admin SDK, Square SDK
- **Database:** Google Cloud Firestore
- **Authentication:** Firebase Authentication with Two-Factor Authentication (2FA)
- **Payments:** Square
- **Deployment:** Docker, GitHub Actions, Google Cloud Run

## Features

### Core Features
- **User Authentication:** Firebase-based authentication with email/password
- **Shop & E-commerce:** Product catalog with Square payment integration
- **Fundraiser Management:** Create and manage fundraising campaigns
- **Admin Dashboard:** Comprehensive admin controls and statistics
- **Real-time Chat:** WebSocket-based real-time messaging
- **Marketing Tools:** Newsletter subscription management

### New Advanced Features
1. **Advanced Search & Filtering System**
   - Search across products, fundraisers, and users
   - Filter by price range, category, and other criteria
   - Real-time search results with pagination

2. **Analytics Dashboard**
   - Visual charts and graphs for business metrics
   - User growth trends
   - Revenue analytics
   - Product distribution by category
   - Fundraiser performance tracking

3. **Two-Factor Authentication (2FA)**
   - TOTP-based 2FA using authenticator apps
   - QR code generation for easy setup
   - Secure account protection
   - Enable/disable 2FA with verification

4. **Activity Feed/Timeline**
   - Personal activity tracking
   - Global activity feed for community engagement
   - Real-time activity updates
   - Visual timeline with icons and timestamps

5. **Dark/Light Theme Toggle**
   - Switch between dark and light themes
   - Theme preference persistence
   - Smooth theme transitions
   - System-wide theme consistency

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

4.  **Search & Filter:**
    -   Use the Search page to find products, fundraisers, or users.
    -   Apply filters like price range or category to refine results.

5.  **Analytics (Admin Only):**
    -   Log in with an admin account.
    -   Navigate to the Analytics page to view charts and metrics.
    -   Explore user growth, revenue trends, and product distribution.

6.  **Two-Factor Authentication:**
    -   Go to your Profile page.
    -   Enable 2FA by scanning the QR code with an authenticator app.
    -   Enter the verification code to activate 2FA.

7.  **Activity Feed:**
    -   Check the Activity page to see your recent actions.
    -   Switch to the Global Feed to see community activity.

8.  **Theme Toggle:**
    -   Click the sun/moon icon in the navigation bar to switch themes.
    -   Your preference will be saved for future sessions.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password

### Shop
- `GET /api/shop/products` - Get all products
- `POST /api/shop/checkout` - Create a checkout session

### Fundraiser
- `GET /api/fundraiser/list` - Get all fundraisers
- `POST /api/fundraiser/create` - Create a new fundraiser
- `POST /api/fundraiser/donate` - Make a donation

### Search
- `GET /api/search/search` - Search across products, fundraisers, and users

### Analytics (Admin Only)
- `GET /api/analytics/overview` - Get comprehensive analytics data

### Activity
- `GET /api/activity/feed` - Get user's activity feed
- `GET /api/activity/global` - Get global activity feed

### Two-Factor Authentication
- `POST /api/2fa/setup` - Setup 2FA for user
- `POST /api/2fa/verify` - Verify and enable 2FA
- `POST /api/2fa/disable` - Disable 2FA
- `GET /api/2fa/status` - Check 2FA status

### Profile
- `POST /api/profile/upload-avatar` - Upload user avatar

### Admin
- `GET /api/admin/stats` - Get admin statistics

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
