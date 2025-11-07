#!/bin/bash
# One-Command Bare-Metal Kubernetes Deployment
# FOR THE KIDS - Deploy 40-PC Datacenter! 💙
#
# This is the master deployment script that orchestrates the entire setup:
# 1. Gateway configuration (G1 Sniper 5)
# 2. Kubernetes control plane (Dell 9020 + 2× OptiPlex)
# 3. GPU nodes (T5500, 2× 1050Ti, 2GB GPUs)
# 4. Database nodes (X79, EVGA X58)
# 5. Worker nodes (20-30× OptiPlex)
# 6. Applications deployment
#
# Usage: Run this script on your workstation (not on cluster nodes)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Network configuration
GATEWAY_IP="10.0.0.1"
GATEWAY_HOST="g1-sniper-5"

# Node IP mappings (update these with your actual IPs)
declare -A NODES=(
    # Control Plane
    ["dell-9020"]="10.0.0.13"      # Primary control plane
    ["optiplex-master-2"]="10.0.0.14"  # Secondary control plane
    ["optiplex-master-3"]="10.0.0.15"  # Tertiary control plane

    # GPU Nodes
    ["t5500"]="10.0.0.10"          # GTX 1070 8GB - Primary AI
    ["gpu-1050ti-1"]="10.0.0.20"   # GTX 1050 Ti - Secondary AI
    ["gpu-1050ti-2"]="10.0.0.21"   # GTX 1050 Ti - Secondary AI
    ["gpu-2gb-1"]="10.0.0.22"      # 2GB GPU - Media processing
    ["gpu-2gb-2"]="10.0.0.23"      # 2GB GPU - Media processing
    ["gpu-2gb-3"]="10.0.0.24"      # 2GB GPU - Media processing

    # Database Nodes
    ["x79-sabertooth"]="10.0.0.11" # PostgreSQL primary
    ["evga-x58"]="10.0.0.12"       # PostgreSQL replica + monitoring

    # Gateway
    ["g1-sniper-5"]="10.0.0.1"     # Dual NIC gateway
)

# Worker nodes (auto-generated IPs 10.0.0.30-10.0.0.60)
WORKER_START_IP="10.0.0.30"
WORKER_COUNT=30

# SSH configuration
SSH_USER="root"
SSH_KEY="${HOME}/.ssh/id_rsa"

echo -e "${BLUE}${BOLD}"
cat << "EOF"
╔════════════════════════════════════════════╗
║   BARE-METAL KUBERNETES DEPLOYMENT         ║
║   40-PC Datacenter - FOR THE KIDS! 💙      ║
╚════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if we have SSH key
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}ERROR: SSH key not found at $SSH_KEY${NC}"
    echo "Generate one with: ssh-keygen -t rsa -b 4096"
    exit 1
fi

# Check if we can reach gateway
if ! ping -c 1 -W 2 $GATEWAY_IP > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Cannot reach gateway at $GATEWAY_IP${NC}"
    echo "Make sure you're connected to the cluster network"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Function to run command on remote node
run_on_node() {
    local node=$1
    local command=$2
    local ip=${NODES[$node]:-}

    if [ -z "$ip" ]; then
        echo -e "${RED}ERROR: Unknown node: $node${NC}"
        return 1
    fi

    echo -e "${CYAN}[$node] $command${NC}"
    ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "${SSH_USER}@${ip}" "$command"
}

# Function to copy file to node
copy_to_node() {
    local node=$1
    local source=$2
    local dest=$3
    local ip=${NODES[$node]:-}

    if [ -z "$ip" ]; then
        echo -e "${RED}ERROR: Unknown node: $node${NC}"
        return 1
    fi

    echo -e "${CYAN}[$node] Copying $source → $dest${NC}"
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$source" "${SSH_USER}@${ip}:${dest}"
}

# Deployment stages
STAGE="${1:-all}"

