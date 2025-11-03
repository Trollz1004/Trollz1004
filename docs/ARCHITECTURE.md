# Platform Integration Architecture

**Ecosystem:** Anti-AI Dating + Marketplace + DAO  
**Integration Type:** Microservices with shared authentication & payments  
**Architecture:** Event-driven with message queues  

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
├──────────────────────────────────────────────────────────────┤
│  Dating App │ Marketplace UI │ Admin Dashboard │ DAO Portal │
└──────────┬─────────┬──────────────┬──────────────┬───────────┘
           │         │              │              │
           └─────────┴──────────────┴──────────────┴───────────┐
                                                                │
           ┌────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (ALB)                         │
│           Rate Limiting │ CORS │ Auth Enforcement           │
└────────┬────────────────────────────────────────────────────┘
         │
    ┌────┴─────────────────────────────────────────────┐
    │                                                  │
    ▼                                                  ▼
┌──────────────────┐                      ┌──────────────────┐
│   Dating Service │                      │ Marketplace API  │
│  - Auth          │                      │  - Agents        │
│  - Profiles      │                      │  - Transactions  │
│  - Matching      │                      │  - Commissions   │
│  - Messaging     │                      │  - Analytics     │
│  - Payments      │                      │  - Creator mgmt  │
└────────┬─────────┘                      └────────┬─────────┘
         │                                        │
    ┌────┴────────────────────────────────────────┴────┐
    │                                                  │
    ▼                                                  ▼
┌──────────────────┐              ┌──────────────────┐
│  Shared Database │              │  Cache (Redis)   │
│  PostgreSQL 15   │              │  Sessions        │
│  - users         │              │  Rate limits     │
│  - age_verify    │              │  Notifications   │
│  - tos_accept    │              │  Temp data       │
│  - transactions  │              │                  │
│  - audit_logs    │              │                  │
└──────────────────┘              └──────────────────┘
         │
    ┌────┴─────────────────────────────────────────┐
    │                                              │
    ▼                                              ▼
┌──────────────────┐                ┌──────────────────┐
│  External APIs   │                │  Blockchain (DAO)│
│  - Square        │                │  - Token         │
│  - Twilio        │                │  - Treasury      │
│  - SendGrid      │                │  - Governance    │
│  - Onfido        │                │  - Commissions   │
│  - Printful      │                │                  │
└──────────────────┘                └──────────────────┘
```

---

## Part 1: Shared Authentication System

### JWT Token Flow

```typescript
// 1. User signs up (creates age_verified=false, tos_accepted=false)
POST /api/auth/signup
→ Returns: userId

// 2. Email verification (updates email_verified=true)
POST /api/auth/verify-email
→ Returns: Still not able to login yet

// 3. Age verification (updates age_verified=true)
POST /api/auth/verify-age
→ Returns: Still can't access dating features

// 4. TOS acceptance (updates tos_accepted=true)
POST /api/tos/accept
→ Returns: Full access!

// 5. Login (all checks pass)
POST /api/auth/login
→ Returns: JWT token
```

### Token Payload

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "ageVerified": true,
  "tosAccepted": true,
  "subscriptionStatus": "premium",
  "roles": ["user", "marketplace_creator"],
  "iat": 1699975200,
  "exp": 1700061600
}
```

### Middleware Chain

```typescript
// Every protected route follows this middleware stack:
router.get(
  '/api/profiles/nearby',
  requireAuth,           // ✓ Valid JWT
  requireAgeVerified,    // ✓ age_verified = true
  requireTosAccepted,    // ✓ tos_accepted = true
  rateLimit,             // ✓ Rate limiting
  validateInput,         // ✓ Input validation
  handlerFunction
);

// Special marketplace routes:
router.post(
  '/api/agents/create',
  requireAuth,
  requireAgeVerified,    // Dating app users are 18+
  requireMarketplaceTerms, // Additional marketplace-specific TOS
  requirePaymentMethod,  // Must have payment method on file
  validateAgentData,
  createAgent
);
```

