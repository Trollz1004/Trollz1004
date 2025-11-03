# Security & Compliance Guidelines

**Platform:** Anti-AI Dating Platform  
**Compliance Frameworks:** GDPR, CCPA, PCI-DSS, SOC 2 Type II  
**Last Updated:** November 2, 2025

---

## Executive Summary

This document outlines security controls, compliance requirements, and risk mitigation strategies for the Anti-AI Dating Platform. All compliance measures are designed to **protect users** and establish **legal liability protections** for the business.

### Key Principles

✅ **Privacy by Design** - Encryption at rest and in transit  
✅ **Age Verification** - Multi-layer protection for minors  
✅ **Data Minimization** - Collect only necessary data  
✅ **Transparency** - Clear TOS and privacy policies  
✅ **Accountability** - Audit trails for all sensitive operations  

---

## Part 1: Data Security

### 1.1 Encryption at Rest

**Sensitive Data Fields:**
- Birthdate (AES-256)
- Phone number hash (bcrypt)
- Email hash (SHA-256)
- Shipping address (AES-256)
- Payment tokens (Square tokenization, never stored)

**Implementation:**

```typescript
// Encrypt birthdate on create
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
const ALGORITHM = 'aes-256-gcm';

function encryptBirthdate(birthdate: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(birthdate, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

function decryptBirthdate(encryptedData: string): string {
  const [iv, encrypted, authTag] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

**Database Level:**
- PostgreSQL encryption extension (pgcrypto) for additional layer
- AWS RDS encryption enabled (KMS managed keys)
- S3 bucket encryption (AES-256 default)
- ElastiCache Redis encryption in transit (TLS 1.2+)

### 1.2 Encryption in Transit

**HTTPS/TLS 1.3 Everywhere:**

```typescript
// Express.js with helmet for security headers
import helmet from 'helmet';
import express from 'express';

const app = express();

// Force HTTPS, enable HSTS
app.use(helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
}));

// Force HTTPS redirect
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// CSP headers (prevent XSS)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'https:', 'data:'],
    connectSrc: ["'self'", 'https://api.antiaidating.com']
  }
}));

// X-Frame-Options (prevent clickjacking)
app.use(helmet.frameguard({ action: 'deny' }));

// X-Content-Type-Options (prevent MIME sniffing)
app.use(helmet.noSniff());
```

**WebSocket Encryption:**

```typescript
import https from 'https';
import WebSocket from 'ws';

// Create WSS server (WebSocket Secure)
const server = https.createServer({
  cert: fs.readFileSync('/etc/ssl/certs/server.crt'),
  key: fs.readFileSync('/etc/ssl/private/server.key')
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // All WebSocket traffic encrypted via TLS
});

server.listen(443);
```

---

## Part 2: Authentication & Authorization

### 2.1 Password Security

**Requirements:**
- Minimum 12 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)
- Not in common password list (rockyou.txt)

**Hashing:**

```typescript
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Store only hash in database
const user = await db.users.create({
  email: req.body.email,
  passwordHash: await hashPassword(req.body.password),
  ageVerified: false,
  tosAccepted: false
});
```

**Salted Bcrypt + 12 rounds = ~2^24 computational cost per guess**

### 2.2 JWT Tokens

**Token Spec:**

```typescript
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  ageVerified: boolean;
  tosAccepted: boolean;
  iat: number; // issued at
  exp: number; // expiration (24 hours)
}

function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      ageVerified: user.ageVerified,
      tosAccepted: user.tosAccepted
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '24h'
    }
  );
}

function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
  } catch (err) {
    return null; // Invalid or expired
  }
}
```

**Token Blacklist (for logout):**

```typescript
// Store blacklisted tokens in Redis
async function logout(token: string, expiresAt: Date): Promise<void> {
  const timeToLive = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  await redis.setex(`blacklist:${token}`, timeToLive, 'true');
}

async function isBlacklisted(token: string): Promise<boolean> {
  return (await redis.get(`blacklist:${token}`)) === 'true';
}

