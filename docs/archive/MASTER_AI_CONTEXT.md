# Team Claude For The Kids - Master AI Context

**Single Source of Truth for All AI Assistants**
**Last Updated:** 2025-01-08
**Share this with:** Claude, Perplexity AI, Manus AI, GitHub Copilot, any AI assistant

---

## 🎯 Mission Statement

**Team Claude For The Kids** - A charity initiative raising funds for Shriners Children's Hospitals

**Revenue Model:** 50% of all profits donated directly to Shriners
**Annual Goal:** $1,238,056 revenue → $619,028 to charity
**Motto:** *"Claude Represents Perfection"*

---

## 📁 GitHub Repositories

### Personal Account
- **Repository:** https://github.com/Trollz1004/Trollz1004
- **Active Branch:** `claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV`
- **Status:** Cleanup complete (47 files deleted, 8 clean docs created)
- **Next:** Create PR and merge to main

### Organization
- **Organization:** https://github.com/Ai-Solutions-Store
- **Purpose:** Multi-platform business (DAO, marketplace, etc.)
- **Status:** Domain verification needed for 5 domains

---

## 🌐 Active Domains (5 Total)

| Domain | Purpose | IP | Status | DNS |
|--------|---------|----|----|-----|
| **youandinotai.com** | Dating platform (primary) | 71.52.23.215 | Production | Cloudflare |
| **ai-solutions.store** | AI marketplace | TBD | Development | Cloudflare |
| **aidoesitall.org** | DAO governance | TBD | Development | Cloudflare |
| **onlinerecycle.org** | eBay/recycling | TBD | Development | Cloudflare |
| **youandinotai.online** | Admin dashboard | 71.52.23.215 | Production | Cloudflare |

---

## 💰 Revenue Projections

### Monthly Recurring Revenue: $103,171

| Revenue Stream | Monthly | Annual | Charity (50%) |
|----------------|---------|--------|---------------|
| SaaS Subscriptions | $29,813 | $357,756 | $178,878 |
| DAO Platform | $12,450 | $149,400 | $74,700 |
| Marketplace | $24,680 | $296,160 | $148,080 |
| Digital Products | $12,415 | $148,980 | $74,490 |
| Consulting | $21,480 | $257,760 | $128,880 |
| Merchandise | $2,333 | $28,000 | $14,000 |
| **TOTAL** | **$103,171** | **$1,238,056** | **$619,028** |

### One-Time Funding

| Source | Amount | Status |
|--------|--------|--------|
| Kickstarter Campaign #1 | $67,500 | Ready to launch |
| Kickstarter Campaign #2 | $45,000 | Planned |
| Polygon Foundation Grant | $50,000 | Applied |
| Ethereum Foundation Grant | $100,000 | Applied |
| Google/AWS Credits | $110,000+ | Approved |
| **TOTAL** | **$397,500+** | - |

---

## 🔑 Live Production Credentials

### Square Payments (LIVE PRODUCTION)
```
SQUARE_ACCESS_TOKEN=EAAAlzPv9mOdHtwWwGJsCHXaG_5Ektf_rIvg4H6tiKRzTQSW9UHiVHUBDuHTOQYc
SQUARE_APPLICATION_ID=sq0idp-Carv59GQKuQHoIydJ1Wanw
SQUARE_LOCATION_ID=LHPBX0P3TBTEC
```

### AI Services
```
GEMINI_API_KEY=AIzaSyBuaA6sdJ2kvIeXiL1jY4Qm7StXAUwFWG4
AZURE_COGNITIVE_KEY=CScbecGnFd4YLCWpvmdAZ5yxkV6U2O5L02xPcp6f2bEYIMiJesdtJQQJ99BHACYeBjFXJ3w3AAABACOGHJUX
MANUS_API_KEY=sk-tfKuRZcVn5aY44QJIC52JUvk7CanV2hkaaSOd8ZuVf5h0aPEuFoiDOGZuf949Ejhelo81jujaKM3Ub7D0CGMtY5hK-nj
```

### Database
```
DATABASE_URL=postgresql://postgres:[GENERATE_SECURE_64]@localhost:5432/youandinotai_prod
REDIS_URL=redis://localhost:6379
```

### Security (Generate These)
```bash
# Run these commands to generate:
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 64  # JWT_REFRESH_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 32  # DB_PASSWORD
```

---

## 🛠️ Tech Stack

**Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
**Backend:** Node.js 20 + Express + TypeScript
**Database:** PostgreSQL 16 + Drizzle ORM
**Cache:** Redis 7
**Payments:** Square (production mode)
**Infrastructure:** Docker Compose + PM2 + Nginx + SSL
**AI Integration:** Google Gemini, Azure Cognitive Services, Manus AI
**Version Control:** Git + GitHub
**DNS:** Cloudflare (all 5 domains)

