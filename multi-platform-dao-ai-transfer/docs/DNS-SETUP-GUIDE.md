# DNS Setup Guide for Multi-Platform Deployment
## IONOS & Namecheap Configuration

This guide covers DNS configuration for your domains registered with **IONOS** or **Namecheap**.

---

## 📋 Domains to Configure

| Domain | Platform | Subdomains Needed |
|--------|----------|-------------------|
| **aidoesitall.org** | DAO Platform | www, api (optional) |
| **claudedroid.ai** | AI Platform | www, api |
| **ai-solutions.store** | Marketplace | www, api, dashboard |

---

## 🎯 Quick Reference - DNS Records Needed

Once you deploy to Kubernetes, you'll get a Load Balancer IP. Use this IP for all A records below.

### Get Your Kubernetes Load Balancer IP

```bash
# After deploying with Helm, run:
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Look for EXTERNAL-IP, example: 203.0.113.45
```

### Required DNS Records

| Domain | Type | Name | Value | TTL |
|--------|------|------|-------|-----|
| aidoesitall.org | A | @ | YOUR_K8S_IP | 3600 |
| aidoesitall.org | A | www | YOUR_K8S_IP | 3600 |
| claudedroid.ai | A | @ | YOUR_K8S_IP | 3600 |
| claudedroid.ai | A | www | YOUR_K8S_IP | 3600 |
| claudedroid.ai | A | api | YOUR_K8S_IP | 3600 |
| ai-solutions.store | A | @ | YOUR_K8S_IP | 3600 |
| ai-solutions.store | A | www | YOUR_K8S_IP | 3600 |
| ai-solutions.store | A | api | YOUR_K8S_IP | 3600 |
| ai-solutions.store | A | dashboard | YOUR_K8S_IP | 3600 |

**Replace `YOUR_K8S_IP`** with your actual Kubernetes Load Balancer IP (e.g., 203.0.113.45)

---

## 🌐 IONOS Setup Instructions

### Step 1: Log into IONOS
1. Go to https://www.ionos.com
2. Click **Login** (top right)
3. Enter your credentials

### Step 2: Access DNS Management
1. Click **Domains & SSL** in the menu
2. Find your domain (e.g., aidoesitall.org)
3. Click the **gear icon** ⚙️ next to the domain
4. Select **DNS** from the dropdown

### Step 3: Add DNS Records for aidoesitall.org

**Add Root Domain (aidoesitall.org)**
1. Click **Add Record**
2. Select **Type**: `A`
3. **Host name**: Leave blank or enter `@`
4. **Points to**: `YOUR_K8S_IP` (e.g., 203.0.113.45)
5. **TTL**: `3600` (1 hour)
6. Click **Save**

**Add WWW Subdomain**
1. Click **Add Record**
2. Select **Type**: `A`
3. **Host name**: `www`
4. **Points to**: `YOUR_K8S_IP`
5. **TTL**: `3600`
6. Click **Save**

### Step 4: Repeat for claudedroid.ai

Add these records:
- **A Record** - Host: `@` → Points to: YOUR_K8S_IP
- **A Record** - Host: `www` → Points to: YOUR_K8S_IP
- **A Record** - Host: `api` → Points to: YOUR_K8S_IP

### Step 5: Repeat for ai-solutions.store

Add these records:
- **A Record** - Host: `@` → Points to: YOUR_K8S_IP
- **A Record** - Host: `www` → Points to: YOUR_K8S_IP
- **A Record** - Host: `api` → Points to: YOUR_K8S_IP
- **A Record** - Host: `dashboard` → Points to: YOUR_K8S_IP

### Step 6: Verify IONOS Configuration

```bash
# Wait 5-10 minutes for DNS propagation, then test:
dig aidoesitall.org +short
dig www.aidoesitall.org +short
dig api.claudedroid.ai +short
dig dashboard.ai-solutions.store +short

# All should return YOUR_K8S_IP
```

---

## 💎 Namecheap Setup Instructions

### Step 1: Log into Namecheap
1. Go to https://www.namecheap.com
2. Click **Sign In** (top right)
3. Enter your credentials

### Step 2: Access Domain List
1. Click **Domain List** in the left sidebar
2. Find your domain (e.g., aidoesitall.org)
3. Click **Manage** button next to the domain

### Step 3: Access Advanced DNS
1. Click the **Advanced DNS** tab
2. You'll see existing DNS records

### Step 4: Add DNS Records for aidoesitall.org

**Add Root Domain**
1. Click **Add New Record**
2. **Type**: Select `A Record`
3. **Host**: `@`
4. **Value**: `YOUR_K8S_IP` (e.g., 203.0.113.45)
5. **TTL**: `Automatic` or `1 hour`
6. Click the **green checkmark** ✓ to save

**Add WWW Subdomain**
1. Click **Add New Record**
2. **Type**: `A Record`
3. **Host**: `www`
4. **Value**: `YOUR_K8S_IP`
5. **TTL**: `Automatic`
6. Click ✓ to save

### Step 5: Repeat for claudedroid.ai

Navigate to claudedroid.ai → Manage → Advanced DNS, then add:
- **A Record** - Host: `@` → Value: YOUR_K8S_IP
- **A Record** - Host: `www` → Value: YOUR_K8S_IP
- **A Record** - Host: `api` → Value: YOUR_K8S_IP

### Step 6: Repeat for ai-solutions.store

Navigate to ai-solutions.store → Manage → Advanced DNS, then add:
- **A Record** - Host: `@` → Value: YOUR_K8S_IP
- **A Record** - Host: `www` → Value: YOUR_K8S_IP
- **A Record** - Host: `api` → Value: YOUR_K8S_IP
- **A Record** - Host: `dashboard` → Value: YOUR_K8S_IP

