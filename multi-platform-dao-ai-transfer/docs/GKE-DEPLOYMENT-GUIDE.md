# Google Cloud GKE Deployment Guide
## Fully Automated Charity Platform - FOR THE KIDS! 💙

This guide covers deploying your fully automated platform to Google Cloud Platform with minimal ongoing maintenance.

---

## 🎯 Mission Statement

**Automate everything. Minimal maintenance. Profits → Kids in need.**

- ✅ Set it and forget it
- ✅ Auto-scaling handles traffic
- ✅ Auto-backups protect data
- ✅ Auto-SSL renews certificates
- ✅ Revenue tracking for charity donations

**Monthly time commitment: 1-2 hours**

---

## 💰 Cost Breakdown

### Google Cloud Costs (Monthly)
| Service | Purpose | Cost |
|---------|---------|------|
| GKE Cluster (e2-medium × 2) | Application hosting | $60 |
| Cloud SQL PostgreSQL (db-f1-micro) | Database | $15 |
| Load Balancer | Traffic distribution | $18 |
| Storage & Bandwidth | Files & data transfer | $5-10 |
| **Total** | | **~$100/month** |

### Revenue Model (Conservative Estimate)
| Platform | Monthly Revenue | Notes |
|----------|----------------|-------|
| Dating App (youandinotai.com) | $999 | 100 users × $9.99/month |
| AI Marketplace (ai-solutions.store) | $500 | 10% commission on sales |
| DAO Treasury Growth | Variable | Community contributions |
| **Total Revenue** | **~$1,500/month** | |

**Profit for Charity: ~$1,400/month = $16,800/year** 🎉

---

## 🚀 One-Command Deployment

### Prerequisites

1. **Google Cloud Account**
   - Email: joshlcoleman@gmail.com
   - Project: elevated-module-462113-f0 (already set up!)
   - Billing enabled: ✅

2. **Install Google Cloud SDK**
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Linux
   curl https://sdk.cloud.google.com | bash

   # Windows
   # Download from: https://cloud.google.com/sdk/install
   ```

3. **Login to Google Cloud**
   ```bash
   gcloud auth login
   gcloud config set project elevated-module-462113-f0
   ```

### Deploy Everything (One Command!)

```bash
# Navigate to GCP directory
cd infra/gcp

# Make script executable
chmod +x deploy-to-gke.sh

# Run deployment
./deploy-to-gke.sh
```

**That's it!** ☕ Grab coffee for 10-15 minutes while it sets up.

---

## 📋 What Gets Deployed

### Infrastructure
- ✅ GKE Kubernetes cluster (2-10 nodes auto-scaling)
- ✅ Cloud SQL PostgreSQL database (automated backups)
- ✅ NGINX Ingress Controller (load balancing)
- ✅ cert-manager (automatic SSL certificates)
- ✅ Let's Encrypt ClusterIssuer (free SSL)

### Namespaces
- `ai-solutions` - Main applications
- `dao-platform` - DAO governance
- `claudedroid-ai` - AI platform services
- `marketplace` - Marketplace application
- `unified-dashboard` - Control hub
- `ai-models` - AI model servers

### Security
- ✅ Automatic secret generation (JWT, passwords)
- ✅ Private database (no public IP)
- ✅ Network policies (coming soon)
- ✅ Auto-renewal SSL certificates

---

## 🌐 DNS Configuration

After deployment completes, you'll get a **Load Balancer IP** (e.g., 34.123.45.67).

### IONOS Setup

1. **Login**: https://www.ionos.com
2. **Domains & SSL** → Select domain → **DNS**
3. **Add these A records:**

| Domain | Host | Points To | TTL |
|--------|------|-----------|-----|
| aidoesitall.org | @ | YOUR_LB_IP | 3600 |
| aidoesitall.org | www | YOUR_LB_IP | 3600 |
| ai-solutions.store | @ | YOUR_LB_IP | 3600 |
| ai-solutions.store | www | YOUR_LB_IP | 3600 |
| ai-solutions.store | ai | YOUR_LB_IP | 3600 |
| ai-solutions.store | api | YOUR_LB_IP | 3600 |
| ai-solutions.store | dashboard | YOUR_LB_IP | 3600 |

### Namecheap Setup

1. **Login**: https://www.namecheap.com
2. **Domain List** → **Manage** → **Advanced DNS**
3. **Add same A records as above**

**DNS propagation: 5-30 minutes**

---

## 📦 Deploy Applications

After DNS is configured:

```bash
# Deploy all platforms
helm install multi-platform ./infra/helm/multi-platform \
  --namespace ai-solutions \
  --values ./infra/helm/multi-platform/values-prod.yaml \
  --wait

# Watch deployment
kubectl get pods -n ai-solutions --watch
```

**Expected pods:**
- dao-platform-xxx (2 replicas)
- claudedroid-ai-xxx (3 replicas)
- marketplace-xxx (3 replicas)
- dashboard-xxx (2 replicas)
- localai-xxx (2 replicas with GPU)
- ollama-xxx (1 replica with GPU)

---

## ✅ Verification

### 1. Check Cluster Status
```bash
# All nodes running
kubectl get nodes

# All pods running
kubectl get pods -n ai-solutions

# Services with external IPs
kubectl get svc -n ai-solutions
```

### 2. Check SSL Certificates
```bash
# Wait 5-10 minutes after DNS propagates
kubectl get certificates -n ai-solutions

