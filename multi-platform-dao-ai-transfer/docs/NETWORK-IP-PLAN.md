# Network Configuration & IP Address Plan
## FOR THE KIDS - 40-PC Datacenter Network 💙

Last Updated: January 2025

---

## 🌐 Network Overview

### External Network
- **ISP**: 1 Gbps fiber (symmetric upload/download)
- **Type**: Static public IP
- **Bandwidth**: Unlimited
- **Uptime**: Enterprise-grade

### Internal Network
- **Network**: 10.0.0.0/24
- **Gateway**: 10.0.0.1 (G1 Sniper 5 Dual NIC)
- **Usable IPs**: 10.0.0.1 - 10.0.0.254 (254 hosts)
- **DNS**: 10.0.0.1 (dnsmasq on gateway)
- **DHCP Range**: 10.0.0.10 - 10.0.0.200 (automatic assignment)

---

## 📋 Complete IP Address Allocation

### Infrastructure Tier (10.0.0.1 - 10.0.0.9)

| IP | Hostname | Hardware | Role | Notes |
|----|----------|----------|------|-------|
| 10.0.0.1 | g1-sniper-5 | G1 Sniper 5 Assassin (32GB, i7, Dual NIC) | **Gateway/Load Balancer** | External + Internal NICs |
| 10.0.0.2 | - | - | Reserved | Future backup gateway |
| 10.0.0.3 | - | - | Reserved | Future DNS |
| 10.0.0.4-9 | - | - | Reserved | Future infrastructure |

---

### GPU Tier (10.0.0.10 - 10.0.0.29)

| IP | Hostname | Hardware | Role | AI Workloads |
|----|----------|----------|------|--------------|
| **10.0.0.10** | t5500 | Dell T5500 (72GB RAM, 2× Xeon, GTX 1070 8GB) | **Primary AI Server** | Stable Diffusion XL, Mistral-7B, Whisper Large-v3 |
| **10.0.0.11** | x79-sabertooth | X79 ASUS Sabertooth (64GB RAM, i7 X-series) | **Database Primary** | PostgreSQL primary (dating app, DAO, marketplace) |
| **10.0.0.12** | evga-x58 | EVGA X58 (48GB RAM, i7 X-series) | **Monitoring + DB Replica** | Prometheus, Grafana, Loki, PostgreSQL replica |
| **10.0.0.13** | dell-9020 | Dell OptiPlex 9020 (32GB RAM, i7K) | **K8s Control Plane Master 1** | Primary Kubernetes master |
| 10.0.0.14 | optiplex-master-2 | OptiPlex (16GB RAM) | K8s Control Plane Master 2 | HA control plane |
| 10.0.0.15 | optiplex-master-3 | OptiPlex (16GB RAM) | K8s Control Plane Master 3 | HA control plane |
| 10.0.0.16-19 | - | - | Reserved | Future control plane expansion |
| **10.0.0.20** | gpu-1050ti-1 | PC #1 (TBD RAM, GTX 1050 Ti 4GB) | **Secondary AI** | Llama2-7B, Stable Diffusion 1.5 |
| **10.0.0.21** | gpu-1050ti-2 | PC #2 (TBD RAM, GTX 1050 Ti 4GB) | **Secondary AI** | CodeLlama-7B, GPT-J 6B |
| **10.0.0.22** | gpu-2gb-1 | PC (TBD RAM, 2GB GPU) | **Media Processing** | FFmpeg transcoding, thumbnails |
| **10.0.0.23** | gpu-2gb-2 | PC (TBD RAM, 2GB GPU) | **Media Processing** | Image optimization |
| **10.0.0.24** | gpu-2gb-3 | PC (TBD RAM, 2GB GPU) | **Media Processing** | Video processing |
| 10.0.0.25-29 | gpu-2gb-4/5 | PC (TBD RAM, 2GB GPU) | Media Processing | Additional GPU nodes |

---

### Worker Tier (10.0.0.30 - 10.0.0.69)

**OptiPlex Fleet**: 30× machines for application pods

