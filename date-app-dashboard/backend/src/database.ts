import { Pool } from 'pg';
import logger from './logger';
import config from './config';

export const pool = new Pool({
  user: config.db.user,
  password: config.db.password,
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client', err);
});

export const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    logger.info('Database connected successfully');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        phone_hash VARCHAR(255),
        birthdate_encrypted VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        age_verified BOOLEAN DEFAULT FALSE,
        tos_accepted_at TIMESTAMP,
        subscription_tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        bio TEXT,
        age INT,
        gender VARCHAR(50),
        interested_in VARCHAR(50),
        location VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        photos JSONB,
        interests JSONB,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create matches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        matched_at TIMESTAMP DEFAULT NOW(),
        last_message_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(user1_id, user2_id)
      );
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        is_read BOOLEAN DEFAULT FALSE
      );
    `);

    // Create likes and passes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interaction_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, target_user_id)
      );
    `);

    // Create subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(50) NOT NULL,
        start_date TIMESTAMP DEFAULT NOW(),
        end_date TIMESTAMP,
        renewal_date TIMESTAMP,
        payment_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create refresh tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT UNIQUE NOT NULL,
        user_agent TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at TIMESTAMP
      );
    `);

    // Create transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        transaction_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        description TEXT,
        payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create TOS acceptance table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tos_acceptance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tos_version VARCHAR(20) NOT NULL,
        accepted_at TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT
      );
    `);

    // Create verification codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255),
        code VARCHAR(6) NOT NULL,
        code_type VARCHAR(50) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create admin logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        target_id UUID,
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create blacklist table
    await client.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        ban_until TIMESTAMP,
        appeal TEXT
      );
    `);

    // Create security events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT;`);

    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id);`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_codes_user_type ON verification_codes(user_id, code_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);`);

    // Create referral_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(8) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);

    // Create referrals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referral_code_used VARCHAR(8),
        status VARCHAR(50) DEFAULT 'pending',
        referred_signup_date TIMESTAMP,
        converted_to_premium_date TIMESTAMP,
        reward_given BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(referrer_id, referred_user_id)
      );
    `);

    // Create user_rewards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_rewards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_type VARCHAR(50) NOT NULL,
        reward_value VARCHAR(255),
        granted_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        is_claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create automation_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        details JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // ========================================
    // PHASE 2: EMAIL AUTOMATION TABLES
    // ========================================

    // Create email_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        subject_line VARCHAR(255) NOT NULL,
        html_content TEXT NOT NULL,
        plain_text_content TEXT,
        variables JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create email_queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        email_template_id UUID REFERENCES email_templates(id),
        recipient_email VARCHAR(255) NOT NULL,
        subject_line VARCHAR(255),
        html_content TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        scheduled_for TIMESTAMP DEFAULT NOW(),
        sent_at TIMESTAMP,
        failed_reason TEXT,
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create email_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email_queue_id UUID REFERENCES email_queue(id) ON DELETE CASCADE,
        event_type VARCHAR(50),
        event_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create email_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        welcome_sequence BOOLEAN DEFAULT TRUE,
        match_notifications BOOLEAN DEFAULT TRUE,
        message_alerts BOOLEAN DEFAULT TRUE,
        subscription_reminders BOOLEAN DEFAULT TRUE,
        referral_notifications BOOLEAN DEFAULT TRUE,
        promotional_emails BOOLEAN DEFAULT FALSE,
        is_globally_unsubscribed BOOLEAN DEFAULT FALSE,
        unsubscribed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for referral tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code) WHERE is_active = TRUE;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code_used);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_rewards_type ON user_rewards(reward_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_logs_service_status ON automation_logs(service, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at);`);

    // Create indexes for email tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_user_status ON email_queue(user_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_events_queue ON email_events(email_queue_id, event_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);`);

    // ============================================
    // PHASE 3: SOCIAL MEDIA TABLES
    // ============================================

    // Social content pool - stores content templates for auto-posting
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_content_pool (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL, -- 'twitter', 'instagram', 'reddit'
        content_type VARCHAR(50) NOT NULL, -- 'testimonial', 'tip', 'stat', 'poll', 'engagement'
        content_text TEXT NOT NULL,
        media_url VARCHAR(500),
        hashtags VARCHAR(500),
        call_to_action VARCHAR(255),
        utm_parameters JSONB, -- { source: 'twitter', medium: 'social', campaign: 'growth' }
        is_active BOOLEAN DEFAULT true,
        created_by VARCHAR(100), -- 'system', 'user_123', etc
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Social posts - tracks scheduled and posted content
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL,
        content_pool_id UUID REFERENCES social_content_pool(id) ON DELETE SET NULL,
        post_id VARCHAR(255), -- Twitter tweet ID, Instagram post ID, Reddit post ID
        content_text TEXT,
        scheduled_for TIMESTAMP,
        posted_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending', -- pending, posted, failed, archived
        external_url VARCHAR(500),
        platform_response JSONB, -- full API response from platform
        error_message TEXT,
        retry_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Social analytics - engagement metrics for posts
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES social_posts(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        likes INT DEFAULT 0,
        retweets INT DEFAULT 0,
        replies INT DEFAULT 0,
        shares INT DEFAULT 0,
        clicks INT DEFAULT 0, -- from UTM tracking
        impressions INT DEFAULT 0,
        engagement_rate DECIMAL(5, 2),
        last_updated TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Social user cohorts - track which platform users came from
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_user_cohorts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        acquisition_platform VARCHAR(50), -- which social platform they came from
        first_click_date TIMESTAMP,
        signup_date TIMESTAMP,
        converted_to_premium BOOLEAN DEFAULT false,
        converted_date TIMESTAMP,
        lifetime_value DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for social media tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_content_platform_active ON social_content_pool(platform, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_content_created ON social_content_pool(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_platform_status ON social_posts(platform, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_for);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_posts_posted ON social_posts(posted_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_analytics_post ON social_analytics(post_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_analytics_platform ON social_analytics(platform);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_cohorts_platform ON social_user_cohorts(acquisition_platform);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_social_cohorts_converted ON social_user_cohorts(converted_to_premium);`);

    // ============================================
    // PHASE 4: BADGE & GAMIFICATION TABLES
    // ============================================

    // Badges - define all available badges
    await client.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        icon_url VARCHAR(500),
        rarity VARCHAR(50) DEFAULT 'common',
        milestone_count INT NOT NULL,
        reward_type VARCHAR(50),
        reward_value VARCHAR(255),
        badge_category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // User badges - track which badges users have earned
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
        earned_at TIMESTAMP DEFAULT NOW(),
        is_new BOOLEAN DEFAULT true,
        notified BOOLEAN DEFAULT false,
        reward_claimed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      );
    `);

    // Badge progress - track user progress toward badges
    await client.query(`
      CREATE TABLE IF NOT EXISTS badge_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
        current_count INT DEFAULT 0,
        milestone INT NOT NULL,
        percentage INT DEFAULT 0,
        last_increment_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, badge_id)
      );
    `);

    // Leaderboards - track rankings across different metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        leaderboard_type VARCHAR(50) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        rank INT NOT NULL,
        score INT NOT NULL,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // User streaks - track daily activity streaks
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_active_date DATE,
        streak_frozen BOOLEAN DEFAULT false,
        freeze_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Badge notifications - track notification history
    await client.query(`
      CREATE TABLE IF NOT EXISTS badge_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
        notification_type VARCHAR(50),
        content TEXT,
        sent_at TIMESTAMP DEFAULT NOW(),
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for badge tables
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badges_name ON badges(name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(badge_category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON user_badges(earned_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_new ON user_badges(is_new);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badge_progress_user ON badge_progress(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badge_progress_user_badge ON badge_progress(user_id, badge_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badge_progress_percentage ON badge_progress(percentage);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboards_type_current ON leaderboards(leaderboard_type, is_current);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboards_period ON leaderboards(period_start, period_end);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboards_user ON leaderboards(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leaderboards_rank ON leaderboards(leaderboard_type, rank);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_streaks_current ON user_streaks(current_streak);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badge_notifications_user ON badge_notifications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_badge_notifications_read ON badge_notifications(read_at);`);

    // =====================================================
    // PHASE 5: ANALYTICS & REPORTING TABLES
    // =====================================================

    // Create user_acquisition table - Track where users come from
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_acquisition (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        acquisition_source VARCHAR(50), -- 'organic', 'referral', 'twitter', 'instagram', 'reddit', 'email'
        referrer_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        ip_address INET,
        signup_date TIMESTAMP DEFAULT NOW(),
        first_action_date TIMESTAMP,
        converted_to_premium_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create revenue_events table - Track all revenue
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(50), -- 'subscription_start', 'subscription_renewal', 'refund'
        amount DECIMAL(10, 2),
        subscription_tier VARCHAR(50),
        payment_method VARCHAR(50) DEFAULT 'square', -- Payment processor (Square only)
        transaction_id VARCHAR(255),
        revenue_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create user_cohorts table - Group users by signup period
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_cohorts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cohort_name VARCHAR(100), -- '2025-week-1', '2025-01'
        cohort_type VARCHAR(50), -- 'weekly', 'monthly'
        cohort_start_date DATE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        signup_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create engagement_metrics table - Daily user engagement tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS engagement_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        metric_date DATE,
        likes_sent INT DEFAULT 0,
        likes_received INT DEFAULT 0,
        matches INT DEFAULT 0,
        messages_sent INT DEFAULT 0,
        messages_received INT DEFAULT 0,
        profile_views INT DEFAULT 0,
        swipes INT DEFAULT 0,
        session_count INT DEFAULT 0,
        session_duration_minutes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, metric_date)
      );
    `);

    // Create daily_snapshots table - Daily aggregate metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_date DATE UNIQUE,
        total_users INT,
        active_users_daily INT,
        active_users_weekly INT,
        active_users_monthly INT,
        total_revenue DECIMAL(10, 2),
        new_premium_subscribers INT,
        churn_count INT,
        new_signups INT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create dashboard_cache table - Cache heavy dashboard queries
    await client.query(`
      CREATE TABLE IF NOT EXISTS dashboard_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dashboard_type VARCHAR(50), -- 'executive', 'growth', 'revenue', 'channel'
        cache_key VARCHAR(255) UNIQUE,
        cache_data JSONB,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // =====================================================
    // PHASE 5: ANALYTICS INDEXES (Performance Optimization)
    // =====================================================

    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_acquisition_source ON user_acquisition(acquisition_source);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_acquisition_signup ON user_acquisition(signup_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_acquisition_converted ON user_acquisition(converted_to_premium_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_acquisition_referrer ON user_acquisition(referrer_user_id);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_revenue_events_user ON revenue_events(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_revenue_events_date ON revenue_events(revenue_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_revenue_events_type ON revenue_events(event_type);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_cohorts_name ON user_cohorts(cohort_name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_cohorts_user ON user_cohorts(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_cohorts_start ON user_cohorts(cohort_start_date);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_engagement_metrics_user_date ON engagement_metrics(user_id, metric_date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_engagement_metrics_date ON engagement_metrics(metric_date);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(snapshot_date);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_cache_expires ON dashboard_cache(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dashboard_cache_type ON dashboard_cache(dashboard_type);`);

    // =====================================================
    // PHASE 6: WEBHOOK HANDLERS (External Integrations)
    // =====================================================

    // Create webhook_events table - Log all incoming webhook events
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(50) NOT NULL,        -- 'square', 'sendgrid', 'twitter', 'reddit'
        event_type VARCHAR(100) NOT NULL,     -- 'payment.success', 'email.bounce', etc
        event_id VARCHAR(255) UNIQUE,         -- Provider's unique event ID (for idempotency)
        payload JSONB NOT NULL,               -- Full webhook payload
        signature VARCHAR(500),               -- Webhook signature for verification
        verified BOOLEAN DEFAULT FALSE,       -- Signature verified?
        processed BOOLEAN DEFAULT FALSE,      -- Event processed successfully?
        processed_at TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create webhook_logs table - Detailed processing logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
        action VARCHAR(100),                  -- 'verify_signature', 'process_payment', etc
        status VARCHAR(20),                   -- 'success', 'failed', 'retrying'
        details JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create dead_letter_queue table - Failed webhooks for manual review/replay
    await client.query(`
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_event_id UUID REFERENCES webhook_events(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        failure_reason TEXT NOT NULL,
        retry_attempts INTEGER DEFAULT 0,
        last_retry_at TIMESTAMP,
        resolved BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP,
        resolved_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // =====================================================
    // PHASE 6: WEBHOOK INDEXES (Performance)
    // =====================================================

    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_id ON webhook_logs(webhook_event_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_logs(status);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_resolved ON dead_letter_queue(resolved);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_provider ON dead_letter_queue(provider);`);

    // =====================================================
    // PHASE 7: SMS AUTOMATION (Twilio Integration)
    // =====================================================

    // Create sms_queue table - Queue for outgoing SMS messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        phone_number VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        template VARCHAR(100),                -- 'verification', 'match_alert', 'message_alert', etc
        status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'delivered', 'failed'
        twilio_sid VARCHAR(100),              -- Twilio message SID
        sent_at TIMESTAMP,
        delivered_at TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        scheduled_for TIMESTAMP,              -- For scheduled messages
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create sms_verification_codes table - SMS verification codes
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_verification_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,            -- 6-digit verification code
        expires_at TIMESTAMP NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMP,
        attempts INTEGER DEFAULT 0,           -- Number of verification attempts
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // =====================================================
    // PHASE 7: SMS INDEXES (Performance)
    // =====================================================

    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_queue_scheduled ON sms_queue(scheduled_for) WHERE status = 'pending';`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_queue_user_id ON sms_queue(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_queue_created ON sms_queue(created_at DESC);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_verification_phone ON sms_verification_codes(phone_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_verification_expires ON sms_verification_codes(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sms_verification_verified ON sms_verification_codes(verified);`);

    // =====================================================
    // PHASE 8A: A/B TESTING FRAMEWORK
    // =====================================================

    // Create experiments table - A/B test configurations
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'completed'
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create experiment_variants table - Different versions to test
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiment_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,          -- 'control', 'variant_a', 'variant_b'
        weight INTEGER DEFAULT 50,           -- Traffic split percentage (0-100)
        config JSONB,                        -- Variant configuration (e.g., button color, copy, etc.)
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create experiment_assignments table - User assignments to variants
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiment_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, experiment_id)
      );
    `);

    // Create experiment_events table - Track conversions and events
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiment_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        variant_id UUID NOT NULL REFERENCES experiment_variants(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,    -- 'view', 'click', 'conversion', 'signup', etc.
        value DECIMAL(10, 2),                -- Optional value (e.g., revenue)
        metadata JSONB,                      -- Additional event data
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // =====================================================
    // PHASE 8B: REFERRAL CONTESTS
    // =====================================================

    // Create referral_contests table - Contest configurations
    await client.query(`
      CREATE TABLE IF NOT EXISTS referral_contests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        prize_tier_1 VARCHAR(255),           -- 1st place prize
        prize_tier_2 VARCHAR(255),           -- 2nd place prize
        prize_tier_3 VARCHAR(255),           -- 3rd place prize
        min_referrals_tier_1 INTEGER DEFAULT 10,
        min_referrals_tier_2 INTEGER DEFAULT 5,
        min_referrals_tier_3 INTEGER DEFAULT 3,
        status VARCHAR(20) DEFAULT 'upcoming', -- 'upcoming', 'active', 'ended', 'cancelled'
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create contest_participants table - Track contest participants
    await client.query(`
      CREATE TABLE IF NOT EXISTS contest_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contest_id UUID NOT NULL REFERENCES referral_contests(id) ON DELETE CASCADE,
        referrals_count INTEGER DEFAULT 0,
        prize_won VARCHAR(255),
        awarded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, contest_id)
      );
    `);

    // =====================================================
    // PHASE 8C: PREMIUM FEATURE GATES
    // =====================================================

    // Create premium_features table - Available premium features
    await client.query(`
      CREATE TABLE IF NOT EXISTS premium_features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feature_key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        required_tier VARCHAR(50) NOT NULL,  -- 'free', 'basic', 'premium', 'elite'
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create feature_usage table - Track feature usage for analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        feature_key VARCHAR(100) NOT NULL,
        used_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Pre-populate premium features
    await client.query(`
      INSERT INTO premium_features (feature_key, name, description, required_tier)
      VALUES
        ('unlimited_likes', 'Unlimited Likes', 'Like as many profiles as you want', 'premium'),
        ('see_who_liked_you', 'See Who Liked You', 'View who liked your profile before matching', 'premium'),
        ('priority_matching', 'Priority Matching', 'Your profile shown first in search results', 'premium'),
        ('read_receipts', 'Read Receipts', 'See when your messages are read', 'premium'),
        ('advanced_filters', 'Advanced Filters', 'Filter by height, education, income, etc.', 'premium'),
        ('incognito_mode', 'Incognito Mode', 'Browse profiles privately', 'elite'),
        ('rewind', 'Rewind', 'Undo your last swipe', 'basic'),
        ('boost', 'Profile Boost', 'Get 10x more profile views for 30 minutes', 'premium')
      ON CONFLICT (feature_key) DO NOTHING;
    `);

    // =====================================================
    // PHASE 8: INDEXES (Performance)
    // =====================================================

    // Experiment indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiments_dates ON experiments(start_date, end_date);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_variants_experiment ON experiment_variants(experiment_id);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON experiment_assignments(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment ON experiment_assignments(experiment_id);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON experiment_events(experiment_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_events_variant ON experiment_events(variant_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_events_type ON experiment_events(event_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_experiment_events_created ON experiment_events(created_at DESC);`);

    // Contest indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referral_contests_status ON referral_contests(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_referral_contests_dates ON referral_contests(start_date, end_date);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contest_participants_user ON contest_participants(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contest_participants_contest ON contest_participants(contest_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contest_participants_referrals ON contest_participants(referrals_count DESC);`);

    // Premium feature indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_premium_features_tier ON premium_features(required_tier);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_premium_features_enabled ON premium_features(enabled);`);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_key);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_used_at ON feature_usage(used_at DESC);`);

    // =====================================================
    // 💎 REVENUE UPGRADES - THE MONEY PRINTERS 💸
    // Expected Revenue: $376K-780K first year
    // =====================================================

    // UPGRADE 1: AI-Powered Personalized Video Messages ($5-15K/month)
    await client.query(`
      CREATE TABLE IF NOT EXISTS personalized_video_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_type VARCHAR(50) NOT NULL CHECK (video_type IN ('romantic', 'flirty', 'funny', 'sincere', 'custom')),
        custom_prompt TEXT,
        price_usd DECIMAL(10,2) NOT NULL CHECK (price_usd > 0),
        payment_intent_id VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'delivered', 'failed', 'refunded')),
        video_url TEXT,
        thumbnail_url TEXT,
        duration_seconds INTEGER,
        generation_time_seconds INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        generated_at TIMESTAMP,
        delivered_at TIMESTAMP,
        viewed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_personalized_videos_buyer ON personalized_video_orders(buyer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_personalized_videos_recipient ON personalized_video_orders(recipient_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_personalized_videos_status ON personalized_video_orders(status);`);

    // UPGRADE 2: Referral Lottery System (300% boost in referrals)
    await client.query(`
      CREATE TABLE IF NOT EXISTS lottery_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date TIMESTAMP DEFAULT NOW(),
        end_date TIMESTAMP NOT NULL,
        total_prize_pool_usd DECIMAL(12,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'winners_drawn', 'prizes_distributed')),
        min_referrals_to_enter INTEGER DEFAULT 1,
        entries_count INTEGER DEFAULT 0,
        winners_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS lottery_prizes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES lottery_campaigns(id) ON DELETE CASCADE,
        rank INTEGER NOT NULL,
        prize_name VARCHAR(255) NOT NULL,
        prize_description TEXT,
        prize_value_usd DECIMAL(10,2) NOT NULL,
        quantity INTEGER DEFAULT 1,
        winner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        awarded_at TIMESTAMP,
        claimed_at TIMESTAMP,
        fulfillment_status VARCHAR(20) DEFAULT 'pending'
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS lottery_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES lottery_campaigns(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        referrals_count INTEGER NOT NULL,
        tickets_earned INTEGER NOT NULL,
        entry_date TIMESTAMP DEFAULT NOW(),
        is_winner BOOLEAN DEFAULT false,
        UNIQUE(campaign_id, user_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lottery_entries_campaign ON lottery_entries(campaign_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_lottery_entries_tickets ON lottery_entries(tickets_earned DESC);`);

    // UPGRADE 3: Guaranteed Boosts with Money-Back ($8-20K/month)
    await client.query(`
      CREATE TABLE IF NOT EXISTS guaranteed_boosts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        package_type VARCHAR(50) NOT NULL CHECK (package_type IN ('basic_10', 'premium_25', 'ultimate_50')),
        guaranteed_views INTEGER NOT NULL,
        actual_views INTEGER DEFAULT 0,
        price_usd DECIMAL(10,2) NOT NULL,
        payment_intent_id VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'refunded', 'failed')),
        boost_start TIMESTAMP DEFAULT NOW(),
        boost_end TIMESTAMP NOT NULL,
        guarantee_met BOOLEAN DEFAULT false,
        refund_issued BOOLEAN DEFAULT false,
        refund_amount_usd DECIMAL(10,2),
        refunded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS boost_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        boost_id UUID NOT NULL REFERENCES guaranteed_boosts(id) ON DELETE CASCADE,
        viewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        viewed_at TIMESTAMP DEFAULT NOW(),
        viewer_location VARCHAR(255),
        viewer_age INTEGER,
        interaction_type VARCHAR(20) CHECK (interaction_type IN ('view', 'like', 'message', 'match'))
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guaranteed_boosts_user ON guaranteed_boosts(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guaranteed_boosts_status ON guaranteed_boosts(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_boost_analytics_boost ON boost_analytics(boost_id);`);

    // UPGRADE 4: Revenue-Share NFTs ($100K-500K instant)
    await client.query(`
      CREATE TABLE IF NOT EXISTS revenue_share_nfts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_id INTEGER UNIQUE NOT NULL,
        contract_address VARCHAR(255) NOT NULL,
        chain VARCHAR(50) NOT NULL CHECK (chain IN ('ethereum', 'polygon', 'arbitrum')),
        owner_wallet VARCHAR(255),
        revenue_share_percentage DECIMAL(5,4) NOT NULL,
        mint_price_usd DECIMAL(10,2) NOT NULL,
        mint_price_native DECIMAL(30,10),
        minted_at TIMESTAMP DEFAULT NOW(),
        total_earnings_usd DECIMAL(12,2) DEFAULT 0,
        last_payout_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB DEFAULT '{}'
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS nft_revenue_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nft_id UUID NOT NULL REFERENCES revenue_share_nfts(id) ON DELETE CASCADE,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        total_revenue_usd DECIMAL(12,2) NOT NULL,
        nft_share_usd DECIMAL(10,4) NOT NULL,
        payout_tx_hash VARCHAR(255),
        payout_status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_revenue_nfts_token ON revenue_share_nfts(token_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_revenue_nfts_owner ON revenue_share_nfts(owner_wallet);`);

    // UPGRADE 5: Viral Content Engine ($10-30K/month)
    await client.query(`
      CREATE TABLE IF NOT EXISTS viral_content_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL CHECK (platform IN ('tiktok', 'instagram_reels', 'youtube_shorts', 'twitter')),
        content_type VARCHAR(50) NOT NULL,
        target_impressions INTEGER DEFAULT 100000,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
        total_posts_created INTEGER DEFAULT 0,
        total_impressions BIGINT DEFAULT 0,
        total_clicks INTEGER DEFAULT 0,
        total_signups INTEGER DEFAULT 0,
        revenue_generated_usd DECIMAL(12,2) DEFAULT 0,
        roi_percentage DECIMAL(8,2),
        created_at TIMESTAMP DEFAULT NOW(),
        last_post_at TIMESTAMP
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS viral_content_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES viral_content_campaigns(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        post_text TEXT,
        post_url TEXT,
        platform_post_id VARCHAR(255),
        posted_at TIMESTAMP DEFAULT NOW(),
        impressions INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        signups_attributed INTEGER DEFAULT 0,
        revenue_attributed_usd DECIMAL(10,2) DEFAULT 0,
        engagement_rate DECIMAL(5,2),
        ctr DECIMAL(5,2),
        last_synced_at TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_viral_campaigns_platform ON viral_content_campaigns(platform);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_viral_posts_campaign ON viral_content_posts(campaign_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_viral_posts_performance ON viral_content_posts(engagement_rate DESC, ctr DESC);`);

    client.release();
    logger.info('💰 Database initialized with EPIC revenue upgrades! Ready to print money! 💸');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
};

export default pool;
