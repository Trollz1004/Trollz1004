#!/bin/bash
# Bare-Metal Kubernetes Cluster Setup
# FOR THE KIDS - Self-Hosted K8s on 40 PCs 💙
#
# This script sets up a production Kubernetes cluster on your hardware:
# - Control Plane: Dell 9020 (32GB) + 2× OptiPlex (16GB) - HA 3-node control plane
# - Gateway: G1 Sniper 5 (configured separately) - Already handles network routing
# - GPU Nodes: T5500 (GTX 1070), 2× 1050Ti PCs - AI workloads
# - Database Nodes: X79 Sabertooth (64GB), EVGA X58 (48GB) - PostgreSQL
# - Workers: 20-30× OptiPlex (16GB each) - Application pods
#
# Network: 10.0.0.0/24 internal network via G1 Sniper 5 gateway
# External: 1Gbps fiber with static IP

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
K8S_VERSION="1.28"  # Kubernetes version
POD_NETWORK_CIDR="192.168.0.0/16"  # Pod network (Calico default)
SERVICE_CIDR="10.96.0.0/12"  # Service network
CONTROL_PLANE_ENDPOINT="10.0.0.13:6443"  # Dell 9020 IP
METALLB_IP_RANGE="10.0.0.50-10.0.0.70"  # Load balancer IP pool

# Node role detection
ROLE="${1:-}"

if [ -z "$ROLE" ]; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   Kubernetes Cluster Setup${NC}"
    echo -e "${BLUE}   FOR THE KIDS! 💙${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Usage: $0 <role> [node-name]"
    echo ""
    echo "Roles:"
    echo "  master     - Control plane node (run on Dell 9020, 2× OptiPlex)"
    echo "  worker     - Worker node (run on OptiPlex fleet)"
    echo "  gpu        - GPU worker (run on T5500, 1050Ti PCs)"
    echo "  database   - Database node (run on X79, EVGA X58)"
    echo ""
    echo "Examples:"
    echo "  $0 master dell-9020          # First control plane node"
    echo "  $0 master optiplex-master-2  # Second control plane node"
    echo "  $0 worker optiplex-worker-1  # Worker node"
    echo "  $0 gpu t5500                 # GPU node"
    echo "  $0 database x79-sabertooth   # Database node"
    echo ""
    exit 1
fi

NODE_NAME="${2:-$(hostname)}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Node Setup: ${NODE_NAME}${NC}"
echo -e "${BLUE}   Role: ${ROLE}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}ERROR: This script must be run as root (sudo)${NC}"
   exit 1
fi

# Step 1: System preparation
echo -e "${YELLOW}Step 1/8: Preparing system...${NC}"

# Disable swap (required for Kubernetes)
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Load required kernel modules
cat > /etc/modules-load.d/k8s.conf <<EOF
overlay
br_netfilter
EOF

modprobe overlay
modprobe br_netfilter

# Set kernel parameters
cat > /etc/sysctl.d/k8s.conf <<EOF
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

sysctl --system

echo -e "${GREEN}✓ System prepared${NC}"

# Step 2: Install container runtime (containerd)
echo ""
echo -e "${YELLOW}Step 2/8: Installing containerd...${NC}"

apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Install containerd
apt-get install -y containerd

# Configure containerd
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml

# Enable systemd cgroup driver
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml

systemctl restart containerd
systemctl enable containerd

echo -e "${GREEN}✓ Containerd installed${NC}"

# Step 3: Install Kubernetes components
echo ""
echo -e "${YELLOW}Step 3/8: Installing Kubernetes ${K8S_VERSION}...${NC}"

# Add Kubernetes repo
curl -fsSL https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v${K8S_VERSION}/deb/ /" > /etc/apt/sources.list.d/kubernetes.list

apt-get update
apt-get install -y kubelet kubeadm kubectl
apt-mark hold kubelet kubeadm kubectl

systemctl enable kubelet

echo -e "${GREEN}✓ Kubernetes components installed${NC}"

# Role-specific setup
if [ "$ROLE" == "master" ]; then
    echo ""
    echo -e "${YELLOW}Step 4/8: Initializing control plane node...${NC}"

    # Check if this is the first master
    if [ "$NODE_NAME" == "dell-9020" ] || [ ! -f /etc/kubernetes/admin.conf ]; then
        echo "Initializing FIRST control plane node..."

        kubeadm init \
            --control-plane-endpoint="${CONTROL_PLANE_ENDPOINT}" \
            --upload-certs \
            --pod-network-cidr="${POD_NETWORK_CIDR}" \
            --service-cidr="${SERVICE_CIDR}" \
            --node-name="${NODE_NAME}"

        # Set up kubectl for root
        mkdir -p $HOME/.kube
        cp -f /etc/kubernetes/admin.conf $HOME/.kube/config
        chown $(id -u):$(id -g) $HOME/.kube/config

        echo -e "${GREEN}✓ Control plane initialized${NC}"

        # Install Calico network plugin
        echo ""
        echo -e "${YELLOW}Step 5/8: Installing Calico CNI...${NC}"
        kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.26.1/manifests/calico.yaml
        echo -e "${GREEN}✓ Calico installed${NC}"

        # Install MetalLB for bare-metal load balancing
        echo ""
        echo -e "${YELLOW}Step 6/8: Installing MetalLB...${NC}"
        kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.13.12/config/manifests/metallb-native.yaml

        # Wait for MetalLB to be ready
        kubectl wait --namespace metallb-system \
            --for=condition=ready pod \
            --selector=app=metallb \
            --timeout=90s || true

        # Configure MetalLB IP pool
        cat <<EOF | kubectl apply -f -
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
  - ${METALLB_IP_RANGE}
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default
  namespace: metallb-system
