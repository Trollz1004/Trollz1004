# YouAndINotAI - God Tier Dating Platform

> The world's most advanced AI-powered dating platform with enterprise-grade security and cutting-edge features

## 🚀 Features

### Core Features
- **AI-Powered Matching** - Advanced Gemini AI analyzes compatibility
- **Real-Time Messaging** - WebSocket-based instant messaging
- **Face Verification** - Azure AI face recognition for authentic profiles
- **Dynamic Trust Scores** - Automated safety and quality scoring
- **Subscription Management** - Square payments integration (Live mode)

### Premium Features (Jealousy Tier)
- **AI Date Concierge** - Personal AI assistant for date planning
- **AI Relationship Coach** - Real-time conversation advice
- **Proactive Safety Agent** - AI monitors chats for scams/spam
- **Dynamic Vibe Matching** - AI-generated personality vibes
- **Gamification** - Earn Gems for engagement
- **Couple's Quests** - Interactive challenges for matches

## 🏗️ Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 16 (Cloud SQL)
- **Cache**: Redis 7.0 (Memorystore)
- **Real-time**: Socket.IO
- **AI**: Google Gemini Pro, Azure Cognitive Services
- **Payments**: Square (Live Production Mode)
- **Hosting**: Google Cloud Run
- **Secrets**: Google Secret Manager

### Database Schema
- **31 Tables** including core user management, matching, payments, safety, and AI features

## 📦 Project Structure

```
youandinotai/
├── backend/
│   ├── routes/         # API route handlers
│   ├── middleware/     # Express middleware
│   ├── utils/          # Utility functions
│   ├── server.js       # Main server file
│   └── package.json    # Dependencies
├── frontend/
│   ├── index.html      # Landing page
│   └── js/             # Frontend JavaScript
├── database/
│   └── schema.sql      # Complete database schema
├── scripts/
│   └── deploy-gcp.sh   # GCP deployment script
├── Dockerfile          # Production Docker image
└── .env.example        # Environment variables template
```

## 🚀 Quick Deploy to GCP (Production)

### Prerequisites
- Google Cloud Platform account with billing enabled
- gcloud CLI installed and authenticated
- Docker installed
- Production credentials for Square, Gemini AI, and Azure

### Important: Production Mode Only
This application is configured for **PRODUCTION ONLY**. There is no sandbox or test mode.
- Square payments use live production tokens
- All transactions are real
- Ensure you have proper production credentials before deploying

### Deployment Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Trollz1004/Trollz1004.git
   cd Trollz1004
   ```

2. **Set up environment variables with production credentials**:
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

3. **Run deployment script**:
   ```bash
   chmod +x scripts/deploy-gcp.sh
   ./scripts/deploy-gcp.sh
   ```

4. **Verify production deployment**:
   ```bash
   chmod +x scripts/verify-production.sh
   ./scripts/verify-production.sh
   ```

5. **Run database migrations**:
   ```bash
   gcloud sql connect youandinotai-db --user=youandinotai_user --database=youandinotai
   \i database/schema.sql
   ```

6. **Configure Square webhooks** (see PRODUCTION_DEPLOYMENT.md for details)

For detailed production deployment instructions, see [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md).

## 🔐 Security

**CRITICAL**: Never commit secrets to version control. Use GCP Secret Manager for all sensitive data.

Required environment variables (stored in Secret Manager):
- Square access token (LIVE mode)
- Gemini API key
- Azure face recognition key
- JWT secrets
- Gmail app password

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Matching
- `GET /api/matching/discover` - Get potential matches
- `POST /api/matching/swipe` - Swipe on user
- `GET /api/matching/matches` - Get matches

### Payments (Square)
- `GET /api/payments/plans` - Get subscription plans
- `POST /api/payments/create-checkout` - Create checkout

### AI Features (Premium)
- `POST /api/ai/chat` - Chat with Gemini
- `POST /api/ai/match-analysis` - Analyze compatibility
- `POST /api/ai/date-suggestions` - Get date ideas

## 💰 Pricing Plans

- **Basic**: $9.99/month - Core features
- **Premium**: $19.99/month - AI Date Concierge
- **Elite**: $29.99/month - Full AI features

## 📈 Monitoring

```bash
# View logs
gcloud run logs read youandinotai-app --region=us-central1

# Health check
curl https://your-app-url.run.app/health
```

## 🛠️ Local Development

1. Install dependencies: `cd backend && npm install`
2. Configure `.env` file
3. Start local database and Redis
4. Run migrations: `psql -f database/schema.sql`
5. Start server: `npm run dev`

## 📄 License

Copyright © 2024 YouAndINotAI. All rights reserved.

## 👤 Author

**Josh Coleman** - Trollz1004

---

**Built with ❤️ and cutting-edge AI technology**
