# Agent Orchestrator Guide

Complete guide for the hybrid AI system using Claude 4.5 Haiku (Anthropic) and Ollama (self-hosted).

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Provider Selection Logic](#provider-selection-logic)
5. [API Endpoints](#api-endpoints)
6. [Usage Examples](#usage-examples)
7. [Task Categories](#task-categories)
8. [Performance & Cost](#performance--cost)
9. [Troubleshooting](#troubleshooting)

## Overview

The Agent Orchestrator intelligently routes AI tasks between two providers:

- **Anthropic Claude Haiku/Sonnet**: Cloud-based, high-quality, paid API
- **Ollama**: Self-hosted, free, privacy-focused local models

### Key Benefits

✅ **Cost Optimization**: Use free local models for simple tasks
✅ **Performance**: Fast local inference for high-volume operations
✅ **Privacy**: Sensitive data stays on your infrastructure
✅ **Flexibility**: Automatic fallback between providers
✅ **Quality**: Use Claude for complex reasoning when needed

## Architecture

```
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Agent Orchestrator   │
│  - Task Analysis     │
│  - Provider Selection│
│  - Caching          │
└──────┬───────────────┘
       │
       ├────────────┐
       ▼            ▼
┌─────────────┐  ┌─────────────┐
│   Ollama    │  │  Anthropic  │
│ (Self-host) │  │   (Cloud)   │
│             │  │             │
│ - Llama 3.2 │  │ - Haiku     │
│ - Mistral   │  │ - Sonnet    │
│ - CodeLlama │  │             │
└─────────────┘  └─────────────┘
```

### Provider Selection Strategy

The orchestrator automatically selects the best provider based on:

1. **Task Complexity**: Simple → Ollama, Complex → Claude
2. **User OAuth Status**: Claude available only if user authorized
3. **Ollama Availability**: Falls back to Claude if Ollama offline
4. **Strategy**: Cost-optimized, performance-optimized, or auto

## Setup Instructions

### 1. Install Ollama

Run the automated installation script:

```bash
chmod +x /home/user/Trollz1004/install-ollama.sh
bash /home/user/Trollz1004/install-ollama.sh
```

This will:
- Install Ollama
- Start the Ollama service
- Pull recommended models (Llama 3.2, Mistral, etc.)
- Test the installation

### 2. Configure Environment

Update your `.env` file:

```env
# Ollama Configuration
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2

# Anthropic OAuth (already configured)
ANTHROPIC_CLIENT_ID=9d1c250a-e61b-44d9-88ed-5944d1962f5e
ANTHROPIC_CLIENT_SECRET=AUcq5MQWG19rDi6w2H9UYhYBeWue0Z0TFrIL5dqv1JajKkEY
```

### 3. Verify Installation

Check that both providers are available:

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Check backend health
curl http://localhost:4000/api/orchestrator/health
```

## Provider Selection Logic

### Complexity-Based Routing

| Complexity | Preferred Provider | Fallback | Use Cases |
|------------|-------------------|----------|-----------|
| **Simple** | Ollama (free) | Claude Haiku | Moderation, spam detection, sentiment |
| **Moderate** | Claude Haiku | Ollama | Bio generation, icebreakers, suggestions |
| **Complex** | Claude Sonnet | Ollama | Compatibility analysis, advice, reasoning |

### Task Category Mapping

#### Ollama-Preferred (Simple, High-Volume)

```typescript
TaskCategory.CONTENT_MODERATION    // "Is this message safe?"
TaskCategory.SPAM_DETECTION        // "Is this spam?"
TaskCategory.SENTIMENT_ANALYSIS    // "Is this positive/negative?"
TaskCategory.KEYWORD_EXTRACTION    // "Extract keywords"
TaskCategory.TEXT_CLASSIFICATION   // "Categorize this text"
TaskCategory.SIMPLE_QA             // "Simple question answering"
```

#### Claude Haiku-Preferred (Fast, Moderate Complexity)

```typescript
TaskCategory.PROFILE_BIO_GENERATION    // Generate dating bios
TaskCategory.ICEBREAKER_GENERATION     // Conversation starters
TaskCategory.MESSAGE_SUGGESTIONS       // Message reply suggestions
TaskCategory.CONVERSATION_STARTERS     // Opening messages
TaskCategory.QUICK_RESPONSES           // Fast responses
```

#### Claude Sonnet-Preferred (Complex Reasoning)

```typescript
TaskCategory.COMPATIBILITY_ANALYSIS    // Match compatibility
TaskCategory.RELATIONSHIP_ADVICE       // Relationship guidance
TaskCategory.DETAILED_MATCHING         // Complex matching logic
TaskCategory.CONTENT_CREATION          // Long-form content
TaskCategory.COMPLEX_REASONING         // Multi-step reasoning
```

## API Endpoints

### Health Check

**GET** `/api/orchestrator/health`

Check status of all AI providers.

```bash
curl http://localhost:4000/api/orchestrator/health
```

**Response:**
```json
{
  "status": "ok",
  "providers": {
    "ollama": {
      "available": true,
      "models": ["llama3.2", "mistral", "codellama:7b"]
    },
    "anthropic": {
      "configured": true
    }
  }
}
```

### Execute Task

**POST** `/api/orchestrator/execute`

Execute a task with automatic provider selection.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "prompt": "Generate a fun bio for someone who likes hiking and photography",
  "category": "profile_bio_generation",
  "maxTokens": 150,
  "temperature": 0.8
}
```

**Response:**
```json
{
  "response": "Weekend warrior capturing mountain views...",
  "metadata": {
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022",
    "duration": 1234,
    "cached": false,
    "tokensUsed": 125
  }
}
```

### Batch Execute

**POST** `/api/orchestrator/batch`

Execute multiple tasks at once.

```json
{
  "tasks": [
    {
      "prompt": "Is this spam: Buy now!",
      "category": "spam_detection"
    },
    {
      "prompt": "Analyze sentiment: I love this app!",
      "category": "sentiment_analysis"
    }
  ]
}
```

### Content Moderation

**POST** `/api/orchestrator/moderate`

```json
{
  "content": "Message to moderate"
}
```

**Response:**
```json
{
  "isSafe": true,
  "reason": null
}
```

### Spam Detection

**POST** `/api/orchestrator/detect-spam`

```json
{
  "message": "Message to check"
}
```

**Response:**
```json
{
  "isSpam": false
}
```

### Sentiment Analysis

**POST** `/api/orchestrator/sentiment`

```json
{
  "text": "Text to analyze"
}
```

**Response:**
```json
{
  "sentiment": "positive"
}
```

### Get Categories

**GET** `/api/orchestrator/categories`

List available task categories, complexities, and strategies.

### Clear Cache

**POST** `/api/orchestrator/clear-cache`

Clear the response cache.

## Usage Examples

### Example 1: Automatic Provider Selection

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456789"}' \
  | jq -r '.token')

# Execute task (auto-selects provider)
curl -X POST http://localhost:4000/api/orchestrator/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a dating bio for someone who loves travel",
    "category": "profile_bio_generation",
    "maxTokens": 150
  }' | jq '.'
```

### Example 2: Content Moderation (Uses Ollama)

```bash
curl -X POST http://localhost:4000/api/orchestrator/moderate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hey, want to chat?"
  }' | jq '.'
```

### Example 3: Batch Processing

```bash
curl -X POST http://localhost:4000/api/orchestrator/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "prompt": "Moderate this: Hello there!",
        "category": "content_moderation"
      },
      {
        "prompt": "Detect spam: Click here now!!!",
        "category": "spam_detection"
      },
      {
        "prompt": "Sentiment: This is amazing!",
        "category": "sentiment_analysis"
      }
    ]
  }' | jq '.'
```

### Example 4: Force Ollama Only

```bash
curl -X POST http://localhost:4000/api/orchestrator/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a short greeting message",
    "strategy": "ollama_only",
    "maxTokens": 50
  }' | jq '.'
