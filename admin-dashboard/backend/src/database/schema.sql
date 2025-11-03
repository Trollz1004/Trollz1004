-- TROLLZ1004 ADMIN DASHBOARD DATABASE SCHEMA
-- Domain: youandinotai.online
-- Purpose: Complete administrative control center
-- NO FAKE DATA POLICY: All revenue, stats, and metrics must be 100% real

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- AUTHENTICATION & USER MANAGEMENT
-- ============================================================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  age INTEGER NOT NULL CHECK (age >= 43), -- Age-verified owner only
  nsfw_approved BOOLEAN DEFAULT true,
  is_owner BOOLEAN DEFAULT true,
  totp_secret VARCHAR(255), -- 2FA secret
  totp_enabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  last_login_ip INET,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- ============================================================================
-- AI AGENT ORCHESTRATION SYSTEM
-- ============================================================================

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('claude', 'gemini', 'perplexity', 'ollama', 'webui', 'openai')),
  model VARCHAR(100) NOT NULL,
  system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
  max_tokens INTEGER DEFAULT 4000,
  capabilities JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'error')),
  created_by_user_id UUID REFERENCES admin_users(id),
  parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  total_conversations INTEGER DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  last_active_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_provider ON agents(provider);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_parent_agent_id ON agents(parent_agent_id);
CREATE INDEX idx_agents_created_by_user_id ON agents(created_by_user_id);

CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  agent_response TEXT,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_conversations_agent_id ON agent_conversations(agent_id);
CREATE INDEX idx_agent_conversations_created_at ON agent_conversations(created_at);

CREATE TABLE agent_file_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('read', 'write', 'delete', 'execute', 'create', 'rename', 'move')),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_file_operations_agent_id ON agent_file_operations(agent_id);
CREATE INDEX idx_agent_file_operations_operation ON agent_file_operations(operation);
CREATE INDEX idx_agent_file_operations_created_at ON agent_file_operations(created_at);

-- ============================================================================
-- CONTENT CREATION SYSTEM (Text/Voice/Image to Video)
-- ============================================================================

CREATE TABLE media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('video', 'image', 'audio', 'document')),
  mime_type VARCHAR(100),
  file_size_bytes BIGINT NOT NULL,
  duration_seconds INTEGER,
  resolution VARCHAR(20),
  frame_rate INTEGER,
  creation_method VARCHAR(50) CHECK (creation_method IN ('text-to-video', 'image-to-video', 'voice-to-video', 'upload', 'edit')),
  prompt TEXT,
  provider VARCHAR(50),
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES admin_users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_library_file_type ON media_library(file_type);
CREATE INDEX idx_media_library_creation_method ON media_library(creation_method);
CREATE INDEX idx_media_library_created_by_agent_id ON media_library(created_by_agent_id);
CREATE INDEX idx_media_library_created_at ON media_library(created_at);

CREATE TABLE content_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media_library(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,
  method VARCHAR(50) NOT NULL CHECK (method IN ('http_post', 'webhook', 'ftp', 'sftp', 's3', 'gcs', 'api')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'retrying')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_distributions_media_id ON content_distributions(media_id);
CREATE INDEX idx_content_distributions_status ON content_distributions(status);
CREATE INDEX idx_content_distributions_created_at ON content_distributions(created_at);

-- ============================================================================
-- DAO GOVERNANCE SYSTEM
-- ============================================================================

CREATE TABLE dao_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_number SERIAL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  proposer_address VARCHAR(255),
  proposer_name VARCHAR(255),
  voting_starts_at TIMESTAMP DEFAULT NOW(),
  voting_ends_at TIMESTAMP NOT NULL,
  execution_time TIMESTAMP,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  abstain_votes INTEGER DEFAULT 0,
  total_voting_power BIGINT DEFAULT 0,
  quorum_required DECIMAL(5,2) DEFAULT 50.00,
  approval_threshold DECIMAL(5,2) DEFAULT 66.67,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'passed', 'rejected', 'executed', 'cancelled')),
  on_chain_tx_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dao_proposals_status ON dao_proposals(status);
