-- OAuth Tables for Anthropic API Integration
-- ============================================================================

-- OAuth States Table
-- Stores temporary OAuth state for PKCE flow
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    state VARCHAR(255) NOT NULL,
    code_verifier VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- OAuth Tokens Table
-- Stores OAuth access tokens and refresh tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'anthropic',
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP NOT NULL,
    scope TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_user ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- Add trigger for updated_at on oauth_tokens
CREATE TRIGGER update_oauth_tokens_updated_at
    BEFORE UPDATE ON oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for Documentation
COMMENT ON TABLE oauth_states IS 'Temporary storage for OAuth PKCE flow state and code verifier';
COMMENT ON TABLE oauth_tokens IS 'Stores OAuth access and refresh tokens for external API integrations';
COMMENT ON COLUMN oauth_states.code_verifier IS 'PKCE code verifier for secure OAuth flow';
COMMENT ON COLUMN oauth_states.state IS 'CSRF protection state parameter';
COMMENT ON COLUMN oauth_tokens.access_token IS 'OAuth access token for API authentication';
COMMENT ON COLUMN oauth_tokens.refresh_token IS 'OAuth refresh token for obtaining new access tokens';
COMMENT ON COLUMN oauth_tokens.scope IS 'Granted OAuth scopes';
