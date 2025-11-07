import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import {
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  getStoredTokens,
  revokeTokens,
  refreshAccessToken,
  isTokenExpired,
} from '../services/anthropicOAuthService';
import logger from '../logger';

export const anthropicOAuthRouter = Router();

/**
 * GET /api/oauth/anthropic/authorize
 * Generates and returns the Anthropic OAuth authorization URL
 */
anthropicOAuthRouter.get('/authorize', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const authUrl = await generateAuthorizationUrl(req.userId);

    logger.info('Generated Anthropic OAuth authorization URL', { userId: req.userId });

    res.json({
      authorizationUrl: authUrl,
      message: 'Visit this URL to authorize access to Anthropic API',
    });
  } catch (error: any) {
    logger.error('Failed to generate Anthropic OAuth URL', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to generate authorization URL',
      error: error.message,
    });
  }
});

/**
 * GET /api/oauth/anthropic/callback
 * Handles the OAuth callback from Anthropic
 */
anthropicOAuthRouter.get('/callback', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { code, state, error, error_description } = req.query as {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  };

  // Handle authorization errors
  if (error) {
    logger.error('OAuth authorization error', {
      userId: req.userId,
      error,
      description: error_description,
    });

    return res.status(400).json({
      message: 'Authorization failed',
      error: error,
      description: error_description,
    });
  }

  // Validate required parameters
  if (!code || !state) {
    return res.status(400).json({
      message: 'Missing required parameters (code or state)',
    });
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(req.userId, code, state);

    logger.info('Successfully completed Anthropic OAuth flow', { userId: req.userId });

    res.json({
      message: 'Successfully authorized Anthropic API access',
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      hasRefreshToken: !!tokens.refreshToken,
    });
  } catch (error: any) {
    logger.error('OAuth callback failed', {
      userId: req.userId,
      error: error.message,
    });

    res.status(400).json({
      message: 'Failed to complete authorization',
      error: error.message,
    });
  }
});

/**
 * GET /api/oauth/anthropic/status
 * Returns the current OAuth token status for the authenticated user
 */
anthropicOAuthRouter.get('/status', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const tokens = await getStoredTokens(req.userId);

    if (!tokens) {
      return res.json({
        authorized: false,
        message: 'No Anthropic OAuth tokens found',
      });
    }

    const expired = isTokenExpired(tokens.expiresAt);

    res.json({
      authorized: true,
      expiresAt: tokens.expiresAt,
      expired: expired,
      hasRefreshToken: !!tokens.refreshToken,
      scope: tokens.scope,
      message: expired
        ? 'Access token expired but can be refreshed'
        : 'Access token is valid',
    });
  } catch (error: any) {
    logger.error('Failed to get OAuth status', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to retrieve OAuth status',
      error: error.message,
    });
  }
});

/**
 * POST /api/oauth/anthropic/refresh
 * Manually refreshes the OAuth access token
 */
anthropicOAuthRouter.post('/refresh', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const tokens = await refreshAccessToken(req.userId);

    logger.info('Manually refreshed Anthropic OAuth token', { userId: req.userId });

    res.json({
      message: 'Successfully refreshed access token',
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
    });
  } catch (error: any) {
    logger.error('Failed to refresh OAuth token', {
      userId: req.userId,
      error: error.message,
    });

    res.status(400).json({
      message: 'Failed to refresh access token',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/oauth/anthropic/revoke
 * Revokes the OAuth tokens for the authenticated user
 */
anthropicOAuthRouter.delete('/revoke', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    await revokeTokens(req.userId);

    logger.info('Revoked Anthropic OAuth tokens', { userId: req.userId });

    res.json({
      message: 'Successfully revoked Anthropic OAuth authorization',
    });
  } catch (error: any) {
    logger.error('Failed to revoke OAuth tokens', {
      userId: req.userId,
      error: error.message,
    });

    res.status(500).json({
      message: 'Failed to revoke authorization',
      error: error.message,
    });
  }
});

export default anthropicOAuthRouter;