// Middleware to check blacklist
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  if (await isBlacklisted(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }
  
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  
  req.user = payload;
  next();
};
```

---

## Part 3: Age Verification & Compliance

### 3.1 Multi-Layer Age Verification

**Layer 1: Birthdate (Mandatory)**

```typescript
async function verifyBirthdate(email: string, birthdate: string): Promise<{
  isEligible: boolean;
  error?: string;
}> {
  const dob = new Date(birthdate);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  if (age < 18) {
    // Log attempt for security audit
    await db.auditLogs.create({
      action: 'age_verification_failed',
      email: email,
      age: age,
      timestamp: new Date(),
      ipAddress: req.ip,
      reason: 'under_18'
    });
    
    return {
      isEligible: false,
      error: 'Must be 18 or older to use this platform'
    };
  }
  
  // Encrypt and store
  await db.ageVerifications.create({
    userId: user.id,
    birthdateEncrypted: encryptBirthdate(birthdate),
    method: 'birthdate',
    verifiedAt: new Date()
  });
  
  return { isEligible: true };
}
```

**Layer 2: Phone Verification (SMS OTP)**

```typescript
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendPhoneVerificationCode(userId: string, phone: string): Promise<void> {
  const code = Math.random().toString().slice(2, 8); // 6 digits
  
  // Store code with 15-minute expiry
  await redis.setex(`phone_code:${userId}`, 900, code);
  
  // Send SMS
  await twilioClient.messages.create({
    body: `Your Anti-AI Dating verification code: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
}

async function verifyPhoneCode(userId: string, code: string): Promise<boolean> {
  const stored = await redis.get(`phone_code:${userId}`);
  if (stored !== code) return false;
  
  // Clean up code
  await redis.del(`phone_code:${userId}`);
  
  // Mark phone verified
  await db.phoneVerifications.create({
    userId: userId,
    phoneHashedSHA256: hashPhone(phone),
    verifiedAt: new Date()
  });
  
  return true;
}
```

**Layer 3: ID Verification (Optional KYC)**

```typescript
// ID uploaded, sent to verification service (e.g., Jumio, Onfido)
async function initiateIdVerification(
  userId: string,
  frontImageBase64: string,
  backImageBase64: string
): Promise<{ verificationId: string; status: string }> {
  // Upload to verification service
  const verificationResult = await onfidoClient.applicants.create({
    firstName: user.firstName,
    lastName: user.lastName
  });
  
  // Check document
  const documentCheck = await onfidoClient.documents.upload({
    applicant_id: verificationResult.id,
    type: 'driving_licence',
    file: Buffer.from(frontImageBase64, 'base64')
  });
  
  // Store reference (never store actual image)
  await db.idVerifications.create({
    userId: userId,
    onfidoApplicantId: verificationResult.id,
    status: 'pending',
    initiatedAt: new Date()
  });
  
  return {
    verificationId: verificationResult.id,
    status: 'pending'
  };
}
```

**Age Verification Enforcement Middleware:**

```typescript
const requireAgeVerified = async (req, res, next) => {
  const user = await db.users.findById(req.user.userId);
  
  if (!user.ageVerified) {
    return res.status(403).json({
      error: 'age_not_verified',
      message: 'You must complete age verification to access this feature'
    });
  }
  
  next();
};

// Apply to all dating features
app.get('/api/profiles/nearby', requireAgeVerified, async (req, res) => {
  // Only age-verified users can browse profiles
});
```

### 3.2 Age Verification Audit Trail

```typescript
// Immutable log of all verification attempts
interface AgeVerificationAudit {
  id: UUID;
  userId: UUID;
  action: 'submitted' | 'verified' | 'failed' | 'appealed';
  method: 'birthdate' | 'phone' | 'id' | 'kyc';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  notes: string;
}

// Cannot be updated or deleted, only appended
async function createAgeVerificationAudit(
  userId: string,
  action: string,
  method: string,
  status: string
): Promise<void> {
  await db.ageVerificationAudits.create({
    userId,
    action,
    method,
    status,
    timestamp: new Date(),
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });
}
```

---

## Part 4: Terms of Service & Legal Protection

### 4.1 TOS Acceptance Logging

```typescript
interface TOSAcceptance {
  id: UUID;
  userId: UUID;
  tosVersion: string;
  accepted_full_terms: boolean;
  accepted_privacy_policy: boolean;
  accepted_liability_waiver: boolean;
  accepted_at: Date;
  ip_address: string;
  user_agent: string;
  // Immutable - never updated, only new records created
}

async function acceptTOS(
  userId: string,
  tosVersion: string,
  agreeFullTerms: boolean,
  agreePrivacy: boolean,
  agreeLiability: boolean
): Promise<void> {
  // Verify all required agreements
  if (!agreeFullTerms || !agreePrivacy || !agreeLiability) {
    throw new Error('Must agree to all terms');
  }
  
  // Create immutable record
  await db.userTosAcceptance.create({
    userId,
    tosVersion,
    accepted_full_terms: agreeFullTerms,
    accepted_privacy_policy: agreePrivacy,
    accepted_liability_waiver: agreeLiability,
    accepted_at: new Date(),
    ip_address: req.ip,
    user_agent: req.get('user-agent')
  });
  
  // Update user status
  await db.users.update(userId, { tosAccepted: true });
}
```

### 4.2 Core TOS Sections

**1. Liability Waiver**
```
USERS ENGAGE AT THEIR OWN RISK

Anti-AI Dating is a platform for adults 18+ to connect. We make no warranties:

- No warranty regarding other users' truthfulness or safety
- "Meet at your own risk" - similar to Tinder, Hinge, Bumble
- We are not liable for user-to-user interactions off-platform
- Users must verify age before using service
- Background checks are optional

This is standard dating app language (see Tinder TOS).
```

**2. Age Verification**
```
YOU MUST BE 18+

- Age verification is mandatory and multi-layered
- False information violates TOS and law
- Violators will be immediately banned
- Repeat violators will be reported to authorities
```

**3. Data Privacy (GDPR/CCPA Compliant)**
```
YOUR DATA IS ENCRYPTED

- Birthdate: AES-256 encryption
- Email: Hashed + salt
- Phone: One-way hash (cannot be reversed)
- Location: Approximate only (PostGIS buffer)
- Payments: Never stored (Square tokenization)

Users can request:
- Full data export (within 30 days)
- Data deletion (GDPR Right to be Forgotten)
- Deletion timeline: 30 days after request
```

**4. Non-Discrimination**
```
EQUAL TREATMENT

- No discrimination based on protected characteristics
- Violations result in immediate ban
- Appeals process available
```

---

## Part 5: Payment Security (PCI-DSS)

### 5.1 Square Integration (Production Only)

```typescript
// NEVER store credit card data
// Square handles tokenization securely

import { Client, Environment } from 'square';

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production, // Never Sandbox in production
  timeout: 30000
});

const paymentsApi = client.getPaymentsApi();

async function createPayment(
  userId: string,
  amount: number,
  sourceId: string // Square token, not card number
): Promise<string> {
  const result = await paymentsApi.createPayment({
    sourceId: sourceId, // Tokenized by Square
    amountMoney: {
      amount: BigInt(amount * 100), // Convert to cents
      currency: 'USD'
    },
    idempotencyKey: `${userId}-${Date.now()}`,
    customerId: userId, // Link to user
    receiptUrl: `https://api.antiaidating.com/receipts/${userId}`
  });
  
  // Log payment for compliance
  await db.squarePayments.create({
    userId,
    squarePaymentId: result.result.payment.id,
    amount,
    status: 'completed',
    createdAt: new Date()
  });
  
  return result.result.payment.id;
}
```

**PCI Compliance Checklist:**
- ✅ Never log/store full card numbers
- ✅ Use Square tokenization (PCI-certified)
- ✅ All traffic HTTPS/TLS 1.3
- ✅ Quarterly security scans
- ✅ Annual penetration testing
- ✅ Incident response plan
- ✅ Employee training on PCI

### 5.2 Subscription Billing

```typescript
async function createSubscription(
  userId: string,
  planId: string
): Promise<string> {
  const plan = SUBSCRIPTION_PLANS[planId]; // e.g., "premium_monthly"
  
  const result = await paymentsApi.createSubscription({
    locationId: process.env.SQUARE_LOCATION_ID,
    customerId: userId,
    planId: plan.squarePlanId,
    cardId: userSquareCardId, // Previously tokenized
    timezone: userTimezone
  });
  
  await db.subscriptions.create({
    userId,
    squareSubscriptionId: result.id,
    planId,
    status: 'active',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    autoRenew: true
  });
  
  return result.id;
}