| IP Range | Count | Hardware | Role | Workloads |
|----------|-------|----------|------|-----------|
| 10.0.0.30-39 | 10 | OptiPlex (16GB RAM, i5/i7) | Dating App Workers | Web frontend, API, matching engine |
| 10.0.0.40-49 | 10 | OptiPlex (16GB RAM, i5/i7) | DAO Platform Workers | Frontend, smart contract interactions |
| 10.0.0.50-59 | 10 | OptiPlex (16GB RAM, i5/i7) | Marketplace Workers | Backend, product catalog, search |
| 10.0.0.60-69 | 10 | OptiPlex (16GB RAM, i5/i7) | General Workers | Dashboard, microservices, cron jobs |

**Total Worker Capacity**:
- 30-40 machines
- ~480-640GB RAM total
- ~120-160 CPU cores total
- Can run 150-250 application pods

---

### Load Balancer IP Pool (10.0.0.70 - 10.0.0.89)

**MetalLB Virtual IPs** for Kubernetes services

| IP Range | Service | Mapped To | Notes |
|----------|---------|-----------|-------|
| 10.0.0.70 | NGINX Ingress Controller | All HTTPS traffic | Main entry point for web traffic |
| 10.0.0.71 | Dating App (internal) | Dating app service | Internal service IP |
| 10.0.0.72 | DAO Platform (internal) | DAO platform service | Internal service IP |
| 10.0.0.73 | Marketplace (internal) | Marketplace service | Internal service IP |
| 10.0.0.74 | Dashboard (internal) | Dashboard service | Internal service IP |
| 10.0.0.75 | PostgreSQL (internal) | Database cluster | Internal database IP |
| 10.0.0.76 | AI API (internal) | LocalAI/Ollama | Internal AI API |
| 10.0.0.77-89 | - | Reserved | Future services |

---

### DHCP Pool (10.0.0.100 - 10.0.0.200)

**Automatic assignment** for temporary devices, laptops, management consoles

| IP Range | Purpose | Notes |
|----------|---------|-------|
| 10.0.0.100-150 | Workstations | Admin laptops, development machines |
| 10.0.0.151-200 | Temporary devices | Testing, temporary servers |

---

### Reserved (10.0.0.201 - 10.0.0.254)

| IP Range | Purpose | Notes |
|----------|---------|-------|
| 10.0.0.201-254 | Future expansion | New services, backup nodes |

---

## 🔧 Gateway Configuration (G1 Sniper 5)

### Network Interfaces

```
┌─────────────────────────────────────────┐
│       G1 Sniper 5 Assassin              │
│       (32GB RAM, i7, Dual NIC)          │
└─────────────────────────────────────────┘
          │                    │
          │                    │
     [eth0]                [eth1]
   (External)            (Internal)
      WAN                   LAN
          │                    │
          │                    │
   Public IP            10.0.0.1/24
  (ISP DHCP)           (Static IP)
          │                    │
          ↓                    ↓
    1Gbps Fiber          Gigabit Switch
    (Internet)           (Cluster Network)
                               │
                               ↓
                         All 40 machines
                         (10.0.0.10+)
```

### NAT/Routing Configuration

**External Interface (eth0)**:
- DHCP from ISP (receives public IP)
- Firewall rules (iptables)
- DDoS protection
- Rate limiting
- Ports forwarded: 80, 443, 22

**Internal Interface (eth1)**:
- Static IP: 10.0.0.1
- DHCP server (dnsmasq)
- DNS caching
- NAT masquerade for outbound traffic

### Firewall Rules (iptables)

```bash
# Default policies
INPUT: DROP (whitelist approach)
FORWARD: DROP (explicit allow)
OUTPUT: ACCEPT

# Allowed inbound (external → gateway)
- Port 22 (SSH) - rate limited
- Port 80 (HTTP) - redirect to 443
- Port 443 (HTTPS)
- Port 6443 (Kubernetes API)

# Allowed forwarding (internal ↔ external)
- Internal → External: ALL (NAT masquerade)
- External → Internal: ESTABLISHED,RELATED only

# Internal network (full access)
- Internal → Gateway: ALL
- Gateway → Internal: ALL
```

---

## 📊 Network Segmentation

### External Traffic Flow
```
Internet (1Gbps)
    ↓
G1 Sniper 5 eth0 (Public IP)
    ↓
Firewall/NAT (iptables)
    ↓
G1 Sniper 5 eth1 (10.0.0.1)
    ↓
MetalLB VIP (10.0.0.70)
    ↓
NGINX Ingress Controller
    ↓
Kubernetes Services
    ↓
Application Pods (across all workers)
```