CREATE INDEX idx_dao_proposals_voting_ends_at ON dao_proposals(voting_ends_at);

CREATE TABLE dao_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES dao_proposals(id) ON DELETE CASCADE,
  voter_address VARCHAR(255) NOT NULL,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
  voting_power BIGINT NOT NULL,
  on_chain_tx_hash VARCHAR(255),
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(proposal_id, voter_address)
);

CREATE INDEX idx_dao_votes_proposal_id ON dao_votes(proposal_id);
CREATE INDEX idx_dao_votes_voter_address ON dao_votes(voter_address);

-- ============================================================================
-- TREASURY MANAGEMENT
-- ============================================================================

CREATE TABLE treasury_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain VARCHAR(50) NOT NULL CHECK (chain IN ('ethereum', 'polygon', 'binance', 'avalanche', 'arbitrum', 'optimism', 'bitcoin', 'solana')),
  address VARCHAR(255) NOT NULL,
  label VARCHAR(255),
  balance_native DECIMAL(30,10) DEFAULT 0,
  balance_usd DECIMAL(20,2) DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chain, address)
);

CREATE INDEX idx_treasury_wallets_chain ON treasury_wallets(chain);
CREATE INDEX idx_treasury_wallets_is_primary ON treasury_wallets(is_primary);

CREATE TABLE treasury_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES treasury_wallets(id) ON DELETE CASCADE,
  tx_hash VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('incoming', 'outgoing', 'internal', 'contract')),
  amount_native DECIMAL(30,10) NOT NULL,
  amount_usd DECIMAL(20,2),
  fee_native DECIMAL(30,10),
  fee_usd DECIMAL(20,2),
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  block_timestamp TIMESTAMP,
  description TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_treasury_transactions_wallet_id ON treasury_transactions(wallet_id);
CREATE INDEX idx_treasury_transactions_tx_hash ON treasury_transactions(tx_hash);
CREATE INDEX idx_treasury_transactions_type ON treasury_transactions(type);
CREATE INDEX idx_treasury_transactions_block_timestamp ON treasury_transactions(block_timestamp);

-- ============================================================================
-- GRANTS MANAGEMENT
-- ============================================================================

CREATE TABLE grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_number SERIAL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  applicant_name VARCHAR(255) NOT NULL,
  applicant_email VARCHAR(255),
  applicant_wallet VARCHAR(255),
  requested_amount_usd DECIMAL(20,2) NOT NULL CHECK (requested_amount_usd > 0),
  approved_amount_usd DECIMAL(20,2) CHECK (approved_amount_usd >= 0),
  disbursed_amount_usd DECIMAL(20,2) DEFAULT 0 CHECK (disbursed_amount_usd >= 0),
  status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'disbursed', 'completed', 'cancelled')),
  milestones JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  reviewed_by_user_id UUID REFERENCES admin_users(id),
  reviewed_at TIMESTAMP,
  disbursed_at TIMESTAMP,
  disbursement_tx_hash VARCHAR(255),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_applicant_email ON grants(applicant_email);
CREATE INDEX idx_grants_created_at ON grants(created_at);

-- ============================================================================
-- FUNDRAISING / KICKSTARTER CAMPAIGNS
-- ============================================================================

CREATE TABLE fundraising_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_number SERIAL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  cover_image_url TEXT,
  video_url TEXT,
  goal_amount_usd DECIMAL(20,2) NOT NULL CHECK (goal_amount_usd > 0),
  current_amount_usd DECIMAL(20,2) DEFAULT 0 CHECK (current_amount_usd >= 0),
  backer_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'funded', 'cancelled', 'completed')),
  category VARCHAR(100),
  reward_tiers JSONB DEFAULT '[]',
  starts_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP NOT NULL,
  funded_at TIMESTAMP,
  created_by_user_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fundraising_campaigns_status ON fundraising_campaigns(status);
