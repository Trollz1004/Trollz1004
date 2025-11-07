#!/bin/bash
# GPU Nodes Setup for Kubernetes
# FOR THE KIDS - AI Power! 💙
#
# This script configures GPU nodes for AI workloads:
# - T5500: GTX 1070 8GB (Primary AI - Stable Diffusion XL, Mistral-7B, Whisper)
# - 2× PCs: GTX 1050 Ti 4GB (Secondary AI - Llama2-7B, CodeLlama, SD 1.5)
# - 3-5× PCs: 2GB GPUs (Media processing - FFmpeg, thumbnails, optimization)
#
# Installs: NVIDIA drivers, CUDA, Docker runtime, Kubernetes device plugin

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GPU_TYPE="${1:-auto}"  # auto, gtx1070, gtx1050ti, low-vram
NODE_NAME="${2:-$(hostname)}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   GPU Node Setup: ${NODE_NAME}${NC}"
echo -e "${BLUE}   GPU Type: ${GPU_TYPE}${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}ERROR: This script must be run as root (sudo)${NC}"
   exit 1
fi

# Detect GPU if auto
if [ "$GPU_TYPE" == "auto" ]; then
    echo -e "${YELLOW}Detecting GPU...${NC}"

    if lspci | grep -i nvidia > /dev/null; then
        GPU_INFO=$(lspci | grep -i nvidia | head -1)
        echo "Found: $GPU_INFO"

        if echo "$GPU_INFO" | grep -i "1070" > /dev/null; then
            GPU_TYPE="gtx1070"
            echo "Detected: GTX 1070 (Primary AI workloads)"
        elif echo "$GPU_INFO" | grep -i "1050" > /dev/null; then
            GPU_TYPE="gtx1050ti"
            echo "Detected: GTX 1050 Ti (Secondary AI workloads)"
        else
            GPU_TYPE="low-vram"
            echo "Detected: Lower-end GPU (Media processing workloads)"
        fi
    else
        echo -e "${RED}ERROR: No NVIDIA GPU detected!${NC}"
        exit 1
    fi
else
    echo "Using specified GPU type: $GPU_TYPE"
fi

echo ""

# Step 1: Install NVIDIA drivers
echo -e "${YELLOW}Step 1/6: Installing NVIDIA drivers...${NC}"

# Add NVIDIA driver repository
add-apt-repository -y ppa:graphics-drivers/ppa
apt-get update

# Install recommended driver
ubuntu-drivers devices
apt-get install -y ubuntu-drivers-common
ubuntu-drivers autoinstall

echo -e "${GREEN}✓ NVIDIA drivers installed${NC}"

# Step 2: Install CUDA toolkit
echo ""
echo -e "${YELLOW}Step 2/6: Installing CUDA toolkit...${NC}"

# CUDA 12.x for modern GPUs
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
dpkg -i cuda-keyring_1.1-1_all.deb
apt-get update
apt-get -y install cuda-toolkit-12-3

# Add CUDA to PATH
cat >> /etc/profile.d/cuda.sh <<EOF
export PATH=/usr/local/cuda/bin:\$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:\$LD_LIBRARY_PATH
EOF

source /etc/profile.d/cuda.sh

echo -e "${GREEN}✓ CUDA toolkit installed${NC}"

# Step 3: Install NVIDIA Container Toolkit
echo ""
echo -e "${YELLOW}Step 3/6: Installing NVIDIA Container Toolkit...${NC}"

distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update
apt-get install -y nvidia-container-toolkit

# Configure containerd for NVIDIA runtime
nvidia-ctk runtime configure --runtime=containerd
systemctl restart containerd

echo -e "${GREEN}✓ NVIDIA Container Toolkit installed${NC}"

# Step 4: Install Kubernetes NVIDIA Device Plugin
echo ""
echo -e "${YELLOW}Step 4/6: Installing NVIDIA Device Plugin for Kubernetes...${NC}"