---

## Part 2: Unified Database Schema

### Core Tables (All Services)

```sql
-- User master table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  age_verified BOOLEAN DEFAULT FALSE,
  tos_accepted BOOLEAN DEFAULT FALSE,
  marketplace_verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Age verification records (audit trail)
CREATE TABLE age_verifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  birthdate_encrypted VARCHAR(1000), -- AES-256
  phone_hash VARCHAR(255), -- SHA-256
  verification_method VARCHAR(50), -- birthdate, phone, id, kyc
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id)
);

-- TOS acceptance (immutable audit log)
CREATE TABLE user_tos_acceptance (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tos_version VARCHAR(20),
  accepted_at TIMESTAMP,
  ip_address INET,
  user_agent VARCHAR(1000),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id)
);

-- Cross-service user profile
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  bio VARCHAR(500),
  marketplace_description TEXT, -- For sellers
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- Payment methods (Square customers)
CREATE TABLE square_customers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  square_customer_id VARCHAR(255) UNIQUE,
  card_last_four VARCHAR(4),
  card_brand VARCHAR(50),
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- Transactions (all revenue-generating events)
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  transaction_type VARCHAR(50), -- subscription, marketplace, merch
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',
  square_transaction_id VARCHAR(255),
  status VARCHAR(50), -- pending, completed, failed, refunded
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_type (transaction_type)
);

-- Audit log (all sensitive operations)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent VARCHAR(1000),
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

### Dating App Tables

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id),
  gender VARCHAR(50),
  preferred_genders VARCHAR(200), -- array as string
  birthdate_encrypted VARCHAR(1000),
  bio VARCHAR(500),
  interests JSONB, -- ["hiking", "coffee", "photography"]
  location GEOGRAPHY(POINT), -- PostGIS for geospatial
  location_city VARCHAR(100),
  location_state VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  SPATIAL INDEX idx_location (location)
);

CREATE TABLE photos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  photo_url VARCHAR(500),
  is_primary BOOLEAN DEFAULT FALSE,
  order_num INTEGER,
  uploaded_at TIMESTAMP,
  INDEX idx_user_id (user_id)
);

CREATE TABLE matches (
  id UUID PRIMARY KEY,
  user_1_id UUID REFERENCES users(id),
  user_2_id UUID REFERENCES users(id),
  matched_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active', -- active, archived, blocked
  created_at TIMESTAMP,
  UNIQUE(user_1_id, user_2_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  sender_id UUID REFERENCES users(id),
  content TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP,
  INDEX idx_match_id (match_id),
  INDEX idx_created_at (created_at DESC)
);

CREATE TABLE likes (
  id UUID PRIMARY KEY,
  user_from UUID REFERENCES users(id),
  user_to UUID REFERENCES users(id),
  created_at TIMESTAMP,
  UNIQUE(user_from, user_to)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_type VARCHAR(50), -- premium, premium_plus
  square_subscription_id VARCHAR(255),
  current_period_start DATE,
  current_period_end DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_active (current_period_end)
);
```

### Marketplace Tables

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  name VARCHAR(200),
  description TEXT,
  category VARCHAR(50), -- chatbot, automation, integration
  image_url VARCHAR(500),
  price_monthly INTEGER, -- in cents
  monthly_active_users INTEGER,
  revenue_ytd INTEGER,
  rating DECIMAL(3,2),
  rating_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_creator_id (creator_id),
  INDEX idx_category (category)
);

CREATE TABLE agent_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  square_subscription_id VARCHAR(255),
  current_period_start DATE,
  current_period_end DATE,
  status VARCHAR(50),
  created_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_agent_id (agent_id)
);