CREATE INDEX idx_fundraising_campaigns_ends_at ON fundraising_campaigns(ends_at);
CREATE INDEX idx_fundraising_campaigns_created_at ON fundraising_campaigns(created_at);

CREATE TABLE campaign_backers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES fundraising_campaigns(id) ON DELETE CASCADE,
  backer_name VARCHAR(255),
  backer_email VARCHAR(255),
  backer_wallet VARCHAR(255),
  amount_usd DECIMAL(20,2) NOT NULL CHECK (amount_usd > 0),
  reward_tier VARCHAR(100),
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  payment_method VARCHAR(50),
  payment_tx_hash VARCHAR(255),
  backed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_campaign_backers_campaign_id ON campaign_backers(campaign_id);
CREATE INDEX idx_campaign_backers_backer_email ON campaign_backers(backer_email);
CREATE INDEX idx_campaign_backers_backed_at ON campaign_backers(backed_at);

-- ============================================================================
-- REVENUE TRACKING (ALL REAL DATA - NO FAKE)
-- ============================================================================

CREATE TABLE revenue_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) NOT NULL UNIQUE,
  source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('subscription', 'one_time', 'donation', 'nft', 'grant', 'fundraiser', 'dao', 'other')),
  total_revenue_usd DECIMAL(20,2) DEFAULT 0 NOT NULL,
  transaction_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE revenue_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES revenue_sources(id) ON DELETE CASCADE,
  amount_usd DECIMAL(20,2) NOT NULL CHECK (amount_usd > 0),
  currency VARCHAR(10),
  amount_native DECIMAL(30,10),
  description TEXT,
  customer_id VARCHAR(255),
  transaction_ref VARCHAR(255),
  payment_method VARCHAR(50),
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_revenue_transactions_source_id ON revenue_transactions(source_id);
CREATE INDEX idx_revenue_transactions_transaction_date ON revenue_transactions(transaction_date);

-- ============================================================================
-- API STATUS MONITORING
-- ============================================================================

CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name VARCHAR(100) UNIQUE NOT NULL,
  endpoint_url TEXT NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  category VARCHAR(50),
  expected_status INTEGER DEFAULT 200,
  timeout_ms INTEGER DEFAULT 5000,
  status VARCHAR(20) DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'degraded', 'unknown')),
  last_checked_at TIMESTAMP,
  last_online_at TIMESTAMP,
  last_offline_at TIMESTAMP,
  response_time_ms INTEGER,
  uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
  total_checks INTEGER DEFAULT 0,
  failed_checks INTEGER DEFAULT 0,
  error_message TEXT,
  auto_resolve_enabled BOOLEAN DEFAULT true,
  auto_resolve_script TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_endpoints_status ON api_endpoints(status);
CREATE INDEX idx_api_endpoints_category ON api_endpoints(category);

CREATE TABLE api_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_endpoint_id UUID REFERENCES api_endpoints(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  response_time_ms INTEGER,
  http_status INTEGER,
  error_message TEXT,
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_health_logs_api_endpoint_id ON api_health_logs(api_endpoint_id);
CREATE INDEX idx_api_health_logs_checked_at ON api_health_logs(checked_at);

-- ============================================================================
-- SYSTEM MONITORING
-- ============================================================================

CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('cpu', 'ram', 'disk', 'network_in', 'network_out')),
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  server_name VARCHAR(100) DEFAULT 'main',
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_metric_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);

CREATE TABLE domain_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  is_online BOOLEAN DEFAULT true,
  dns_resolution_ms INTEGER,
  ssl_valid BOOLEAN DEFAULT true,
  ssl_expiry_date DATE,
  page_load_time_ms INTEGER,
  http_status INTEGER,
  cloudflare_status VARCHAR(50),
  last_checked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_domain_status_domain ON domain_status(domain);
CREATE INDEX idx_domain_status_is_online ON domain_status(is_online);

-- ============================================================================
-- SOCIAL MEDIA INTEGRATION
-- ============================================================================

