# Bare-Metal Kubernetes Deployment Guide
## FOR THE KIDS - Self-Hosted 40-PC Datacenter 💙

Complete guide for deploying your multi-platform applications on your own hardware.

**Cost Savings**: $70,800/year vs cloud hosting → MORE FOR CHARITY! 💙

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Hardware Inventory](#hardware-inventory)
3. [Network Architecture](#network-architecture)
4. [Prerequisites](#prerequisites)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment](#post-deployment)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)
9. [Maintenance](#maintenance)

---

## 🎯 Overview

This deployment creates a production-grade Kubernetes cluster on your 40-PC datacenter:

- **Control Plane**: 3-node HA (Dell 9020 + 2× OptiPlex)
- **Gateway**: G1 Sniper 5 (Dual NIC) - Network gateway, load balancer, firewall
- **GPU Nodes**: 6× machines (1× GTX 1070, 2× GTX 1050 Ti, 3× 2GB GPUs)
- **Database**: 2× nodes (X79 primary, EVGA X58 replica)
- **Workers**: 30× OptiPlex machines for application pods
- **Monitoring**: EVGA X58 (Prometheus, Grafana, Loki)

### Why Self-Host?

| Cost Item | Cloud (GKE/GCP) | Self-Hosted | Savings |
|-----------|----------------|-------------|---------|
| **Compute** | $2,400/mo | $150/mo (electricity) | $2,250/mo |
| **GPU** | $900/mo | $50/mo (electricity) | $850/mo |
| **Database** | $400/mo | Included | $400/mo |
| **Storage** | $800/mo | Included | $800/mo |
| **Bandwidth** | $500/mo | Included | $500/mo |
| **Load Balancer** | $50/mo | Included | $50/mo |
| **AI APIs** | $1,150/mo | Included | $1,150/mo |
| **TOTAL** | **$6,200/mo** | **$300/mo** | **$5,900/mo** |

**ANNUAL SAVINGS**: $70,800/year → ALL FOR THE KIDS! 💙

---

## 🖥️ Hardware Inventory

### Tier 1: Infrastructure

| Machine | RAM | CPU | GPU | Role | IP |
|---------|-----|-----|-----|------|-----|
| G1 Sniper 5 Assassin | 32GB | i7 | None | Gateway (Dual NIC) | 10.0.0.1 |
| Dell OptiPlex 9020 | 32GB | i7K | None | K8s Control Plane Master 1 | 10.0.0.13 |
| OptiPlex | 16GB | i5/i7 | None | K8s Control Plane Master 2 | 10.0.0.14 |
| OptiPlex | 16GB | i5/i7 | None | K8s Control Plane Master 3 | 10.0.0.15 |

### Tier 2: GPU/AI

| Machine | RAM | CPU | GPU | VRAM | Role | IP |
|---------|-----|-----|-----|------|------|-----|
| Dell T5500 | 72GB | 2× Xeon | GTX 1070 | 8GB | Primary AI Server | 10.0.0.10 |
| PC #1 | TBD | TBD | GTX 1050 Ti | 4GB | Secondary AI | 10.0.0.20 |
| PC #2 | TBD | TBD | GTX 1050 Ti | 4GB | Secondary AI | 10.0.0.21 |
| PC #3 | TBD | TBD | 2GB GPU | 2GB | Media Processing | 10.0.0.22 |
| PC #4 | TBD | TBD | 2GB GPU | 2GB | Media Processing | 10.0.0.23 |
| PC #5 | TBD | TBD | 2GB GPU | 2GB | Media Processing | 10.0.0.24 |

### Tier 3: Database

| Machine | RAM | CPU | GPU | Role | IP |
|---------|-----|-----|-----|------|-----|
| X79 ASUS Sabertooth | 64GB | i7 X-series | None | PostgreSQL Primary | 10.0.0.11 |
| EVGA X58 | 48GB | i7 X-series | None | PostgreSQL Replica + Monitoring | 10.0.0.12 |

### Tier 4: Workers

| Count | RAM | CPU | Role | IP Range |
|-------|-----|-----|------|----------|
| 30× OptiPlex | 16GB ea | i5/i7 | Application Pods | 10.0.0.30-59 |

**Total Capacity**:
- **RAM**: ~700-900GB
- **CPU**: ~160-200 cores
- **GPU VRAM**: ~24-32GB
- **Storage**: ~40-80TB (estimated)
- **Network**: 1 Gbps fiber (unlimited bandwidth)

See [HARDWARE-INVENTORY.md](./HARDWARE-INVENTORY.md) for detailed specifications.

---

## 🌐 Network Architecture

### Physical Network Topology

```
Internet (1Gbps Fiber)
      ↓
┌─────────────────────────────────┐
│   G1 Sniper 5 Assassin          │
│   Gateway (Dual NIC)            │
│   32GB RAM, i7                  │
├─────────────────────────────────┤
│ eth0 (WAN): Public IP           │  ← External internet
│ eth1 (LAN): 10.0.0.1/24         │  ← Internal cluster
└──────────────┬──────────────────┘
               ↓
      Gigabit Switch
               ↓
    ┌──────────┴──────────┐
    ↓                     ↓
Control Plane         All Other Nodes
(3× masters)          (37 machines)
10.0.0.13-15          10.0.0.10-59
```

### Logical Network Architecture

```
External Traffic Flow:
──────────────────────
Internet
  ↓
Gateway eth0 (Public IP)
  ↓
Firewall/NAT
  ↓
Gateway eth1 (10.0.0.1)
  ↓
MetalLB VIP (10.0.0.70)
  ↓
NGINX Ingress Controller
  ↓
Kubernetes Services
  ↓
Application Pods

Internal Traffic Flow:
──────────────────────
Pod → Calico CNI (192.168.x.x)
  ↓
Service ClusterIP (10.96.x.x)
  ↓
Target Pod
```

### Network Segments

| Segment | CIDR | Purpose |
|---------|------|---------|
| External | ISP DHCP | Public internet access |
| Internal | 10.0.0.0/24 | Cluster node network |
| Pod Network | 192.168.0.0/16 | Kubernetes pod network (Calico) |
| Service Network | 10.96.0.0/12 | Kubernetes service IPs |
| MetalLB Pool | 10.0.0.70-89 | Load balancer virtual IPs |

See [NETWORK-IP-PLAN.md](./NETWORK-IP-PLAN.md) for complete IP allocation.

---

## ✅ Prerequisites

### Before You Begin

1. **All machines have Ubuntu 22.04 LTS installed**
   - Minimal installation (no GUI needed)
   - SSH enabled
   - Root access configured

2. **Network connectivity**
   - All machines connected to same switch
   - G1 Sniper 5 has both NICs connected:
     - eth0 → ISP modem/router (external)
     - eth1 → Cluster switch (internal)

3. **SSH access**
   - SSH key generated on your workstation:
     ```bash
     ssh-keygen -t rsa -b 4096
     ```
   - Public key copied to all nodes:
     ```bash
     ssh-copy-id root@10.0.0.1   # Gateway
     ssh-copy-id root@10.0.0.13  # Master 1
     # ... etc for all nodes
     ```

4. **Static IPs configured** (or DHCP reservations)
   - See [NETWORK-IP-PLAN.md](./NETWORK-IP-PLAN.md) for IP allocation
   - Alternatively, configure G1 Sniper 5 gateway first and use DHCP

5. **Domain names** (if using external access)
   - aidoesitall.org (IONOS/Namecheap)
   - ai-solutions.store (IONOS/Namecheap)
   - See [DNS-SETUP-GUIDE.md](./DNS-SETUP-GUIDE.md)

### Recommended: Install OS on All Machines

**Option 1: Ubuntu Server 22.04 LTS** (Recommended)
```bash
# Download ISO
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso

# Create bootable USB
# Use Rufus (Windows) or dd (Linux):
sudo dd if=ubuntu-22.04.3-live-server-amd64.iso of=/dev/sdX bs=4M status=progress
```

**Option 2: Automated PXE Boot** (Advanced)
- Set up PXE boot server on gateway
- Network boot all machines simultaneously
- (Not covered in this guide)

---

## 🚀 Deployment Steps

### Step 1: Configure Gateway (G1 Sniper 5)

**This is the FIRST and most important step!**

1. Ensure G1 Sniper 5 has Ubuntu 22.04 installed
2. Connect both NICs:
   - eth0 → ISP modem/router (gets public IP via DHCP)
   - eth1 → Cluster switch (will be 10.0.0.1)

3. From your workstation, copy and run gateway setup script:

```bash
# Copy script to gateway
scp infra/bare-metal/gateway-setup.sh root@<GATEWAY_TEMP_IP>:/root/

# SSH to gateway
ssh root@<GATEWAY_TEMP_IP>

# Run gateway setup (this configures dual NIC, NAT, DHCP, firewall)
chmod +x /root/gateway-setup.sh
/root/gateway-setup.sh
```

4. Follow the prompts:
   - Confirm external interface (likely eth0 or enp2s0)
   - Confirm internal interface (likely eth1 or enp3s0)
   - Script will configure:
     - Static IP 10.0.0.1 on internal interface
     - NAT/masquerading for internet access
     - DHCP server for cluster nodes
     - DNS caching
     - Firewall rules
     - Fail2ban for SSH protection

5. Verify gateway is working:

```bash
# On gateway, check status
/usr/local/bin/gateway-monitor.sh

# Should show:
# - eth0 with public IP
# - eth1 with 10.0.0.1
# - DHCP server running
# - Firewall rules active
```

**From this point on, all cluster nodes should be able to:**
- Get IP addresses via DHCP (10.0.0.10-200)
- Access internet via gateway NAT
- Resolve DNS via gateway

---

### Step 2: Set Up Kubernetes Control Plane

**Deploy 3-node HA control plane** (Dell 9020 + 2× OptiPlex)

#### 2a. Primary Master (Dell 9020)

```bash
# From your workstation

# Copy setup script
scp infra/bare-metal/k8s-cluster-setup.sh root@10.0.0.13:/root/

# SSH to Dell 9020
ssh root@10.0.0.13

# Run master setup
chmod +x /root/k8s-cluster-setup.sh
/root/k8s-cluster-setup.sh master dell-9020

# This will:
# - Install containerd
# - Install Kubernetes 1.28
# - Initialize control plane
# - Install Calico CNI
# - Install MetalLB
# - Install NGINX Ingress
# - Generate join commands
```

**Wait ~10 minutes** for control plane to initialize.

#### 2b. Copy kubeconfig to Your Workstation

```bash
# On your workstation
mkdir -p ~/.kube
scp root@10.0.0.13:/etc/kubernetes/admin.conf ~/.kube/config

# Verify connectivity
kubectl get nodes

# Should show:
# NAME        STATUS   ROLES           AGE   VERSION
# dell-9020   Ready    control-plane   5m    v1.28.x
```

#### 2c. Join Additional Masters (HA)

```bash
# Get join command from master
ssh root@10.0.0.13 cat /root/kubeadm-join-master.sh

# Copy output, then for each additional master:

# Master 2 (optiplex-master-2)
ssh root@10.0.0.14
# Paste join command here
<MASTER_JOIN_COMMAND>

# Master 3 (optiplex-master-3)
ssh root@10.0.0.15
# Paste join command here
<MASTER_JOIN_COMMAND>
```

Verify:
```bash
kubectl get nodes

# Should show 3 control-plane nodes:
# dell-9020            Ready   control-plane   10m   v1.28.x
# optiplex-master-2    Ready   control-plane   5m    v1.28.x
# optiplex-master-3    Ready   control-plane   5m    v1.28.x
```

---

### Step 3: Set Up GPU Nodes

**Configure 6× GPU machines** for AI workloads.

#### 3a. T5500 (GTX 1070 8GB) - Primary AI

```bash
# Copy scripts
scp infra/bare-metal/k8s-cluster-setup.sh root@10.0.0.10:/root/
scp infra/bare-metal/gpu-nodes-setup.sh root@10.0.0.10:/root/

# SSH to T5500
ssh root@10.0.0.10

# Set up as GPU worker
/root/k8s-cluster-setup.sh gpu t5500

# Get join command from master and run it
ssh root@10.0.0.13 cat /root/kubeadm-join-worker.sh | bash

# Install GPU drivers and CUDA
/root/gpu-nodes-setup.sh gtx1070 t5500

# REBOOT REQUIRED
reboot
```

#### 3b. GTX 1050 Ti Nodes (Secondary AI)

```bash
# Repeat for gpu-1050ti-1 (10.0.0.20) and gpu-1050ti-2 (10.0.0.21)

ssh root@10.0.0.20
# ... copy scripts, run setup, join cluster
/root/gpu-nodes-setup.sh gtx1050ti gpu-1050ti-1
reboot
```

#### 3c. 2GB GPU Nodes (Media Processing)

```bash
# Repeat for gpu-2gb-1, gpu-2gb-2, gpu-2gb-3 (10.0.0.22-24)

ssh root@10.0.0.22
# ... copy scripts, run setup, join cluster
/root/gpu-nodes-setup.sh low-vram gpu-2gb-1
reboot
```

#### 3d. Verify GPUs After Reboot

```bash
# SSH to each GPU node
ssh root@10.0.0.10 nvidia-smi

# Should show GPU info

# On workstation, check cluster GPU availability
kubectl get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.capacity.nvidia\\.com/gpu

# Should show:
# t5500           1
# gpu-1050ti-1    1
# gpu-1050ti-2    1
# gpu-2gb-1       1
# gpu-2gb-2       1
# gpu-2gb-3       1
```

---

### Step 4: Set Up Database Nodes

**Configure PostgreSQL primary + replica**

```bash
# X79 Sabertooth (Primary)
ssh root@10.0.0.11
/root/k8s-cluster-setup.sh database x79-sabertooth
<JOIN_COMMAND>

# EVGA X58 (Replica + Monitoring)
ssh root@10.0.0.12
/root/k8s-cluster-setup.sh database evga-x58
<JOIN_COMMAND>

# Label nodes for database workloads
kubectl label node x79-sabertooth node-role.kubernetes.io/database=true
kubectl label node evga-x58 node-role.kubernetes.io/database=true
```

---

### Step 5: Set Up Worker Nodes

**Add 30× OptiPlex machines** for application pods.

#### Option A: Manual (one at a time)

```bash
# For each worker (10.0.0.30-59)
ssh root@10.0.0.30

# Copy and run setup
# ... (repeat for all workers)
```

#### Option B: Automated (parallel)

```bash
# From your workstation, run deployment script
cd infra/bare-metal
./deploy-bare-metal.sh workers

# This will automatically:
# - Detect all reachable workers (10.0.0.30-59)
# - Copy setup scripts
# - Join them to cluster
# - Label them as workers
```

Verify:
```bash
kubectl get nodes

# Should show 40+ nodes total:
# - 3 control-plane
# - 6 GPU nodes
# - 2 database nodes
# - 30+ worker nodes
```

---

### Step 6: Deploy Applications

**Deploy all platforms** to the cluster.

#### 6a. Install cert-manager (SSL)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --namespace cert-manager \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/instance=cert-manager \
    --timeout=300s
```

#### 6b. Create Let's Encrypt ClusterIssuer

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: joshlcoleman@gmail.com  # Your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### 6c. Create Namespace

```bash
kubectl create namespace ai-solutions
```

#### 6d. Generate Secrets

```bash
# Generate random secrets for production
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ai-solutions
type: Opaque
stringData:
  DATABASE_URL: "postgresql://admin:$(openssl rand -base64 32)@postgresql.ai-solutions.svc.cluster.local:5432/dating_app"
  JWT_SECRET: "$(openssl rand -base64 64)"
  SESSION_SECRET: "$(openssl rand -base64 64)"
  ANTHROPIC_API_KEY: "sk-ant-REPLACE-WITH-YOUR-KEY"
  GOOGLE_GEMINI_API_KEY: "REPLACE-WITH-YOUR-KEY"
  STRIPE_SECRET_KEY: "sk_live_REPLACE-WITH-YOUR-KEY"
  STRIPE_WEBHOOK_SECRET: "whsec_REPLACE-WITH-YOUR-KEY"
EOF
```

#### 6e. Deploy All Manifests

```bash
# Apply all Kubernetes manifests
kubectl apply -f infra/k8s/

# This deploys:
# - Ingress (multi-domain routing)
# - All platform deployments
# - Services
# - ConfigMaps
# - Secrets
```

#### 6f. Wait for Pods to Start

```bash
# Watch pods coming online
kubectl get pods -n ai-solutions -w

# Should see:
# - dao-platform pods
# - claudedroid-ai pods (if deployed)
# - marketplace pods
# - dashboard pods
# - database pods
```

---

### Step 7: Configure DNS

**Point your domains to the cluster**.

#### 7a. Get Load Balancer IP

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Look for EXTERNAL-IP (MetalLB assigned, e.g., 10.0.0.70)
```

But wait! This is an **internal IP** (10.0.0.70). You need to configure **port forwarding** on your gateway to map external traffic to this IP.

#### 7b. Configure Port Forwarding on Gateway

```bash
# SSH to gateway
ssh root@10.0.0.1

# Add port forwarding rules (forward external 80/443 to MetalLB IP)
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 -j DNAT --to-destination 10.0.0.70:80
iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 443 -j DNAT --to-destination 10.0.0.70:443

# Save rules
iptables-save > /etc/iptables/rules.v4
netfilter-persistent save
```

#### 7c. Update DNS Records

Get your gateway's **public IP**:
```bash
ssh root@10.0.0.1 curl ifconfig.me
# Example: 203.0.113.45
```

Then update DNS at IONOS/Namecheap:

| Domain | Type | Host | Value | TTL |
|--------|------|------|-------|-----|
| aidoesitall.org | A | @ | YOUR_PUBLIC_IP | 3600 |
| aidoesitall.org | A | www | YOUR_PUBLIC_IP | 3600 |
| ai-solutions.store | A | @ | YOUR_PUBLIC_IP | 3600 |
| ai-solutions.store | A | www | YOUR_PUBLIC_IP | 3600 |
| ai-solutions.store | A | ai | YOUR_PUBLIC_IP | 3600 |
| ai-solutions.store | A | api | YOUR_PUBLIC_IP | 3600 |
| ai-solutions.store | A | dashboard | YOUR_PUBLIC_IP | 3600 |

See [DNS-SETUP-GUIDE.md](./DNS-SETUP-GUIDE.md) for detailed instructions.

#### 7d. Wait for SSL Certificates

```bash
# cert-manager will automatically request Let's Encrypt certificates
# Wait 5-10 minutes, then check:

kubectl get certificates -n ai-solutions

# Should show all as "Ready":
# dao-platform-tls          True
# marketplace-tls           True
```

#### 7e. Test Access

```bash
# Test each domain
curl -I https://aidoesitall.org
curl -I https://ai-solutions.store
curl -I https://dashboard.ai-solutions.store

# All should return 200 OK or redirect
```

**Open in browser** - you should see your platforms live! 🎉

---

## 📊 Post-Deployment

### Verify Everything is Working

```bash
# 1. Check all nodes are Ready
kubectl get nodes

# 2. Check all pods are Running
kubectl get pods -A

# 3. Check services have IPs
kubectl get svc -A

# 4. Check ingress has IP
kubectl get ingress -n ai-solutions

# 5. Check certificates are Ready
kubectl get certificates -n ai-solutions

# 6. Check GPU nodes have GPUs available
kubectl describe node t5500 | grep nvidia.com/gpu
```

### Access Your Platforms

- **DAO Platform**: https://aidoesitall.org
- **Marketplace**: https://ai-solutions.store
- **AI Platform**: https://ai.ai-solutions.store
- **Dashboard**: https://dashboard.ai-solutions.store

---

## 📈 Monitoring

### Prometheus + Grafana

Monitoring is deployed on **EVGA X58** (10.0.0.12).

#### Access Grafana

```bash
# Port-forward Grafana to your workstation
kubectl port-forward -n monitoring svc/grafana 3000:80

# Open browser: http://localhost:3000
# Default login: admin / admin
```

#### Pre-configured Dashboards

1. **Cluster Overview** - Node CPU, RAM, disk usage
2. **GPU Utilization** - GPU usage across all AI nodes
3. **Application Metrics** - Dating app, DAO, marketplace stats
4. **Network Traffic** - Bandwidth usage per service
5. **Charity Revenue** - Monthly revenue tracking (FOR THE KIDS! 💙)

### View Logs (Loki)

```bash
# Query logs for specific app
kubectl logs -n ai-solutions -l app=dao-platform -f

# Or use Grafana Loki dashboard
# Grafana → Explore → Select Loki → Query logs
```

### Monitoring Commands

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage
kubectl top pods -A

# GPU usage
ssh root@10.0.0.10 nvidia-smi

# Gateway network stats
ssh root@10.0.0.1 /usr/local/bin/gateway-monitor.sh
```

---

## 🔧 Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n ai-solutions

# Common issues:
# - Image pull errors (check internet connectivity)
# - Insufficient resources (check node capacity)
# - Secret not found (verify secrets created)
```

### No Internet Access from Pods

```bash
# Test from a pod
kubectl run test --image=alpine -it --rm -- ping 8.8.8.8

# If fails, check gateway NAT:
ssh root@10.0.0.1
iptables -t nat -L POSTROUTING -n -v  # Should show MASQUERADE rule
cat /proc/sys/net/ipv4/ip_forward      # Should be 1
```

### SSL Certificates Not Issuing

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager -f

# Check certificate status
kubectl describe certificate dao-platform-tls -n ai-solutions

# Common issues:
# - DNS not propagated yet (wait 30 min)
# - Port 80 not forwarded on gateway
# - cert-manager not running
```

### GPU Not Detected in Cluster

```bash
# Check GPU node has drivers loaded
ssh root@10.0.0.10 nvidia-smi

# Check NVIDIA device plugin is running
kubectl get pods -n kube-system | grep nvidia

# Check node has GPU capacity
kubectl describe node t5500 | grep nvidia.com/gpu

# If missing, re-run GPU setup script
ssh root@10.0.0.10 /root/gpu-nodes-setup.sh gtx1070 t5500
```

### High Network Latency

```bash
# Test latency between nodes
kubectl run test --image=alpine -it --rm -- ping 10.0.0.10

# Check gateway is not overloaded
ssh root@10.0.0.1 top

# Check switch is gigabit (not 100Mbps)
ssh root@10.0.0.10 ethtool eth0 | grep Speed
```

---

## 🛠️ Maintenance

### Regular Tasks

**Daily**:
- Check cluster status: `kubectl get nodes`
- Check pod health: `kubectl get pods -A`
- Monitor revenue dashboard: https://dashboard.ai-solutions.store

**Weekly**:
- Review logs for errors
- Check disk usage on all nodes
- Verify backups are running

**Monthly**:
- Update Kubernetes components
- Review and rotate secrets
- Clean up old container images

### Updating Kubernetes

```bash
# Update control plane nodes first
ssh root@10.0.0.13
apt update && apt upgrade -y kubelet kubeadm kubectl

# Then update workers
# ... (repeat for all workers)

# Drain node before update
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data

# Uncordon after update
kubectl uncordon <node>
```

### Scaling

#### Add More Workers

```bash
# Just join new machines to cluster
ssh root@<NEW_MACHINE_IP>
/root/k8s-cluster-setup.sh worker <hostname>
<JOIN_COMMAND>
```

#### Add More GPU Nodes

```bash
# Same as above, but with GPU setup
/root/k8s-cluster-setup.sh gpu <hostname>
/root/gpu-nodes-setup.sh <gpu-type> <hostname>
```

---

## 💰 Cost Tracking

### Monthly Operating Costs

| Item | Cost |
|------|------|
| Electricity (40 PCs @ 150W avg) | $200 |
| Cooling (if needed) | $50 |
| Internet (already have) | $0 |
| Maintenance buffer | $50 |
| **TOTAL** | **$300/month** |

### Revenue Priority

1. **Priority 1**: Claude AI subscription ($200/month) ← MUST be covered first!
2. **Priority 2**: Infrastructure costs ($100/month)
3. **Priority 3**: Everything else → **FOR THE KIDS!** 💙

**Goal**: $1,000/month to charity after costs

See [CHARITY-SCALING-PLAN.md](./CHARITY-SCALING-PLAN.md) for growth strategy.

---

## 🎯 Next Steps

Once deployment is complete:

1. ✅ Cluster is live and serving traffic
2. ✅ All domains have SSL certificates
3. ✅ Monitoring dashboards active
4. ✅ GPU workloads running

**Now focus on**:
1. **User acquisition** - Get users on dating app, marketplace
2. **Revenue generation** - Enable Stripe payments
3. **Monitoring** - Watch dashboards daily
4. **Charity donations** - Track monthly revenue → charity

---

## 📞 Support Resources

**Documentation**:
- [Hardware Inventory](./HARDWARE-INVENTORY.md)
- [Network IP Plan](./NETWORK-IP-PLAN.md)
- [DNS Setup Guide](./DNS-SETUP-GUIDE.md)
- [GKE Deployment Guide](./GKE-DEPLOYMENT-GUIDE.md) (cloud alternative)
- [Charity Scaling Plan](./CHARITY-SCALING-PLAN.md)

**Kubernetes Resources**:
- Official docs: https://kubernetes.io/docs/
- Troubleshooting: https://kubernetes.io/docs/tasks/debug/

**NVIDIA GPU**:
- CUDA docs: https://docs.nvidia.com/cuda/
- K8s device plugin: https://github.com/NVIDIA/k8s-device-plugin

---

## 🎉 Summary

**You now have**:
- ✅ Production Kubernetes cluster on 40 PCs
- ✅ High-availability control plane (3 nodes)
- ✅ GPU acceleration for AI workloads
- ✅ Load balancing and auto-scaling
- ✅ Automatic SSL certificates
- ✅ Full monitoring stack
- ✅ Multi-platform applications running
- ✅ **$70,800/year saved** vs cloud → MORE FOR CHARITY! 💙

**FOR THE KIDS! 💙**

---

**Last Updated**: January 2025
**Version**: 1.0.0
