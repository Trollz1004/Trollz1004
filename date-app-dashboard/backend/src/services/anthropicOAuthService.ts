import crypto from 'crypto';
import axios from 'axios';
import pool from '../database';
import config from '../config';
import logger from '../logger';

interface OAuthState {
  userId: string;
  codeVerifier: string;
  state: string;
  createdAt: Date;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string;
}

/**
 * Generates a cryptographically secure random string for PKCE
 */
function generateCodeVerifier(): string {
  return crypto
    .randomBytes(32)
    .toString('base64url');
}

/**
 * Generates the code challenge from the code verifier using SHA256
 */
function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Generates a random state string for CSRF protection
 */
function generateState(): string {
  return crypto
    .randomBytes(32)
    .toString('base64url');
}

/**
 * Stores OAuth state temporarily in database
 */
async function storeOAuthState(userId: string, state: string, codeVerifier: string): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await pool.query(
    `INSERT INTO oauth_states (user_id, state, code_verifier, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, provider) DO UPDATE SET
       state = $2,
       code_verifier = $3,
       expires_at = $4,
       created_at = NOW()`,
    [userId, state, codeVerifier, expiresAt]
  );
}

/**
 * Retrieves and validates OAuth state from database
 */
async function getOAuthState(userId: string, state: string): Promise<OAuthState | null> {
  const result = await pool.query(
    `SELECT user_id, state, code_verifier, created_at, expires_at
     FROM oauth_states
     WHERE user_id = $1 AND state = $2 AND expires_at > NOW()`,
    [userId, state]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    userId: row.user_id,
    codeVerifier: row.code_verifier,
    state: row.state,
    createdAt: row.created_at,
  };
}

/**
 * Deletes OAuth state after use
 */
async function deleteOAuthState(userId: string, state: string): Promise<void> {
  await pool.query(
    'DELETE FROM oauth_states WHERE user_id = $1 AND state = $2',
    [userId, state]
  );
}

/**
 * Stores OAuth tokens in database
 */
async function storeTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | undefined,
  expiresIn: number,
  scope: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await pool.query(
    `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at, scope)
     VALUES ($1, 'anthropic', $2, $3, $4, $5)
     ON CONFLICT (user_id, provider) DO UPDATE SET
       access_token = $2,
       refresh_token = COALESCE($3, oauth_tokens.refresh_token),
       expires_at = $4,
       scope = $5,
       updated_at = NOW()`,
    [userId, accessToken, refreshToken, expiresAt, scope]
  );

  logger.info('Anthropic OAuth tokens stored', { userId, scope });
}

/**
 * Retrieves stored OAuth tokens for a user
 */
export async function getStoredTokens(userId: string): Promise<StoredToken | null> {
  const result = await pool.query(
    `SELECT access_token, refresh_token, expires_at, scope
     FROM oauth_tokens
     WHERE user_id = $1 AND provider = 'anthropic'`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    expiresAt: row.expires_at,
    scope: row.scope,
  };
}

/**
 * Checks if the access token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() >= new Date(expiresAt);
}

/**
 * Generates the authorization URL for Anthropic OAuth
 */
export async function generateAuthorizationUrl(userId: string): Promise<string> {
  if (!config.anthropic.clientId || !config.anthropic.redirectUri) {
    throw new Error('Anthropic OAuth is not configured');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  await storeOAuthState(userId, state, codeVerifier);

  const params = new URLSearchParams({
    client_id: config.anthropic.clientId,
    response_type: 'code',
    redirect_uri: config.anthropic.redirectUri,
    scope: 'org:create_api_key user:profile user:inference',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  });

  const authUrl = `${config.anthropic.authUrl}?${params.toString()}`;

  logger.info('Generated Anthropic OAuth URL', { userId });
  return authUrl;
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForTokens(
  userId: string,
  code: string,
  state: string
): Promise<StoredToken> {
  if (!config.anthropic.clientId || !config.anthropic.clientSecret || !config.anthropic.redirectUri) {
    throw new Error('Anthropic OAuth is not configured');
  }

  // Validate state
  const oauthState = await getOAuthState(userId, state);
  if (!oauthState) {
    throw new Error('Invalid or expired OAuth state');
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post<TokenResponse>(
      config.anthropic.tokenUrl,
      {
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: config.anthropic.redirectUri,
        client_id: config.anthropic.clientId,
        client_secret: config.anthropic.clientSecret,
        code_verifier: oauthState.codeVerifier,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;

    // Store tokens
    await storeTokens(userId, access_token, refresh_token, expires_in, scope);

    // Clean up state
    await deleteOAuthState(userId, state);

    logger.info('Successfully exchanged OAuth code for tokens', { userId });

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      scope: scope,
    };
  } catch (error: any) {
    logger.error('Failed to exchange OAuth code', {
      userId,
      error: error.message,
      response: error.response?.data,
    });
    throw new Error('Failed to exchange authorization code for tokens');
  }
}

/**
 * Refreshes an expired access token
 */
export async function refreshAccessToken(userId: string): Promise<StoredToken> {
  if (!config.anthropic.clientId || !config.anthropic.clientSecret) {
    throw new Error('Anthropic OAuth is not configured');
  }

  const tokens = await getStoredTokens(userId);
  if (!tokens || !tokens.refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    const tokenResponse = await axios.post<TokenResponse>(
      config.anthropic.tokenUrl,
      {
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: config.anthropic.clientId,
        client_secret: config.anthropic.clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;

    // Store new tokens
    await storeTokens(userId, access_token, refresh_token, expires_in, scope);

    logger.info('Successfully refreshed OAuth token', { userId });

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      scope: scope,
    };
  } catch (error: any) {
    logger.error('Failed to refresh OAuth token', {
      userId,
      error: error.message,
      response: error.response?.data,
    });
    throw new Error('Failed to refresh access token');
  }
}

/**
 * Gets a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const tokens = await getStoredTokens(userId);

  if (!tokens) {
    throw new Error('No OAuth tokens found. User needs to authorize first.');
  }

  if (isTokenExpired(tokens.expiresAt)) {
    logger.info('Access token expired, refreshing', { userId });
    const refreshedTokens = await refreshAccessToken(userId);
    return refreshedTokens.accessToken;
  }

  return tokens.accessToken;
}

/**
 * Revokes OAuth tokens for a user
 */
export async function revokeTokens(userId: string): Promise<void> {
  await pool.query(
    'DELETE FROM oauth_tokens WHERE user_id = $1 AND provider = $\'anthropic\'',
    [userId]
  );

  logger.info('Revoked Anthropic OAuth tokens', { userId });
}
