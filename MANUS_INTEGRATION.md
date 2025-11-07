# Manus AI Task Automation Integration

Complete integration of Manus task automation into YouAndINotAI dating platform.

## Setup

### 1. Configure Webhook in Manus

Go to http://manus.im/app?show_settings=integrations&app_name=api

- **Webhook URL**: `https://youandinotai.com/api/webhooks/manus`
- **Events**: Enable both `task_created` and `task_stopped`

Manus will send a test request to verify your endpoint.

### 2. Add API Key to Environment

```bash
# .env.production
MANUS_API_KEY=sk-tfKuRZcVn5aY44QJIC52JUvk7CanV2hkaaSOd8ZuVf5h0aPEuFoiDOGZuf949Ejhelo81jujaKM3Ub7D0CGMtY5hK-nj
```

## Use Cases for Dating Platform

### Automated Content Generation

**Task**: Generate social media posts for marketing

```bash
# Create Manus task via API
curl -X POST https://api.manus.im/tasks \
  -H "Authorization: Bearer $MANUS_API_KEY" \
  -d '{
    "title": "Generate Instagram posts for dating app",
    "prompt": "Create 5 engaging Instagram posts promoting YouAndINotAI dating app. Focus on human connection, anti-AI stance, and verified profiles."
  }'
```

When completed, webhook receives:
- Generated post copy
- Image URLs (if generated)
- Hashtag suggestions

### User Verification Processing

**Task**: Verify user ID documents

```bash
curl -X POST https://api.manus.im/tasks \
  -H "Authorization: Bearer $MANUS_API_KEY" \
  -d '{
    "title": "Verify ID for user #12345",
    "prompt": "Review this ID document and selfie for authenticity. Check: 1) ID is valid government document, 2) Face matches selfie, 3) User is 18+. Document URL: https://youandinotai.com/uploads/id-12345.jpg"
  }'
```

Webhook response includes:
- Verification decision (approve/reject)
- Confidence score
- Reasoning

### Match Quality Analysis

**Task**: Analyze and improve matching algorithm

```bash
curl -X POST https://api.manus.im/tasks \
  -H "Authorization: Bearer $MANUS_API_KEY" \
  -d '{
    "title": "Analyze match quality for past 30 days",
    "prompt": "Review match data: conversion rate, message response rate, unmatch rate. Suggest algorithm improvements."
  }'
```

## API Endpoints

### Webhook Handler (Automatic)

```
POST /api/webhooks/manus
```

Automatically receives and processes Manus events.

### Get All Tasks

```bash
GET /api/manus/tasks

# Response
[
  {
    "task_id": "task_abc123",
    "title": "Generate Instagram posts",
    "status": "completed",
    "message": "Created 5 posts with engagement-optimized copy",
    "attachments": [
      {
        "file_name": "post-1.jpg",
        "url": "https://s3.amazonaws.com/manus-files/post-1.jpg",
        "size_bytes": 204857
      }
    ],
    "created_at": "2025-10-30T01:00:00Z",
    "completed_at": "2025-10-30T01:05:23Z"
  }
]
```

### Get Specific Task

```bash
GET /api/manus/tasks/:taskId
```

## Database Schema

```sql
-- Task tracking
CREATE TABLE manus_tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'running',
  message TEXT,
  stop_reason VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Generated files
CREATE TABLE manus_attachments (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) REFERENCES manus_tasks(task_id),
  file_name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Task Status Flow

```
1. Create task via Manus API
   ↓
2. Webhook receives "task_created" event
   ↓ (stores in database with status="running")
3. Manus AI processes task
   ↓
4. Webhook receives "task_stopped" event
   ↓
5. Update database:
   - stop_reason="finish" → status="completed"
   - stop_reason="ask" → status="waiting_input"
   ↓
6. Store attachments if present
```

## Example: Automated Weekly Report

```javascript
// Schedule this with cron
async function generateWeeklyReport() {
  const response = await fetch('https://api.manus.im/tasks', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MANUS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Weekly dating app metrics report',
      prompt: `Generate a comprehensive report for YouAndINotAI:
        - New signups: ${await getSignupCount()}
        - Active matches: ${await getMatchCount()}
        - Revenue: $${await getRevenue()}
        - Top performing features
        - Recommendations for growth

        Format as PDF with charts.`
    })
  });

  const { task_id } = await response.json();
  console.log(`Report generation started: ${task_id}`);

  // Webhook will handle completion and store the PDF
}
```

## Error Handling

Webhook endpoint automatically:
- Validates payload structure
- Handles database errors
- Logs all events
- Returns 200 status to Manus

If webhook fails (5xx error), Manus will retry up to 3 times with exponential backoff.

## Security Notes

⚠️ **Important**: Your webhook is publicly accessible. Always:

1. Verify requests come from Manus (check IP or implement signature verification)
2. Sanitize all input data
3. Never expose database errors to webhook responses
4. Monitor for suspicious activity

## Testing

Test your webhook locally with ngrok:

```bash
# Terminal 1: Start your API
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000

# Use ngrok URL in Manus webhook settings
https://abc123.ngrok.io/api/webhooks/manus
```

Send test payload:

```bash
curl -X POST http://localhost:3000/api/webhooks/manus \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test_123",
    "event_type": "task_stopped",
    "task_detail": {
      "task_id": "task_test",
      "task_title": "Test task",
      "task_url": "https://manus.im/app/task_test",
      "message": "Task completed successfully",
      "attachments": [],
      "stop_reason": "finish"
    }
  }'
```

## Production Checklist

- [ ] Webhook URL configured in Manus settings
- [ ] `MANUS_API_KEY` added to `.env.production`
- [ ] Database migrations run (manus_tasks, manus_attachments tables)
- [ ] Webhook endpoint returns 200 within 10 seconds
- [ ] SSL certificate valid
- [ ] Monitoring set up for failed webhooks
- [ ] Test task created and completed successfully

## Support

- Manus API Docs: https://docs.manus.im
- Manus Dashboard: https://manus.im/app
- YouAndINotAI Backend: Port 3000
