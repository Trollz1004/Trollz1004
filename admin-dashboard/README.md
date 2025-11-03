# 🎛️ TROLLZ1004 ADMIN DASHBOARD

**Domain**: [youandinotai.online](https://youandinotai.online)  
**Purpose**: Complete Administrative Control Center  
**Status**: 🚧 In Development

---

## 🌟 OVERVIEW

Enterprise-level AI orchestration platform with:
- Multi-AI agent management (Claude 4.5, Gemini, Perplexity, Ollama, WebUI)
- Text/Voice/Image to Video content creation
- DAO/Treasury/Grants/Fundraising management
- Real-time monitoring with auto-resolve
- Social media automation across 7+ platforms
- Built-in video editor and media library
- Complete file system access for agents
- **ZERO FAKE DATA POLICY** - All metrics are 100% real

---

## 🏗️ ARCHITECTURE

### Completely Separate from Dating App
- **Date App**: youandinotai.com (existing)
- **Admin Dashboard**: youandinotai.online (this project)
- Separate backends, databases, and deployments
- API-to-API communication when needed

### Tech Stack

**Backend**:
- Node.js 20+ with TypeScript
- Express.js + Socket.io
- PostgreSQL 15+ (30+ tables)
- Redis for caching & queues
- Bull for job processing

**Frontend**:
- React 18 + TypeScript
- Vite build system
- Socket.io-client for real-time
- Custom dark theme (VSCode + Claude Orange)

**AI/ML**:
- Anthropic Claude SDK
- Google Generative AI
- OpenAI (Whisper)
- Perplexity API
- Ollama (local models)
- Runway ML (video generation)

**Blockchain**:
- ethers.js for Web3
- Multi-chain support (ETH, Polygon, Arbitrum)

---

## 📦 15 MAJOR COMPONENTS

1. ✅ **Multi-AI Agent Orchestration** - Claude 4.5 orchestrator with unlimited agent creation
2. 🚧 **Agent Creation GUI** - Build agents from dashboard with full config
3. 🚧 **Content Creation System** - Text/Voice/Image to Video generation
4. 🚧 **Integrated Media Player & Editor** - In-browser video editing with FFmpeg.wasm
5. 🚧 **URL Content Distribution** - Send created content anywhere (validated URLs only)
6. 🚧 **DAO Management** - Governance, proposals, voting
7. 🚧 **Treasury Management** - Multi-chain wallet management
8. 🚧 **Grants System** - Application, review, disbursement
9. 🚧 **Fundraising/Kickstarter** - Campaign management with real-time tracking
10. 🚧 **Real-Time Revenue Dashboard** - ALL REAL DATA (NO FAKE)
11. 🚧 **API Status Monitoring** - Green/red buttons with auto-resolve
12. 🚧 **1-Click Auto-Resolve** - Pre-scripted fixes for common issues
13. 🚧 **Social Media Auto-Post** - 1-click posting to 7+ platforms
14. 🚧 **Comet Browser Integration** - Embedded browser in dashboard
15. 🚧 **File System Admin Control** - Full access with security

---

## 🚀 GETTING STARTED

### Prerequisites
```bash
Node.js >= 20.0.0
PostgreSQL >= 15
Redis >= 7
npm >= 10.0.0
```

### Installation

1. **Clone and navigate**:
```bash
cd admin-dashboard/backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. **Setup database**:
```bash
# Create database
createdb admin_dashboard

# Run migrations
npm run db:migrate
```

5. **Start development**:
```bash
npm run dev
```

### Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

---

## 🔐 SECURITY & AUTHENTICATION

### Owner-Only Access
- Age-verified 43+ account owner
- Email/password + 2FA (TOTP)
- Session-based authentication
- NSFW content approved

### Critical Security Rules
1. **Private Keys**: NEVER commit `.env`, wallet keys, or service account JSON
2. **2FA Required**: All admin operations require 2FA
3. **Audit Logging**: All actions logged with IP, timestamp, user agent
4. **File Access**: Restricted directories (no /etc, /usr, /bin access)
5. **Agent Permissions**: Whitelisted directories only

---

## 📊 DATABASE SCHEMA

30+ tables including:
- `agents` - AI agent configurations
- `agent_conversations` - Chat history
- `agent_file_operations` - File access audit log
- `media_library` - All created content
- `content_distributions` - URL delivery tracking
- `dao_proposals` - Governance proposals
- `treasury_wallets` - Multi-chain wallets
- `treasury_transactions` - All blockchain txs
- `grants` - Grant applications & disbursements
- `fundraising_campaigns` - Kickstarter-style campaigns
- `revenue_sources` - Real revenue tracking (NO FAKE DATA)
- `api_endpoints` - Monitored API health
- `system_metrics` - CPU, RAM, disk, network
- `domain_status` - Domain uptime monitoring
- `social_media_accounts` - Connected platforms
- `social_media_posts` - Post history & analytics

See `backend/src/database/schema.sql` for complete schema.

---

## 🎨 THEME

**Dark Theme**: VSCode-inspired  
**Accent Color**: Claude Code Orange (#ff9d00)

```css
--background-primary: #1e1e1e;
--background-secondary: #252526;
--accent-orange: #ff9d00;
--success-green: #4caf50;
--error-red: #f44336;
```

---

## 🤖 AI AGENT SYSTEM

### Supported Providers
- **Claude** (Anthropic) - Primary orchestrator
- **Gemini** (Google)
- **Perplexity** - Real-time search AI
- **Ollama** - Local models (llama3.1, etc.)
- **WebUI** - Custom integrations
- **OpenAI** - Whisper for voice-to-text

### Agent Capabilities
- ✅ File system access (whitelisted directories)
- ✅ Content creation (video, image, text)
- ✅ Social media posting
- ✅ DAO operations
- ✅ Treasury management
- ✅ Unlimited sub-agent creation
- ✅ Real-time monitoring

---

## 📹 CONTENT CREATION

### Text-to-Video
```typescript
POST /api/content/text-to-video
{
  "prompt": "A sunset over the ocean",
  "duration": 5,
  "resolution": "1280x720"
}
```

### Voice-to-Video
```typescript
POST /api/content/voice-to-video
{
  "audioFile": <file>,
  "visualStyle": "abstract"
}
```

### Image-to-Video
```typescript
POST /api/content/image-to-video
{
  "imageFile": <file>,
  "motionPrompt": "Camera zoom in slowly"
}
```

All content stored in `media_library` table with thumbnails.

---

## 💰 DAO & TREASURY

### Create Proposal
```typescript
POST /api/dao/proposals
{
  "title": "Fund new marketing campaign",
  "description": "...",
  "votingEndsAt": "2025-12-31T23:59:59Z"
}
```

### Check Treasury Balance
```typescript
GET /api/treasury/balance
// Returns REAL balance across all chains (NO FAKE DATA)
{
  "total_usd": 12345.67,
  "wallets": [
    { "chain": "ethereum", "balance_usd": 10000.00 },
    { "chain": "polygon", "balance_usd": 2345.67 }
  ]
}
```

---

## 🚦 API MONITORING & AUTO-RESOLVE

### Monitored APIs (15+)
- Date app health
- Claude API
- OpenAI API
- Gemini API
- Runway ML
- Twilio SMS
- SendGrid Email
- Stripe Payments
- Twitter/Instagram/Reddit APIs
- Ethereum/Polygon RPCs

### Auto-Resolve System
When API goes red (offline), click button to:
1. Execute pre-scripted fix
2. Monitor resolution
3. Update status to green

Example auto-resolve scripts:
- Restart connection pool
- Refresh auth tokens
- Clear cache
- Retry with backoff

---

## 📱 SOCIAL MEDIA AUTO-POST

### 1-Click Post to All
```typescript
POST /api/social/post-all
{
  "mediaId": "uuid",
  "caption": "Check out our new feature!",
  "platforms": ["twitter", "instagram", "facebook", "reddit"]
}
```

### Custom URL Posting
```typescript
POST /api/social/post-to-url
{
  "url": "https://valid-url.com/api/post",
  "mediaId": "uuid",
  "method": "http_post"
}
// URL MUST be valid http/https (validated)
```

---

## 🖥️ REAL-TIME MONITORING

### Server Metrics
- CPU usage %
- RAM usage (GB)
- Disk space (GB free)
- Network I/O
- Process count
- Uptime

### Domain Monitoring
- youandinotai.com status
- youandinotai.online status
- DNS resolution time
- SSL expiry date
- Page load time
- Cloudflare status

### Agent Monitoring
- Total agents online
- Active conversations
- Token usage
- API calls/min
- Error rate

---

## 📁 FILE SYSTEM ACCESS

### Allowed Directories
```bash
/var/www
/home/admin
/opt/trollz
```

### Restricted Directories
```bash
/etc
/usr
/bin
/sbin
/sys
/proc
```

All file operations logged in `agent_file_operations` table.

---

## 🔧 DEVELOPMENT

### Run Backend Dev Server
```bash
cd backend
npm run dev
```

### Run Frontend Dev Server
```bash
cd frontend
npm run dev
```

### Build for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Run Database Migrations
```bash
npm run db:migrate
```

---

## 🌐 DEPLOYMENT

### Production URLs
- **Admin Dashboard**: https://youandinotai.online
- **Date App**: https://youandinotai.com

### Environment
- Both domains on Cloudflare
- SSL enabled (HTTPS only)
- CORS configured for both domains

### Docker Deployment
```bash
docker-compose up -d
```

---

## 📝 API DOCUMENTATION

See `ADMIN_DASHBOARD_SPEC.md` for complete API documentation.

### Key Endpoints
- `/api/agents` - Agent management
- `/api/content` - Content creation
- `/api/dao` - DAO governance
- `/api/treasury` - Treasury management
- `/api/grants` - Grant system
- `/api/fundraisers` - Fundraising campaigns
- `/api/revenue` - Revenue tracking (REAL DATA)
- `/api/status` - API health monitoring
- `/api/social` - Social media posting

---

## 🚨 ZERO FAKE DATA POLICY

**CRITICAL**: All displayed data MUST be 100% real.

### Examples:
- If $0 revenue: Display "$0.00" ✅
- If $0 revenue: Display "Coming soon" ❌
- If 0 transactions: Display "0 transactions" ✅
- If 0 transactions: Display "Sample data" ❌

### Revenue Sources (All Real)
- Date app subscriptions
- NFT sales
- Fundraiser contributions
- Grant distributions
- DAO treasury
- Kickstarter campaigns

---

## 📚 DOCUMENTATION

- `ADMIN_DASHBOARD_SPEC.md` - Complete technical specification
- `backend/src/database/schema.sql` - Database schema
- `.env.example` - Environment configuration template
- This README - Getting started guide

---

## 🤝 SUPPORT

**Owner Contact**: owner@youandinotai.online

---

## 📄 LICENSE

Proprietary - All rights reserved

---

**Built with 💜 for complete administrative control**