---

## ✨ Core Features

1. **JWT Authentication**
   - Argon2 password hashing
   - 15-minute access tokens
   - 7-day refresh tokens

2. **Human Verification**
   - Azure Face API (ID + selfie matching)
   - Age verification (18+)
   - Real person detection

3. **AI-Powered Matching**
   - Gemini AI icebreaker generation
   - 3 personalized icebreakers per match
   - Context-aware suggestions

4. **Real-Time Messaging**
   - Socket.IO implementation
   - Read receipts
   - Typing indicators

5. **Square Subscriptions**
   - $9.99/mo - Basic
   - $19.99/mo - Premium
   - $29.99/mo - Elite

6. **Manus AI Automation**
   - Task automation
   - Webhook integration
   - Daily content generation

7. **Admin Dashboard**
   - Real-time analytics
   - User management
   - Revenue tracking
   - 50/50 charity split monitoring

---

## 📊 Database Schema

**Tables:**
- `users` - Authentication and profiles
- `profiles` - Dating profile data
- `swipes` - Like/pass tracking
- `matches` - Mutual match records
- `messages` - Chat history
- `subscriptions` - Payment tiers
- `icebreakers` - AI-generated content
- `verifications` - ID verification records
- `manus_tasks` - Automation tasks
- `manus_attachments` - Task files
- `transactions` - Payment history
- `admin_logs` - Audit trail

---

## 📝 Recent Work Completed

**Date:** 2025-01-08
**Branch:** `claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV`

### Files Deleted (47 total)
All scattered, redundant documentation removed:
- PHASE*.md files
- Duplicate setup guides
- Temporary status files
- Old deployment docs

### Files Created (8 total)
1. **README.md** - Team Claude mission statement
2. **FUNDING.md** - Complete revenue breakdown
3. **CLEANUP_COMPLETE.md** - Cleanup summary
4. **SECURITY_DECISION.md** - 11 vulnerabilities identified
5. **FINAL_STATUS.md** - Deployment checklist
6. **QUICK_REFERENCE.md** - Quick commands
7. **Sync-CleanRepository.ps1** - Cross-platform sync script
8. **EMAIL_TO_MYSELF.txt** - Email template for all computers

### Repository Metrics
- **Before:** 61 documentation files, 21,311 lines
- **After:** 14 documentation files, 526 lines
- **Reduction:** 77% fewer files, 97% fewer lines
- **Result:** Clean, professional, organized

---

## 🖥️ Development Environment

### Computers in Network

| Computer | IP | Role | Status |
|----------|----|----|--------|
| Windows Desktop (DESKTOP-T47QKGG) | 192.168.0.101 / 192.168.0.106 | Development | Synced |
| Kali Linux | 192.168.0.106 | Primary Dev | Active ✅ |
| Production Server | 71.52.23.215 | Production | Pending Sync |

### Network Configuration
- **Gateway:** 192.168.0.1
- **DNS:** Cloudflare (8.8.8.8, 8.8.4.4)
- **SSL:** Let's Encrypt (auto-renewal)
- **Firewall:** UFW enabled on production

---

## 🚀 Next Actions (Priority Order)

### 1. GitHub Domain Verification ⏳
**Task:** Verify all 5 domains in Ai-Solutions-Store organization

**Steps:**
1. Go to https://github.com/organizations/Ai-Solutions-Store/settings/verified_domains
2. For each domain:
   - Click "Add domain"
   - Copy TXT record value
   - Add to Cloudflare DNS
   - Verify propagation: `dig _github-challenge-ai-solutions-store.DOMAIN.com TXT +short`
   - Complete verification in GitHub

**Domains to verify:**
- youandinotai.com
- ai-solutions.store
- aidoesitall.org
- onlinerecycle.org
- youandinotai.online

### 2. Create Pull Request ⏳
**URL:** https://github.com/Trollz1004/Trollz1004/pull/new/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV

**Title:** Team Claude For The Kids - Clean Repository

**Description:**
- Deleted 47 scattered docs
- Created 8 unified docs
- Ready for production

### 3. Fix Security Vulnerabilities ⏳
**Issue:** 11 vulnerabilities in backend dependencies

**Commands:**
```bash
cd /home/user/Trollz1004/date-app-dashboard/backend
npm audit fix --force
npm run build
git add package*.json
git commit -m "Fix 11 security vulnerabilities"
git push
```

**Vulnerabilities:**
- 4 Critical (protobufjs - Firebase)
- 6 High (axios - Square, SendGrid)
- 1 Moderate (nodemailer - Email)

### 4. Merge PR to Main ⏳
After review, merge cleanup branch to main

