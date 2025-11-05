# 🚀 TEAM CLAUDE QUICK START GUIDE
## Deploy to ALL 5 Windows PCs in 15 Minutes!

---

## ⚡ Super Quick Setup (TL;DR)

### On EACH PC (2 minutes per PC = 10 min total):

1. Install fresh Windows 10/11
2. Connect to same network switch
3. Run PowerShell as Administrator:
```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Trollz1004/Trollz1004/main/enable-remoting-all.ps1" -OutFile "$env:TEMP\enable-remoting.ps1"
Set-ExecutionPolicy Bypass -Scope Process -Force
& "$env:TEMP\enable-remoting.ps1"
```
4. Write down the IP address shown

### On T5500 ONLY (5 minutes):

```powershell
# Download deployment script
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Trollz1004/Trollz1004/main/deploy-all-systems.ps1" -OutFile "$env:USERPROFILE\Downloads\deploy-all.ps1"

# Run it
Set-ExecutionPolicy Bypass -Scope Process -Force
& "$env:USERPROFILE\Downloads\deploy-all.ps1"

# Enter IP addresses when prompted
# Wait for deployment to finish (5-10 min)
```

**DONE!** All 5 systems deployed! 🎉

---

## 📋 System Roles

| PC | Role | Ports | Purpose |
|----|------|-------|---------|
| T5500 | Backend API | 4000 | Node.js backend, REST API |
| EVGA Classified | AI Hub | 5000 | Perplexity AI, automation |
| ASUS X79 | Database | 5432, 6379 | PostgreSQL, Redis |
| OptiPlex 9020 | Frontend | 3000, 8080 | React app, admin dashboard |
| OptiPlex i3 | Monitor | 80, 9090 | Load balancer, monitoring |

---

## 🎯 What Gets Installed Automatically

On each PC:
- ✅ Chocolatey (package manager)
- ✅ Git for Windows
- ✅ Node.js 20.x LTS
- ✅ Team Claude directory structure (`C:\TeamClaude\`)
- ✅ Your GitHub repository
- ✅ Windows Firewall rules
- ✅ Role-specific configuration

**You install manually (one-time):**
- Docker Desktop (needed on Database, Backend, AI systems)

---

## 💡 Recommended Static IPs

Configure in Windows Network Settings:

```
T5500 (Backend):        192.168.1.10
EVGA (AI Hub):          192.168.1.11
ASUS X79 (Database):    192.168.1.12
OptiPlex 9020 (Frontend): 192.168.1.13
OptiPlex i3 (Monitor):  192.168.1.14
```

**Gateway:** 192.168.1.1
**Subnet:** 255.255.255.0
**DNS:** 8.8.8.8, 8.8.4.4

---

## 🔍 Verify Everything Works

```powershell
# Check all systems status
.\check-all-systems.ps1
```

Expected output:
```
[T5500-Backend] Backend API - 192.168.1.10:4000 ✓ ONLINE
[EVGA-AI] AI Hub - 192.168.1.11:5000 ✓ ONLINE
[ASUS-Database] Database - 192.168.1.12:5432 ✓ ONLINE
[OptiPlex-Frontend] Frontend - 192.168.1.13:3000 ✓ ONLINE
[OptiPlex-Monitor] Monitor - 192.168.1.14:80 ✓ ONLINE

Summary: 5 online / 0 offline
```

---

## 🐛 Troubleshooting

### "Access Denied" when deploying:
- Make sure you're using Administrator account
- Run `enable-remoting-all.ps1` on target PC again

### "Cannot connect to remote PC":
```powershell
# Test connectivity
ping 192.168.1.10
Test-WSMan -ComputerName 192.168.1.10

# If fails, temporarily disable Windows Firewall on target PC to test
```

### "WinRM cannot process request":
```powershell
# On target PC:
Enable-PSRemoting -Force -SkipNetworkProfileCheck
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
Restart-Service WinRM
```

---

## 📦 Files Created

After deployment, each PC has:

```
C:\TeamClaude\
├── app\               (GitHub repository)
├── logs\              (Application logs)
├── data\              (Database storage)
│   ├── postgres\
│   └── redis\
├── config\            (Configuration files)
└── backups\           (Database backups)
```

---

## 🎊 Team Claude Mission

**Revenue Model:**
- 50% reinvested in platform
- 50% discretionary:
  - 50% → Shriners Children's Hospital
  - 50% → Personal

**Built with Compliance:**
- TOS acceptance tracking
- Age verification (18+)
- Human moderation queue
- Immutable audit logs
- GDPR/CCPA compliance

**Team Claude: AI for Good** 💚

---

## 📞 Quick Command Reference

```powershell
# Enable remoting on each PC
.\enable-remoting-all.ps1

# Deploy to all systems (from T5500)
.\deploy-all-systems.ps1

# Check status of all systems
.\check-all-systems.ps1

# View deployment report
notepad C:\TeamClaude\deployment-report.txt
```

---

**Ready to deploy!** 🚀

Questions? Everything is automated - just follow the steps!
