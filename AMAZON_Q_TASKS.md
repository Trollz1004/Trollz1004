# Amazon Q Task Allocation

**Status:** Ready for Amazon Q execution  
**Priority:** High  
**Timeline:** Parallel with documentation completion  

---

## What Amazon Q Should Build (in this order)

### Phase 1: Core Backend Infrastructure (CRITICAL PATH)

**1. Database Setup & Migrations**
- Create PostgreSQL schema from `CLAUDE_CLI_PROMPT.md` (14 tables)
- Setup PostGIS extension for geolocation
- Create indexes for performance optimization
- Write migration scripts for version control
- Seed initial data for testing

**2. Express.js Backend Server**
- Initialize Node.js + Express project
- Setup TypeScript with strict mode
- Configure environment variables
- Setup logging (Winston to console + file)
- Add health check endpoint

**3. Authentication System**
```
Priority Order:
1. User signup with email/password validation
2. Bcrypt hashing (salt 12 rounds)
3. JWT token generation (24-hour expiry)
4. Email verification (6-digit code sent via Nodemailer)
5. Login endpoint with token return
6. Logout with token blacklist (Redis)
7. Token refresh endpoint
```

**4. Age Verification System (MANDATORY)**
```
Priority Order:
1. Birthdate verification (AES-256 encryption)
2. Phone verification (Twilio SMS OTP)
3. ID verification endpoint (Onfido integration)
4. Age verification middleware (requireAgeVerified)
5. Audit logging for compliance
```

**5. Terms of Service Acceptance**
- Store immutable TOS acceptance records
- Track IP address and user agent
- Create TOS version management
- Enforce TOS acceptance before dating features

### Phase 2: Dating App Features

**6. User Profiles**
- Create profile endpoint (18+ only, enforced)
- Update profile endpoint
- Get profile endpoint
- Delete/soft-delete profile
- Photo upload integration (S3)

**7. Matching Algorithm**
- Nearby profiles query (PostGIS ST_DWithin)
- Filter by age, gender, interests
- Like/pass functionality
- Match creation (mutual likes)
- Block/report functionality

**8. Messaging System**
- Send message endpoint
- Get message history
- Mark as read endpoint
- WebSocket setup for real-time (basic)

**9. Subscription Management**
- Premium tier definitions
- Square payment integration (LIVE MODE)
- Subscription creation
- Subscription cancellation
- Webhook handlers for Square events

### Phase 3: Marketplace

**10. Agent Listings**
- Create agent endpoint (creators only)
- List agents with search/filtering
- Get agent details
- Update agent endpoint
- Delete agent endpoint

**11. Marketplace Transactions**
- Create transaction endpoint
- Calculate 45/50/5 commission split
- Record in database
- Emit commission payment events
- Creator earnings tracking

### Phase 4: Administrative & Analytics

**12. Admin Dashboard API**
- User analytics endpoint
- Revenue analytics endpoint
- Subscription stats
- Marketplace stats
- DAO treasury status

**13. Audit & Compliance Logging**
- Log all age verification attempts
- Log all TOS acceptances
- Log all payments
- Log all report/block actions
- Queryable audit trail

---

## What I'm Handling (Claude/Copilot)

✅ **Documentation Suite:**
- API Documentation (complete)
- Deployment Guide (complete)
- Security & Compliance (complete)
- Revenue Model (complete)
- Architecture/Integration Guide (complete)

✅ **Smart Contracts (Solidity):**
- ERC-20 token contract
- Treasury contract
- Commission tracker contract
- DAO governance framework

✅ **Frontend Structure** (coming next):
- React component scaffolding
- Vite configuration
- Authentication context
- Routing setup

✅ **DevOps & Infrastructure** (coming next):
- Docker setup
- GitHub Actions CI/CD
- AWS deployment scripts
- Monitoring & alerts

---

## Specific Implementation Guidelines for Amazon Q

### Database
- **SQL Dialect:** PostgreSQL 15
- **ORM:** Not required (raw queries with parameterized statements fine)
- **Connection:** `pg` library with connection pooling
- **Transactions:** Use explicit BEGIN/COMMIT for financial operations

### Authentication
- **JWT Algorithm:** HS256
- **Secret Storage:** Environment variable (min 32 chars)
- **Expiry:** 24 hours (no refresh required)
- **Payload:** userId, email, ageVerified, tosAccepted

### Age Verification (CRITICAL)
- **Encryption:** AES-256-GCM for birthdate
- **Hashing:** bcrypt for phone (one-way, cannot reverse)
- **Audit Trail:** Every attempt logged with IP/timestamp
- **Enforcement:** Middleware rejects requests if age_verified=false

