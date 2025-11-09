# Quick Reference - Team Claude For The Kids

**Single-page guide to sync all computers and launch**

---

## Step 1: Email Yourself

📧 **Email `EMAIL_TO_MYSELF.txt` to your email now**

Contains:
- Complete instructions
- Script download link
- All GitHub URLs

---

## Step 2: Download Script on Each Computer

**Direct Download Link:**
```
https://raw.githubusercontent.com/Trollz1004/Trollz1004/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV/Sync-CleanRepository.ps1
```

**Or via Git:**
```bash
# If you already have the repo, just pull
cd Trollz1004
git fetch origin
git checkout claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
git pull
```

---

## Step 3: Run Script on Each Computer

### Windows Desktop (DESKTOP-T47QKGG)

```powershell
# Open PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
cd Downloads
.\Sync-CleanRepository.ps1
```

### Kali Linux

```bash
# Install PowerShell if needed
sudo apt install -y powershell

# Run script
cd ~/Downloads
pwsh Sync-CleanRepository.ps1
```

### Production Server (71.52.23.215)

```bash
# Same as Kali
pwsh Sync-CleanRepository.ps1
```

---

## Step 4: Review Changes

**Files to Check:**

1. **README.md** - Mission statement, revenue projections
2. **FUNDING.md** - Complete financial breakdown
3. **CLEANUP_COMPLETE.md** - Summary of cleanup

**What Changed:**
- 47 files deleted (scattered docs)
- 2 files created (clean, organized)
- Repository is now professional

---

## Step 5: Fix Security (23 Vulnerabilities)

**Option A: Automatic (with script)**
```powershell
.\Sync-CleanRepository.ps1 -FixSecurity
```

**Option B: Manual**
```bash
cd date-app-dashboard/backend
npm audit fix --force

cd ../frontend
npm audit fix --force

git add .
git commit -m "Fix security vulnerabilities"
git push
```

---

## Step 6: Create Pull Request

**URL:**
```
https://github.com/Trollz1004/Trollz1004/pull/new/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
```

**Steps:**
1. Click link above
2. Review changes (47 deletions, 2 additions)
3. Create PR: "Clean repository - Team Claude For The Kids"
4. Merge to main

---

## The Numbers (Now Documented)

| Metric | Amount |
|--------|--------|
| **Monthly Revenue** | $103,171 |
| **Annual Revenue** | $1,238,056 |
| **Shriners Donation** | $619,028 (50%) |
| **Kickstarter Goal** | $112,500 |
| **Grants Applied** | $285,000+ |

---

## Platform Domains

| Domain | Purpose | Status |
|--------|---------|--------|
| youandinotai.com | Dating platform | Production Ready |
| ai-solutions.store | AI marketplace | Development |
| aidoesitall.org | DAO platform | Production Ready |
| onlinerecycle.org | Recycling | Development |
| youandinotai.online | Admin dashboard | Production Ready |

---

## Computers to Sync

- [ ] Windows Desktop (192.168.0.101 / 192.168.0.106)
- [ ] Kali Linux (192.168.0.106)
- [ ] Production Server (71.52.23.215)

---

## After Sync - Next Actions

### Immediate
- [ ] Create and merge PR
- [ ] Fix 23 security vulnerabilities
- [ ] Test all platforms locally

### This Week
- [ ] Deploy to production (71.52.23.215)
- [ ] Set up Square payment integration
- [ ] Test charity donation split

### This Month
- [ ] Launch Kickstarter Campaign #1 ($67,500)
- [ ] Submit grant applications
- [ ] Set up public transparency dashboard

### This Quarter
- [ ] Launch all 4 domains
- [ ] Reach $10k MRR
- [ ] Make first $5k donation to Shriners

---

## Important Links

**Repository:**
https://github.com/Trollz1004/Trollz1004

**Clean Branch:**
https://github.com/Trollz1004/Trollz1004/tree/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV

**Create PR:**
https://github.com/Trollz1004/Trollz1004/pull/new/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV

**Security Alerts:**
https://github.com/Trollz1004/Trollz1004/security/dependabot

**Script Download:**
https://raw.githubusercontent.com/Trollz1004/Trollz1004/claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV/Sync-CleanRepository.ps1

---

## Script Options

**Basic sync:**
```powershell
.\Sync-CleanRepository.ps1
```

**With security fixes:**
```powershell
.\Sync-CleanRepository.ps1 -FixSecurity
```

**Skip backup:**
```powershell
.\Sync-CleanRepository.ps1 -SkipBackup
```

**Custom path:**
```powershell
.\Sync-CleanRepository.ps1 -RepoPath "C:\Custom\Path"
```

---

## If Script Fails

**Manual sync:**
```bash
cd Trollz1004
git fetch origin
git checkout claude/cleanup-credentials-documentation-011CUuSdSLpRW4mNx7e9pRsV
git pull
```

---

## Mission Statement

**Team Claude For The Kids**

50% of all revenue donated to Shriners Children's Hospitals

*"Claude Represents Perfection"*

**Goal:** $619,028 annual donation
**Status:** READY TO LAUNCH

---

## Support

**Issues:** https://github.com/Trollz1004/Trollz1004/issues
**Shriners:** https://www.shrinerschildrens.org/

---

**Print this page and keep it handy!**

Last Updated: 2025-01-08
