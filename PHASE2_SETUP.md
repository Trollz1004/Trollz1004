# Phase 2 Installation & Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd date-app-dashboard/backend
npm install
```

This will install the new `@sendgrid/mail` package along with all existing dependencies.

### 2. Configure Environment Variables

Add these to your `.env` file (copy from `.env.example`):

```bash
# SendGrid Configuration (REQUIRED)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_WEBHOOK_PUBLIC_KEY=your_webhook_verification_key_here
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Trollz1004

# Email Queue Settings (Optional - defaults shown)
EMAIL_BATCH_SIZE=100
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=5000
MAX_EMAILS_PER_USER_PER_DAY=5

# Feature Flags (Optional - defaults to true)
ENABLE_WELCOME_SEQUENCE=true
ENABLE_MATCH_NOTIFICATIONS=true
ENABLE_MESSAGE_ALERTS=true
```

### 3. Database Migration

The email tables will be created automatically when you run the application, as they're included in `database.ts`. However, to ensure they're created:

```bash
npm start
```

The application will initialize the following tables:
- `email_templates`
- `email_queue`
- `email_events`
- `email_preferences`

Plus 8 performance indexes.

### 4. SendGrid Setup (CRITICAL)

#### A. Create SendGrid Account
1. Go to https://sendgrid.com/free/
2. Sign up for free account (100 emails/day)
3. Verify your email address

#### B. Get API Key
1. Log into SendGrid dashboard
2. Navigate to: **Settings** → **API Keys**
3. Click **Create API Key**
4. Name: "Trollz1004 Backend"
5. Permissions: **Mail Send** (Full Access)
6. Copy the key (you'll only see it once!)
7. Paste into `.env` as `SENDGRID_API_KEY`

#### C. Verify Sender Email
1. In SendGrid dashboard: **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in your details (use a real email you control)
4. Verify the email SendGrid sends you
5. Use this verified email as `FROM_EMAIL` in `.env`

#### D. Configure Event Webhook (for analytics)
1. Navigate to: **Settings** → **Mail Settings** → **Event Webhook**
2. Enable the Event Webhook
3. Set HTTP POST URL: `https://your-domain.com/api/webhooks/sendgrid`
   - For local testing: Use ngrok or similar tunnel
4. Select these events:
   - ✅ Opened
   - ✅ Clicked
   - ✅ Bounced
   - ✅ Spam Report
   - ✅ Unsubscribe
5. Enable **Signature Verification**
6. Copy the verification key to `.env` as `SENDGRID_WEBHOOK_PUBLIC_KEY`

### 5. Create Email Templates

You need to create initial email templates in the database. Here's a quick script to create a test template:

```typescript
// Run this in your database client or create a seed script
INSERT INTO email_templates (id, name, subject, html_body, text_body, variables) VALUES
(
  gen_random_uuid(),
  'welcome_1',
  'Welcome to Trollz1004, {{userName}}!',
  '<html><body><h1>Welcome {{userName}}!</h1><p>Thanks for joining Trollz1004. Click <a href="{{verificationLink}}">here</a> to verify your email.</p></body></html>',
  'Welcome {{userName}}! Thanks for joining Trollz1004. Verify your email: {{verificationLink}}',
  '["userName", "verificationLink"]'::jsonb
);
```

**TODO**: Create production-quality HTML templates for:
- `welcome_1` through `welcome_5` (welcome sequence)
- `match_notification`
- `message_alert`
- `subscription_confirmation`
- `subscription_expiring`
- `referral_reward_confirmation`
- `reengagement_day7`, `reengagement_day14`, `reengagement_day30`

### 6. Test Email Sending

#### Option A: Direct API Test
```bash
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": "your-test-user-id",
    "templateName": "welcome_1",
    "variables": {
      "userName": "Test User",
      "verificationLink": "https://example.com/verify"
    }
  }'
```

#### Option B: Trigger via Signup
1. Create a test account via `/api/auth/signup`
2. Check the `email_queue` table for queued welcome email
3. Wait 5 minutes for cron job to process, or trigger manually

#### Option C: Test Queue Processing
```typescript
// In a test file or console
import { processQueue } from './automations/email/emailQueueService';
await processQueue();
```

### 7. Verify Automation Worker

The automation worker should be running the email cron jobs:

```
✅ Process Email Queue - Every 5 minutes
✅ Retry Failed Emails - Every 6 hours  
✅ Subscription Expiring Reminders - Daily at 9 AM
✅ Re-engagement Emails - Daily at 2 PM
✅ Cleanup Old Queue - Sunday at 4 AM
```

Check logs for:
```
[AUTOMATION] Email queue processing started...
[AUTOMATION] Batch processed X emails
```

## 🧪 Testing Checklist

### Manual Tests