```

### Example 5: Force Claude Only

```bash
curl -X POST http://localhost:4000/api/orchestrator/execute \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a thoughtful relationship advice paragraph",
    "strategy": "anthropic_only",
    "complexity": "complex",
    "maxTokens": 200
  }' | jq '.'
```

## Task Categories

### Content Moderation

```typescript
await moderateContent("User message to check");
// Returns: { isSafe: boolean, reason?: string }
```

### Spam Detection

```typescript
await detectSpam("Message to check");
// Returns: boolean
```

### Sentiment Analysis

```typescript
await analyzeSentiment("Text to analyze");
// Returns: 'positive' | 'negative' | 'neutral'
```

### Custom Tasks

```typescript
import { agentOrchestrator, TaskCategory } from './services/agentOrchestrator';

const result = await agentOrchestrator.executeTask({
  prompt: "Your custom prompt",
  category: TaskCategory.SIMPLE_QA,
  userId: userId,
  maxTokens: 200,
  temperature: 0.7
});
```

## Performance & Cost

### Cost Comparison

| Provider | Task Type | Cost per 1M tokens | Speed |
|----------|-----------|-------------------|-------|
| **Ollama** | Any | $0 (free) | Fast (local) |
| **Claude Haiku** | Moderate | ~$0.25 input, ~$1.25 output | Very Fast |
| **Claude Sonnet** | Complex | ~$3 input, ~$15 output | Medium |

### Performance Metrics

**Ollama (Local)**:
- Latency: 50-500ms depending on model and hardware
- Throughput: Limited by CPU/GPU
- Cost: Free

**Claude Haiku**:
- Latency: 200-800ms
- Throughput: High
- Cost: Very low ($0.25-$1.25 per million tokens)

**Claude Sonnet**:
- Latency: 500-2000ms
- Throughput: High
- Cost: Medium ($3-$15 per million tokens)

### Recommended Strategy

**High-Volume, Simple Tasks** (spam, moderation):
- Use Ollama exclusively
- Save API costs
- Fast local inference

**User-Facing Features** (bio generation, icebreakers):
- Use Claude Haiku
- Better quality
- Fast response times

**Complex Analysis** (compatibility, advice):
- Use Claude Sonnet
- Best reasoning capabilities
- Worth the extra cost

## Ollama Models

### Installed by Default

| Model | Size | Use Case | Speed |
|-------|------|----------|-------|
| **llama3.2** | 3B | General purpose | Fast |
| **llama3.2:1b** | 1B | Simple tasks | Very Fast |
| **mistral** | 7B | Business tasks | Medium |
| **codellama:7b** | 7B | Code generation | Medium |
| **nomic-embed-text** | - | Embeddings | Fast |

### Pull Additional Models

```bash
# Larger, more capable models
ollama pull llama3.1:8b
ollama pull mixtral

