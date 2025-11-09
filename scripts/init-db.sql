-- Production Database Schema - Team Claude For The Kids
-- 13 tables | 50+ indexes | Auto 50/50 charity split | Zero placeholders
-- PostgreSQL 16+

BEGIN;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- 2. Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  age INTEGER,
  gender VARCHAR(50),
  interests TEXT[],
  location JSONB,
  photos TEXT[],
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_age ON profiles(age);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_location ON profiles USING GIN(location);

-- 3. Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('basic', 'premium', 'vip')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'canceled', 'expired')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- 4. Transactions table with AUTO 50/50 split (GENERATED columns)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  type VARCHAR(50) NOT NULL CHECK (type IN ('subscription', 'donation', 'purchase', 'refund')),
  nonce INTEGER NOT NULL, -- Transaction replay protection
  stripe_payment_intent VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  -- AUTO 50/50 SPLIT - GENERATED COLUMNS
  platform_share DECIMAL(10, 2) GENERATED ALWAYS AS (amount * 0.50) STORED,
  charity_share DECIMAL(10, 2) GENERATED ALWAYS AS (amount * 0.50) STORED,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, nonce) -- Prevent replay attacks
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_nonce ON transactions(user_id, nonce); -- Replay protection

-- 5. Revenue split tracking (auto-updated by trigger)
CREATE TABLE revenue_split (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  platform_share DECIMAL(10, 2) NOT NULL,
  charity_share DECIMAL(10, 2) NOT NULL,
  split_percentage DECIMAL(5, 2) DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_revenue_split_transaction ON revenue_split(transaction_id);
CREATE INDEX idx_revenue_split_created_at ON revenue_split(created_at);

-- 6. Charity donations tracking
CREATE TABLE charity_donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  charity_name VARCHAR(255) DEFAULT 'Shriners Children''s Hospitals',
  donation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_transfer_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'transferred', 'failed')),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_charity_donations_transaction ON charity_donations(transaction_id);
CREATE INDEX idx_charity_donations_status ON charity_donations(status);
CREATE INDEX idx_charity_donations_date ON charity_donations(donation_date);

-- 7. Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  match_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_at ON matches(created_at);

-- 8. Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_read ON messages(read) WHERE read = FALSE;
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- 9. DAO Proposals table
CREATE TABLE dao_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id BIGINT UNIQUE NOT NULL,
  proposer_address VARCHAR(42) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  targets TEXT[] NOT NULL,
  values BIGINT[] NOT NULL,
  signatures TEXT[] NOT NULL,
  calldatas TEXT[] NOT NULL,
  start_block BIGINT NOT NULL,
  end_block BIGINT NOT NULL,
  for_votes BIGINT DEFAULT 0,
  against_votes BIGINT DEFAULT 0,
  abstain_votes BIGINT DEFAULT 0,
  executed BOOLEAN DEFAULT FALSE,
  canceled BOOLEAN DEFAULT FALSE,
  eta BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dao_proposals_proposal_id ON dao_proposals(proposal_id);
CREATE INDEX idx_dao_proposals_proposer ON dao_proposals(proposer_address);
CREATE INDEX idx_dao_proposals_executed ON dao_proposals(executed);
CREATE INDEX idx_dao_proposals_created_at ON dao_proposals(created_at);

-- 10. DAO Votes table
CREATE TABLE dao_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id BIGINT REFERENCES dao_proposals(proposal_id) ON DELETE CASCADE,
  voter_address VARCHAR(42) NOT NULL,
  support SMALLINT NOT NULL CHECK (support IN (0, 1, 2)), -- 0=Against, 1=For, 2=Abstain
  votes BIGINT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(proposal_id, voter_address)
);

CREATE INDEX idx_dao_votes_proposal ON dao_votes(proposal_id);
CREATE INDEX idx_dao_votes_voter ON dao_votes(voter_address);
CREATE INDEX idx_dao_votes_support ON dao_votes(support);

-- 11. Audit logs table (compliance)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip VARCHAR(45),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  success BOOLEAN NOT NULL,
  error TEXT,
  metadata JSONB
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);

-- 12. Cache table (for app-level caching)
CREATE TABLE cache (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cache_expires ON cache(expires_at);

-- 13. Feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- ==========================================
-- TRIGGERS for auto 50/50 split tracking
-- ==========================================

-- Trigger: Auto-create revenue_split entry when transaction completes
CREATE OR REPLACE FUNCTION auto_create_revenue_split()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO revenue_split (transaction_id, amount, platform_share, charity_share)
    VALUES (NEW.id, NEW.amount, NEW.platform_share, NEW.charity_share);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revenue_split
AFTER UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION auto_create_revenue_split();

-- Trigger: Auto-create charity_donation entry for charity share
CREATE OR REPLACE FUNCTION auto_create_charity_donation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO charity_donations (transaction_id, amount)
  VALUES (NEW.transaction_id, NEW.charity_share);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_charity_donation
AFTER INSERT ON revenue_split
FOR EACH ROW
EXECUTE FUNCTION auto_create_charity_donation();

-- Trigger: Update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_profiles_timestamp BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_subscriptions_timestamp BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ==========================================
-- VIEWS for reporting
-- ==========================================

-- Platform statistics view
CREATE VIEW platform_stats AS
SELECT
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT u.id) FILTER (WHERE u.last_login > NOW() - INTERVAL '30 days') as active_users,
  COUNT(DISTINCT s.id) as active_subscriptions,
  COUNT(DISTINCT m.id) as total_matches,
  COALESCE(SUM(t.amount), 0) as total_revenue,
  COALESCE(SUM(t.platform_share), 0) as platform_revenue,
  COALESCE(SUM(t.charity_share), 0) as charity_revenue,
  COALESCE(SUM(cd.amount), 0) as total_donated
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
LEFT JOIN matches m ON u.id = m.user1_id OR u.id = m.user2_id
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
LEFT JOIN charity_donations cd ON cd.status = 'transferred';

-- Daily revenue view
CREATE VIEW daily_revenue AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as transaction_count,
  SUM(amount) as total_revenue,
  SUM(platform_share) as platform_revenue,
  SUM(charity_share) as charity_revenue
FROM transactions
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ==========================================
-- SEED DATA for testing
-- ==========================================

-- Feature flags
INSERT INTO feature_flags (name, enabled, description) VALUES
('charity_split', TRUE, 'Enable automatic 50/50 charity split'),
('dao_governance', TRUE, 'Enable DAO governance features'),
('premium_features', TRUE, 'Enable premium subscription features');

COMMIT;

-- Success message
SELECT 'Database initialized successfully! 13 tables, 50+ indexes, auto 50/50 split active.' as status;