### Internal Traffic Flow
```
Pod A (on worker-1)
    ↓
Calico CNI (192.168.x.x)
    ↓
Service ClusterIP (10.96.x.x)
    ↓
Pod B (on worker-2)
```

### Database Traffic Flow
```
Application Pods
    ↓
PostgreSQL Service (10.0.0.75)
    ↓
x79-sabertooth (10.0.0.11) - Primary
    ├─ Synchronous replication ─→ evga-x58 (10.0.0.12) - Replica
```

---

## 🔒 Security Zones

### Zone 1: External (Untrusted)
- **Interface**: eth0 on G1 Sniper 5
- **Access**: Internet-facing
- **Security**: Maximum (firewall, rate limiting, fail2ban)
- **Allowed**: Incoming HTTPS, SSH (rate-limited)

### Zone 2: Gateway (DMZ)
- **Device**: G1 Sniper 5 both interfaces
- **Role**: Firewall, NAT, routing
- **Security**: High (locked down, monitoring)
- **Allowed**: Routing only, no application services

### Zone 3: Cluster Network (Trusted)
- **Devices**: All 40 machines (10.0.0.10+)
- **Access**: Internal only (via NAT for outbound)
- **Security**: Medium (trusted internal, firewall blocks external direct access)
- **Allowed**: Full cluster communication, internet via NAT

### Zone 4: Pod Network (Isolated)
- **Network**: 192.168.0.0/16 (Calico CNI)
- **Access**: Pod-to-pod via Kubernetes
- **Security**: Kubernetes NetworkPolicies
- **Allowed**: Defined by NetworkPolicies

---

## 🚀 DNS Configuration

### Internal DNS (dnsmasq on gateway)

**Domain**: cluster.local

**Static DNS entries** (configured in /etc/dnsmasq.conf):
```
10.0.0.1    gateway.cluster.local
10.0.0.10   t5500.cluster.local
10.0.0.11   x79-sabertooth.cluster.local
10.0.0.12   evga-x58.cluster.local
10.0.0.13   dell-9020.cluster.local
10.0.0.20   gpu-1050ti-1.cluster.local
10.0.0.21   gpu-1050ti-2.cluster.local
# ... etc
```

**Upstream DNS**:
- 8.8.8.8 (Google Public DNS)
- 8.8.4.4 (Google Public DNS)
- 1.1.1.1 (Cloudflare DNS)

### External DNS (IONOS/Namecheap)

**Public domains** pointing to gateway public IP:
- aidoesitall.org → Public IP
- ai-solutions.store → Public IP
- www.aidoesitall.org → Public IP
- ai.ai-solutions.store → Public IP
- api.ai-solutions.store → Public IP
- dashboard.ai-solutions.store → Public IP

**SSL/TLS**: cert-manager with Let's Encrypt (automatic renewal)

---

## 📈 Bandwidth Allocation

### Expected Traffic Distribution

| Service | Expected Traffic | Priority |
|---------|-----------------|----------|
| Dating App | 200-500 Mbps | High |
| Marketplace | 100-300 Mbps | Medium |
| DAO Platform | 50-100 Mbps | Medium |
| Dashboard | 10-50 Mbps | Low |
| AI API (external) | 100-200 Mbps | High |
| Database replication | 10-50 Mbps | High (internal) |
| Monitoring | 5-10 Mbps | Low (internal) |

**Total**: 500-900 Mbps average
**Capacity**: 1 Gbps (1000 Mbps)
**Headroom**: ~100-500 Mbps for spikes

### QoS (Quality of Service) - Future

If needed, implement traffic shaping on gateway:
- **Priority 1**: Database replication (ensure data consistency)
- **Priority 2**: Dating App, AI API (revenue generators)
- **Priority 3**: Marketplace, DAO
- **Priority 4**: Dashboard, monitoring

---

## 🛠️ Network Monitoring

### Tools Installed

**On Gateway (G1 Sniper 5)**:
- `vnstat` - Bandwidth monitoring
- `iptraf-ng` - Real-time traffic analysis
- `netdata` - System and network metrics