# Specialized models
ollama pull phi3
ollama pull gemma2

# List available models
ollama list
```

## Troubleshooting

### Ollama Not Available

```bash
# Check service status
systemctl status ollama

# Restart service
sudo systemctl restart ollama

# Check API
curl http://localhost:11434/api/tags
```

### Model Not Found

```bash
# Pull the model
ollama pull llama3.2

# Verify it's installed
ollama list
```

### Slow Performance

**Ollama**:
- Use smaller models (llama3.2:1b)
- Check CPU/RAM usage
- Consider GPU acceleration

**Claude**:
- Reduce maxTokens
- Enable caching
- Use Haiku instead of Sonnet

### High API Costs

- Increase Ollama usage for simple tasks
- Set `strategy: "cost_optimized"`
- Enable response caching
- Use Haiku instead of Sonnet

### Cache Issues

```bash
# Clear orchestrator cache
curl -X POST http://localhost:4000/api/orchestrator/clear-cache \
  -H "Authorization: Bearer $TOKEN"
```

## Advanced Configuration

### Custom Provider Selection

```typescript
import { agentOrchestrator, ProviderStrategy } from './services/agentOrchestrator';

// Cost-optimized: prefer Ollama
const result = await agentOrchestrator.executeTask({
  prompt: "Your prompt",
  strategy: ProviderStrategy.COST_OPTIMIZED
});

// Performance-optimized: prefer Claude
const result = await agentOrchestrator.executeTask({
  prompt: "Your prompt",
  strategy: ProviderStrategy.PERFORMANCE_OPTIMIZED
});
```

### Custom Models

Update `.env`:

```env
OLLAMA_DEFAULT_MODEL=mistral
```

Or specify in code:

```typescript
import { ollamaClient } from './services/ollamaClient';

const response = await ollamaClient.generate("Your prompt", {
  model: "mixtral",
  temperature: 0.7
});
```

## Monitoring

### Check Provider Health

```bash
# Full health check
curl http://localhost:4000/api/orchestrator/health | jq '.'

# Ollama models
curl http://localhost:11434/api/tags | jq '.models[].name'

# Anthropic status
curl -X GET http://localhost:4000/api/oauth/anthropic/status \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Performance Monitoring

The orchestrator logs all task executions:

```typescript
logger.info('Task executed successfully', {
  provider: result.provider,
  model: result.model,
  duration: result.duration,
  category: request.category,
  complexity: request.complexity,
});
```

Check logs for:
- Provider selection patterns
- Response times
- Error rates
- Cache hit rates

## Best Practices

1. **Use appropriate complexity**: Don't use Sonnet for simple tasks
2. **Enable caching**: Reduces repeated API calls
3. **Monitor costs**: Track Anthropic API usage
4. **Local for volume**: Use Ollama for high-frequency tasks
5. **Cloud for quality**: Use Claude for user-facing content
6. **Test both providers**: Ensure fallback works
7. **Update models**: Regularly update Ollama models

## Support

- **Ollama Docs**: https://github.com/ollama/ollama
- **Anthropic Docs**: https://docs.anthropic.com
- **Backend Logs**: `date-app-dashboard/backend/logs/`

## Summary

The Agent Orchestrator provides a flexible, cost-effective AI infrastructure by:

✅ Automatically routing tasks to optimal providers
✅ Using free local models for simple operations
✅ Leveraging Claude's quality for complex tasks
✅ Providing built-in caching and fallback
✅ Offering full control over provider selection

**Cost Savings**: 60-80% reduction by using Ollama for simple tasks
**Performance**: Sub-second responses with local models
**Quality**: Best-in-class Claude for critical features
