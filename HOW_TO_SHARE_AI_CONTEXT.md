# How to Share Master AI Context

**Goal:** Make sure Perplexity AI, Manus AI, and Claude all have the same understanding of Team Claude For The Kids

---

## 📄 The Document

**File:** `MASTER_AI_CONTEXT.md`
**Location:** https://github.com/Trollz1004/Trollz1004/blob/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV/MASTER_AI_CONTEXT.md

This is your **single source of truth** for all AI assistants.

---

## 🤖 Claude (claude.ai)

**✅ Already Done!**
- I have this context from our conversation
- It's stored in this repo
- Reference it anytime by asking: "Check MASTER_AI_CONTEXT.md"

**Optional: Add to Preferences**
1. Go to https://claude.ai/settings
2. Click "Custom Instructions"
3. Copy this short version:

```
Project: Team Claude For The Kids (50% to Shriners)
Repo: github.com/Trollz1004/Trollz1004
Branch: claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
Domains: 5 (youandinotai.com, ai-solutions.store, aidoesitall.org, onlinerecycle.org, youandinotai.online)
Revenue: $1.2M annual → $619K to Shriners
Status: Cleanup complete, ready for domain verification
Context: See MASTER_AI_CONTEXT.md in repo for full details
```

---

## 🔮 Perplexity AI

**Method 1: Ask Directly (Recommended)**

Start a new conversation and paste this:

```
I'm working on Team Claude For The Kids, a charity project raising funds for Shriners Children's Hospitals (50% of all revenue).

Here's the complete context for this project:

[PASTE ENTIRE MASTER_AI_CONTEXT.md CONTENTS HERE]

Please remember this context for all future questions about this project. When I ask about domains, credentials, revenue goals, or next steps, refer to this document.

My immediate question: How do I verify 5 domains in the GitHub organization "Ai-Solutions-Store"?
```

**Method 2: Use Perplexity Spaces**

1. Create a new Space: "Team Claude For The Kids"
2. Add MASTER_AI_CONTEXT.md as the first document
3. Ask questions in that Space - it will use the context

---

## 🔧 Manus AI

**Configure Task Context:**

1. Go to https://manus.im/app?show_settings=integrations
2. Click "Add Integration" → "Custom Webhook"
3. Set webhook URL: `https://youandinotai.com/api/webhooks/manus`
4. In task settings, add this as "Project Context":

```
Project: Team Claude For The Kids
Mission: 50% of revenue → Shriners Children's Hospitals
Tech: React 18, Node.js 20, PostgreSQL 16, Square payments
Domains: youandinotai.com (primary), ai-solutions.store, aidoesitall.org, onlinerecycle.org, youandinotai.online
Status: Production deployment pending
Full Context: github.com/Trollz1004/Trollz1004/blob/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV/MASTER_AI_CONTEXT.md
```

**For Each Task:**
- Reference the master context document
- All tasks should support the charity mission
- Use credentials from MASTER_AI_CONTEXT.md

---

## 🐙 GitHub Copilot

**In VS Code:**

1. Open the Trollz1004 repository in VS Code
2. Open MASTER_AI_CONTEXT.md
3. Press `Cmd/Ctrl + Shift + P` → "GitHub Copilot: Add File to Chat Context"
4. Now when you chat with Copilot, it has this context

**Or add to workspace settings:**

Create `.vscode/settings.json`:
```json
{
  "github.copilot.chat.contextFiles": [
    "MASTER_AI_CONTEXT.md"
  ]
}
```

---

## 💬 ChatGPT Plus

**Method 1: Custom GPT (Recommended)**

1. Go to https://chat.openai.com/gpts/editor
2. Click "Create a GPT"
3. Name: "Team Claude For The Kids Assistant"
4. Instructions: Paste entire MASTER_AI_CONTEXT.md
5. Save and use this GPT for all project questions

**Method 2: Start Each Conversation**

At the start of each chat:
```
Context for this conversation:

[PASTE MASTER_AI_CONTEXT.md]

Please use this as the source of truth for all questions about Team Claude For The Kids.
```

---

## 🔄 Keeping Context in Sync

**When you make changes:**

1. **Update MASTER_AI_CONTEXT.md** in the repo
2. **Commit and push** to GitHub
3. **Update each AI platform:**
   - **Claude:** Just reference the updated file (I'll see it)
   - **Perplexity:** Start new conversation with updated context
   - **Manus:** Update task context in settings
   - **Copilot:** File updates automatically
   - **ChatGPT:** Update Custom GPT instructions

**When to update:**
- New domains added
- Credentials change
- Revenue goals updated
- Major milestones reached
- New platforms launched

---

## ✅ Verification Checklist

After sharing with each platform, verify they understand:

**Ask each AI:**
> "What is Team Claude For The Kids? What's the mission? What are the 5 domains? What's the revenue goal?"

**Expected answer should include:**
- ✅ Charity for Shriners Children's Hospitals
- ✅ 50% of revenue donated
- ✅ 5 domains (youandinotai.com, ai-solutions.store, aidoesitall.org, onlinerecycle.org, youandinotai.online)
- ✅ $1.2M annual revenue goal
- ✅ $619K annual charity donation
- ✅ Next step: Domain verification

**If any AI gets it wrong:** Re-share the master context

---

## 🎯 Benefits of Shared Context

**Consistency:**
- All AIs give the same information
- No conflicting advice
- Unified understanding

**Efficiency:**
- Don't re-explain the project every time
- Get straight to work
- Faster task completion

**Accuracy:**
- Single source of truth
- No outdated information
- Always current

**Collaboration:**
- AIs can work together
- Hand off tasks seamlessly
- Complementary strengths

---

## 📝 Quick Copy-Paste

**For Immediate Use:**

Go to:
```
https://raw.githubusercontent.com/Trollz1004/Trollz1004/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV/MASTER_AI_CONTEXT.md
```

Copy entire contents, paste into any AI assistant.

---

## 🚀 Next Steps

1. **Test Perplexity:** Share context, ask about domain verification
2. **Configure Manus:** Add webhook, set project context
3. **Verify Understanding:** Ask each AI the verification question
4. **Start Working:** Use whichever AI is best for each task

---

**All AIs are now on the same page!** 🎉