// Webhook handler for subscription renewals
async function handleSubscriptionRenewal(event: any): Promise<void> {
  const subscription = event.data.object.subscription;
  
  await db.subscriptions.update(subscription.id, {
    currentPeriodStart: new Date(subscription.billing_cycle_anchor_date),
    currentPeriodEnd: new Date(subscription.next_renewal_date),
    lastRenewalAt: new Date()
  });
}
```

---

## Part 6: Rate Limiting & DDoS Protection

### 6.1 Redis-Based Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  keyGenerator: (req) => req.ip,
  skip: (req) => req.user?.isAdmin, // Admin bypass
  handler: (req, res) => {
    res.status(429).json({
      error: 'too_many_requests',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Stricter auth endpoint limits
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:'
  }),
  windowMs: 60 * 1000,
  max: 10, // 10 requests per minute
  skipSuccessfulRequests: true, // Only count failures
  keyGenerator: (req) => req.body.email
});

// Payment endpoint limits (prevent abuse)
const paymentLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:payment:'
  }),
  windowMs: 60 * 1000,
  max: 30, // 30 requests per minute per user
  keyGenerator: (req) => req.user.userId
});

// Apply limiters
app.use('/api/', apiLimiter);
app.post('/api/auth/signup', authLimiter, handleSignup);
app.post('/api/auth/login', authLimiter, handleLogin);
app.post('/api/payments', paymentLimiter, handlePayment);
```

