# Complete Hardware Inventory - Updated
## FOR THE KIDS Charity Datacenter 💙

Last Updated: January 2025

---

## 🏆 HIGH-PERFORMANCE TIER

### Machine 1: Dell T5500 (AI Powerhouse)
- **RAM**: 72GB
- **CPU**: 2× Xeon (multi-core)
- **GPU**: GTX 1070 8GB
- **Role**: Primary AI Model Server
- **Workloads**:
  - Stable Diffusion XL
  - Mistral-7B-Instruct
  - Whisper Large-v3

### Machine 2: X79 ASUS Sabertooth (Database Master)
- **RAM**: 64GB
- **CPU**: i7 X-series
- **GPU**: None
- **Role**: PostgreSQL Primary Database
- **Workloads**:
  - Dating app database
  - DAO platform database
  - Marketplace database

### Machine 3: EVGA X58 (Monitoring & Logs)
- **RAM**: 48GB
- **CPU**: i7 X-series
- **GPU**: None
- **Role**: Monitoring Stack
- **Workloads**:
  - Prometheus
  - Grafana
  - Loki (logs)
  - Jaeger (tracing)

### Machine 4: G1 Sniper 5 Assassin (Network Gateway) ⭐
- **RAM**: 32GB
- **CPU**: i7
- **GPU**: None
- **Network**: 2× Ethernet ports (DUAL NIC!)
- **Role**: Load Balancer / Gateway
- **Why Perfect**:
  - Dual NICs allow network segmentation
  - Port 1: External traffic (internet)
  - Port 2: Internal cluster network
  - Can run MetalLB, NGINX, HAProxy
- **Workloads**:
  - MetalLB (load balancer)
  - NGINX Ingress Controller
  - Firewall/routing
  - External access gateway

### Machine 5: Dell OptiPlex 9020
- **RAM**: 32GB
- **CPU**: i7K (overclockable)
- **GPU**: None
- **Role**: Kubernetes Control Plane Master 1
- **Workloads**:
  - K8s API server
  - etcd (cluster state)
  - Controller manager

---

## ⚡ GPU TIER

### Machine 6-7: PCs with GTX 1050 Ti (4GB each)
- **RAM**: TBD (likely 16-32GB each)
- **CPU**: TBD
- **GPU**: GTX 1050 Ti 4GB
- **Role**: Secondary AI Servers
- **Workloads**:
  - Machine 6: Llama2-7B, Stable Diffusion 1.5
  - Machine 7: CodeLlama-7B, GPT-J 6B

### Machine 8-10+: PCs with 2GB GPUs
- **RAM**: TBD
- **CPU**: TBD
- **GPU**: 2GB cards (multiple units)
- **Role**: Media Processing
- **Workloads**:
  - FFmpeg video transcoding
  - Image optimization
  - Thumbnail generation
  - Background tasks

---

## 🖥️ STANDARD WORKER TIER

### Machines 11-40+: OptiPlex Fleet
- **Count**: 20-40 machines
- **RAM**: ~16GB each (some 13GB models)
- **CPU**: i5/i7 (4 cores typical)
- **GPU**: Integrated graphics
- **Role**: Application Workers
- **Workloads**:
  - Dating app pods (web + API)
  - DAO platform services
  - Marketplace backend
  - Dashboard frontend
  - Microservices

**Total Worker Capacity**:
- ~320-640GB RAM total
- ~80-160 CPU cores total
- Can run 100-200 application pods

---

## 🌐 NETWORK INFRASTRUCTURE

### Internet Connection
- **Speed**: 1 Gbps up/down (1000 Mbps)
- **Type**: Static fiber
- **IP**: Static public IP (for hosting)
- **Bandwidth**: Unlimited
- **Uptime**: Enterprise-grade

### Internal Network Design
```
Internet (1Gbps)
      ↓
G1 Sniper 5 (Dual NIC Gateway)
├─ External NIC → Public internet
└─ Internal NIC → Private cluster network
      ↓
    Switch
      ↓
All other machines (private IPs)
```

**Benefits of Dual NIC Setup**:
- ✅ Security: Internal cluster traffic isolated
- ✅ Performance: Dedicated network paths
- ✅ Monitoring: Easy traffic analysis
- ✅ Failover: Can route around failures

---

## 🎯 CLUSTER ARCHITECTURE

### Control Plane (Kubernetes Masters)
1. **Dell 9020** (32GB) - Master 1
2. **OptiPlex** (16GB) - Master 2
3. **OptiPlex** (16GB) - Master 3

**Total**: 64GB RAM, high availability

### Network/Gateway Tier
1. **G1 Sniper 5** (32GB, Dual NIC) - Load Balancer

