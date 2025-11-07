# Anthropic OAuth Integration Guide

This guide explains how to set up and use the Anthropic OAuth integration in your dating platform to access Claude AI capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Setup Instructions](#setup-instructions)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Security Considerations](#security-considerations)
8. [Troubleshooting](#troubleshooting)

## Overview

The Anthropic OAuth integration enables your application to:
- Authenticate users with Anthropic's API using OAuth 2.0 with PKCE
- Generate AI-powered content using Claude
- Provide personalized AI assistance to your users
- Create intelligent matching suggestions

### Features

- **OAuth 2.0 with PKCE**: Secure authorization flow
- **Automatic Token Refresh**: Handles expired tokens automatically
- **Database Storage**: Securely stores tokens in PostgreSQL
- **Ready-to-Use API Client**: Easy-to-use service for Claude AI interactions

## Setup Instructions

### 1. Register Your Application

1. Go to [Anthropic Console](https://console.anthropic.com/settings/oauth)
2. Create a new OAuth application
3. Note down your `Client ID` and `Client Secret`
4. Add redirect URI: `http://localhost:4000/api/oauth/anthropic/callback` (development) or `https://yourdomain.com/api/oauth/anthropic/callback` (production)

### 2. Database Setup

Run the OAuth database migration:

```bash
psql -U postgres -d youandinotai_dev -f database/migrations/002_oauth_tables.sql
```

This creates two tables:
- `oauth_states`: Temporary storage for OAuth PKCE flow
- `oauth_tokens`: Persistent storage for access/refresh tokens

### 3. Configuration

Update your `.env` file with Anthropic OAuth credentials:

```env
# Anthropic OAuth Configuration
ANTHROPIC_CLIENT_ID=your_client_id_here
ANTHROPIC_CLIENT_SECRET=your_client_secret_here
ANTHROPIC_REDIRECT_URI=http://localhost:4000/api/oauth/anthropic/callback
ANTHROPIC_AUTH_URL=https://console.anthropic.com/oauth/authorize
ANTHROPIC_TOKEN_URL=https://console.anthropic.com/oauth/token
ANTHROPIC_API_URL=https://api.anthropic.com
```

### 4. Start the Server

```bash
cd date-app-dashboard/backend
npm install
npm run start
```

## API Endpoints

### 1. Get Authorization URL

**GET** `/api/oauth/anthropic/authorize`

Generates the OAuth authorization URL that users should visit to grant access.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "authorizationUrl": "https://console.anthropic.com/oauth/authorize?...",
  "message": "Visit this URL to authorize access to Anthropic API"
}
```

### 2. OAuth Callback

**GET** `/api/oauth/anthropic/callback?code=...&state=...`

Handles the OAuth callback and exchanges the authorization code for tokens.

**Query Parameters:**
- `code`: Authorization code from Anthropic
- `state`: CSRF protection state

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "message": "Successfully authorized Anthropic API access",
  "expiresAt": "2025-11-08T10:30:00Z",
  "scope": "org:create_api_key user:profile user:inference",
  "hasRefreshToken": true
}
```

### 3. Check OAuth Status

**GET** `/api/oauth/anthropic/status`

Returns the current OAuth authorization status for the authenticated user.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "authorized": true,
  "expiresAt": "2025-11-08T10:30:00Z",
  "expired": false,
  "hasRefreshToken": true,
  "scope": "org:create_api_key user:profile user:inference",
  "message": "Access token is valid"
}
```

### 4. Refresh Token

**POST** `/api/oauth/anthropic/refresh`

Manually refreshes the OAuth access token.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "message": "Successfully refreshed access token",
  "expiresAt": "2025-11-08T11:30:00Z",
  "scope": "org:create_api_key user:profile user:inference"
}
```

### 5. Revoke Authorization

**DELETE** `/api/oauth/anthropic/revoke`

Revokes the OAuth tokens for the authenticated user.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "message": "Successfully revoked Anthropic OAuth authorization"
}
```

## Usage Examples

### Complete OAuth Flow (Kali Linux / cURL)

```bash
# Step 1: Login to get JWT token
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your_password"}' \
  | jq -r '.token')

# Step 2: Get authorization URL
AUTH_URL=$(curl -s -X GET http://localhost:4000/api/oauth/anthropic/authorize \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.authorizationUrl')

echo "Visit this URL: $AUTH_URL"

# Step 3: After visiting the URL and authorizing, you'll be redirected to the callback
# The callback will automatically handle the token exchange

# Step 4: Check OAuth status
curl -X GET http://localhost:4000/api/oauth/anthropic/status \
  -H "Authorization: Bearer $TOKEN"
```

### Using the Anthropic API Client in Code

```typescript
import { createAnthropicClient, generateTextForUser } from './services/anthropicApiClient';

// Method 1: Use the client directly
async function generateProfileBio(userId: string, userInfo: any) {
  const client = createAnthropicClient(userId);

  const response = await client.generateText(
    `Create an engaging dating profile bio for a person who likes ${userInfo.interests}.`,
    {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 200,
      temperature: 0.7
    }
  );

  return response;
}

// Method 2: Use the helper function
async function getMatchingSuggestions(userId: string, profile: any) {
  const prompt = `Based on this profile: ${JSON.stringify(profile)}, suggest 3 conversation starters.`;

  const suggestions = await generateTextForUser(userId, prompt, {
    maxTokens: 150
  });

  return suggestions;
}

// Method 3: Chat with conversation history
import { chatWithClaude } from './services/anthropicApiClient';

async function haveChatConversation(userId: string) {
  const messages = [
    { role: 'user', content: 'What makes a great dating profile?' },
  ];

  const result = await chatWithClaude(userId, messages);

  console.log('Response:', result.response);
  console.log('Tokens used:', result.usage);
}
```

### Direct API Usage Example

```typescript
// In a route handler
import { createAnthropicClient } from '../services/anthropicApiClient';

app.post('/api/ai/generate-bio', requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const { interests, about } = req.body;

  try {
    const client = createAnthropicClient(req.userId);

    const bio = await client.generateText(
      `Create a fun, engaging dating profile bio for someone who likes: ${interests}. About them: ${about}`,
      { maxTokens: 200 }
    );

    res.json({ bio });
  } catch (error: any) {
    res.status(500).json({
      message: 'Failed to generate bio',
      error: error.message
    });
  }
});
```

## Security Considerations

### 1. Token Storage

- OAuth tokens are encrypted at rest in the PostgreSQL database
- Never expose tokens in logs or client responses
- Use HTTPS in production for all OAuth flows

### 2. PKCE (Proof Key for Code Exchange)

The implementation uses PKCE to protect against authorization code interception:

```typescript
// Code verifier is generated and stored securely
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