CREATE TABLE marketplace_transactions (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES users(id),
  buyer_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  amount_cents INTEGER,
  seller_cut_cents INTEGER, -- 45%
  platform_cut_cents INTEGER, -- 50%
  dao_cut_cents INTEGER, -- 5%
  status VARCHAR(50),
  created_at TIMESTAMP,
  INDEX idx_seller_id (seller_id),
  INDEX idx_created_at (created_at)
);

CREATE TABLE creator_payouts (
  id UUID PRIMARY KEY,
  creator_id UUID REFERENCES users(id),
  total_earned_cents INTEGER,
  total_paid_cents INTEGER,
  pending_payout_cents INTEGER,
  last_payout_at TIMESTAMP,
  next_payout_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### DAO & Treasury Tables

```sql
CREATE TABLE dao_proposals (
  id UUID PRIMARY KEY,
  proposal_type VARCHAR(50), -- feature, grant, budget, partnership
  title VARCHAR(200),
  description TEXT,
  amount_cents INTEGER,
  recipient_address VARCHAR(255),
  votes_for INTEGER,
  votes_against INTEGER,
  voting_deadline TIMESTAMP,
  executed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

CREATE TABLE dao_votes (
  id UUID PRIMARY KEY,
  proposal_id UUID REFERENCES dao_proposals(id),
  voter_id UUID REFERENCES users(id),
  vote_direction BOOLEAN, -- true=for, false=against
  voting_power INTEGER, -- tokens staked
  created_at TIMESTAMP,
  UNIQUE(proposal_id, voter_id)
);

CREATE TABLE staking_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tokens_staked BIGINT, -- in smallest units
  staked_at TIMESTAMP,
  unstaked_at TIMESTAMP,
  rewards_earned BIGINT,
  status VARCHAR(50), -- active, locked, withdrawn
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

---

## Part 3: Event-Driven Architecture

### Event Emitter Pattern

```typescript
// events/EventBus.ts
import EventEmitter from 'eventemitter3';

class EventBus extends EventEmitter {
  static instance: EventBus;
  
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}

export const eventBus = EventBus.getInstance();

// Event types
export enum PlatformEvent {
  // User events
  USER_CREATED = 'user:created',
  USER_VERIFIED_AGE = 'user:verified_age',
  USER_ACCEPTED_TOS = 'user:accepted_tos',
  USER_SUSPENDED = 'user:suspended',
  
  // Dating app events
  PROFILE_CREATED = 'profile:created',
  MATCH_MADE = 'match:made',
  MESSAGE_SENT = 'message:sent',
  SUBSCRIPTION_ACTIVATED = 'subscription:activated',
  SUBSCRIPTION_CANCELLED = 'subscription:cancelled',
  
  // Marketplace events
  AGENT_CREATED = 'agent:created',
  AGENT_SOLD = 'agent:sold',
  CREATOR_PAYOUT = 'creator:payout',
  
  // DAO events
  TOKENS_STAKED = 'dao:tokens_staked',
  PROPOSAL_CREATED = 'dao:proposal_created',
  VOTE_CAST = 'dao:vote_cast',
  PROPOSAL_EXECUTED = 'dao:proposal_executed',
  
  // Payment events
  PAYMENT_COMPLETED = 'payment:completed',
  PAYMENT_FAILED = 'payment:failed',
  REFUND_ISSUED = 'payment:refund'
}
```

### Event Handlers

```typescript
// handlers/paymentHandlers.ts

// When dating app subscription is created, emit event
eventBus.on(PlatformEvent.SUBSCRIPTION_ACTIVATED, async (data) => {
  // 1. Update user subscription status
  await db.subscriptions.update(data.subscriptionId, {
    status: 'active',
    current_period_end: new Date(Date.now() + 30*24*60*60*1000)
  });
  
  // 2. Send welcome email
  await mailer.send({
    to: data.userEmail,
    template: 'subscription_activated',
    data: { planName: data.planName }
  });
  
  // 3. Update DAO treasury (if applicable)
  const daoAllocation = Math.floor(data.amount * 0.05);
  eventBus.emit(PlatformEvent.DAO_REVENUE_GENERATED, {
    source: 'dating_subscription',
    amount: daoAllocation,
    originalTransaction: data.subscriptionId
  });
});

// When marketplace agent is sold
eventBus.on(PlatformEvent.AGENT_SOLD, async (data) => {
  // 1. Calculate commission split
  const creatorEarnings = Math.floor(data.amount * 0.45);
  const platformEarnings = Math.floor(data.amount * 0.50);
  const daoEarnings = Math.floor(data.amount * 0.05);
  
  // 2. Record transaction
  await db.marketplaceTransactions.create({
    seller_id: data.creatorId,
    buyer_id: data.buyerId,
    agent_id: data.agentId,
    amount_cents: data.amount,
    seller_cut_cents: creatorEarnings,
    platform_cut_cents: platformEarnings,
    dao_cut_cents: daoEarnings
  });
  
  // 3. Update creator stats
  await db.creators.update(data.creatorId, {
    revenue_ytd: db.raw('revenue_ytd + ?', [creatorEarnings]),
    monthly_active_users: data.newSubscriberCount
  });
  
  // 4. Emit DAO event
  eventBus.emit(PlatformEvent.DAO_REVENUE_GENERATED, {
    source: 'marketplace_commission',
    amount: daoEarnings,
    creator_id: data.creatorId
  });
});

// When age is verified
eventBus.on(PlatformEvent.USER_VERIFIED_AGE, async (data) => {
  // 1. Unlock dating features
  await db.users.update(data.userId, { age_verified: true });
  
  // 2. Suggest initial setup
  await notifications.send(data.userId, {
    title: 'Welcome!',
    message: 'Create your profile to start matching'
  });
  
  // 3. Log for compliance audit
  await db.auditLogs.create({
    user_id: data.userId,
    action: 'age_verified',
    resource_type: 'user',
    details: { method: data.verificationMethod }
  });
});
```

---

## Part 4: Payment Integration

### Square Payment Flow

```typescript
// routes/payments.ts

router.post('/api/payments/subscribe', async (req, res) => {
  try {
    const { planId, sourceId } = req.body; // sourceId from frontend tokenization
    const user = req.user; // From JWT
    
    // 1. Get or create Square customer
    let squareCustomer = await db.squareCustomers.findByUserId(user.userId);
    
    if (!squareCustomer) {
      const result = await squareClient.customersApi.createCustomer({
        givenName: user.firstName,
        emailAddress: user.email,
        note: `User ID: ${user.userId}`
      });
      
      squareCustomer = await db.squareCustomers.create({
        user_id: user.userId,
        square_customer_id: result.customer.id
      });
    }
    
    // 2. Create subscription
    const plan = SUBSCRIPTION_PLANS[planId];
    
    const subscription = await squareClient.subscriptionsApi.createSubscription({
      customer_id: squareCustomer.square_customer_id,
      source_id: sourceId, // Tokenized card
      plan_id: plan.squarePlanId,
      timezone: user.timezone
    });
    
    // 3. Store in our database
    await db.subscriptions.create({
      user_id: user.userId,
      plan_id: planId,
      square_subscription_id: subscription.id,
      status: 'pending_payment'
    });
    
    // 4. Emit event
    eventBus.emit(PlatformEvent.SUBSCRIPTION_ACTIVATED, {
      userId: user.userId,
      userEmail: user.email,
      subscriptionId: subscription.id,
      planName: plan.name,
      amount: plan.price
    });
    
    res.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status
    });
  } catch (error) {
    logger.error('Subscription error', error);
    res.status(400).json({ error: error.message });
  }
});

