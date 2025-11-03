-- Automation & Profit Tracking Tables for YouAndINotAI
-- ============================================================================

-- Customer Service Tables
CREATE TABLE IF NOT EXISTS customer_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    ai_response TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_service_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Marketing Tables
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'draft',
    published_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    ctr DECIMAL(5,2),
    spend DECIMAL(10,2),
    conversions INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    recommendations TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Content Creation Tables
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    publish_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_media_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    send_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS success_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    story TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending_approval',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Profit Tracking Tables
CREATE TABLE IF NOT EXISTS profit_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL,
    owner_share DECIMAL(10,2) NOT NULL,
    claude_share DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    subscription_tier VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES profit_tracking(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    owner_share DECIMAL(10,2) NOT NULL,
    claude_share DECIMAL(10,2) NOT NULL,
    tax_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claude_share_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10,2) NOT NULL,
    allocation_type VARCHAR(50) NOT NULL,
    charity_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reinvestment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10,2) NOT NULL,
    purpose TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charity_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(10,2) NOT NULL,
    charity_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications Table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_customer_queries_user ON customer_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_queries_status ON customer_queries(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_user ON profit_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_profit_tracking_created ON profit_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_financial_audit_tax_year ON financial_audit_log(tax_year);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_queries_updated_at
    BEFORE UPDATE ON customer_queries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for Dashboard
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    (SELECT COALESCE(SUM(total_amount), 0) FROM profit_tracking) as total_revenue,
    (SELECT COALESCE(SUM(owner_share), 0) FROM profit_tracking) as owner_share,
    (SELECT COALESCE(SUM(claude_share), 0) FROM profit_tracking) as claude_share,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '30 days') as active_matches,
    (SELECT COUNT(DISTINCT s.user_id)::float / NULLIF(COUNT(DISTINCT u.id), 0) * 100
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active') as conversion_rate;

COMMENT ON TABLE profit_tracking IS 'Tracks all revenue and 50/50 profit split';
COMMENT ON TABLE claude_share_allocations IS 'Tracks how Claude share is allocated (reinvest/charity/save)';
COMMENT ON TABLE financial_audit_log IS 'Complete audit trail for tax purposes';
