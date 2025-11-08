# 🏠 Self-Hosted AI Setup - Cost-Effective Architecture

## 🎯 **Goal: Minimize API Costs, Maximize Self-Hosting**

Use your **T5500 Precision with GTX 1070 8GB** for FREE local AI!

---

## 🤖 **Recommended AI Stack**

### **1. Ollama (Self-Hosted - FREE) - PRIMARY**
**Deploy on:** T5500 Precision (GPU accelerated)

**Installation:**
```bash
# On Windows (T5500):
curl https://ollama.ai/install.sh | sh

# Or download from: https://ollama.com/download
```

**Recommended Models:**
```bash
# Marketing & Content (Fast, 4GB VRAM)
ollama pull llama3.1:8b

# Customer Service (Balanced)
ollama pull mistral:7b

# Code & Technical (Best quality)
ollama pull codellama:13b

# Multi-modal (Images + Text)
ollama pull llava:7b
```

**GPU Acceleration:**
- GTX 1070 8GB = Perfect for 7B-13B models
- Runs 100% locally
- NO API costs
- Fast inference (GPU accelerated)

---

### **2. Open WebUI (Self-Hosted - FREE) - INTERFACE**
**Deploy on:** T5500 Precision

**Installation:**
```bash
docker run -d -p 3000:8080 \
  -v open-webui:/app/backend/data \
  -e OLLAMA_BASE_URL=http://localhost:11434 \
  --name open-webui \
  ghcr.io/open-webui/open-webui:main
```

**Features:**
- ChatGPT-like interface
- Multi-user support
- Model management
- RAG (document upload)
- Image generation support

**Access:** http://localhost:3000

---

### **3. LocalAI (Self-Hosted - FREE) - API COMPATIBLE**
**Deploy on:** T5500 Precision

**Why LocalAI:**
- OpenAI API compatible (drop-in replacement)
- Text-to-Speech
- Image generation
- Embeddings
- Multi-modal

**Installation:**
```bash
docker run -p 8080:8080 \
  -v models:/models \
  -e MODELS_PATH=/models \
  --gpus all \
  localai/localai:latest-gpu-nvidia-cuda-12
```

---

## 🎯 **Optimal Architecture**

### **Use Cases & Which AI to Use:**

#### **Customer Service (24/7)**
- **Primary:** Ollama (llama3.1:8b) - FREE
- **Fallback:** Perplexity API (for complex queries only)
- **Cost:** ~90% free, 10% paid

#### **Marketing & Content Creation**
- **Primary:** Ollama (mistral:7b) - FREE
- **Enhancement:** Gemini API (for SEO optimization only)
- **Cost:** ~95% free, 5% paid

#### **Match Recommendations**
- **Primary:** LocalAI embeddings - FREE
- **Fallback:** Azure Cognitive (for special cases)
- **Cost:** 100% free

#### **Image Analysis (Profile Photos)**
- **Primary:** Ollama (llava:7b) - FREE
- **Fallback:** Azure Vision (for NSFW detection)
- **Cost:** ~80% free, 20% paid

---

## 💰 **Cost Comparison**

### **Current Setup (Cloud APIs):**
```
Perplexity: $20/month (200K tokens)
Gemini:     $15/month
Azure:      $30/month
Total:      ~$65/month = $780/year
```

### **Self-Hosted Setup:**
```
Ollama:     $0 (FREE)
Open WebUI: $0 (FREE)
LocalAI:    $0 (FREE)
Electricity: ~$15/month (GPU running 24/7)
Total:      ~$15/month = $180/year

SAVINGS: $600/year!
```

---

## 🚀 **T5500 Precision Setup (Recommended)**

### **Hardware:**
- CPU: Dual Xeon E5506 (12 cores)
- RAM: 72GB
- GPU: GTX 1070 8GB ✅ PERFECT!
- Storage: 477GB SSD

### **Software Stack:**
```
1. Ollama (Port 11434)
2. Open WebUI (Port 3000)
3. LocalAI (Port 8080)
4. CloudeDroid API (Port 3456)
5. PostgreSQL (Port 5432)
6. Redis (Port 6379)
```

### **Why This Works:**
- GTX 1070 can run 7B-13B models smoothly
- 72GB RAM = Massive model loading capacity
- Dual Xeon = Good parallel processing
- All running locally = No API costs

---

## 📝 **Configuration Changes Needed**

### **1. Update CloudeDroid to Use Ollama**

Edit `cloudedroid-production/server.js`:

```javascript
// BEFORE (Using Perplexity API - PAID)
const response = await axios.post('https://api.perplexity.ai/chat/completions', {
  model: 'llama-3.1-sonar-small-128k-online',
  messages: req.body.messages
}, {
  headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` }
});

// AFTER (Using Ollama - FREE)
const response = await axios.post('http://localhost:11434/api/chat', {
  model: 'llama3.1:8b',
  messages: req.body.messages,
  stream: false
});
```

### **2. Update YouAndINotAI Backend**

Add to `date-app-dashboard/backend/src/ai/`:

```typescript
// ai-service.ts
import axios from 'axios';

export class AIService {
  private ollamaUrl = process.env.OLLAMA_HOST || 'http://localhost:11434';