### 6.2 DDoS Protection (AWS Shield)

```bash
# Enable AWS Shield Standard (automatic)
# - Automatic DDoS protection at no cost
# - Mitigates large Layer 3/4 attacks

# For enhanced protection (optional AWS Shield Advanced):
aws shield subscribe --subscription

# DDoS Response Team (DRT) available 24/7
```

---

## Part 7: SQL Injection & XSS Prevention

### 7.1 SQL Injection Prevention

```typescript
// ✅ SAFE: Parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail] // Parameter passed separately
);

// ❌ UNSAFE: String concatenation
const user = await db.query(
  `SELECT * FROM users WHERE email = '${userEmail}'` // Vulnerable!
);
```

**Query Builder Pattern (Recommended):**

```typescript
import { query } from './db';

// Using parameterized query builder
const profiles = await db.profiles
  .where('age', '>=', minAge)
  .where('age', '<=', maxAge)
  .where('gender', 'in', preferredGenders)
  .select('id', 'firstName', 'photos')
  .limit(20)
  .exec();

// Translates to: SELECT id, firstName, photos FROM profiles 
//   WHERE age >= $1 AND age <= $2 AND gender = ANY($3) LIMIT 20
```

### 7.2 XSS Prevention

```typescript
// Input validation with Zod
import { z } from 'zod';
import DOMPurify from 'dompurify';

const BioSchema = z.string()
  .min(10)
  .max(500)
  .refine(val => {
    // Prevent HTML/script injection
    return !/<script|<iframe|javascript:|on\w+=/i.test(val);
  }, 'HTML/script tags not allowed');

// Sanitize output in templates
function renderProfile(profile) {
  return `
    <div class="profile">
      <h1>${DOMPurify.sanitize(profile.firstName)}</h1>
      <p>${DOMPurify.sanitize(profile.bio)}</p>
    </div>
  `;
}
```

---

## Part 8: Monitoring & Logging

### 8.1 Security Events Logging

```typescript
interface SecurityEvent {
  eventType: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console()
  ]
});

async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  // Log to file
  logger.log({
    level: event.severity,
    message: event.eventType,
    ...event
  });
  
  // Store in database for compliance audit
  await db.securityLogs.create(event);
  
  // Alert if critical
  if (event.severity === 'critical') {
    await alertSecurityTeam(event);
  }
}

// Example security events
logSecurityEvent({
  eventType: 'failed_login',
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date(),
  details: { email: req.body.email },
  severity: 'medium'
});

logSecurityEvent({
  eventType: 'unauthorized_age_access',
  userId: 'unknown',
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date(),
  details: { age: 15 },
  severity: 'critical'
});
```

### 8.2 CloudWatch Monitoring