### Database Tier
1. **X79 Sabertooth** (64GB) - PostgreSQL Primary
2. **EVGA X58** (48GB) - PostgreSQL Replica

### GPU/AI Tier
1. **Dell T5500** (72GB, GTX 1070) - Primary AI
2. **PC #1** (TBD, GTX 1050 Ti) - Secondary AI
3. **PC #2** (TBD, GTX 1050 Ti) - Secondary AI
4. **3-5 PCs** (TBD, 2GB GPUs) - Media processing

### Worker Tier
1. **20-30 OptiPlex** machines - Application pods

### Monitoring Tier
1. **EVGA X58** (48GB) - Prometheus, Grafana, Loki

---

## 💰 TOTAL CAPACITY

### Compute
- **Total RAM**: ~700-900GB
- **Total CPU Cores**: ~160-200
- **Total Storage**: ~40-80TB (estimate)

### GPU
- **8GB VRAM**: 1× (GTX 1070)
- **4GB VRAM**: 2× (GTX 1050 Ti)
- **2GB VRAM**: 3-5× (various)
- **Total GPU RAM**: ~24-32GB

### Network
- **External**: 1 Gbps up/down
- **Internal**: Gigabit ethernet switches
- **Dual NIC**: 1 machine (gateway)

---

## 🚀 WHAT THIS CAN HOST

| Service | Max Capacity | Notes |
|---------|-------------|-------|
| **Dating App Users** | 100,000+ | With auto-scaling |
| **AI API Requests** | Unlimited | Self-hosted models |
| **Marketplace Listings** | 50,000+ | No database limits |
| **DAO Members** | 100,000+ | Blockchain handles scale |
| **Concurrent Connections** | 10,000+ | Load balanced |
| **Storage** | 40-80TB | Across all machines |

---

## 💸 COST ANALYSIS

### Monthly Operating Costs
```
Electricity (40 PCs @ 150W avg):      $200/month
Cooling (if needed):                   $50/month
Internet (already included):           $0
Maintenance/repairs:                   $50/month (buffer)
------------------------------------------------
TOTAL MONTHLY COST:                    $300/month
```

### Equivalent Cloud Cost
```
Compute (40× n2-standard-4):          $2,400/month
GPU instances (3× T4):                $900/month
Databases (high-RAM):                 $400/month
Storage (40TB):                       $800/month
Bandwidth (unlimited):                $500/month
Load Balancer:                        $50/month
AI API costs:                         $1,150/month
------------------------------------------------
TOTAL CLOUD COST:                     $6,200/month
```

**MONTHLY SAVINGS**: $5,900/month
**ANNUAL SAVINGS**: $70,800/year MORE FOR CHARITY! 💙

---

## 🔧 SPECIAL FEATURES

### G1 Sniper 5 Dual NIC Setup
```
eth0 (WAN): Public IP → Internet
  ├─ Firewall rules
  ├─ DDoS protection
  └─ Rate limiting

eth1 (LAN): Private 10.0.0.1 → Cluster
  ├─ MetalLB virtual IPs
  ├─ Internal DNS
  └─ Cluster communication
```

**This gives you**:
- ✅ Professional-grade network segmentation
- ✅ Security isolation
- ✅ Easy monitoring (separate interfaces)
- ✅ High availability routing

---

## 📋 DEPLOYMENT PRIORITY

### Phase 1: Core Infrastructure
1. ✅ G1 Sniper 5 → Gateway/Load Balancer
2. ✅ Dell 9020 → K8s Master 1
3. ✅ 2× OptiPlex → K8s Masters 2 & 3
4. ✅ X79 Sabertooth → Database

### Phase 2: GPU Services
1. ✅ Dell T5500 → Primary AI server
2. ✅ 2× 1050 Ti machines → Secondary AI
3. ✅ 2GB GPU machines → Media processing

### Phase 3: Workers
1. ✅ 20-30 OptiPlex → Application pods
2. ✅ Auto-scaling configured
3. ✅ Load testing

### Phase 4: Monitoring
1. ✅ EVGA X58 → Full monitoring stack
2. ✅ Alerts configured
3. ✅ Dashboards live

---

## 🎯 NEXT STEPS

**Tell me:**
1. How many machines have OS installed RIGHT NOW?
2. What IPs should I use for cluster? (10.0.0.x range?)
3. Ready to configure the G1 Sniper 5 as gateway?

**Then I'll create:**
- ✅ Dual NIC configuration for G1 Sniper 5
- ✅ Complete K8s cluster setup scripts
- ✅ GPU workload scheduling
- ✅ Load balancer configuration
- ✅ One-command deployment

---

**FOR THE KIDS! Let's build this datacenter!** 💙🚀

**Last Updated**: January 2025
