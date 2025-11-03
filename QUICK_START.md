# ⚡ QUICK START REFERENCE

## 🚀 Get Running in 60 Seconds

```bash
cd date-app-dashboard/frontend
npm install
npm run dev
```

Then open: **http://localhost:3000**

---

## 🎯 USER FLOW TEST

1. **Signup** → email@example.com / SecurePass123!
2. **Verify Email** → Check console for 6-digit code (demo: 123456)
3. **Verify Age** → Select any date 1990+ (you'll be 18+)
4. **Verify Phone** → Phone: +1-555-0100 / Code: 123456
5. **Accept TOS** → Read and agree
6. **Create Profile** → Add bio, 1-6 photos, interests
7. **Dashboard** → Browse profiles, like/pass, see matches

---

## 📁 KEY FILES

| File | Purpose | Lines |
|------|---------|-------|
| `AuthContext.tsx` | Global auth state | 150 |
| `Dashboard.tsx` | Main app UI | 250 |
| `CreateProfile.tsx` | Profile setup | 230 |
| `App.tsx` | Router setup | 120 |
| `Auth.css` | Auth styling | 350 |
| `Dashboard.css` | App styling | 550 |

---

## 🔧 COMMANDS

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview build
npm run test            # Run tests
npm run lint            # Lint TypeScript

# Installation
npm install             # Install deps
npm update              # Update packages
```

---

## 🌐 ENVIRONMENT

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **API Proxy:** Configured in vite.config.ts
- **Database:** PostgreSQL (localhost:5432)

---

## 📋 API ENDPOINTS

**Auth:**
- POST `/api/auth/signup`
- POST `/api/auth/verify-email`
- POST `/api/auth/verify-age`
- POST `/api/auth/verify-phone`
- POST `/api/auth/accept-tos`
- POST `/api/auth/login`

**Profiles:**
- POST `/api/profiles`
- GET `/api/profiles/discover`
- POST `/api/matches/like/{id}`
- POST `/api/matches/pass/{id}`
- GET `/api/matches`

---

## 🔐 DEMO ACCOUNT

Email: `demo@antiaidating.com`
Password: `Test@1234`

---

## ⚠️ COMMON ISSUES

**"Cannot find module 'react'"**
```bash
npm install
```

**Backend not responding**
- Check if backend is running on :4000
- Check vite.config.ts proxy settings

**Token not persisting**
- Check browser localStorage
- DevTools → Application → Local Storage

---

## 📊 PROJECT STATUS

| Component | Status |
|-----------|--------|
| Frontend UI | ✅ Complete |
| Authentication | ✅ Complete |
| API Integration | ✅ Ready |
| Styling | ✅ Complete |
| Backend | 🟡 In Progress |
| Database | 🟡 In Progress |
| Deployment | ⏳ Ready Soon |

---

## 📚 DOCUMENTATION

- **Full Setup:** `FRONTEND_SETUP.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY.md`
- **Status:** `FRONTEND_STATUS.md`
- **API Spec:** `docs/API.md`
- **Deployment:** `docs/DEPLOYMENT.md`

---

## 🆘 SUPPORT

1. Check `FRONTEND_SETUP.md` for detailed guide
2. Review `docs/API.md` for endpoint specs
3. Check browser console for errors
4. Review TypeScript types for prop requirements

---

**Ready to launch!** 🎉