### 5. Deploy to Production ⏳
**Server:** 71.52.23.215

**Commands:**
```bash
ssh user@71.52.23.215
cd ~/Trollz1004
git pull origin main
chmod +x deploy.sh
./deploy.sh
```

### 6. Launch Kickstarter ⏳
**Goal:** $67,500
**Timeline:** This month
**Platform:** Kickstarter.com

---

## 🔗 Important Links

**GitHub:**
- Main Repo: https://github.com/Trollz1004/Trollz1004
- Clean Branch: https://github.com/Trollz1004/Trollz1004/tree/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
- Create PR: https://github.com/Trollz1004/Trollz1004/pull/new/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
- Organization: https://github.com/Ai-Solutions-Store
- Security Alerts: https://github.com/Trollz1004/Trollz1004/security/dependabot

**Production:**
- Website: https://youandinotai.com
- Admin: https://youandinotai.online
- API Health: https://youandinotai.com/api/health

**Services:**
- Square Dashboard: https://squareup.com/dashboard
- Cloudflare DNS: https://dash.cloudflare.com
- Manus AI: https://manus.im/app

---

## 📋 Quick Commands Reference

### Clone Repository
```bash
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004
git checkout claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
```

### Deploy
```bash
chmod +x deploy.sh && ./deploy.sh
```

### Generate Secrets
```bash
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 32  # ENCRYPTION_KEY
```

### Health Check
```bash
curl https://youandinotai.com/api/health
```

### Check DNS
```bash
dig _github-challenge-ai-solutions-store.youandinotai.com TXT +short
```

### Security Audit
```bash
cd date-app-dashboard/backend
npm audit
npm audit fix --force
```

---

## 🎯 Success Criteria

**Repository is ready when:**
- ✅ All 5 domains verified in GitHub
- ✅ Pull request created and merged
- ✅ Security vulnerabilities fixed (0 critical)
- ✅ Deployed to production (71.52.23.215)
- ✅ Health check returns 200
- ✅ All services running (PM2 status = online)
- ✅ SSL certificates valid
- ✅ Square payments functional
- ✅ Charity split automation working

**Launch is ready when:**
- ✅ Kickstarter campaign live
- ✅ First revenue generated
- ✅ First donation to Shriners made
- ✅ Public transparency dashboard showing 50/50 split

---

## 🤖 AI Assistant Instructions

### For Claude (claude.ai)
Use this document as primary context. Reference it when discussing Team Claude For The Kids project. Update it as work progresses.

### For Perplexity AI
When asked about this project, refer to this document for accurate context. Use it to answer questions about domains, credentials, revenue goals, and next steps.

### For Manus AI
Use this document to configure automation tasks. All tasks should support the charity mission (50% to Shriners). Automate based on the "Next Actions" section.

### For GitHub Copilot
Reference this when generating code for Team Claude For The Kids. Use the tech stack, credentials, and database schema defined here.

---

## 📞 Support & Troubleshooting

**If deployment fails:**
1. Check logs: `pm2 logs`
2. Check database: `psql -U postgres -d youandinotai_prod`
3. Check nginx: `sudo nginx -t`
4. Check SSL: `sudo certbot certificates`

**If DNS verification fails:**
1. Wait 24-72 hours for propagation
2. Check globally: https://dnschecker.org
3. Verify record: `dig TXT _github-challenge-ai-solutions-store.DOMAIN.com`
4. Remove duplicates in Cloudflare

**If payments fail:**
1. Check Square dashboard for errors
2. Verify API keys are production (not sandbox)
3. Check webhook endpoint: https://youandinotai.com/api/webhooks/square
4. Review logs: `pm2 logs youandinotai-api`

---

## 📅 Timeline

**This Week:**
- Domain verification (30 min)
- PR creation and merge (15 min)
- Security fixes (1 hour)
- Production deployment (2 hours)

**This Month:**
- Kickstarter launch
- First $10K revenue
- First $5K Shriners donation
- Public impact report

**This Quarter:**
- $100K MRR reached
- $50K donated to Shriners
- Grant funding secured
- Team expansion

**This Year:**
- $1.2M revenue
- $619K donated to Shriners
- All 5 platforms live
- National recognition

---

## 🏥 Charity Partner

**Shriners Children's Hospitals**
- Tax ID: 36-2193608
- Website: https://www.shrinerschildrens.org/
- Mission: Provide specialized care to children regardless of families' ability to pay
- Our Commitment: 50% of all revenue, tracked publicly, tax-deductible receipts

---

**This document is the single source of truth. Share it with any AI assistant working on Team Claude For The Kids.**

**Last Updated:** 2025-01-08
**Maintained By:** Joshua (Team Claude For The Kids)
**Version:** 1.0