cat > /tmp/nvidia-device-plugin.yaml <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvidia-device-plugin-daemonset
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: nvidia-device-plugin-ds
  updateStrategy:
    type: RollingUpdate
  template:
    metadata:
      labels:
        name: nvidia-device-plugin-ds
    spec:
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      nodeSelector:
        nvidia.com/gpu: "true"
      priorityClassName: "system-node-critical"
      containers:
      - image: nvcr.io/nvidia/k8s-device-plugin:v0.14.3
        name: nvidia-device-plugin-ctr
        env:
          - name: FAIL_ON_INIT_ERROR
            value: "false"
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop: ["ALL"]
        volumeMounts:
        - name: device-plugin
          mountPath: /var/lib/kubelet/device-plugins
      volumes:
      - name: device-plugin
        hostPath:
          path: /var/lib/kubelet/device-plugins
EOF

echo "Device plugin manifest saved to /tmp/nvidia-device-plugin.yaml"
echo "Apply with: kubectl apply -f /tmp/nvidia-device-plugin.yaml"

echo -e "${GREEN}✓ NVIDIA Device Plugin manifest created${NC}"

# Step 5: Configure node labels based on GPU type
echo ""
echo -e "${YELLOW}Step 5/6: Configuring node labels...${NC}"

cat > /tmp/label-node.sh <<EOF
#!/bin/bash
# Run this on the master node after joining

NODE_NAME="${NODE_NAME}"
GPU_TYPE="${GPU_TYPE}"

kubectl label node \${NODE_NAME} nvidia.com/gpu=true --overwrite
kubectl label node \${NODE_NAME} node-role.kubernetes.io/gpu=true --overwrite

if [ "\${GPU_TYPE}" == "gtx1070" ]; then
    # Primary AI workloads
    kubectl label node \${NODE_NAME} gpu-tier=primary --overwrite
    kubectl label node \${NODE_NAME} gpu-vram=8gb --overwrite
    kubectl label node \${NODE_NAME} workload=ai-primary --overwrite
    echo "Labels applied for GTX 1070 (Primary AI)"

elif [ "\${GPU_TYPE}" == "gtx1050ti" ]; then
    # Secondary AI workloads
    kubectl label node \${NODE_NAME} gpu-tier=secondary --overwrite
    kubectl label node \${NODE_NAME} gpu-vram=4gb --overwrite
    kubectl label node \${NODE_NAME} workload=ai-secondary --overwrite
    echo "Labels applied for GTX 1050 Ti (Secondary AI)"

else
    # Media processing workloads
    kubectl label node \${NODE_NAME} gpu-tier=media --overwrite
    kubectl label node \${NODE_NAME} gpu-vram=2gb --overwrite
    kubectl label node \${NODE_NAME} workload=media-processing --overwrite
    echo "Labels applied for low-VRAM GPU (Media processing)"
fi

# Apply taint to prevent non-GPU pods from scheduling
kubectl taint nodes \${NODE_NAME} nvidia.com/gpu=true:NoSchedule --overwrite

echo "Node \${NODE_NAME} configured for GPU workloads!"
EOF

chmod +x /tmp/label-node.sh

echo "Node labeling script saved to /tmp/label-node.sh"
echo "Run on master node AFTER this node joins the cluster"

echo -e "${GREEN}✓ Node configuration prepared${NC}"

# Step 6: Create GPU workload examples
echo ""
echo -e "${YELLOW}Step 6/6: Creating GPU workload examples...${NC}"

# Example: Stable Diffusion XL (GTX 1070)
cat > /tmp/stable-diffusion-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stable-diffusion-xl
  namespace: ai-solutions
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stable-diffusion-xl
  template:
    metadata:
      labels:
        app: stable-diffusion-xl
    spec:
      nodeSelector:
        gpu-tier: primary  # Only schedule on GTX 1070
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: stable-diffusion
        image: registry.k8s.io/cuda-vector-add:v0.1  # Replace with your SD image
        resources:
          limits:
            nvidia.com/gpu: 1  # Request 1 GPU
          requests:
            nvidia.com/gpu: 1
        env:
        - name: MODEL
          value: "stable-diffusion-xl-base-1.0"
---
apiVersion: v1
kind: Service
metadata:
  name: stable-diffusion-xl
  namespace: ai-solutions
spec:
  selector:
    app: stable-diffusion-xl
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
EOF

