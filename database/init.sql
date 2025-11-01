-- YouAndINotAI Production Database Schema
-- NO PLACEHOLDERS - Production Ready

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    age INTEGER CHECK (age >= 18),
    bio TEXT,
    location VARCHAR(255),
    profile_photo VARCHAR(500),
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_expires TIMESTAMP,
    verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    is_admin BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Profiles table (extended user information)
CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    gender VARCHAR(50),
    looking_for VARCHAR(50),
    interests TEXT[],
    height INTEGER,
    education VARCHAR(255),
    occupation VARCHAR(255),
    smoking VARCHAR(50),
    drinking VARCHAR(50),
    religion VARCHAR(100),
    languages TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User profiles (matches backend expectations)
CREATE TABLE IF NOT EXISTS user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(50),
    looking_for VARCHAR(50),
    bio TEXT,
    location VARCHAR(255),
    interests TEXT[],
    photos TEXT[],
    height INTEGER,
    education VARCHAR(255),
    occupation VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User trust scores (reputation system)
CREATE TABLE IF NOT EXISTS user_trust_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    score DECIMAL(5,2) DEFAULT 50.00 CHECK (score >= 0 AND score <= 100),
    verified_human BOOLEAN DEFAULT false,
    verification_method VARCHAR(50),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- User rewards (gamification)
CREATE TABLE IF NOT EXISTS user_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    gems_balance INTEGER DEFAULT 0,
    total_gems_earned INTEGER DEFAULT 0,
    total_gems_spent INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_activity DATE,
    achievements JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    matched_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    compatibility_score INTEGER CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    status VARCHAR(50) DEFAULT 'pending',
    matched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, matched_user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    transaction_id VARCHAR(255) UNIQUE,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    liked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, liked_user_id)
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id)
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_matches_user ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_matched_user ON matches(matched_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type);

-- Insert demo data for testing  
INSERT INTO users (email, password_hash, name, age, bio, subscription_plan, is_admin) VALUES
('admin@youandinotai.com', '$2a$10$rOiDjiwqs0EmHQhWgeL.yO7qwEjxHqfPp6FvKJMfKVQJ4wGQlJQO.', 'Admin User', 30, 'Platform Administrator', 'vip', true),
('demo@youandinotai.com', '$2a$10$rOiDjiwqs0EmHQhWgeL.yO7qwEjxHqfPp6FvKJMfKVQJ4wGQlJQO.', 'Demo User', 28, 'Just testing the platform!', 'premium', false),
('user1@example.com', '$2a$10$rOiDjiwqs0EmHQhWgeL.yO7qwEjxHqfPp6FvKJMfKVQJ4wGQlJQO.', 'Sarah Johnson', 26, 'Love hiking and coffee ☕', 'basic', false),
('user2@example.com', '$2a$10$rOiDjiwqs0EmHQhWgeL.yO7qwEjxHqfPp6FvKJMfKVQJ4wGQlJQO.', 'Mike Chen', 32, 'Software engineer, foodie 🍕', 'vip', false)
ON CONFLICT (email) DO NOTHING;

-- Insert demo user profiles
INSERT INTO user_profiles (user_id, first_name, last_name, date_of_birth, gender, looking_for) VALUES
(1, 'Admin', 'User', '1995-01-01', 'other', 'all'),
(2, 'Demo', 'User', '1997-05-15', 'male', 'female'),
(3, 'Sarah', 'Johnson', '1999-03-20', 'female', 'male'),
(4, 'Mike', 'Chen', '1993-08-10', 'male', 'female')
ON CONFLICT (user_id) DO NOTHING;

-- Insert demo trust scores
INSERT INTO user_trust_scores (user_id, score, verified_human) VALUES
(1, 100.00, true),
(2, 75.00, true),
(3, 80.00, true),
(4, 90.00, true)
ON CONFLICT (user_id) DO NOTHING;

-- Insert demo rewards
INSERT INTO user_rewards (user_id, gems_balance, total_gems_earned) VALUES
(1, 1000, 1000),
(2, 50, 100),
(3, 25, 75),
(4, 100, 150)
ON CONFLICT (user_id) DO NOTHING;

-- Insert demo payment data
INSERT INTO payments (user_id, amount, plan, transaction_id, status) VALUES
(1, 29.99, 'vip', 'txn_admin_001', 'completed'),
(2, 19.99, 'premium', 'txn_demo_001', 'completed'),
(3, 9.99, 'basic', 'txn_demo_002', 'completed'),
(4, 29.99, 'vip', 'txn_demo_003', 'completed')
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_rewards_updated_at BEFORE UPDATE ON user_rewards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
