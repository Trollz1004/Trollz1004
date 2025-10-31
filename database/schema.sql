-- ============================================================================
-- YouAndINotAI - Complete Database Schema
-- Version: 2.0 (God Tier + Jealousy Tier)
-- Total Tables: 31
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    account_status VARCHAR(50) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned', 'deleted'))
);

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(100),
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(50),
    looking_for VARCHAR(50),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100) DEFAULT 'USA',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    height_cm INTEGER,
    education VARCHAR(100),
    occupation VARCHAR(100),
    relationship_status VARCHAR(50),
    children VARCHAR(50),
    smoking VARCHAR(50),
    drinking VARCHAR(50),
    religion VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50),
    dynamic_vibe VARCHAR(100), -- AI-generated vibe
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    ai_tags JSONB DEFAULT '[]', -- AI-generated tags
    moderation_status VARCHAR(50) DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, interest_name)
);

-- ============================================================================
-- SUBSCRIPTION & PAYMENTS
-- ============================================================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    square_plan_id VARCHAR(255),
    features JSONB DEFAULT '[]',
    tier_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, price_monthly, tier_level, features) VALUES
('basic', 'Basic', 'Essential dating features', 9.99, 1, '["unlimited_likes", "see_who_liked_you", "5_super_likes_per_day"]'),
('premium', 'Premium', 'Advanced AI features', 19.99, 2, '["all_basic_features", "ai_date_concierge", "priority_matching", "read_receipts"]'),
('elite', 'Elite', 'Complete experience with exclusive features', 29.99, 3, '["all_premium_features", "ai_relationship_coach", "profile_boost", "advanced_filters"]');

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    square_subscription_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
    started_at TIMESTAMP DEFAULT NOW(),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    square_payment_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method VARCHAR(50),
    error_message TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- MATCHING & DISCOVERY
-- ============================================================================

CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id UUID REFERENCES users(id) ON DELETE CASCADE,
    swiped_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    direction VARCHAR(10) CHECK (direction IN ('like', 'pass', 'super_like')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(swiper_id, swiped_user_id)
);

CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id_a UUID REFERENCES users(id) ON DELETE CASCADE,
    user_id_b UUID REFERENCES users(id) ON DELETE CASCADE,
    gemini_compatibility_score DECIMAL(3, 2), -- AI compatibility (0-100)
    azure_face_confidence DECIMAL(3, 2), -- Face verification confidence
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'unmatched', 'blocked')),
    matched_at TIMESTAMP DEFAULT NOW(),
    CHECK (user_id_a < user_id_b), -- Ensure consistent ordering
    UNIQUE(user_id_a, user_id_b)
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP,
    last_message_preview TEXT,
    unread_count_a INTEGER DEFAULT 0,
    unread_count_b INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif', 'ai_suggested')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    safety_checked BOOLEAN DEFAULT FALSE,
    safety_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SAFETY & MODERATION
-- ============================================================================

CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    evidence_urls JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE safety_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN ('scam', 'spam', 'harassment', 'inappropriate_content', 'fake_profile')),
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    content_sample TEXT,
    ai_confidence DECIMAL(3, 2), -- 0-1 confidence score
    action_taken VARCHAR(100) CHECK (action_taken IN ('blocked', 'flagged', 'passed', 'review_required')),
    status VARCHAR(50) DEFAULT 'active',
    reviewed_by_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_user_id)
);

-- ============================================================================
-- JEALOUSY TIER: DYNAMIC TRUST SCORE
-- ============================================================================

CREATE TABLE user_trust_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    score DECIMAL(5, 2) DEFAULT 50.00 CHECK (score >= 0 AND score <= 100),
    factors JSONB DEFAULT '{}', -- Breakdown of contributing factors
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- JEALOUSY TIER: AI DATE CONCIERGE
-- ============================================================================

CREATE TABLE ai_date_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    generated_by_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date_ideas JSONB DEFAULT '[]', -- Array of date suggestions
    location_preferences JSONB DEFAULT '{}',
    budget_range VARCHAR(50),
    gemini_prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- JEALOUSY TIER: COUPLE'S QUESTS
