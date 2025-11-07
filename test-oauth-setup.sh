#!/bin/bash
# Test script for Anthropic OAuth integration

set -e  # Exit on error

echo "=========================================="
echo "Anthropic OAuth Setup and Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check PostgreSQL
echo -e "${YELLOW}Step 1: Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib
fi

# Start PostgreSQL if not running
if ! sudo service postgresql status &> /dev/null; then
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    sudo service postgresql start
fi

echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
echo ""

# Step 2: Create database
echo -e "${YELLOW}Step 2: Setting up database...${NC}"
sudo -u postgres psql -c "CREATE DATABASE youandinotai_dev;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" || true
echo -e "${GREEN}✓ Database configured${NC}"
echo ""

# Step 3: Run migrations
echo -e "${YELLOW}Step 3: Running database migrations...${NC}"

# First check if we need the base schema
echo "Checking for users table..."
TABLE_EXISTS=$(sudo -u postgres psql -d youandinotai_dev -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');" | xargs)

if [ "$TABLE_EXISTS" != "t" ]; then
    echo "Creating base schema..."
    sudo -u postgres psql -d youandinotai_dev <<EOF
-- Create users table (minimal for testing)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    age_verified BOOLEAN DEFAULT FALSE,
    tos_accepted_at TIMESTAMP,
    subscription_tier VARCHAR(50),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    last_login_user_agent TEXT,
    birthdate_encrypted TEXT,
    phone VARCHAR(20),
    phone_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create other necessary tables
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create tos_acceptance table
CREATE TABLE IF NOT EXISTS tos_acceptance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tos_version VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(255) NOT NULL,
    code_type VARCHAR(20) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, code_type)
);

-- Helper function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;
EOF
fi

# Run OAuth migration
echo "Running OAuth migration..."
sudo -u postgres psql -d youandinotai_dev -f /home/user/Trollz1004/database/migrations/002_oauth_tables.sql

echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 4: Check Node.js and dependencies
echo -e "${YELLOW}Step 4: Checking Node.js dependencies...${NC}"
cd /home/user/Trollz1004/date-app-dashboard/backend

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Step 5: Display configuration
echo -e "${YELLOW}Step 5: OAuth Configuration${NC}"
echo "----------------------------------------"
echo "Client ID: 9d1c250a-e61b-44d9-88ed-5944d1962f5e"
echo "Redirect URI: http://localhost:4000/api/oauth/anthropic/callback"
echo "----------------------------------------"
echo ""

# Step 6: Create test user
echo -e "${YELLOW}Step 6: Creating test user...${NC}"
TEST_USER_EMAIL="test@example.com"
# Hash for password "Test123456789" (bcrypt with 12 rounds)
TEST_USER_HASH='$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIYY3aYqeu'

sudo -u postgres psql -d youandinotai_dev <<EOF
INSERT INTO users (email, password_hash, email_verified, phone_verified, age_verified, tos_accepted_at)
VALUES ('${TEST_USER_EMAIL}', '${TEST_USER_HASH}', true, true, true, NOW())
ON CONFLICT (email) DO NOTHING;
EOF

echo -e "${GREEN}✓ Test user created${NC}"
echo "  Email: ${TEST_USER_EMAIL}"
echo "  Password: Test123456789"
echo ""

# Step 7: Instructions for testing
echo -e "${GREEN}=========================================="
echo "Setup Complete! Now you can test OAuth"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}To start the server:${NC}"
echo "  cd /home/user/Trollz1004/date-app-dashboard/backend"
echo "  npm run dev  (or: npm start)"
echo ""
echo -e "${YELLOW}To test the OAuth flow:${NC}"
echo ""
echo "1. Login and get JWT token:"
echo "   TOKEN=\$(curl -s -X POST http://localhost:4000/api/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test@example.com\",\"password\":\"Test123456789\"}' \\"
echo "     | jq -r '.token')"
echo ""
echo "2. Get authorization URL:"
echo "   curl -X GET http://localhost:4000/api/oauth/anthropic/authorize \\"
echo "     -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "3. Visit the URL in your browser and authorize"
echo ""
echo "4. Check OAuth status:"
echo "   curl -X GET http://localhost:4000/api/oauth/anthropic/status \\"
echo "     -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo -e "${YELLOW}Quick test (all in one):${NC}"
echo "   bash /home/user/Trollz1004/test-oauth-flow.sh"
echo ""