case "$STAGE" in
    all)
        echo -e "${BOLD}Running FULL deployment (all stages)${NC}"
        ;;
    gateway)
        echo -e "${BOLD}Stage: Gateway configuration only${NC}"
        ;;
    masters)
        echo -e "${BOLD}Stage: Control plane setup only${NC}"
        ;;
    workers)
        echo -e "${BOLD}Stage: Worker nodes setup only${NC}"
        ;;
    gpu)
        echo -e "${BOLD}Stage: GPU nodes setup only${NC}"
        ;;
    apps)
        echo -e "${BOLD}Stage: Applications deployment only${NC}"
        ;;
    *)
        echo "Usage: $0 [all|gateway|masters|workers|gpu|apps]"
        exit 1
        ;;
esac

echo ""

# Stage 1: Gateway Configuration
if [ "$STAGE" == "all" ] || [ "$STAGE" == "gateway" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STAGE 1: Gateway Configuration${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo "Configuring G1 Sniper 5 as dual-NIC gateway..."

    # Copy gateway setup script
    copy_to_node "g1-sniper-5" "$(dirname $0)/gateway-setup.sh" "/root/gateway-setup.sh"

    # Run gateway setup
    run_on_node "g1-sniper-5" "chmod +x /root/gateway-setup.sh && /root/gateway-setup.sh"

    echo -e "${GREEN}✓ Gateway configured${NC}"
    echo ""
fi

# Stage 2: Control Plane Setup
if [ "$STAGE" == "all" ] || [ "$STAGE" == "masters" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STAGE 2: Control Plane Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Setup first master (Dell 9020)
    echo "Setting up primary control plane (dell-9020)..."
    copy_to_node "dell-9020" "$(dirname $0)/k8s-cluster-setup.sh" "/root/k8s-cluster-setup.sh"
    run_on_node "dell-9020" "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh master dell-9020"

    echo ""
    echo "Waiting 60 seconds for control plane to stabilize..."
    sleep 60

    # Get join commands
    echo "Retrieving join commands from master..."
    MASTER_JOIN=$(run_on_node "dell-9020" "cat /root/kubeadm-join-master.sh")
    WORKER_JOIN=$(run_on_node "dell-9020" "cat /root/kubeadm-join-worker.sh")

    # Copy kubeconfig locally
    echo "Copying kubeconfig to local machine..."
    scp -o StrictHostKeyChecking=no -i "$SSH_KEY" \
        "${SSH_USER}@${NODES['dell-9020']}:/etc/kubernetes/admin.conf" \
        "${HOME}/.kube/config"

    echo -e "${GREEN}✓ Primary control plane ready${NC}"

    # Setup additional masters
    echo ""
    echo "Setting up additional control plane nodes..."

    for master in "optiplex-master-2" "optiplex-master-3"; do
        echo "Setting up $master..."
        copy_to_node "$master" "$(dirname $0)/k8s-cluster-setup.sh" "/root/k8s-cluster-setup.sh"
        run_on_node "$master" "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh master $master"

        # Join to cluster
        run_on_node "$master" "$MASTER_JOIN"

        echo "Waiting 30 seconds..."
        sleep 30
    done

    echo -e "${GREEN}✓ High-availability control plane configured (3 nodes)${NC}"
    echo ""

    # Verify cluster
    echo "Verifying cluster status..."
    kubectl get nodes

    echo ""
fi

# Stage 3: GPU Nodes Setup
if [ "$STAGE" == "all" ] || [ "$STAGE" == "gpu" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STAGE 3: GPU Nodes Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # T5500 - GTX 1070 8GB (Primary AI)
    echo "Setting up T5500 (GTX 1070 - Primary AI)..."
    copy_to_node "t5500" "$(dirname $0)/k8s-cluster-setup.sh" "/root/k8s-cluster-setup.sh"
    copy_to_node "t5500" "$(dirname $0)/gpu-nodes-setup.sh" "/root/gpu-nodes-setup.sh"

    run_on_node "t5500" "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh gpu t5500"
    run_on_node "t5500" "$WORKER_JOIN"
    run_on_node "t5500" "chmod +x /root/gpu-nodes-setup.sh && /root/gpu-nodes-setup.sh gtx1070 t5500"

    echo "T5500 setup complete. REBOOT REQUIRED for GPU drivers."
    echo ""

    # 1050 Ti nodes (Secondary AI)
    for node in "gpu-1050ti-1" "gpu-1050ti-2"; do
        echo "Setting up $node (GTX 1050 Ti - Secondary AI)..."
        copy_to_node "$node" "$(dirname $0)/k8s-cluster-setup.sh" "/root/k8s-cluster-setup.sh"
        copy_to_node "$node" "$(dirname $0)/gpu-nodes-setup.sh" "/root/gpu-nodes-setup.sh"

        run_on_node "$node" "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh gpu $node"
        run_on_node "$node" "$WORKER_JOIN"
        run_on_node "$node" "chmod +x /root/gpu-nodes-setup.sh && /root/gpu-nodes-setup.sh gtx1050ti $node"

        echo "$node setup complete. REBOOT REQUIRED."
        echo ""
    done

    # 2GB GPU nodes (Media processing)
    for node in "gpu-2gb-1" "gpu-2gb-2" "gpu-2gb-3"; do
        echo "Setting up $node (2GB GPU - Media processing)..."
        copy_to_node "$node" "$(dirname $0)/k8s-cluster-setup.sh" "/root/k8s-cluster-setup.sh"
        copy_to_node "$node" "$(dirname $0)/gpu-nodes-setup.sh" "/root/gpu-nodes-setup.sh"

        run_on_node "$node" "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh gpu $node"
        run_on_node "$node" "$WORKER_JOIN"
        run_on_node "$node" "chmod +x /root/gpu-nodes-setup.sh && /root/gpu-nodes-setup.sh low-vram $node"

        echo "$node setup complete. REBOOT REQUIRED."
        echo ""
    done

    # Deploy NVIDIA device plugin
    echo "Deploying NVIDIA device plugin to cluster..."
    kubectl apply -f https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/v0.14.3/nvidia-device-plugin.yml

    echo -e "${GREEN}✓ GPU nodes configured (REBOOT ALL GPU NODES NOW)${NC}"
    echo ""
fi

# Stage 4: Worker Nodes Setup
if [ "$STAGE" == "all" ] || [ "$STAGE" == "workers" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STAGE 4: Worker Nodes Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo "Setting up $WORKER_COUNT OptiPlex worker nodes..."

    # Generate worker node IPs
    for i in $(seq 1 $WORKER_COUNT); do
        NODE_NAME="optiplex-worker-$i"
        NODE_IP="10.0.0.$((29 + i))"

        echo "Setting up $NODE_NAME ($NODE_IP)..."

        # Check if node is reachable
        if ! ping -c 1 -W 2 $NODE_IP > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠ $NODE_NAME not reachable, skipping...${NC}"
            continue
        fi

        # Copy and run setup script
        scp -o StrictHostKeyChecking=no -i "$SSH_KEY" \
            "$(dirname $0)/k8s-cluster-setup.sh" \
            "${SSH_USER}@${NODE_IP}:/root/k8s-cluster-setup.sh"

        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "${SSH_USER}@${NODE_IP}" \
            "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh worker $NODE_NAME"

        # Join to cluster
        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "${SSH_USER}@${NODE_IP}" "$WORKER_JOIN"

        echo -e "${GREEN}✓ $NODE_NAME joined cluster${NC}"
    done

    echo ""
    echo -e "${GREEN}✓ Worker nodes configured${NC}"
    echo ""
fi

# Stage 5: Database Nodes Setup
if [ "$STAGE" == "all" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STAGE 5: Database Nodes Setup${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    for node in "x79-sabertooth" "evga-x58"; do
        echo "Setting up $node as database node..."
        copy_to_node "$node" "$(dirname $0)/k8s-cluster-setup.sh" "/root/k8s-cluster-setup.sh"
        run_on_node "$node" "chmod +x /root/k8s-cluster-setup.sh && /root/k8s-cluster-setup.sh database $node"
        run_on_node "$node" "$WORKER_JOIN"

        # Label node
        kubectl label node "$node" node-role.kubernetes.io/database=true --overwrite

        echo -e "${GREEN}✓ $node configured${NC}"
    done

    echo ""
fi

# Stage 6: Applications Deployment
if [ "$STAGE" == "all" ] || [ "$STAGE" == "apps" ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}STAGE 6: Applications Deployment${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo "Creating namespaces..."
    kubectl create namespace ai-solutions --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -

    echo ""
    echo "Installing cert-manager for SSL..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

    echo "Waiting for cert-manager to be ready..."
    kubectl wait --namespace cert-manager \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/instance=cert-manager \
        --timeout=300s

    echo ""
    echo "Deploying applications..."

    # Apply all Kubernetes manifests
    if [ -d "$(dirname $0)/../k8s" ]; then
        kubectl apply -f "$(dirname $0)/../k8s/"
    fi

    echo -e "${GREEN}✓ Applications deployed${NC}"
    echo ""
fi

# Final summary
echo ""
echo -e "${BLUE}${BOLD}"
cat << "EOF"
╔════════════════════════════════════════════╗
║   DEPLOYMENT COMPLETE! 🎉                  ║
║   FOR THE KIDS! 💙                         ║
╚════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${GREEN}Cluster Status:${NC}"
kubectl get nodes -o wide

echo ""
echo -e "${GREEN}Services:${NC}"
kubectl get svc -A

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. REBOOT all GPU nodes to load NVIDIA drivers:"
echo "   ssh root@10.0.0.10 reboot  # T5500"
echo "   ssh root@10.0.0.20 reboot  # gpu-1050ti-1"
echo "   ssh root@10.0.0.21 reboot  # gpu-1050ti-2"
echo "   # etc..."
echo ""
echo "2. After GPU nodes reboot, verify GPUs are detected:"
echo "   kubectl get nodes -o custom-columns=NAME:.metadata.name,GPU:.status.capacity.nvidia\\.com/gpu"
echo ""
echo "3. Configure DNS records (see docs/DNS-SETUP-GUIDE.md)"
echo ""
echo "4. Monitor cluster:"
echo "   kubectl get pods -A"
echo "   kubectl top nodes"
echo ""
echo -e "${CYAN}Useful Commands:${NC}"
echo "  kubectl get nodes                  # View all nodes"
echo "  kubectl get pods -A                # View all pods"
echo "  kubectl logs -n ai-solutions <pod> # View pod logs"
echo "  kubectl describe node <node>       # Node details"
echo ""
echo -e "${BLUE}FOR THE KIDS! 💙 Cluster is live!${NC}"
echo ""

# Save cluster info
echo "Saving cluster info..."
cat > /tmp/cluster-info.txt <<EOF
BARE-METAL KUBERNETES CLUSTER - FOR THE KIDS! 💙
================================================

Deployment Date: $(date)

NETWORK CONFIGURATION:
---------------------
Gateway IP: $GATEWAY_IP (G1 Sniper 5)
Internal Network: 10.0.0.0/24
Pod Network: $POD_NETWORK_CIDR
Service Network: $SERVICE_CIDR

CONTROL PLANE NODES:
-------------------
EOF

for node in dell-9020 optiplex-master-2 optiplex-master-3; do
    echo "$node: ${NODES[$node]}" >> /tmp/cluster-info.txt
done

cat >> /tmp/cluster-info.txt <<EOF

GPU NODES:
----------
t5500 (GTX 1070 8GB): ${NODES['t5500']}
gpu-1050ti-1 (GTX 1050 Ti 4GB): ${NODES['gpu-1050ti-1']}
gpu-1050ti-2 (GTX 1050 Ti 4GB): ${NODES['gpu-1050ti-2']}

DATABASE NODES:
--------------
x79-sabertooth (PostgreSQL Primary): ${NODES['x79-sabertooth']}
evga-x58 (PostgreSQL Replica): ${NODES['evga-x58']}

WORKER NODES:
------------
30× OptiPlex machines: $WORKER_START_IP - 10.0.0.59

KUBECTL CONFIG:
--------------
Saved to: ~/.kube/config

MONITORING:
----------
Run: kubectl get nodes
Run: kubectl top nodes
Run: kubectl get pods -A

FOR THE KIDS! 💙
EOF

cat /tmp/cluster-info.txt

echo ""
echo "Cluster info saved to: /tmp/cluster-info.txt"
echo ""