- [ ] **Signup Flow**: Create account → Check for welcome email in queue
- [ ] **Subscription Purchase**: Buy premium → Check for confirmation email
- [ ] **Referral Reward**: Complete referral → Check for reward notification
- [ ] **Email Preferences**: Update preferences → Verify respected
- [ ] **Unsubscribe**: Click unsubscribe link → Verify no more emails
- [ ] **Queue Processing**: Add to queue → Wait 5 min → Check sent status
- [ ] **Webhook**: Open email in SendGrid → Check `email_events` table
- [ ] **Analytics**: Check `/api/email/analytics` for metrics

### Database Verification

```sql
-- Check templates exist
SELECT COUNT(*) FROM email_templates;

-- Check queue is processing
SELECT status, COUNT(*) FROM email_queue GROUP BY status;

-- Check events are being tracked
SELECT event_type, COUNT(*) FROM email_events GROUP BY event_type;

-- Check user preferences
SELECT * FROM email_preferences LIMIT 10;
```

## 🔧 Troubleshooting

### "SENDGRID_API_KEY is not set"
- Make sure `.env` file exists in `backend/` directory
- Verify `SENDGRID_API_KEY` is in `.env`
- Restart the server after adding it

### "Failed to send email: 403 Forbidden"
- Your SendGrid API key doesn't have "Mail Send" permission
- Create a new API key with proper permissions

### "Failed to send email: 400 Bad Request"
- `FROM_EMAIL` is not verified in SendGrid
- Complete "Verify a Single Sender" process

### Emails stuck in "pending" status
- Cron job not running (check automation worker logs)
- Manually trigger: `await processQueue()` in console
- Check for errors in `email_queue.error_message`

### Webhook events not appearing
- Webhook URL not publicly accessible
- Signature verification failing (check `SENDGRID_WEBHOOK_PUBLIC_KEY`)
- Events not enabled in SendGrid settings

### User not receiving emails
- Check `email_preferences` - they may have opted out
- Check `email_events` for bounces
- Verify their email address is valid
- Check SendGrid dashboard for delivery status

## 📊 Monitoring

### Key Metrics to Watch

1. **Queue Health**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     AVG(attempts) as avg_attempts
   FROM email_queue
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY status;
   ```

2. **Delivery Rate**
   ```sql
   SELECT 
     COUNT(*) as sent,
     COUNT(DISTINCT CASE WHEN event_type = 'bounce' THEN queue_id END) as bounced,
     ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'bounce' THEN queue_id END) / COUNT(*), 2) as bounce_rate
   FROM email_queue
   LEFT JOIN email_events ON email_queue.id = email_events.queue_id
   WHERE email_queue.status = 'sent'
     AND email_queue.sent_at > NOW() - INTERVAL '7 days';
   ```

3. **Engagement Rate**
   ```sql
   SELECT 
     COUNT(DISTINCT queue_id) as sent,
     COUNT(DISTINCT CASE WHEN event_type = 'open' THEN queue_id END) as opens,
     COUNT(DISTINCT CASE WHEN event_type = 'click' THEN queue_id END) as clicks,
     ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'open' THEN queue_id END) / COUNT(DISTINCT queue_id), 2) as open_rate,
     ROUND(100.0 * COUNT(DISTINCT CASE WHEN event_type = 'click' THEN queue_id END) / COUNT(DISTINCT queue_id), 2) as click_rate
   FROM email_queue
   LEFT JOIN email_events ON email_queue.id = email_events.queue_id
   WHERE status = 'sent'
     AND sent_at > NOW() - INTERVAL '7 days';
   ```

## 🎯 Next Steps

### Immediate (Before Production)
1. ✅ Install dependencies (`npm install`)
2. ✅ Configure SendGrid API key
3. ✅ Verify sender email
4. 🔲 Create production HTML email templates
5. 🔲 Seed templates into database
6. 🔲 Test full email flow end-to-end
7. 🔲 Set up webhook endpoint (ngrok for dev, real domain for prod)
8. 🔲 Test webhook event processing

### Short Term
- Create responsive HTML email templates
- Build template seeding script
- Add email preview endpoint
- Create admin email dashboard
- Set up monitoring/alerts for failed emails

### Long Term
- A/B testing framework
- Advanced user segmentation
- Drip campaign builder
- Email scheduling optimization
- Multi-language support

## 📚 Additional Resources

- **SendGrid Docs**: https://docs.sendgrid.com/
- **SendGrid API Reference**: https://docs.sendgrid.com/api-reference/
- **Email Best Practices**: https://sendgrid.com/resource/email-best-practices/
- **CAN-SPAM Compliance**: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business

---

**Status**: Phase 2 core implementation COMPLETE ✅  
**Ready for**: Template creation, testing, deployment

For questions or issues, refer to `PHASE2_EMAIL_AUTOMATION.md` for detailed documentation.