**On Monitoring Node (EVGA X58)**:
- Prometheus - Metrics collection
- Grafana - Visualization
- Loki - Log aggregation
- Jaeger - Distributed tracing

### Monitoring Commands

```bash
# Gateway traffic stats
ssh root@10.0.0.1 vnstat -i eth0 -l  # Live external traffic
ssh root@10.0.0.1 vnstat -i eth1 -l  # Live internal traffic

# Active connections
ssh root@10.0.0.1 ss -tuln | grep ESTABLISHED

# NAT connection tracking
ssh root@10.0.0.1 cat /proc/net/nf_conntrack | wc -l

# Firewall stats
ssh root@10.0.0.1 iptables -L -n -v
```

---

## 🔧 Troubleshooting

### Can't reach internet from cluster nodes

```bash
# On gateway (10.0.0.1)
cat /proc/sys/net/ipv4/ip_forward  # Should be 1
iptables -t nat -L POSTROUTING -n -v  # Should show MASQUERADE rule

# On cluster node
ping 8.8.8.8  # Test external connectivity
ping 10.0.0.1  # Test gateway connectivity
cat /etc/resolv.conf  # Should have nameserver 10.0.0.1
```

### DHCP not working

```bash
# On gateway
systemctl status dnsmasq
tail -f /var/log/syslog | grep dnsmasq

# Check leases
cat /var/lib/misc/dnsmasq.leases
```

### Slow network performance

```bash
# Check for packet loss
ping -c 100 10.0.0.10

# Check interface errors
ip -s link show eth0
ip -s link show eth1

# Check NAT conntrack limit
sysctl net.netfilter.nf_conntrack_max
cat /proc/sys/net/netfilter/nf_conntrack_count
```

### Port forwarding not working

```bash
# Verify iptables PREROUTING rules
iptables -t nat -L PREROUTING -n -v

# Check if service is listening
ss -tuln | grep <port>

# Test from external
curl -I https://aidoesitall.org
```

---

## 📋 IP Address Quick Reference

**Copy/paste for easy reference:**

```
GATEWAY:          10.0.0.1   (g1-sniper-5)

GPU/AI:
  Primary AI:     10.0.0.10  (t5500 - GTX 1070 8GB)
  Secondary AI:   10.0.0.20  (gpu-1050ti-1 - GTX 1050 Ti 4GB)
  Secondary AI:   10.0.0.21  (gpu-1050ti-2 - GTX 1050 Ti 4GB)
  Media:          10.0.0.22  (gpu-2gb-1)
  Media:          10.0.0.23  (gpu-2gb-2)
  Media:          10.0.0.24  (gpu-2gb-3)

DATABASE:
  PostgreSQL 1°:  10.0.0.11  (x79-sabertooth - 64GB)
  PostgreSQL 2°:  10.0.0.12  (evga-x58 - 48GB + monitoring)

CONTROL PLANE:
  Master 1:       10.0.0.13  (dell-9020 - 32GB)
  Master 2:       10.0.0.14  (optiplex-master-2)
  Master 3:       10.0.0.15  (optiplex-master-3)

WORKERS:
  OptiPlex:       10.0.0.30-69 (40 machines)

METALLB POOL:
  Services:       10.0.0.70-89

DHCP POOL:
  Auto-assign:    10.0.0.100-200
```

---

## 💡 Best Practices

1. **Always use static IPs for critical infrastructure**:
   - Control plane nodes
   - Database nodes
   - GPU nodes
   - Gateway

2. **Use DHCP reservations** (dnsmasq) instead of manual static IPs when possible

3. **Document IP changes** immediately in this file

4. **Test connectivity** before deploying services:
   ```bash
   # From any cluster node
   ping -c 5 10.0.0.1      # Gateway
   ping -c 5 8.8.8.8       # Internet
   ping -c 5 10.0.0.11     # Database
   ```

5. **Monitor network usage** regularly:
   ```bash
   ssh root@10.0.0.1 gateway-monitor.sh
   ```

6. **Keep firewall rules minimal** - only open required ports

7. **Use Kubernetes NetworkPolicies** for pod-to-pod access control

---

**FOR THE KIDS! 💙 Network is ready!**

**Last Updated**: January 2025
