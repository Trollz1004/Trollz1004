# ═══════════════════════════════════════════════════════════════════════════
# TEAM CLAUDE REMOTE DEPLOYMENT GUIDE
# Deploy to ALL 5 Systems from ONE Computer!
# ═══════════════════════════════════════════════════════════════════════════

## 🎯 Overview

This guide shows you how to deploy to ALL 5 Windows PCs **remotely** from a single computer (T5500).

**You'll run ONE script and it deploys to all 5 systems automatically!** 🚀

---

## 📋 Prerequisites

### Hardware Setup:
- ✅ All 5 PCs connected to same Ethernet switch/router
- ✅ Fresh Windows 10/11 installed on each
- ✅ All PCs powered on and connected to network

### Software Requirements:
- Windows 10/11 (fresh install)
- Network connectivity
- Administrator access on all PCs

---

## 🔧 Step 1: Initial Setup (Do This ONCE on Each PC)

### On Each PC, Run PowerShell as Administrator:

```powershell
# 1. Set computer name (makes it easy to identify)
# Run this on each PC with the appropriate name:

# On T5500:
Rename-Computer -NewName "T5500-Backend" -Restart

# On EVGA:
Rename-Computer -NewName "EVGA-AI" -Restart

# On ASUS X79:
Rename-Computer -NewName "ASUS-Database" -Restart

# On OptiPlex 9020:
Rename-Computer -NewName "OptiPlex-Frontend" -Restart

# On OptiPlex i3:
Rename-Computer -NewName "OptiPlex-Monitor" -Restart
```

**After restart, run this on EACH PC:**

```powershell
# 2. Enable PowerShell Remoting
Enable-PSRemoting -Force

# 3. Allow connections from any computer on network
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force

# 4. Restart WinRM service
Restart-Service WinRM

# 5. Configure Windows Firewall
Enable-NetFirewallRule -DisplayName "Windows Remote Management (HTTP-In)"

# 6. Verify it's working
Test-WSMan

# You should see XML output - that means it's working!
```

---

## 🌐 Step 2: Get IP Addresses of All Systems

On each PC, run:

```powershell
# Get IP address
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'} | Select-Object IPAddress, InterfaceAlias

# Or simpler:
ipconfig | findstr IPv4
```

**Write down the IP addresses:**

```
T5500 (Backend):      192.168.1.___
EVGA (AI Hub):        192.168.1.___
ASUS X79 (Database):  192.168.1.___
OptiPlex 9020 (Front): 192.168.1.___
OptiPlex i3 (Monitor): 192.168.1.___
```

---

## 🚀 Step 3: Run Master Deployment Script (From T5500 ONLY)

### Download and Run on T5500:

```powershell
# Right-click PowerShell → Run as Administrator

# Download the deployment script
cd $env:USERPROFILE\Downloads
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Trollz1004/Trollz1004/main/deploy-all-systems.ps1" -OutFile "deploy-all-systems.ps1"

# Run it
Set-ExecutionPolicy Bypass -Scope Process -Force
.\deploy-all-systems.ps1
```

### The script will ask for:
1. IP addresses of each system
2. Administrator password (same on all systems recommended)
3. Confirmation to proceed

### Then it will automatically:
- ✅ Connect to all 5 systems
- ✅ Install software (Chocolatey, Git, Node.js)
- ✅ Create directories
- ✅ Clone repository
- ✅ Configure firewall
- ✅ Download Docker Desktop installers
- ✅ Set up roles (Backend, AI, Database, Frontend, Monitor)
- ✅ Generate reports

**Time: 10-15 minutes total for ALL 5 systems!**

---

## ✅ Step 4: Verify Everything Worked

The script will create a report: `C:\TeamClaude\deployment-report.html`

Open it in a browser to see:
- ✅ Which systems deployed successfully
- ⚠️ Which systems had issues
- 📊 System information for each PC

---

## 🐳 Step 5: Install Docker Desktop (Manual Step)

Docker Desktop requires a manual install and reboot on each system.

**Easy way - On each PC:**

```powershell
# Run this to download Docker Desktop installer
Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile "$env:USERPROFILE\Downloads\DockerDesktop.exe"

# Run the installer
Start-Process "$env:USERPROFILE\Downloads\DockerDesktop.exe" -Wait

# Restart computer
Restart-Computer
```

**After reboot, start Docker Desktop on each system.**

---

## 🎊 Step 6: Start All Services (From T5500)

Once Docker is installed on all systems, run:

```powershell
# From T5500, start all services remotely
.\start-all-services.ps1
```

This will:
- ✅ Start PostgreSQL + Redis on ASUS X79
- ✅ Start Backend API on T5500
- ✅ Start AI services on EVGA
- ✅ Start Frontend on OptiPlex 9020
- ✅ Start Monitoring on OptiPlex i3

---

## 🔍 Troubleshooting

### "Access Denied" errors:
```powershell
# Make sure you're using an Administrator account
# Run this on target PC:
Enable-PSRemoting -Force
```

### Can't connect to remote PC:
```powershell
# Test connection from T5500:
Test-WSMan -ComputerName 192.168.1.XXX

# If fails, check:
# 1. Is target PC powered on?
# 2. Can you ping it? ping 192.168.1.XXX
# 3. Is Windows Firewall blocking? (temporarily disable to test)
```

### "WinRM cannot process the request":
```powershell
# On target PC:
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
Restart-Service WinRM
```

---

## 💡 Pro Tips

### Same Password on All Systems:
Makes remote deployment **much easier**! Use the same local Administrator password on all 5 PCs.

### Static IP Addresses:
After initial setup, configure static IPs:
- T5500: 192.168.1.10
- EVGA: 192.168.1.11
- ASUS: 192.168.1.12
- OptiPlex 9020: 192.168.1.13
- OptiPlex i3: 192.168.1.14

### Remote Desktop:
Enable RDP on all systems for easy remote management:
```powershell
Set-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Terminal Server' -name "fDenyTSConnections" -value 0
Enable-NetFirewallRule -DisplayGroup "Remote Desktop"
```

---

## 📊 Network Topology

```
[Router/Switch]
      |
      ├─── T5500 (Backend API) - 192.168.1.10:4000
      |
      ├─── EVGA Classified (AI Hub) - 192.168.1.11:5000
      |
      ├─── ASUS X79 (Database) - 192.168.1.12:5432,6379
      |
      ├─── OptiPlex 9020 (Frontend) - 192.168.1.13:3000,8080
      |
      └─── OptiPlex i3 (Monitor) - 192.168.1.14:80,9090
```

---

## 🎯 Summary

**What makes this easy:**
1. Run ONE script from T5500
2. It deploys to ALL 5 systems automatically
3. No need to physically go to each PC
4. Parallel deployment = fast (10-15 min total)
5. Automatic error reporting

**Team Claude: Building Smart, Deploying Smarter** 💚

---

## 📞 Quick Command Reference

```powershell
# Enable remoting on target PC
Enable-PSRemoting -Force

# Test connection from T5500
Test-WSMan -ComputerName 192.168.1.XXX

# Deploy to all systems
.\deploy-all-systems.ps1

# Start all services
.\start-all-services.ps1

# Check status of all systems
.\check-all-systems.ps1
```

**Ready to deploy!** 🚀