CREATE TABLE social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('twitter', 'instagram', 'facebook', 'reddit', 'tiktok', 'linkedin', 'youtube')),
  account_name VARCHAR(255) NOT NULL,
  account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_connected BOOLEAN DEFAULT true,
  last_post_at TIMESTAMP,
  total_posts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(platform, account_name)
);

CREATE INDEX idx_social_media_accounts_platform ON social_media_accounts(platform);
CREATE INDEX idx_social_media_accounts_is_connected ON social_media_accounts(is_connected);

CREATE TABLE social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES social_media_accounts(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_library(id) ON DELETE SET NULL,
  post_text TEXT,
  post_url TEXT,
  platform_post_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'posted', 'failed')),
  scheduled_for TIMESTAMP,
  posted_at TIMESTAMP,
  error_message TEXT,
  engagement JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_media_posts_account_id ON social_media_posts(account_id);
CREATE INDEX idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_media_posts_posted_at ON social_media_posts(posted_at);

-- ============================================================================
-- FILE SYSTEM BROWSER
-- ============================================================================

CREATE TABLE file_browser_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_file_browser_bookmarks_user_id ON file_browser_bookmarks(user_id);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_agent_id ON audit_logs(agent_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- INITIAL DATA - OWNER ACCOUNT (Update after creation)
-- ============================================================================

-- Create owner account (password will be hashed by application)
-- INSERT INTO admin_users (email, password_hash, full_name, age, nsfw_approved, is_owner)
-- VALUES ('owner@youandinotai.online', '$2b$12$placeholder', 'Owner', 43, true, true);

-- Initialize revenue sources with ZERO data
INSERT INTO revenue_sources (source_name, source_type, total_revenue_usd, transaction_count)
VALUES 
  ('Date App Subscriptions', 'subscription', 0, 0),
  ('NFT Sales', 'one_time', 0, 0),
  ('Fundraiser Contributions', 'fundraiser', 0, 0),
  ('Grant Distributions', 'grant', 0, 0),
  ('DAO Treasury', 'dao', 0, 0),
  ('Kickstarter Campaigns', 'fundraiser', 0, 0);

-- Initialize domain monitoring
INSERT INTO domain_status (domain)
VALUES 
  ('youandinotai.com'),
  ('youandinotai.online');

-- Initialize API endpoint monitoring
INSERT INTO api_endpoints (api_name, endpoint_url, category, auto_resolve_enabled)
VALUES 
  ('Date App Health', 'https://youandinotai.com/api/health', 'date_app', true),
  ('Claude API', 'https://api.anthropic.com/v1/messages', 'ai_provider', true),
  ('OpenAI API', 'https://api.openai.com/v1/models', 'ai_provider', true),
  ('Gemini API', 'https://generativelanguage.googleapis.com/v1/models', 'ai_provider', true),
  ('Runway ML API', 'https://api.runwayml.com/v1/status', 'content_creation', true),
  ('Twilio SMS', 'https://api.twilio.com/2010-04-01/Accounts', 'communication', true),
  ('SendGrid Email', 'https://api.sendgrid.com/v3/user/profile', 'communication', true),
  ('Stripe Payments', 'https://api.stripe.com/v1/charges', 'payment', true),
  ('Twitter API', 'https://api.twitter.com/2/users/me', 'social_media', true),
  ('Instagram API', 'https://graph.instagram.com/me', 'social_media', true),
  ('Reddit API', 'https://oauth.reddit.com/api/v1/me', 'social_media', true),
  ('Ethereum RPC', 'https://mainnet.infura.io/v3/', 'blockchain', true),
  ('Polygon RPC', 'https://polygon-rpc.com', 'blockchain', true);

-- Create indexes for performance
CREATE INDEX idx_revenue_total ON revenue_sources(total_revenue_usd DESC);
CREATE INDEX idx_active_agents ON agents(status) WHERE status = 'active';

-- Enable row-level security (optional, for future multi-tenant)
-- ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