```bash
# Monitor failed login attempts
aws logs create-metric-filter \
  --log-group-name /ecs/antiaidating \
  --filter-name failed-login \
  --filter-pattern "[... eventType = \"failed_login\" ...]" \
  --metric-transformations \
    metricName=FailedLogins,metricValue=1

# Alert if > 10 failed logins in 5 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name excessive-failed-logins \
  --metric-name FailedLogins \
  --namespace Custom \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:security-alerts
```

---

## Part 9: Incident Response Plan

### 9.1 Data Breach Response

**Timeline:** 72 hours to notify users (GDPR requirement)

1. **Immediate (0-1 hour)**
   - Identify scope of breach
   - Isolate affected systems
   - Preserve forensic evidence

2. **Notification (1-24 hours)**
   - Notify affected users
   - Provide breach details and recommendations
   - Offer free credit monitoring

3. **Remediation (24-72 hours)**
   - Patch vulnerability
   - Force password reset for affected users
   - Complete audit

4. **Follow-up (After 72 hours)**
   - Provide summary report
   - Implement prevention measures
   - Update security policies

### 9.2 Denial of Service (DDoS) Response

1. Activate AWS Shield Advanced
2. Route traffic through CloudFlare (additional DDoS mitigation)
3. Scale ECS service (auto-scaling to handle spike)
4. Notify security team
5. Document attack details for analysis

---

## Part 10: Compliance Checklist

### GDPR Compliance

- [x] Legal basis for data collection (explicit consent)
- [x] Data processing agreement with vendors
- [x] Privacy policy in plain language
- [x] Right to access data (export feature)
- [x] Right to be forgotten (delete account)
- [x] Data portability (export in standard format)
- [x] Breach notification (72-hour requirement)
- [x] DPA documentation
- [x] Regular audits

### CCPA Compliance

- [x] Privacy policy disclosure
- [x] Right to know (data request fulfillment)
- [x] Right to delete (account deletion)
- [x] Right to opt-out (unsubscribe)
- [x] Non-discrimination (same service/price)
- [x] Opt-in for minors (under 16)

### PCI-DSS Compliance

- [x] Never store full card numbers
- [x] Use PCI-certified payment processor (Square)
- [x] Quarterly security assessments
- [x] Annual penetration testing
- [x] Incident response documentation
- [x] Employee training (annually)

### SOC 2 Type II

- [x] Access controls (role-based)
- [x] Logical security (encryption, MFA)
- [x] Change management
- [x] Incident response procedures
- [x] Continuous monitoring
- [x] Annual audit by third party

---

## Part 11: Security Best Practices

### Code Review Checklist

Before every deployment:

- [ ] No hardcoded secrets (check .env.example)
- [ ] SQL queries use parameterized statements
- [ ] Input validation on all endpoints
- [ ] Output sanitization in templates
- [ ] Error messages don't leak sensitive info
- [ ] CORS properly configured
- [ ] CSRF tokens on state-changing endpoints
- [ ] Authentication/authorization enforced
- [ ] Rate limiting applied
- [ ] Logging of security events

### Dependency Management

```bash
# Regular security updates
npm audit
npm audit fix

# Check for vulnerable packages
npm install -g snyk
snyk test

# Enable automated dependabot
# (GitHub automatically checks for CVEs)
```

---

## Part 12: Third-Party Vendor Security

All vendors vetted for:
- SOC 2 Type II certification
- Regular penetration testing
- Data encryption
- Incident response procedures
- DPA (Data Processing Agreement)

**Approved Vendors:**
- **Square** (Payments) - PCI-DSS Level 1
- **Twilio** (SMS) - SOC 2 Type II
- **SendGrid** (Email) - SOC 2 Type II
- **Onfido** (ID Verification) - ISO 27001
- **AWS** (Infrastructure) - SOC 2 Type II

---

## Contacts & Resources

**Security Team:** security@antiaidating.com  
**DPO (Data Protection Officer):** dpo@antiaidating.com  
**Incident Hotline:** +1-415-555-0199  

**References:**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- GDPR Compliance: https://gdpr-info.eu/
- PCI-DSS: https://www.pcisecuritystandards.org/

---

**Last Updated:** November 2, 2025  
**Next Review:** May 2, 2026  
**Approved By:** Security & Compliance Team