### Step 7: Verify Namecheap Configuration

```bash
# Wait 5-30 minutes for DNS propagation (Namecheap can be slower)
dig aidoesitall.org +short
dig www.claudedroid.ai +short
dig api.ai-solutions.store +short

# All should return YOUR_K8S_IP
```

---

## 🔒 SSL/TLS Certificate Setup

Your Kubernetes ingress is already configured for **automatic SSL with cert-manager**.

### How It Works
1. **cert-manager** is installed in your K8s cluster
2. It automatically requests **Let's Encrypt** certificates
3. Certificates are stored in K8s secrets
4. Auto-renewal every 90 days

### Verify Cert-Manager is Running

```bash
# Check if cert-manager is installed
kubectl get pods -n cert-manager

# You should see 3 pods running:
# cert-manager-xxxxx
# cert-manager-cainjector-xxxxx
# cert-manager-webhook-xxxxx
```

### Install Cert-Manager (if not installed)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create Let's Encrypt ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: contact@aidoesitall.org  # CHANGE THIS TO YOUR EMAIL
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Check Certificate Status

```bash
# Check certificates
kubectl get certificates -n ai-solutions

# Should show 4 certificates (one per TLS secret):
# dao-platform-tls         True    Ready
# claudedroid-ai-tls       True    Ready
# marketplace-tls          True    Ready
# dashboard-tls            True    Ready

# View certificate details
kubectl describe certificate dao-platform-tls -n ai-solutions
```

---

## ✅ Verification Checklist

After configuring DNS, verify everything works:

### 1. DNS Propagation Check

Use online tools:
- https://dnschecker.org
- https://www.whatsmydns.net

Enter each domain and subdomain to verify worldwide propagation.

### 2. Test HTTP Access (before SSL)

```bash
# Test each domain (should redirect to HTTPS)
curl -I http://aidoesitall.org
curl -I http://claudedroid.ai
curl -I http://ai-solutions.store
curl -I http://dashboard.ai-solutions.store
```

### 3. Test HTTPS Access (after cert-manager issues certs)

```bash
# Wait 5-10 minutes after DNS propagates for certificates
curl -I https://aidoesitall.org
curl -I https://api.claudedroid.ai
curl -I https://dashboard.ai-solutions.store

# All should return 200 OK or 301/302 redirect
```

### 4. Test in Browser

Open each URL in your browser:
- ✅ https://aidoesitall.org - DAO Platform
- ✅ https://www.aidoesitall.org - DAO Platform (www)
- ✅ https://claudedroid.ai - AI Platform Frontend
- ✅ https://api.claudedroid.ai/health - AI API Health
- ✅ https://ai-solutions.store - Marketplace
- ✅ https://dashboard.ai-solutions.store - Control Hub

All should have **valid SSL certificates** (green padlock 🔒).

---

## 🚨 Troubleshooting

### DNS Not Resolving
**Problem**: `dig aidoesitall.org` returns NXDOMAIN

**Solutions**:
1. Wait longer (DNS can take up to 48 hours, usually 5-30 min)
2. Verify A records are saved in IONOS/Namecheap
3. Check TTL is set correctly (3600 or Automatic)
4. Clear local DNS cache:
   ```bash
   # Linux
   sudo systemd-resolve --flush-caches

   # macOS
   sudo dscacheutil -flushcache

   # Windows
   ipconfig /flushdns
   ```

### SSL Certificate Not Issuing
**Problem**: `kubectl get certificates` shows "False" status

**Solutions**:
1. Check cert-manager logs:
   ```bash
   kubectl logs -n cert-manager deploy/cert-manager -f
   ```
2. Verify DNS is fully propagated (cert-manager needs this)
3. Check ClusterIssuer exists:
   ```bash
   kubectl get clusterissuer letsencrypt-prod
   ```
4. Describe certificate for errors:
   ```bash
   kubectl describe certificate dao-platform-tls -n ai-solutions
   ```

### 502 Bad Gateway
**Problem**: Domain loads but shows 502 error

**Solutions**:
1. Check if services are running:
   ```bash
   kubectl get pods -n ai-solutions
   kubectl get svc -n ai-solutions
   ```
2. Check ingress backend:
   ```bash
   kubectl describe ingress multi-platform-ingress -n ai-solutions
   ```
3. View pod logs:
   ```bash
   kubectl logs -n ai-solutions <pod-name>
   ```

### Certificate Shows "Fake LE Intermediate X1"
**Problem**: Browser shows "Not Secure" with fake certificate

**Solution**: This is normal during testing. Change to production issuer:
```bash
# Edit ingress annotation
kubectl edit ingress multi-platform-ingress -n ai-solutions

# Change:
cert-manager.io/cluster-issuer: letsencrypt-staging
# To:
cert-manager.io/cluster-issuer: letsencrypt-prod
```

---

## 📞 Support

If you encounter issues:

1. **Check DNS propagation**: https://dnschecker.org
2. **Verify Kubernetes is running**: `kubectl get pods -n ai-solutions`
3. **Check ingress controller**: `kubectl get svc -n ingress-nginx`
4. **View logs**: `kubectl logs -n ai-solutions <pod-name>`

---

## 🎯 Summary

**After following this guide, you should have:**

✅ All domains pointing to your Kubernetes cluster IP
✅ Automatic SSL certificates from Let's Encrypt
✅ All platforms accessible via HTTPS
✅ Dashboard monitoring all services

**Estimated Setup Time**: 30-60 minutes + DNS propagation (5-30 min)

---

**Last Updated**: January 2025
**Bundle Version**: 1.0.0
