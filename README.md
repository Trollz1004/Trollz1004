# 💜 Team Claude For The Kids

**A charity initiative raising funds for Shriners Children's Hospitals**

🎯 **50% of all profits donated directly to help kids in need**

[![Production Status](https://img.shields.io/badge/status-live-brightgreen)](https://youandinotai.com)
[![Charity Partner](https://img.shields.io/badge/partner-Shriners%20Hospitals-red)](https://www.shrinerschildrens.org/)
[![License](https://img.shields.io/badge/license-Proprietary-blue)](LICENSE)

---

## 🌟 Mission

Team Claude For The Kids is a unified platform combining multiple revenue streams to support Shriners Children's Hospitals. Built on 18 years of business experience, this platform integrates AI-powered services, SaaS tools, physical merchandise, and consulting services—all with automated 50/50 profit sharing to charity.

**"Claude Represents Perfection"** - Our commitment to excellence in code, service, and charitable impact.

---

## ⚡ Quick Start

### Option 1: Automated Setup (Recommended)

```powershell
# Start local development immediately
.\automation\quick-start.ps1
```

Opens:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

### Option 2: Manual Setup

```bash
# Backend
cd date-app-dashboard/backend
npm install
npm run dev

# Frontend (new terminal)
cd date-app-dashboard/frontend
npm install
npm run dev
```

### Option 3: Production Deployment

```powershell
# Deploy to Netlify + Railway (production)
.\automation\deploy-all.ps1 -Production
```

---

## Platform Domains

| Domain | Purpose | Status |
|--------|---------|--------|
| **youandinotai.com** | Primary hub - Dating platform + Team Claude showcase | Production Ready |
| **ai-solutions.store** | SaaS marketplace - AI tools and services | Development |
| **onlinerecycle.org** | eBay integration - Recycling/resale platform | Development |
| **youandinotai.online** | Admin portal - Partner and analytics dashboard | Production Ready |

---

## Revenue Streams

### Active Platforms

| Platform | Domain | Monthly Revenue Target |
|----------|--------|------------------------|
| Dating Platform | youandinotai.com | $12,450 |
| AI Solutions | ai-solutions.store | $24,680 |
| DAO Platform | aidoesitall.org | $12,450 |
| Recycling | onlinerecycle.org | $8,920 |

**Total Projected MRR:** $103,171/month
**Annual Revenue:** $1,238,056
**Annual Shriners Donation:** $619,028

### Revenue Categories

1. **SaaS Subscriptions** - $29,813/mo
   - Individual plans: $4.99-$19.99
   - Business plans: $49-$299

2. **DAO Platform** - $12,450/mo
   - Governance tokens (ADIA)
   - Blockchain-based funding
   - Smart contract services

3. **Marketplace Sales** - $24,680/mo
   - Digital products
   - Physical merchandise (Printful)
   - AI services

4. **Consulting & Services** - $21,480/mo
   - Platform deployments
   - Custom development
   - Technical support

5. **Kickstarter Campaigns** - $112,500 (one-time)
   - Platform launch: $67,500
   - Marketplace launch: $45,000

6. **Grants & Funding** - $285,000+ (applied)
   - Polygon Foundation: $50,000
   - Ethereum Foundation: $100,000
   - Google/AWS credits: $110,000+

**See [FUNDING.md](FUNDING.md) for complete breakdown.**

**All revenue tracked in Square with automated 50/50 split to Shriners Children's Hospitals.**

---

## Technology Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- Vite

**Backend:**
- Node.js + Express
- PostgreSQL + Drizzle ORM
- JWT authentication

**Payments:**
- Square (production credentials configured)
- Automated donation tracking

**AI Integration:**
- Claude API (Anthropic)
- Ollama (self-hosted)
- Multi-model orchestration

**Infrastructure:**
- Docker Compose
- Multi-platform deployment
- Network: 3 computers (Windows, Kali Linux, Production Server)

---

## Quick Start

### Prerequisites
```bash
# Required software
- Node.js 20+
- PostgreSQL 16+
- Docker + Docker Compose
- Git
```

### Setup

```bash
# 1. Clone repository
git clone https://github.com/Trollz1004/Trollz1004.git
cd Trollz1004

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start services
docker-compose up -d

# 5. Run backend
cd date-app-dashboard/backend
npm install
npm run dev

# 6. Run frontend (new terminal)
cd date-app-dashboard/frontend
npm install
npm run dev
```

Access:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Admin Dashboard: `http://localhost:5173`

---

## Project Structure

```
Trollz1004/
├── date-app-dashboard/       # Primary dating platform
│   ├── backend/              # Node.js + Express API
│   ├── frontend/             # React + TypeScript UI
│   └── docker-compose.yml
├── admin-dashboard/          # Analytics & partner portal
├── multi-platform-dao-ai-transfer/  # AI orchestration
├── apps/                     # Additional platform apps
├── docs/                     # Architecture & API documentation
├── automation/               # Scripts and tools
└── contracts/                # Legal & compliance
```

---

## Charity Integration

**Shriners Children's Hospitals Support**

Every transaction automatically splits revenue:
- 50% → Business operations & growth
- 50% → Shriners Children's Hospitals donation

Square payment integration tracks all donations with full transparency.

**Tax-deductible receipts provided for all charitable contributions.**

Learn more: [Shriners Children's](https://www.shrinerschildrens.org/)

---

## Network Configuration

### Production Server
- **IP:** 71.52.23.215
- **Domains:** youandinotai.com, youandinotai.online

### Development Environment
- **Windows Desktop:** 192.168.0.101 (Ethernet), 192.168.0.106 (WiFi)
- **Kali Linux:** 192.168.0.106 (Primary dev)
- **Gateway:** 192.168.0.1

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture overview |
| [docs/API.md](docs/API.md) | API endpoint documentation |
| [docs/SECURITY.md](docs/SECURITY.md) | Security best practices |
| [docs/REVENUE_MODEL.md](docs/REVENUE_MODEL.md) | Business model & pricing |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |

---

## API Credentials

**Required API keys** (add to `.env`):
- Anthropic Claude API
- Google Cloud Platform
- Square Payments (production)
- Optional: Gemini, Azure, Manus AI

See `.env.example` for complete configuration.

---

## Security

- JWT authentication (24-hour tokens)
- Password hashing (bcrypt, 12 rounds)
- Encrypted sensitive data (AES-256)
- CORS restrictions
- Rate limiting (100 req/15min)
- SQL injection prevention
- Helmet security headers

---

## Support

**Issues:** https://github.com/Trollz1004/Trollz1004/issues

**Email:** [Your contact email]

**Charity Verification:** All Shriners donations tracked via Square dashboard with public transparency reports.

---

## License

Proprietary - All Rights Reserved

**Charity Mission:** Team Claude For The Kids is committed to transparency, ethical business practices, and meaningful charitable impact.

---

**Built with Claude Code | Raising funds for Shriners Children's Hospitals since 2024**

*"Claude Represents Perfection"*