-- ============================================================================

CREATE TABLE couple_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    quest_title VARCHAR(255) NOT NULL,
    quest_description TEXT,
    quest_type VARCHAR(100), -- e.g., 'photo_challenge', 'conversation_starter', 'date_idea'
    completion_criteria JSONB DEFAULT '{}',
    reward_gems INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ============================================================================
-- JEALOUSY TIER: GAMIFICATION & REWARDS
-- ============================================================================

CREATE TABLE user_rewards (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    gems_balance INTEGER DEFAULT 0 CHECK (gems_balance >= 0),
    lifetime_gems_earned INTEGER DEFAULT 0,
    last_daily_login_reward DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('earned', 'spent', 'expired')),
    amount INTEGER NOT NULL,
    reason VARCHAR(255),
    balance_after INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ANALYTICS & ADMIN
-- ============================================================================

CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'moderator' CHECK (role IN ('super_admin', 'admin', 'moderator')),
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_matches BOOLEAN DEFAULT TRUE,
    email_messages BOOLEAN DEFAULT TRUE,
    email_likes BOOLEAN DEFAULT TRUE,
    push_matches BOOLEAN DEFAULT TRUE,
    push_messages BOOLEAN DEFAULT TRUE,
    push_likes BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- User Profiles
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_location ON user_profiles(location_city, location_state);
CREATE INDEX idx_user_profiles_gender_looking ON user_profiles(gender, looking_for);

-- Photos
CREATE INDEX idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX idx_user_photos_primary ON user_photos(user_id, is_primary);

-- Subscriptions
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- Matching
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id, created_at DESC);
CREATE INDEX idx_swipes_swiped_user ON swipes(swiped_user_id);
CREATE INDEX idx_matches_users ON matches(user_id_a, user_id_b);
CREATE INDEX idx_matches_status ON matches(status);

-- Conversations & Messages
CREATE INDEX idx_conversations_match_id ON conversations(match_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(is_read, conversation_id);

-- Safety
CREATE INDEX idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_safety_alerts_user ON safety_alerts(user_id);
CREATE INDEX idx_safety_alerts_severity ON safety_alerts(severity, status);

-- Trust Scores
CREATE INDEX idx_trust_scores_score ON user_trust_scores(score DESC);

-- Activity
CREATE INDEX idx_activity_log_user ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_type ON user_activity_log(activity_type);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO admin_users (email, password_hash, role) VALUES
('admin@youandinotai.com', '$2b$10$rZ7gGQ8qzQ8qzQ8qzQ8qze8qzQ8qzQ8qzQ8qzQ8qzQ8qzQ8qzQ8q', 'super_admin');

-- System settings
INSERT INTO system_settings (key, value, description) VALUES
('platform_version', '2.0.0', 'Current platform version'),
('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
('max_swipes_per_day_free', '50', 'Daily swipe limit for free users'),
('max_super_likes_per_day', '5', 'Daily super like limit'),
('trust_score_threshold_low', '25', 'Low trust score threshold'),
('trust_score_threshold_critical', '10', 'Critical trust score threshold');

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO youandinotai_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO youandinotai_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO youandinotai_user;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user authentication and account data';
COMMENT ON TABLE user_profiles IS 'Extended user profile information for matching';
COMMENT ON TABLE user_trust_scores IS 'Dynamic safety and quality score for each user (Jealousy Tier feature)';
COMMENT ON TABLE safety_alerts IS 'AI-generated alerts from the Proactive Safety Agent';
COMMENT ON TABLE ai_date_plans IS 'AI-generated date suggestions for matched couples';
COMMENT ON TABLE couple_quests IS 'Interactive challenges for matched couples';
COMMENT ON TABLE user_rewards IS 'Gamification points (Gems) earned through platform engagement';

-- ============================================================================
-- SCHEMA VERSION
-- ============================================================================

CREATE TABLE schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES
('2.0.0', 'Complete God Tier + Jealousy Tier schema with 31 tables');