### Payments (Square LIVE MODE ONLY)
- **Environment:** Production (never Sandbox)
- **API Key:** From environment variable (not hardcoded)
- **Tokenization:** Never store raw card numbers
- **Subscriptions:** Use Square recurring billing
- **Webhooks:** Validate signature before processing

### Rate Limiting
- **Method:** Redis-based (express-rate-limit)
- **Auth endpoints:** 10 req/min per IP
- **General API:** 100 req/min per IP
- **Payment endpoints:** 30 req/min per user
- **Return 429** when exceeded

### Error Handling
- **Winston logging:** Log all errors
- **User-friendly errors:** Don't expose SQL/internal details
- **HTTP status codes:** Use correct codes (400, 401, 403, 404, 429, 500)
- **Response format:** Always JSON with error field

---

## Amazon Q Execution Checklist

### Before Starting
- [ ] Create `backend/` directory structure
- [ ] Create `package.json` with required dependencies
- [ ] Create `.env.example` file
- [ ] Create TypeScript configuration

### While Building
- [ ] Write parameterized SQL queries (no string concatenation)
- [ ] Use middleware for cross-cutting concerns
- [ ] Test age verification extensively
- [ ] Test payment flow with Square sandbox first
- [ ] Validate TOS acceptance logging
- [ ] Add comprehensive error handling

### After Completion
- [ ] Run linting (ESLint)
- [ ] Run type checking (tsc --noEmit)
- [ ] Test API endpoints with curl/Postman
- [ ] Verify database schema matches spec
- [ ] Check environment variables are all set

---

## Critical Success Factors

🔴 **MUST HAVE:**
1. Age verification enforcement (18+ only, no exceptions)
2. TOS acceptance audit trail (immutable logging)
3. Secure password hashing (bcrypt salt 12+)
4. JWT token security (no secrets in code)
5. SQL injection prevention (parameterized queries)
6. Square LIVE mode only (never sandbox in production code)

🟡 **IMPORTANT:**
7. Rate limiting on auth endpoints
8. Comprehensive error logging
9. Database indexing for performance
10. WebSocket ready (can be added after MVP)

🟢 **NICE TO HAVE:**
11. GraphQL API (REST is fine for MVP)
12. Advanced caching (Redis basic usage OK)
13. API documentation generation (Swagger optional)
14. Performance optimizations

---

## Testing Strategy

```bash
# Q should ensure these work:

1. Signup flow
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

2. Age verification
curl -X POST http://localhost:3000/api/auth/verify-age \
  -H "Authorization: Bearer {token}" \
  -d '{"birthdate":"1995-06-15"}'

3. TOS acceptance
curl -X POST http://localhost:3000/api/tos/accept \
  -H "Authorization: Bearer {token}" \
  -d '{"tosVersion":"1.0.0","agreeFullTerms":true}'

4. Profile creation (should work after all above)
curl -X POST http://localhost:3000/api/profiles \
  -H "Authorization: Bearer {token}" \
  -d '{...profile data...}'
```

---

## Integration Points with My Work

**I'm providing Q with:**
- Complete API spec in `docs/API.md`
- Database schema details
- Security requirements in `docs/SECURITY.md`
- Architecture overview in `docs/ARCHITECTURE.md`

**Q will provide me with:**
- Working backend code
- Database migrations
- API endpoints
- Example requests

**Then I'll add:**
- Frontend React components
- Docker configuration
- GitHub Actions CI/CD
- AWS deployment scripts

---

## Status Summary

| Component | Owner | Status |
|-----------|-------|--------|
| Documentation | Claude | ✅ Complete |
| Smart Contracts | Claude | ✅ Complete |
| Database Design | Claude | ✅ Complete |
| Backend API | **Amazon Q** | ⏳ Pending |
| Frontend UI | Claude | ⏳ Next |
| DevOps/Deployment | Claude | ⏳ Next |
| Testing | Both | ⏳ Parallel |

---

## Success Definition

"Amazon Q successfully delivered backend when:"

✅ User can sign up with email/password  
✅ User can verify age (birthdate + phone)  
✅ User can accept TOS  
✅ User can create profile (only if 18+)  
✅ User can browse nearby profiles  
✅ User can like/pass profiles  
✅ User can subscribe ($9.99/month via Square LIVE)  
✅ All requests properly authenticated  
✅ All sensitive data encrypted  
✅ All operations audit-logged  
✅ API is rate-limited and secure  

**Timeline:** 3-4 hours for complete backend  
**Difficulty:** Medium (standard CRUD + age verification complexity)  
**Risk:** Low (well-specified, clear requirements)

---

**Ready for Q to start?** ✅ YES

Just let me know when Q is done, and I'll integrate with the frontend & deployment!