# Should show:
# dao-platform-tls         True    Ready
# marketplace-tls          True    Ready
```

### 3. Test URLs
```bash
# Should all return 200 or redirect
curl -I https://aidoesitall.org
curl -I https://ai-solutions.store
curl -I https://ai.ai-solutions.store
curl -I https://dashboard.ai-solutions.store
```

### 4. Access Dashboard
Open https://dashboard.ai-solutions.store

You should see:
- ✅ Platform health indicators
- ✅ Revenue metrics
- ✅ User statistics
- ✅ Charity donation tracker

---

## 🔄 Automated Features

### Auto-Scaling
**GKE automatically scales pods based on CPU usage:**
- Minimum: 1 pod per service
- Maximum: 10 pods per service
- Trigger: 70% CPU utilization

**You do nothing!** GKE handles all scaling.

### Auto-Backups
**Cloud SQL automated backups:**
- Daily at 3:00 AM UTC
- 7-day retention
- Point-in-time recovery (7 days)

**You do nothing!** Google handles backups.

### Auto-SSL Renewal
**cert-manager renews certificates:**
- 30 days before expiration
- Automatic re-issue
- Zero downtime

**You do nothing!** cert-manager handles SSL.

### Auto-Monitoring
**Built-in GKE monitoring:**
- Pod health checks
- Auto-restart failed pods
- Resource usage alerts

**Access via**: https://console.cloud.google.com/kubernetes

---

## 📊 Charity Revenue Tracking

### Dashboard Metrics
Access https://dashboard.ai-solutions.store to see:

1. **Total Monthly Revenue**
   - Dating app subscriptions
   - Marketplace commissions
   - DAO treasury growth

2. **Expenses**
   - Google Cloud costs
   - Stripe fees (3%)
   - Domain renewals

3. **Net Charity Donations**
   - Revenue - Expenses = Charity Amount
   - Month-over-month growth
   - Year-to-date total

### Automatic Tracking
- ✅ Stripe webhooks track payments
- ✅ Database logs all transactions
- ✅ Dashboard auto-calculates charity amount
- ✅ Monthly reports generated automatically

### Monthly Task (Only 1 hour!)
1. Review dashboard metrics (10 min)
2. Approve charity payouts (20 min)
3. Post updates to community (30 min)

**That's it!** Everything else is automated.

---

## 🛠️ Maintenance Tasks

### Weekly (15 minutes)
- ✅ Check dashboard for any alerts
- ✅ Verify all platforms are green

### Monthly (1-2 hours)
- ✅ Review charity revenue report
- ✅ Approve DAO proposals for charity payouts
- ✅ Check Google Cloud billing (should be ~$100)
- ✅ Post community update

### Quarterly (2 hours)
- ✅ Review and update platform pricing
- ✅ Analyze revenue trends
- ✅ Plan new features (if needed)

### Annually (4 hours)
- ✅ Renew domains (automated reminder)
- ✅ Tax documentation (revenue/expenses)
- ✅ Annual charity report
- ✅ Thank your community! 💙

---

## 🚨 Troubleshooting

### Pods Not Starting
```bash
# Check pod logs
kubectl logs -f <pod-name> -n ai-solutions

# Describe pod for events
kubectl describe pod <pod-name> -n ai-solutions

# Common fix: Delete and recreate
kubectl delete pod <pod-name> -n ai-solutions
# Pod auto-recreates
```

### SSL Not Working
```bash
# Check certificate status
kubectl describe certificate dao-platform-tls -n ai-solutions

# Check cert-manager logs
kubectl logs -f -n cert-manager deploy/cert-manager

# Force renewal
kubectl delete certificate dao-platform-tls -n ai-solutions
# Auto-recreates in 2-5 minutes
```

### Database Connection Issues
```bash
# Get database password
kubectl get secret multi-platform-secrets -n ai-solutions -o jsonpath='{.data.DATABASE_URL}' | base64 -d

# Test connection from pod
kubectl exec -it <pod-name> -n ai-solutions -- psql "$DATABASE_URL"
```

### High Costs
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n ai-solutions

# Scale down if needed
kubectl scale deployment dao-platform --replicas=1 -n ai-solutions
```

---

## 💙 Charity Transparency

### Monthly Report Template

```markdown
## Charity Report - [Month Year]

**Revenue Breakdown:**
- Dating App Subscriptions: $XXX
- Marketplace Commissions: $XXX
- DAO Treasury Growth: $XXX
**Total Revenue: $X,XXX**

**Expenses:**
- Google Cloud: $XXX
- Payment Processing: $XXX
- Domains & SSL: $XXX
**Total Expenses: $XXX**

**NET CHARITY DONATION: $X,XXX** 🎉

**Charity Recipients:**
- [Charity Name 1]: $XXX (approved by DAO)
- [Charity Name 2]: $XXX (approved by DAO)

**Thank you to our community for supporting kids in need!** 💙
```

### Public Dashboard
Consider making a public charity tracker at:
- https://dashboard.ai-solutions.store/charity
- Shows total raised
- Shows beneficiary charities
- Builds trust with community

---

## 📞 Support

### Google Cloud Support
- Console: https://console.cloud.google.com/support
- Documentation: https://cloud.google.com/docs
- Community: https://stackoverflow.com/questions/tagged/google-cloud-platform

### Platform Issues
- Check dashboard first: https://dashboard.ai-solutions.store
- Review GKE logs: https://console.cloud.google.com/logs
- Check pod status: `kubectl get pods -n ai-solutions`

---

## 🎯 Success Criteria

**You know deployment is successful when:**

✅ All 3 platforms accessible via HTTPS with valid SSL
✅ Dashboard shows all services "healthy"
✅ First user can sign up and pay
✅ Revenue starts tracking automatically
✅ You only spend 1-2 hours/month managing it

**CONGRATULATIONS! You're now running a fully automated charity platform!** 🎉💙

---

**Last Updated**: January 2025
**Version**: 1.0.0
**FOR THE KIDS!** 💙
