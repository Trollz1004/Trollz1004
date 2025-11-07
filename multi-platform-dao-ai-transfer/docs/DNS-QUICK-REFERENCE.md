# DNS Quick Reference - Copy & Paste Ready

## 🚀 Get Your Kubernetes IP First

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Copy the EXTERNAL-IP (e.g., 203.0.113.45)
```

---

## 📋 All DNS Records (Copy This Table)

**Replace `YOUR_K8S_IP` with your actual Load Balancer IP**

```
Domain: aidoesitall.org
------------------------
Type: A    Host: @           Value: YOUR_K8S_IP    TTL: 3600
Type: A    Host: www         Value: YOUR_K8S_IP    TTL: 3600

Domain: claudedroid.ai
------------------------
Type: A    Host: @           Value: YOUR_K8S_IP    TTL: 3600
Type: A    Host: www         Value: YOUR_K8S_IP    TTL: 3600
Type: A    Host: api         Value: YOUR_K8S_IP    TTL: 3600

Domain: ai-solutions.store
------------------------
Type: A    Host: @           Value: YOUR_K8S_IP    TTL: 3600
Type: A    Host: www         Value: YOUR_K8S_IP    TTL: 3600
Type: A    Host: api         Value: YOUR_K8S_IP    TTL: 3600
Type: A    Host: dashboard   Value: YOUR_K8S_IP    TTL: 3600
```

---

## 🔧 IONOS - Step by Step

1. Login → **Domains & SSL**
2. Click **⚙️ gear icon** → Select **DNS**
3. Click **Add Record** for each entry above
4. **Type**: A
5. **Host name**: (use value from table)
6. **Points to**: YOUR_K8S_IP
7. **TTL**: 3600
8. Click **Save**

**Repeat for all 3 domains**

---

## 🔧 Namecheap - Step by Step

1. Login → **Domain List**
2. Click **Manage** → **Advanced DNS** tab
3. Click **Add New Record** for each entry above
4. **Type**: A Record
5. **Host**: (use value from table)
6. **Value**: YOUR_K8S_IP
7. **TTL**: Automatic
8. Click **✓ checkmark** to save

**Repeat for all 3 domains**

---

## ✅ Verify DNS (Run These Commands)

```bash
# Wait 5-10 minutes, then test:
dig aidoesitall.org +short
dig www.aidoesitall.org +short
dig claudedroid.ai +short
dig api.claudedroid.ai +short
dig ai-solutions.store +short
dig dashboard.ai-solutions.store +short

# All should return YOUR_K8S_IP
```

---

## 🌐 Online DNS Checkers

- https://dnschecker.org (Check worldwide propagation)
- https://www.whatsmydns.net (Global DNS lookup)
- https://mxtoolbox.com/SuperTool.aspx (Complete DNS tools)

---

## 🔒 SSL Certificate Setup (Automatic)

Your ingress is configured with **cert-manager** for automatic Let's Encrypt certificates.

### Check Cert-Manager Status
```bash
kubectl get pods -n cert-manager
```

### If Not Installed, Run:
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait 2 minutes, then create issuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: contact@aidoesitall.org
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Check Certificates (5-10 min after DNS propagates)
```bash
kubectl get certificates -n ai-solutions

# Should show all as "Ready"
```

---

## 🎯 Final Test URLs

After DNS + SSL is ready (15-30 min total), test these URLs:

```
✅ https://aidoesitall.org
✅ https://www.aidoesitall.org
✅ https://claudedroid.ai
✅ https://api.claudedroid.ai/health
✅ https://ai-solutions.store
✅ https://dashboard.ai-solutions.store
```

All should have **green padlock 🔒** in browser.

---

## 🚨 Quick Troubleshooting

**DNS not resolving?**
```bash
# Wait longer (up to 48 hours, usually 10-30 min)
# Clear local cache
sudo systemd-resolve --flush-caches  # Linux
sudo dscacheutil -flushcache          # macOS
ipconfig /flushdns                     # Windows
```

**SSL not working?**
```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager -f

# Force certificate renewal
kubectl delete certificate dao-platform-tls -n ai-solutions
# It will auto-recreate
```

**502 Bad Gateway?**
```bash
# Check if pods are running
kubectl get pods -n ai-solutions

# Check service status
kubectl get svc -n ai-solutions

# View logs
kubectl logs -n ai-solutions <pod-name>
```

---

## ⏱️ Timeline

| Step | Time | Cumulative |
|------|------|------------|
| Add DNS records | 10 min | 10 min |
| DNS propagation | 10-30 min | 40 min |
| SSL certificate issue | 5-10 min | 50 min |
| **Total** | **~50 min** | **~1 hour** |

---

**Need detailed instructions?** See `DNS-SETUP-GUIDE.md`