spec:
  ipAddressPools:
  - default-pool
EOF

        echo -e "${GREEN}✓ MetalLB installed and configured${NC}"

        # Install NGINX Ingress Controller
        echo ""
        echo -e "${YELLOW}Step 7/8: Installing NGINX Ingress...${NC}"
        kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/baremetal/deploy.yaml
        echo -e "${GREEN}✓ NGINX Ingress installed${NC}"

        # Save join commands
        echo ""
        echo -e "${YELLOW}Step 8/8: Generating join commands...${NC}"

        # Control plane join command
        kubeadm token create --print-join-command > /root/kubeadm-join-worker.sh
        chmod +x /root/kubeadm-join-worker.sh

        # Get certificate key for control plane joins
        CERT_KEY=$(kubeadm init phase upload-certs --upload-certs 2>/dev/null | tail -1)
        echo "$(cat /root/kubeadm-join-worker.sh) --control-plane --certificate-key ${CERT_KEY}" > /root/kubeadm-join-master.sh
        chmod +x /root/kubeadm-join-master.sh

        echo -e "${GREEN}✓ Join commands saved${NC}"
        echo ""
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}   CONTROL PLANE READY! 🎉${NC}"
        echo -e "${BLUE}========================================${NC}"
        echo ""
        echo -e "${GREEN}Join additional MASTER nodes with:${NC}"
        echo -e "${YELLOW}$(cat /root/kubeadm-join-master.sh)${NC}"
        echo ""
        echo -e "${GREEN}Join WORKER nodes with:${NC}"
        echo -e "${YELLOW}$(cat /root/kubeadm-join-worker.sh)${NC}"
        echo ""
        echo -e "${GREEN}Copy /etc/kubernetes/admin.conf to your workstation to use kubectl${NC}"
        echo ""

    else
        echo "Joining ADDITIONAL control plane node..."
        echo "Run the join command from the first master:"
        echo "  /root/kubeadm-join-master.sh"
        echo ""
        echo "If you don't have it, generate on first master with:"
        echo "  kubeadm token create --print-join-command"
        echo ""
        exit 1
    fi

elif [ "$ROLE" == "worker" ] || [ "$ROLE" == "gpu" ] || [ "$ROLE" == "database" ]; then
    echo ""
    echo -e "${YELLOW}Step 4/8: Preparing ${ROLE} node...${NC}"

    # Apply node labels based on role
    if [ "$ROLE" == "gpu" ]; then
        echo "This will be a GPU node for AI workloads"
        # GPU setup happens in separate script (gpu-nodes-setup.sh)
    elif [ "$ROLE" == "database" ]; then
        echo "This will be a database node"
        # We'll label it after joining
    else
        echo "This will be a standard worker node"
    fi

    echo ""
    echo -e "${GREEN}✓ Node prepared${NC}"
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   NODE READY TO JOIN! 🎉${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Get the join command from the master node:"
    echo "   ssh root@10.0.0.13 cat /root/kubeadm-join-worker.sh"
    echo ""
    echo "2. Run the join command on this machine"
    echo ""
    echo "3. Label the node from the master:"
    if [ "$ROLE" == "gpu" ]; then
        echo "   kubectl label node ${NODE_NAME} node-role.kubernetes.io/gpu=true"
        echo "   kubectl label node ${NODE_NAME} nvidia.com/gpu=true"
    elif [ "$ROLE" == "database" ]; then
        echo "   kubectl label node ${NODE_NAME} node-role.kubernetes.io/database=true"
    else
        echo "   kubectl label node ${NODE_NAME} node-role.kubernetes.io/worker=true"
    fi
    echo ""

else
    echo -e "${RED}ERROR: Unknown role: ${ROLE}${NC}"
    echo "Valid roles: master, worker, gpu, database"
    exit 1
fi

# Install monitoring tools on all nodes
echo ""
echo -e "${YELLOW}Installing monitoring tools...${NC}"
apt-get install -y htop iotop vnstat sysstat

# Enable metrics
systemctl enable sysstat
systemctl start sysstat

echo -e "${GREEN}✓ Monitoring tools installed${NC}"

# Create node info script
cat > /usr/local/bin/node-info.sh <<'EOF'
#!/bin/bash
# Node information script

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Node Information${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${GREEN}Hostname:${NC} $(hostname)"
echo -e "${GREEN}IP Address:${NC} $(hostname -I | awk '{print $1}')"
echo -e "${GREEN}Kubernetes Version:${NC} $(kubelet --version 2>/dev/null || echo 'Not running')"
echo -e "${GREEN}Containerd Status:${NC} $(systemctl is-active containerd)"
echo -e "${GREEN}Kubelet Status:${NC} $(systemctl is-active kubelet)"
echo ""

echo -e "${GREEN}System Resources:${NC}"
echo -e "  CPU: $(nproc) cores"
echo -e "  RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo -e "  Disk: $(df -h / | awk 'NR==2 {print $2}')"
echo ""

if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}GPU Information:${NC}"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
    echo ""
fi

if [ -f /etc/kubernetes/admin.conf ]; then
    echo -e "${GREEN}Cluster Status:${NC}"
    kubectl get nodes 2>/dev/null || echo "Not in cluster yet"
    echo ""
fi

echo -e "${GREEN}Uptime:${NC} $(uptime -p)"
echo -e "${GREEN}Load:${NC} $(uptime | awk -F'load average:' '{print $2}')"
echo ""
EOF

chmod +x /usr/local/bin/node-info.sh

echo ""
echo -e "${GREEN}Run 'node-info.sh' anytime to check node status${NC}"
echo ""
echo -e "${BLUE}FOR THE KIDS! 💙 Node setup complete!${NC}"
echo ""
