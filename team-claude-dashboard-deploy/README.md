# Team Claude Dashboard - Deployment Package

**Ai-Solutions.Store Platform**
**Mission: 50% to Shriners Children's Hospitals**

---

## 🚀 Quick Deploy

```bash
# From this directory, run:
./deploy-netlify.sh
```

**Or from project root:**
```bash
./TEAM-CLAUDE-LAUNCHER.sh
```

---

## 📦 Package Contents

- **index.html** - Team Claude Dashboard (main file)
- **styles.css** - Responsive green charity theme
- **script.js** - Interactive charts and real-time updates
- **deploy-netlify.sh** - Automated deployment script
- **netlify.toml** - Netlify configuration (auto-generated)

---

## 🌐 Features

### Dashboard Sections:
- ✅ Overview - Key metrics and charts
- ✅ Revenue - Profit split and MRR tracking
- ✅ Users - User growth and engagement
- ✅ Charity Impact - Shriners donation tracking
- ✅ Platform Status - System health monitoring

### Responsive Design:
- ✅ Desktop, tablet, and mobile optimized
- ✅ Real-time chart updates
- ✅ Interactive tab navigation
- ✅ Live activity feed

---

## 📋 Prerequisites

- Node.js (v18+)
- npm
- Netlify CLI: `npm install -g netlify-cli`

---

## 🔧 Local Development

```bash
# Start local server
python3 -m http.server 8000

# Visit dashboard
# http://localhost:8000
```

---

## 🌐 Custom Domain Setup

**Recommended:** `dashboard.youandinotai.com`

**Cloudflare DNS:**
```
Type:   CNAME
Name:   dashboard
Target: your-site.netlify.app
Proxy:  DNS only
```

---

## 💙 Mission

**50% of all profits → Shriners Children's Hospitals**

Every subscription helps children receive world-class medical care.

---

## 📖 Full Documentation

See: `../TEAM-CLAUDE-DASHBOARD-DEPLOY-GUIDE.md`

---

**Status:** Production Ready ✅
**Platform:** Netlify
**Version:** 1.0.0
