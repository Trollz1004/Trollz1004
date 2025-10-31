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

## 🚀 Quick Deploy to GCP

### Prerequisites
- Google Cloud Platform account with billing enabled
- gcloud CLI installed and authenticated
- Docker installed

### Deployment Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Trollz1004/Trollz1004.git
   cd Trollz1004
   ```

2. **Run deployment script**:
   ```bash
   chmod +x scripts/deploy-gcp.sh
   ./scripts/deploy-gcp.sh
   ```

3. **Update secrets with production values**:
   ```bash
   echo -n 'YOUR_SQUARE_TOKEN' | gcloud secrets versions add square-access-token --data-file=-
   echo -n 'YOUR_GEMINI_KEY' | gcloud secrets versions add gemini-api-key --data-file=-
   echo -n 'YOUR_AZURE_KEY' | gcloud secrets versions add azure-face-key --data-file=-
   ```

4. **Run database migrations**:
   ```bash
   gcloud sql connect youandinotai-db --user=youandinotai_user
   \i database/schema.sql
   ```

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