  async generateResponse(prompt: string): Promise<string> {
    try {
      // Try Ollama first (FREE)
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: 'llama3.1:8b',
        prompt,
        stream: false
      });
      return response.data.response;
    } catch (error) {
      // Fallback to Gemini API (PAID) only if Ollama fails
      console.warn('Ollama unavailable, using Gemini fallback');
      return this.geminiBackup(prompt);
    }
  }
}
```

### **3. Update .env**

```bash
# Self-Hosted AI (FREE)
OLLAMA_HOST=http://192.168.1.100:11434
LOCALAI_HOST=http://192.168.1.100:8080
OPEN_WEBUI_URL=http://192.168.1.100:3000

# Cloud APIs (PAID - Use as fallback only)
PERPLEXITY_API_KEY=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
GEMINI_API_KEY=AIzaSyBuaA6sdJ2kvIeXiL1jY4Qm7StXAUwFWG4
AZURE_COGNITIVE_KEY=CScbecGnFd4YLCWpvmdAZ5yxkV6U2O5L02xPcp6f2bEYIMiJesdtJQQJ99BHACYeBjFXJ3w3AAABACOGHJUX

# AI Strategy
AI_PRIMARY=ollama
AI_FALLBACK=gemini
USE_CLOUD_API_ONLY_IF_LOCAL_FAILS=true
```

---

## 🔧 **T5500 Deployment Script**

Create `setup-ai-t5500.ps1`:

```powershell
Write-Host "=== Setting up Self-Hosted AI on T5500 ===" -ForegroundColor Cyan

# 1. Install Ollama
Write-Host "Installing Ollama..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://ollama.ai/download/windows" -OutFile "$env:TEMP\ollama-setup.exe"
Start-Process "$env:TEMP\ollama-setup.exe" -Wait

# 2. Pull models
Write-Host "Downloading AI models (this may take 10-15 minutes)..." -ForegroundColor Yellow
ollama pull llama3.1:8b      # 4.7GB - Marketing/Content
ollama pull mistral:7b        # 4.1GB - Customer Service
ollama pull codellama:13b     # 7.3GB - Technical
ollama pull llava:7b          # 4.5GB - Image analysis

# 3. Install Open WebUI
Write-Host "Installing Open WebUI..." -ForegroundColor Yellow
docker run -d -p 3000:8080 `
  -v open-webui:/app/backend/data `
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 `
  --name open-webui `
  ghcr.io/open-webui/open-webui:main

# 4. Install LocalAI
Write-Host "Installing LocalAI..." -ForegroundColor Yellow
docker run -d -p 8080:8080 `
  -v models:/models `
  --gpus all `
  --name localai `
  localai/localai:latest-gpu-nvidia-cuda-12

Write-Host ""
Write-Host "✅ Self-Hosted AI Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access:"
Write-Host "  Ollama:     http://localhost:11434" -ForegroundColor Cyan
Write-Host "  Open WebUI: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  LocalAI:    http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test Ollama:"
Write-Host '  ollama run llama3.1:8b "Hello, tell me about yourself"' -ForegroundColor Yellow
```

---

## 📊 **Performance Expectations**

### **GTX 1070 8GB Specs:**

**llama3.1:8b (Recommended):**
- Load time: ~2 seconds
- Inference: 40-60 tokens/second
- VRAM usage: 5.5GB
- Perfect for: Customer service, marketing

**mistral:7b (Alternative):**
- Load time: ~2 seconds
- Inference: 45-70 tokens/second
- VRAM usage: 4.8GB
- Perfect for: Content generation

**codellama:13b (Best Quality):**
- Load time: ~3 seconds
- Inference: 25-35 tokens/second
- VRAM usage: 7.5GB
- Perfect for: Technical support

---

## 🎯 **Recommended Strategy**

### **Priority Order:**
1. **Ollama (FREE)** - 90% of requests
2. **LocalAI (FREE)** - Embeddings, images
3. **Cloud APIs (PAID)** - Only for fallback/special cases

### **When to Use Cloud APIs:**
- ✅ Real-time web search needed (Perplexity)
- ✅ Multi-modal advanced features (Gemini)
- ✅ Ollama server down (failover)
- ❌ Regular customer service (use Ollama)
- ❌ Content generation (use Ollama)
- ❌ Basic chat (use Ollama)

---

## 🔥 **Immediate Action Items**

1. **Install on T5500:**
   ```powershell
   .\setup-ai-t5500.ps1
   ```

2. **Update CloudeDroid** to use Ollama first

3. **Update YouAndINotAI** to use Ollama for matching/content

4. **Keep cloud APIs** as emergency backup

5. **Monitor costs:**
   - Ollama: $0/month ✅
   - Cloud APIs: < $10/month (90% reduction)

---

## 🎉 **Expected Results**

**Before:**
- $65/month API costs
- Dependent on cloud services
- Latency from API calls

**After:**
- ~$5/month API costs (95% savings!)
- Fully self-hosted (privacy!)
- Lower latency (local GPU)
- Offline capable (no internet needed)

---

**Ready to deploy self-hosted AI on your T5500?**

Let me know and I'll update all the configurations! 🚀
