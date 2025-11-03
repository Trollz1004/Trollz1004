# Anti-AI Dating Platform - Complete API Documentation

**Base URL**: `https://api.antiaidating.com/api`  
**Version**: 1.0.0  
**Authentication**: JWT Bearer Token (24-hour expiry)

---

## Table of Contents
1. [Authentication](#authentication)
2. [Age Verification](#age-verification)
3. [Terms of Service](#terms-of-service)
4. [User Profiles](#user-profiles)
5. [Matching & Discovery](#matching--discovery)
6. [Chat & Messaging](#chat--messaging)
7. [Payments & Subscriptions](#payments--subscriptions)
8. [Admin Dashboard](#admin-dashboard)
9. [Error Codes](#error-codes)

---

## Authentication

### POST /auth/signup
Create a new user account with email verification.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Signup successful. Check your email for verification code.",
  "userId": "uuid-here",
  "verificationCodeSent": true
}
```

**Validation Rules:**
- Email: Valid RFC 5322 format, unique in database
- Password: Min 12 chars, 1 uppercase, 1 number, 1 special char
- Rate limit: 5 signups per IP per hour

---

### POST /auth/verify-email
Verify email with 6-digit code sent via email.

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified. Next: confirm your age.",
  "nextStep": "age_verification"
}
```

**Error:** `400 Bad Request` if code invalid or expired (15 min expiry)

---

### POST /auth/verify-age
Multi-layer age verification system.

**Step 1: Birthdate Submission**
```json
{
  "email": "user@example.com",
  "birthdate": "1995-06-15"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "ageVerified": false,
  "ageStatus": "birthdate_provided",
  "message": "Birthdate recorded. For additional security, please verify via phone.",
  "nextStep": "phone_verification"
}
```

**Step 2: Phone Verification** (SMS code)
```json
{
  "email": "user@example.com",
  "phone": "+1-415-555-0100",
  "phoneCode": "654321"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "ageVerified": true,
  "message": "Age verified. You can now create your profile."
}
```

**Age Requirement:** Calculated as `today - birthdate >= 18 years`  
**Storage:** Encrypted AES-256 (birthdate), hashed (phone number)

---

### POST /auth/verify-id (Optional - Enhanced Verification)
For users who opt into KYC/ID verification.

**Request:**
```json
{
  "email": "user@example.com",
  "idType": "drivers_license",
  "idFrontImageBase64": "data:image/jpeg;base64,...",
  "idBackImageBase64": "data:image/jpeg;base64,...",
  "userAgreesKYC": true
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "message": "ID submitted for verification. We'll confirm within 24 hours.",
  "verificationId": "verify-uuid-here",
  "status": "pending"
}
```

**Note:** Optional but increases trust score and unlocks premium features

---

### POST /auth/login
Authenticate and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "ageVerified": true,
    "tosAccepted": false,
    "profileComplete": false
  }
}
```

**Token Format:** JWT with HS256 signature, 24-hour expiry  
**Headers:** `Authorization: Bearer {token}`

---

### POST /auth/logout
Invalidate JWT token (server-side token blacklist).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### POST /auth/refresh-token
Refresh expiring JWT token (valid only if token > 1 hour remaining).

**Response:** `200 OK`
```json
{
  "success": true,
  "token": "new-jwt-token-here",
  "expiresIn": 86400
}
```

---

## Terms of Service

### GET /tos/current
Retrieve current Terms of Service version.

**Response:** `200 OK`
```json
{
  "version": "1.0.0",
  "effectiveDate": "2025-11-02",
  "content": "TERMS OF SERVICE\n\n1. Age Requirement...",
  "changesSummary": "Initial release"
}
```

---

### POST /tos/accept
Accept Terms of Service (creates immutable audit log).

**Request:**
```json
{
  "tosVersion": "1.0.0",
  "userAgreesFullTerms": true,
  "userAgreesPrivacyPolicy": true,
  "userAgreesLiabilityWaiver": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Terms accepted. You can now create your profile.",
  "acceptanceId": "acceptance-uuid-here",
  "acceptedAt": "2025-11-02T10:30:00Z",
  "acceptanceValidForDays": 365
}
```

**Database Entry (Immutable):**
```
user_tos_acceptance {
  id: UUID
  user_id: UUID
  tos_version: "1.0.0"
  accepted_at: TIMESTAMP
  ip_address: VARCHAR (audit trail)
  user_agent: VARCHAR (device info)
}
```

---

## User Profiles

### POST /profiles
Create user profile (requires age verified + TOS accepted).

**Request:**
```json
{
  "firstName": "Alex",
  "lastName": "Smith",
  "bio": "Adventure seeker, coffee enthusiast, real human",
  "birthdate": "1995-06-15",
  "gender": "male",
  "preferredGenders": ["female", "non-binary"],
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "city": "San Francisco",
    "state": "CA"
  },
  "photos": [
    {
      "url": "https://cdn.antiaidating.com/photos/uuid-1.jpg",
      "isPrimary": true,
      "order": 1
    }
  ],
  "interests": ["hiking", "coffee", "photography", "travel"],
  "lookingFor": "genuine connection"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "profile": {
    "id": "profile-uuid-here",
    "userId": "user-uuid-here",
    "completionPercent": 95,
    "profileScore": 8.5,
    "createdAt": "2025-11-02T10:35:00Z"
  }
}
```

**Validation:**
- Age: Must be 18+ (calculated from birthdate)
- Photo count: Min 1, max 6
- Bio length: 10-500 characters
- Location: Required (used for matching algorithm)

---

### GET /profiles/me
Retrieve current user's profile.

**Headers:** `Authorization: Bearer {token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "profile": {
    "id": "profile-uuid-here",
    "firstName": "Alex",
    "bio": "Adventure seeker...",
    "age": 29,
    "location": {
      "city": "San Francisco",
      "distance": "5.2 km from you"
    },
    "photos": [...],
    "interests": [...],
    "profileScore": 8.5,
    "matchCount": 42,
    "lastUpdated": "2025-11-01T15:20:00Z"
  }
}
```

---

### PUT /profiles/me
Update user profile.

**Request:** (any fields to update)
```json
{
  "bio": "Updated bio text",
  "interests": ["hiking", "travel", "photography"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {...}
}
```

---

### DELETE /profiles/me
Soft-delete profile (can be restored within 30 days).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Profile deleted. You can restore it within 30 days."
}
```

---

### GET /profiles/nearby?distance=5&limit=20
Find profiles near user location (PostGIS geospatial query).

**Query Parameters:**
- `distance`: Search radius in km (default: 5, max: 50)
- `limit`: Results per page (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `ageMin`: Minimum age filter (default: 18)
- `ageMax`: Maximum age filter (default: 99)
- `genders`: Filter by gender (comma-separated)

**Response:** `200 OK`
```json
{
  "success": true,
  "results": [
    {
      "id": "profile-uuid-1",
      "firstName": "Jordan",
      "age": 27,
      "distance": "2.3 km away",
      "photos": ["https://cdn.antiaidating.com/..."],
      "matchScore": 92,
      "lastActive": "5 minutes ago"
    }
  ],
  "total": 342,
  "offset": 0,
  "limit": 20
}
```

**Database Query:**
```sql
SELECT * FROM profiles 
WHERE ST_DWithin(location, $1, $2) 
  AND age BETWEEN $3 AND $4
  AND gender = ANY($5)
ORDER BY matchScore DESC
LIMIT $6 OFFSET $7;
```

---

## Matching & Discovery

### POST /matches/like
Like a profile (swipe right).

**Request:**
```json
{
  "targetProfileId": "profile-uuid-here"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Liked successfully",
  "isMatch": false,
  "matchId": null
}
```

**Or if mutual like (Match!):**
```json
{
  "success": true,
  "message": "It's a match!",
  "isMatch": true,
  "matchId": "match-uuid-here",
  "matchedAt": "2025-11-02T10:45:00Z"
}
```

---

### POST /matches/pass
Pass on a profile (swipe left).

**Request:**
```json
{
  "targetProfileId": "profile-uuid-here"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Passed"
}
```

---

### GET /matches
Get all user's matches.

**Query Parameters:**
- `status`: "active" | "archived" | "blocked" (default: "active")
- `sortBy`: "recent" | "score" (default: "recent")
- `limit`: 20 (default)

**Response:** `200 OK`
```json
{
  "success": true,
  "matches": [
    {
      "id": "match-uuid-here",
      "otherUser": {
        "id": "profile-uuid",
        "firstName": "Jordan",
        "age": 27,
        "photoUrl": "https://...",
        "matchScore": 92
      },
      "matchedAt": "2025-11-02T10:45:00Z",
      "lastMessageAt": "2025-11-02T14:20:00Z",
      "messageCount": 23,
      "status": "active"
    }
  ],
  "total": 15
}
```

---

### POST /matches/{matchId}/block
Block a user (no longer see them or their messages).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User blocked",
  "blockedAt": "2025-11-02T10:50:00Z"
}
```

---

### POST /matches/{matchId}/report
Report a user for inappropriate behavior.

**Request:**
```json
{
  "reason": "inappropriate_photos",
  "description": "Profile contains explicit content",
  "screenshots": ["data:image/jpeg;base64,..."]
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "reportId": "report-uuid-here",
  "message": "Report submitted. Our team will review within 24 hours."
}
```

---

## Chat & Messaging

### POST /messages/send
Send a message to a match (WebSocket for real-time, HTTP for historical).

**Request:**
```json
{
  "matchId": "match-uuid-here",
  "message": "Hey! How's your day going?",
  "attachmentUrls": []
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": {
    "id": "msg-uuid-here",
    "senderProfileId": "profile-uuid-here",
    "matchId": "match-uuid-here",
    "content": "Hey! How's your day going?",
    "sentAt": "2025-11-02T14:55:00Z",
    "readAt": null,
    "deliveryStatus": "sent"
  }
}
```

---

### GET /messages/{matchId}?limit=20&offset=0
Retrieve message history for a match.

**Response:** `200 OK`
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-uuid-1",
      "senderName": "You",
      "content": "Hey! How's your day going?",
      "sentAt": "2025-11-02T14:55:00Z",
      "readAt": "2025-11-02T15:00:00Z"
    },
    {
      "id": "msg-uuid-2",
      "senderName": "Jordan",
      "content": "Great! Just got back from the gym",
      "sentAt": "2025-11-02T15:05:00Z",
      "readAt": "2025-11-02T15:06:00Z"
    }
  ],
  "total": 142,
  "offset": 0,
  "limit": 20
}
```

---

### PUT /messages/{messageId}/read
Mark message as read (triggers read receipt).

**Response:** `200 OK`
```json
{
  "success": true,
  "readAt": "2025-11-02T15:06:00Z"
}
```

---

### WebSocket Connection
**URL:** `wss://ws.antiaidating.com/chat`  
**Auth:** Query parameter `?token={jwt_token}`

**Subscribe to Match:**
```json
{
  "action": "subscribe",
  "matchId": "match-uuid-here"
}
```

**Receive Real-Time Message:**
```json
{
  "type": "message",
  "message": {
    "id": "msg-uuid",
    "senderName": "Jordan",
    "content": "Hey!",
    "sentAt": "2025-11-02T15:10:00Z"
  }
}
```

---

## Payments & Subscriptions

### POST /payments/create-payment
Create one-time payment (e.g., profile boost, super likes).

**Request:**
```json
{
  "amount": 9.99,
  "currency": "USD",
  "description": "Profile Boost - 7 days",
  "itemType": "profile_boost"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "paymentId": "pay-uuid-here",
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "squarePaymentUrl": "https://square.link/pay/xxxxx",
  "status": "pending",
  "expiresAt": "2025-11-02T15:20:00Z"
}
```

---

### POST /payments/subscribe
Create recurring subscription (monthly premium).

**Request:**
```json
{
  "planId": "premium_monthly",
  "planName": "Premium Monthly",
  "amount": 9.99,
  "currency": "USD",
  "billingCycle": "MONTHLY",
  "autoRenew": true
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "subscriptionId": "sub-uuid-here",
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "squarePaymentUrl": "https://square.link/pay/xxxxx",
  "status": "pending",
  "currentPeriodEnd": "2025-12-02",
  "message": "Complete payment to activate subscription"
}
```

---

### GET /payments/subscriptions
Get user's active subscriptions.

**Response:** `200 OK`
```json
{
  "success": true,
  "subscriptions": [
    {
      "id": "sub-uuid-here",
      "planName": "Premium Monthly",
      "amount": 9.99,
      "status": "active",
      "currentPeriodStart": "2025-11-02",
      "currentPeriodEnd": "2025-12-02",
      "autoRenew": true,
      "cancelAt": null,
      "squareSubscriptionId": "SUBSCRIPTION_UUID"
    }
  ]
}
```

---

### POST /payments/subscriptions/{subscriptionId}/cancel
Cancel subscription (effective end of billing cycle).

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscription cancelled. Access valid until 2025-12-02",
  "cancelAt": "2025-12-02"
}
```

---

### POST /payments/webhook
Square payment webhook (server-to-server, auto-validates signature).

**Webhook Events:**
- `payment.created` - New payment initiated
- `payment.updated` - Payment status updated (completed, failed, etc.)
- `subscription.created` - New subscription
- `subscription.updated` - Subscription renewed or cancelled

**Webhook Payload:**
```json
{
  "type": "payment.updated",
  "data": {
    "object": {
      "id": "pay-uuid",
      "amount": 9.99,
      "status": "COMPLETED",
      "userId": "user-uuid",
      "timestamp": "2025-11-02T15:15:00Z"
    }
  }
}
```

**Square LIVE Mode Only:**
- Uses Production Square API key
- Real payment processing
- Requires HTTPS certificate
- PCI compliance via Square tokenization

---

## Admin Dashboard

### GET /admin/analytics
Get platform-wide analytics (admin only).

**Headers:** `Authorization: Bearer {admin_token}`

**Response:** `200 OK`
```json
{
  "success": true,
  "analytics": {
    "totalUsers": 18542,
    "ageVerifiedUsers": 18234,
    "activeProfiles": 16890,
    "dailyActiveUsers": 3420,
    "totalMatches": 142567,
    "totalMessages": 8954321,
    "averageSessionDuration": 23.4,
    "revenue": {
      "todayRevenue": 1240.50,
      "monthRevenue": 34560.75,
      "yearRevenue": 267890.25
    },
    "paymentMethods": {
      "credit_card": 65,
      "debit_card": 25,
      "digital_wallet": 10
    }
  }
}
```

---

### GET /admin/users
List and filter users (admin only).

**Query Parameters:**
- `status`: "active" | "suspended" | "deleted"
- `ageVerified`: true | false
- `tosAccepted`: true | false
- `limit`: 50 (default)

**Response:** `200 OK`
```json
{
  "success": true,
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "status": "active",
      "ageVerified": true,
      "tosAccepted": true,
      "createdAt": "2025-11-01T10:00:00Z",
      "lastLogin": "2025-11-02T14:30:00Z"
    }
  ],
  "total": 18542
}
```

---

### POST /admin/users/{userId}/suspend
Suspend user account (manual moderation).

**Request:**
```json
{
  "reason": "multiple_reports",
  "duration": 7,
  "durationUnit": "days"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User suspended for 7 days",
  "suspendedAt": "2025-11-02T15:20:00Z",
  "unsuspendAt": "2025-11-09T15:20:00Z"
}
```

---

### GET /admin/reports
View user reports (flagged behavior).

**Response:** `200 OK`
```json
{
  "success": true,
  "reports": [
    {
      "id": "report-uuid",
      "reportedUser": {
        "id": "user-uuid",
        "name": "Jordan"
      },
      "reason": "inappropriate_photos",
      "description": "Profile contains explicit content",
      "reportedAt": "2025-11-02T14:50:00Z",
      "status": "pending"
    }
  ],
  "total": 23
}
```

---

## Error Codes

| Code | Status | Message | Solution |
|------|--------|---------|----------|
| 400 | Bad Request | Invalid email format | Check email RFC 5322 compliance |
| 400 | Bad Request | Password too weak | Min 12 chars, uppercase, number, special char |
| 401 | Unauthorized | Invalid or expired token | Refresh token or re-authenticate |
| 402 | Payment Required | Subscription expired | Renew subscription |
| 403 | Forbidden | Age not verified | Complete age verification |
| 403 | Forbidden | TOS not accepted | Accept Terms of Service |
| 404 | Not Found | Profile not found | Check profile ID |
| 409 | Conflict | Email already registered | Use different email or login |
| 429 | Too Many Requests | Rate limit exceeded | Wait before retrying (see Retry-After header) |
| 500 | Internal Server Error | Database error | Retry in 30 seconds or contact support |

---

## Rate Limiting

**Standard Endpoints:** 100 requests per minute per IP  
**Auth Endpoints:** 10 requests per minute per IP  
**Payment Endpoints:** 30 requests per minute per user  

**Headers in Response:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1635862800
Retry-After: 35
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/antiaidating
DATABASE_POOL_SIZE=20

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=24h

# Square (LIVE MODE ONLY)
SQUARE_ACCESS_TOKEN=sq_live_xxxxx
SQUARE_ENVIRONMENT=Production

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1415555XXXX

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx

# Redis
REDIS_URL=redis://localhost:6379

# Encryption
ENCRYPTION_KEY=your-aes-256-key-base64-encoded
```

---

**Last Updated:** November 2, 2025  
**API Version:** 1.0.0  
**Support:** api-support@antiaidating.com