# Example: Llama2-7B (GTX 1050 Ti)
cat > /tmp/llama2-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llama2-7b
  namespace: ai-solutions
spec:
  replicas: 2  # Can run on both 1050Ti cards
  selector:
    matchLabels:
      app: llama2-7b
  template:
    metadata:
      labels:
        app: llama2-7b
    spec:
      nodeSelector:
        gpu-tier: secondary  # Schedule on GTX 1050 Ti
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: llama2
        image: ghcr.io/ggerganov/llama.cpp:latest  # Replace with your image
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
        env:
        - name: MODEL
          value: "llama-2-7b-chat.gguf"
---
apiVersion: v1
kind: Service
metadata:
  name: llama2-7b
  namespace: ai-solutions
spec:
  selector:
    app: llama2-7b
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
EOF

# Example: FFmpeg Media Processing (2GB GPUs)
cat > /tmp/media-processing-deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: media-processor
  namespace: ai-solutions
spec:
  replicas: 3  # Can run on all low-VRAM GPUs
  selector:
    matchLabels:
      app: media-processor
  template:
    metadata:
      labels:
        app: media-processor
    spec:
      nodeSelector:
        gpu-tier: media  # Schedule on 2GB GPUs
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: ffmpeg
        image: jrottenberg/ffmpeg:latest
        resources:
          limits:
            nvidia.com/gpu: 1
          requests:
            nvidia.com/gpu: 1
        command: ["sleep", "infinity"]  # Replace with actual processing job
EOF

echo "GPU workload examples saved:"
echo "  /tmp/stable-diffusion-deployment.yaml (GTX 1070)"
echo "  /tmp/llama2-deployment.yaml (GTX 1050 Ti)"
echo "  /tmp/media-processing-deployment.yaml (2GB GPUs)"

echo -e "${GREEN}✓ GPU workload examples created${NC}"

# Verify installation
echo ""
echo -e "${YELLOW}Verifying installation...${NC}"

echo "NVIDIA Driver:"
nvidia-smi --query-gpu=driver_version --format=csv,noheader || echo "NVIDIA driver not loaded (reboot required)"

echo ""
echo "CUDA Version:"
nvcc --version 2>/dev/null | grep "release" || echo "CUDA not in PATH yet (reboot required)"

echo ""
echo -e "${GREEN}✓ GPU node setup complete!${NC}"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   GPU NODE READY! 🎉${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Node: ${NODE_NAME}${NC}"
echo -e "${GREEN}GPU Type: ${GPU_TYPE}${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. REBOOT this machine to load NVIDIA drivers:"
echo "   sudo reboot"
echo ""
echo "2. After reboot, verify GPU:"
echo "   nvidia-smi"
echo ""
echo "3. Join this node to Kubernetes cluster (if not already done)"
echo ""
echo "4. On the MASTER node, apply labels:"
echo "   scp /tmp/label-node.sh root@10.0.0.13:/tmp/"
echo "   ssh root@10.0.0.13 /tmp/label-node.sh"
echo ""
echo "5. On the MASTER node, deploy NVIDIA device plugin:"
echo "   kubectl apply -f /tmp/nvidia-device-plugin.yaml"
echo ""
echo "6. Verify GPU is available in cluster:"
echo "   kubectl describe node ${NODE_NAME} | grep nvidia.com/gpu"
echo ""
echo -e "${GREEN}GPU Workload Scheduling:${NC}"
if [ "$GPU_TYPE" == "gtx1070" ]; then
    echo "  ✓ Primary AI: Stable Diffusion XL, Mistral-7B, Whisper Large-v3"
    echo "  ✓ 8GB VRAM available"
elif [ "$GPU_TYPE" == "gtx1050ti" ]; then
    echo "  ✓ Secondary AI: Llama2-7B, CodeLlama, Stable Diffusion 1.5"
    echo "  ✓ 4GB VRAM available"
else
    echo "  ✓ Media Processing: FFmpeg transcoding, thumbnails, optimization"
    echo "  ✓ 2GB VRAM available"
fi
echo ""
echo -e "${BLUE}FOR THE KIDS! 💙 GPU power ready!${NC}"
echo ""