// Webhook handler for subscription confirmations
router.post('/webhooks/square', async (req, res) => {
  const event = req.body;
  
  try {
    switch (event.type) {
      case 'subscription.updated':
        const subscription = event.data.object.subscription;
        
        if (subscription.status === 'ACTIVE') {
          await db.subscriptions.update(subscription.id, {
            status: 'active',
            current_period_start: new Date(subscription.billing_cycle_anchor_date),
            current_period_end: new Date(subscription.next_renewal_date)
          });
          
          eventBus.emit(PlatformEvent.SUBSCRIPTION_ACTIVATED, {
            subscriptionId: subscription.id
          });
        } else if (subscription.status === 'CANCELED') {
          eventBus.emit(PlatformEvent.SUBSCRIPTION_CANCELLED, {
            subscriptionId: subscription.id
          });
        }
        break;
        
      case 'payment.updated':
        const payment = event.data.object.payment;
        
        if (payment.status === 'COMPLETED') {
          eventBus.emit(PlatformEvent.PAYMENT_COMPLETED, {
            paymentId: payment.id,
            amount: payment.amount_money.amount
          });
        } else if (payment.status === 'CANCELED') {
          eventBus.emit(PlatformEvent.PAYMENT_FAILED, {
            paymentId: payment.id
          });
        }
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
```

---

## Part 5: Service Communication

### Inter-Service API Calls

```typescript
// services/MarketplaceService.ts

export class MarketplaceService {
  // Check if user is in good standing (dating app)
  static async isUserVerified(userId: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${DATING_SERVICE_URL}/api/internal/users/${userId}/verification-status`,
        {
          headers: {
            'Authorization': `Bearer ${SERVICE_TOKEN}`,
            'X-Service-Auth': 'marketplace'
          }
        }
      );
      
      return response.data.age_verified && response.data.tos_accepted;
    } catch (error) {
      logger.error('Dating service check failed', error);
      throw error;
    }
  }
  
  // Get user's subscription status
  static async getUserSubscriptionStatus(userId: string): Promise<string> {
    const subscription = await db.subscriptions.findByUserId(userId);
    
    if (!subscription) return 'none';
    if (subscription.cancelled_at) return 'cancelled';
    if (new Date() > new Date(subscription.current_period_end)) return 'expired';
    return 'active';
  }
  
  // Notify dating app when new top agent is available
  static async notifyTopAgentAvailable(agentId: string): Promise<void> {
    try {
      await axios.post(
        `${DATING_SERVICE_URL}/api/internal/notifications`,
        {
          notificationType: 'top_agent_available',
          agentId: agentId
        },
        {
          headers: {
            'X-Service-Auth': 'marketplace'
          }
        }
      );
    } catch (error) {
      logger.warn('Notification delivery failed', error);
      // Don't crash if notification fails
    }
  }
}

// services/DAOService.ts

export class DAOService {
  // Record revenue in DAO
  static async recordRevenue(
    source: string,
    amount: number
  ): Promise<void> {
    try {
      // Call blockchain contract
      const tx = await daoContract.recordRevenue(
        web3.utils.toWei(amount, 'ether'),
        source
      );
      
      // Log transaction
      await db.daoRevenue.create({
        source,
        amount,
        blockchain_tx: tx.hash,
        created_at: new Date()
      });
      
      logger.info('DAO revenue recorded', { source, amount });
    } catch (error) {
      logger.error('DAO revenue recording failed', error);
      // Retry with exponential backoff
      setTimeout(() => DAOService.recordRevenue(source, amount), 5000);
    }
  }
}
```

---

## Part 6: DAO Integration

### Revenue Distribution

```typescript
// When any payment is completed, allocate to DAO
eventBus.on(PlatformEvent.PAYMENT_COMPLETED, async (data) => {
  const daoAllocation = Math.floor(data.amount * 0.05); // 5%
  
  // Update DAO treasury (on-chain)
  await daoService.recordRevenue(data.source, daoAllocation);
  
  // Update DAO analytics (off-chain)
  await db.daoAnalytics.update({
    total_revenue: db.raw('total_revenue + ?', [daoAllocation]),
    last_revenue_at: new Date()
  });
});

// Staking rewards automatically calculated
async function calculateStakingRewards() {
  const stakingRecords = await db.staking.findActive();
  
  for (const record of stakingRecords) {
    const timeStaked = Date.now() - record.staked_at.getTime();
    const annualReward = (record.tokens_staked * 0.05); // 5% APY
    const prioratedReward = (annualReward * timeStaked) / (365*24*60*60*1000);
    
    if (prioratedReward > 0) {
      // Mint new tokens for rewards
      await daoToken.mintRewards(record.user_id, prioratedReward);
    }
  }
}

// Treasury governance proposals
interface Proposal {
  id: string;
  title: string;
  description: string;
  amount: number;
  recipient: string;
  category: 'grant' | 'creator_reward' | 'marketing' | 'security';
  votingDeadline: Date;
  votesFor: number;
  votesAgainst: number;
}

async function executeApprovedProposal(proposalId: string) {
  const proposal = await db.daoProposals.findById(proposalId);
  
  if (proposal.votesFor <= proposal.votesAgainst) {
    throw new Error('Proposal rejected by community');
  }
  
  if (new Date() <= proposal.votingDeadline) {
    throw new Error('Voting still ongoing');
  }
  
  // Transfer from treasury to recipient
  await daoTreasury.transfer(
    proposal.recipient,
    web3.utils.toWei(proposal.amount, 'ether')
  );
  
  // Update proposal status
  await db.daoProposals.update(proposalId, {
    executed: true,
    executed_at: new Date()
  });
}
```

---

## Part 7: Monitoring & Health Checks

### Service Health Endpoints

```typescript
// /api/health
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    version: process.env.VERSION,
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      payments: 'unknown',
      blockchain: 'unknown'
    }
  };
  
  try {
    // Check database
    await db.query('SELECT 1');
    health.checks.database = 'ok';
  } catch (err) {
    health.checks.database = 'failed';
    health.status = 'degraded';
  }
  
  try {
    // Check Redis
    await redis.ping();
    health.checks.redis = 'ok';
  } catch (err) {
    health.checks.redis = 'failed';
    health.status = 'degraded';
  }
  
  try {
    // Check Square API
    await squareClient.locationsApi.retrieveLocation(SQUARE_LOCATION_ID);
    health.checks.payments = 'ok';
  } catch (err) {
    health.checks.payments = 'failed';
    health.status = 'degraded';
  }
  
  try {
    // Check blockchain connection
    const blockNumber = await web3.eth.getBlockNumber();
    if (blockNumber > 0) {
      health.checks.blockchain = 'ok';
    }
  } catch (err) {
    health.checks.blockchain = 'failed';
    // Don't mark as degraded - DAO is optional
  }
  
  res.json(health);
});
```

---

## Part 8: Deployment Across Services

### Docker Compose (Local Development)

```yaml
version: '3.8'

services:
  # Shared infrastructure
  postgres:
    image: postgis/postgis:15-alpine
    environment:
      POSTGRES_DB: antiaidating
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Services
  dating-api:
    build: ./date-app-dashboard/backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://admin:dev_password@postgres:5432/antiaidating
      REDIS_URL: redis://redis:6379
      SQUARE_ENVIRONMENT: Sandbox
      NODE_ENV: development
    depends_on:
      - postgres
      - redis

  marketplace-api:
    build: ./marketplace/backend
    ports:
      - "3001:3000"
    environment:
      DATABASE_URL: postgresql://admin:dev_password@postgres:5432/antiaidating
      REDIS_URL: redis://redis:6379
      SQUARE_ENVIRONMENT: Sandbox
      NODE_ENV: development
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./date-app-dashboard/frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000/api
      VITE_MARKETPLACE_URL: http://localhost:3001/api
    depends_on:
      - dating-api
      - marketplace-api

volumes:
  postgres_data:
```

---

**Last Updated:** November 2, 2025  
**Architecture Review:** Quarterly  
**Next Update:** February 2, 2026
