# GitHub Copilot Deployment Prompt

Paste this into GitHub Copilot when creating your repository:

---

## COPILOT PROMPT:

Deploy a complete production-ready dating platform called "Team Claude For The Kids" that donates 50% of all revenue to Shriners Children's Hospitals.

**Repository Setup:**
- Create under organization: [YOUR_ORG_NAME]
- Repository name: TeamClaudeForTheKids
- Visibility: Private (contains production code)
- Initialize with comprehensive README

**Platform Components to Deploy:**

1. **Backend API (Node.js/TypeScript)**
   - Express.js REST API
   - PostgreSQL database with migrations
   - Redis caching
   - Square payment integration (production mode)
   - JWT authentication
   - Video verification for profiles
   - Real-time matching algorithm
   - Marketing automation worker
   - Grant automation system

2. **Frontend (React/TypeScript)**
   - Dating app user interface
   - Admin dashboard
   - Payment/subscription management
   - Profile creation and matching
   - Video verification UI
   - Revenue analytics dashboard

3. **Infrastructure as Code:**
   - Docker Compose for local development
   - Google Cloud Platform deployment configs
   - AWS CloudFormation templates
   - Railway.app deployment files
   - Kubernetes manifests (optional)

4. **Automation Systems:**
   - AI-powered marketing automation (Perplexity API)
   - Google Ads integration
   - Social media automation (Twitter, Facebook, Instagram, TikTok)
   - Email marketing campaigns (SendGrid)
   - Grant discovery and application automation
   - Revenue tracking and forecasting

5. **Database Schema:**
   - Users table with verification
   - Profiles with matching preferences
   - Matches and conversations
   - Subscriptions and payments
   - Transactions with charity tracking (50% split)
   - Marketing campaigns
   - Grant applications
   - Analytics and metrics

6. **Payment Processing:**
   - Square API integration (PRODUCTION mode only)
   - Subscription tiers: Free, Pro ($9.99), Premium ($19.99)
   - One-time payments for premium features
   - Automatic 50% charity allocation
   - Transaction logging and receipts

7. **Deployment Automation:**
   - One-click Railway deployment script
   - Google Cloud Run deployment (no Docker needed)
   - Full AWS/GCP infrastructure deployment
   - CI/CD with GitHub Actions
   - Automated testing and validation

8. **Documentation:**
   - Complete deployment guides (Railway, GCP, AWS)
   - API documentation
   - Database schema documentation
   - Marketing automation setup
   - Revenue tracking guide
   - Troubleshooting guides

**Environment Variables Required:**
```env
# Payment Processing
SQUARE_ACCESS_TOKEN=production_token
SQUARE_APP_ID=app_id
SQUARE_ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Marketing Automation
PERPLEXITY_API_KEY=api_key
GOOGLE_ADS_API_KEY=api_key
SENDGRID_API_KEY=api_key
FACEBOOK_ACCESS_TOKEN=token
TWITTER_API_KEY=api_key

# Application
NODE_ENV=production
PORT=5000
JWT_SECRET=random_secret
```

**Deployment Options to Include:**

1. **Railway.app (5 minutes):**
   - One-click deploy button
   - Automatic database provisioning
   - Environment variable configuration
   - Domain generation
   - Cost: $5-20/month

2. **Google Cloud Run (15 minutes):**
   - Cloud SQL PostgreSQL
   - Memorystore Redis
   - Cloud Storage
   - Cloud Build (no Docker needed locally)
   - Cloud Scheduler for automation
   - Cost: $55-115/month

3. **Full AWS Infrastructure (4-6 hours):**
   - ECS Fargate
   - RDS PostgreSQL
   - ElastiCache Redis
   - S3 + CloudFront
   - Lambda for automation
   - Cost: $350-750/month

**Revenue Model:**
- Dating subscriptions: $12K/month target
- AI Marketplace commissions: $24K/month target
- Merchandise sales: $65K/month target
- Grant funding: $500K-2M/year target
- **Total Year 1:** $1.2M+ revenue
- **Charity donation:** 50% = $600K+ to Shriners Children's Hospitals

**Key Features:**
- Video verification (no bots)
- AI-powered matching algorithm
- Real-time chat and messaging
- Premium subscription tiers
- Square payment processing
- 50% automatic charity allocation
- Marketing automation (12 posts/day)
- Email campaigns (triggered)
- Grant automation ($500K-2M pipeline)
- Revenue analytics dashboard
- Auto-scaling infrastructure
- SSL certificates (automatic)
- Database backups (automatic)

**File Structure:**
```
TeamClaudeForTheKids/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── Dockerfile
├── automation/
│   ├── marketing-agent.ts
│   ├── grant-automation.ts
│   └── revenue-tracker.ts
├── database/
│   └── migrations/
├── infrastructure/
│   ├── gcp/
│   ├── aws/
│   └── railway/
├── docs/
│   ├── DEPLOY-RAILWAY.md
│   ├── DEPLOY-GCP.md
│   ├── DEPLOY-AWS.md
│   ├── API.md
│   └── REVENUE.md
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docker-compose.yml
├── railway-deploy.sh
├── gcp-deploy.sh
├── aws-deploy.sh
├── .env.example
├── .env.production.example
└── README.md
```

**CI/CD Pipeline:**
- GitHub Actions for automated testing
- Automated deployment on push to main
- Security scanning (Dependabot)
- Code quality checks (ESLint, Prettier)
- Database migration automation
- Integration testing

**Security Requirements:**
- HTTPS only (enforced)
- JWT authentication
- Password hashing (bcrypt)
- Rate limiting
- CORS configuration
- SQL injection prevention
- XSS protection
- CSRF tokens
- Environment variable encryption

**Monitoring & Analytics:**
- Real-time revenue tracking
- User growth metrics
- Conversion rate analytics
- Payment success/failure tracking
- Marketing ROI tracking
- Error logging (Sentry)
- Performance monitoring
- Uptime monitoring

**Success Metrics:**
- Month 1: $5K-10K revenue, 1,000-2,000 users
- Month 6: $75K-90K revenue, 10,000-15,000 users
- Year 1: $1.2M+ revenue, 25,000-35,000 users
- Charity donation: $600K+ to Shriners Children's Hospitals

**Deployment Commands:**
```bash
# Railway (easiest)
railway init
railway up

# Google Cloud
gcloud run deploy

# AWS
aws cloudformation create-stack

# Docker Compose (local)
docker-compose up
```

**Post-Deployment Checklist:**
- ✅ Platform accessible via HTTPS
- ✅ Payment processing working (Square)
- ✅ 50% charity split verified
- ✅ Marketing automation running
- ✅ Grant automation active
- ✅ Revenue dashboard functional
- ✅ Database backups enabled
- ✅ Monitoring alerts configured

Generate all necessary code, configurations, and documentation to make this platform production-ready and deployable immediately.

---

## Additional Instructions for Copilot:

1. Use TypeScript for all code (backend and frontend)
2. Include comprehensive error handling
3. Add detailed code comments
4. Create complete API documentation
5. Include unit tests and integration tests
6. Follow REST API best practices
7. Implement secure authentication
8. Add database migration scripts
9. Create deployment automation scripts
10. Include troubleshooting guides

**Priority:** Production-ready code that can be deployed immediately and start generating revenue for charity.

**Mission:** Every dollar earned helps sick children at Shriners Children's Hospitals. Build this platform to make a real difference in kids' lives.

**Target:** $1.2M+ Year 1 revenue = $600K+ donated to charity 💚