### 3. State Parameter

CSRF protection is enforced through the state parameter:

```typescript
const state = crypto.randomBytes(32).toString('base64url');
// State is validated during callback
```

### 4. Token Expiration

- Access tokens expire after the time specified by Anthropic (typically 1 hour)
- Tokens are automatically refreshed when expired
- Refresh tokens are stored securely and rotated

### 5. Best Practices

1. Always use environment variables for OAuth credentials
2. Never commit `.env` files to version control
3. Rotate OAuth secrets regularly (every 90 days)
4. Monitor OAuth usage and failed attempts
5. Implement rate limiting on OAuth endpoints
6. Use secure, unique state values for each authorization request

## Troubleshooting

### Error: "Anthropic OAuth is not configured"

**Cause:** Missing OAuth credentials in environment variables.

**Solution:**
```bash
# Check your .env file has these values
ANTHROPIC_CLIENT_ID=...
ANTHROPIC_CLIENT_SECRET=...
ANTHROPIC_REDIRECT_URI=...
```

### Error: "Invalid or expired OAuth state"

**Cause:** OAuth state expired (>10 minutes) or CSRF mismatch.

**Solution:**
- Start the OAuth flow again
- Ensure you're using the same browser/session
- Check that cookies are enabled

### Error: "No OAuth tokens found. User needs to authorize first."

**Cause:** User hasn't completed OAuth flow or tokens were revoked.

**Solution:**
```bash
# Get a new authorization URL
curl -X GET http://localhost:4000/api/oauth/anthropic/authorize \
  -H "Authorization: Bearer $TOKEN"
```

### Error: "Failed to refresh access token"

**Cause:** Refresh token expired or invalid.

**Solution:**
- Re-authorize the application
- Check that ANTHROPIC_CLIENT_SECRET is correct

### Database Connection Issues

```bash
# Verify the migration was applied
psql -U postgres -d youandinotai_dev -c "\dt oauth_*"

# Should show:
#  oauth_states
#  oauth_tokens
```

### Testing the OAuth Flow

```bash
# 1. Check health
curl http://localhost:4000/health

# 2. Get authorization URL (requires logged-in user)
curl -X GET http://localhost:4000/api/oauth/anthropic/authorize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 3. Check status
curl -X GET http://localhost:4000/api/oauth/anthropic/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Advanced Usage

### Custom Prompts for Dating Features

```typescript
// Generate icebreaker messages
async function generateIcebreaker(userId: string, matchProfile: any) {
  const client = createAnthropicClient(userId);

  const messages = [
    {
      role: 'user',
      content: `Generate a friendly, personalized icebreaker message for someone who likes ${matchProfile.interests}. Keep it casual and engaging.`
    }
  ];

  const result = await client.createCompletion(messages, {
    maxTokens: 100,
    temperature: 0.8
  });

  return result.content[0].text;
}

// Analyze compatibility
async function analyzeCompatibility(userId: string, profile1: any, profile2: any) {
  const prompt = `
    Analyze the compatibility between these two profiles:

    Profile 1: ${JSON.stringify(profile1)}
    Profile 2: ${JSON.stringify(profile2)}

    Provide a compatibility score (0-100) and 3 key reasons.
  `;

  const analysis = await generateTextForUser(userId, prompt, {
    maxTokens: 300
  });

  return analysis;
}
```

## Rate Limiting

The OAuth endpoints are protected by the global rate limiter (100 requests per 15 minutes). Consider implementing user-specific rate limits for AI generation:

```typescript
// Add to your route
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour per user
  keyGenerator: (req: AuthRequest) => req.userId || req.ip
});

app.post('/api/ai/generate', aiRateLimiter, requireAuth, async (req, res) => {
  // Your AI generation code
});
```

## Support

For issues related to:
- **OAuth Flow**: Check server logs in `date-app-dashboard/backend/logs/`
- **Token Issues**: Verify environment variables and database tables
- **API Errors**: Check Anthropic API status and your account limits

## References

- [Anthropic OAuth Documentation](https://docs.anthropic.com/oauth)
- [Anthropic API Documentation](https://docs.anthropic.com/api)
- [OAuth 2.0 RFC 6749](https://tools.ietf.org/html/rfc6749)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
