#!/bin/bash
################################################################################
# Bulk Deployment Script for 35 Dell Precision T5500 Desktops
# Automates deployment across all machines
################################################################################

set -e

echo "=========================================="
echo "BULK DEPLOYMENT TO 35 DESKTOPS"
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Desktop inventory file
INVENTORY_FILE="desktops-inventory.txt"

# Create inventory file if it doesn't exist
if [ ! -f "$INVENTORY_FILE" ]; then
    log_info "Creating desktop inventory file..."
    cat > "$INVENTORY_FILE" << 'EOF'
# Desktop Inventory - 35 Dell Precision T5500 Machines
# Format: DESKTOP_NUMBER,HOSTNAME,IP_ADDRESS,SSH_USER,SSH_PORT,STATUS
# Status: pending, deployed, failed

1,t5500-01,192.168.1.101,root,22,deployed
2,t5500-02,192.168.1.102,root,22,pending
3,t5500-03,192.168.1.103,root,22,pending
4,t5500-04,192.168.1.104,root,22,pending
5,t5500-05,192.168.1.105,root,22,pending
6,t5500-06,192.168.1.106,root,22,pending
7,t5500-07,192.168.1.107,root,22,pending
8,t5500-08,192.168.1.108,root,22,pending
9,t5500-09,192.168.1.109,root,22,pending
10,t5500-10,192.168.1.110,root,22,pending
11,t5500-11,192.168.1.111,root,22,pending
12,t5500-12,192.168.1.112,root,22,pending
13,t5500-13,192.168.1.113,root,22,pending
14,t5500-14,192.168.1.114,root,22,pending
15,t5500-15,192.168.1.115,root,22,pending
16,t5500-16,192.168.1.116,root,22,pending
17,t5500-17,192.168.1.117,root,22,pending
18,t5500-18,192.168.1.118,root,22,pending
19,t5500-19,192.168.1.119,root,22,pending
20,t5500-20,192.168.1.120,root,22,pending
21,t5500-21,192.168.1.121,root,22,pending
22,t5500-22,192.168.1.122,root,22,pending
23,t5500-23,192.168.1.123,root,22,pending
24,t5500-24,192.168.1.124,root,22,pending
25,t5500-25,192.168.1.125,root,22,pending
26,t5500-26,192.168.1.126,root,22,pending
27,t5500-27,192.168.1.127,root,22,pending
28,t5500-28,192.168.1.128,root,22,pending
29,t5500-29,192.168.1.129,root,22,pending
30,t5500-30,192.168.1.130,root,22,pending
31,t5500-31,192.168.1.131,root,22,pending
32,t5500-32,192.168.1.132,root,22,pending
33,t5500-33,192.168.1.133,root,22,pending
34,t5500-34,192.168.1.134,root,22,pending
35,t5500-35,192.168.1.135,root,22,pending
EOF
    log_warning "Please edit '$INVENTORY_FILE' with your actual desktop IPs and credentials"
    log_info "Run: nano $INVENTORY_FILE"
    exit 1
fi

# Function to deploy to a single desktop
deploy_to_desktop() {
    local number=$1
    local hostname=$2
    local ip=$3
    local user=$4
    local port=$5

    log_info "[$number/35] Deploying to $hostname ($ip)..."

    # Test SSH connectivity
    if ! ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -p "$port" "$user@$ip" "echo 'SSH OK'" &>/dev/null; then
        log_error "[$number/35] Cannot connect to $hostname ($ip) via SSH"
        return 1
    fi

    # Copy setup scripts
    log_info "[$number/35] Copying setup scripts..."
    scp -P "$port" setup-t5500-base.sh deploy-platform.sh "$user@$ip:/tmp/" &>/dev/null

    # Copy .env file
    if [ -f ".env" ]; then
        log_info "[$number/35] Copying .env configuration..."
        scp -P "$port" .env "$user@$ip:/tmp/" &>/dev/null
    fi

    # Run base setup
    log_info "[$number/35] Running base system setup..."
    ssh -p "$port" "$user@$ip" "chmod +x /tmp/setup-t5500-base.sh && /tmp/setup-t5500-base.sh" &>/dev/null || {
        log_error "[$number/35] Base setup failed"
        return 1
    }

    # Copy .env to app directory
    if [ -f ".env" ]; then
        ssh -p "$port" "$user@$ip" "cp /tmp/.env /opt/youandinotai/app/.env" &>/dev/null
    fi

    # Run platform deployment
    log_info "[$number/35] Deploying platform..."
    ssh -p "$port" "$user@$ip" "cd /opt/youandinotai/app && chmod +x /tmp/deploy-platform.sh && /tmp/deploy-platform.sh" &>/dev/null || {
        log_error "[$number/35] Platform deployment failed"
        return 1
    }

    log_success "[$number/35] $hostname deployed successfully!"
    return 0
}

# Parse command line arguments
PARALLEL=false
MAX_PARALLEL=5
START_FROM=1

while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)
            PARALLEL=true
            shift
            ;;
        --max-parallel)
            MAX_PARALLEL="$2"
            shift 2
            ;;
        --start-from)
            START_FROM="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Read inventory and deploy
DEPLOYED=0
FAILED=0
SKIPPED=0

log_info "Starting bulk deployment..."
log_info "Parallel mode: $PARALLEL"
log_info "Max parallel: $MAX_PARALLEL"
log_info "Starting from: Desktop #$START_FROM"
echo ""

# Create temporary directory for logs
LOGDIR="deployment-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOGDIR"

# Process inventory
while IFS=',' read -r number hostname ip user port status; do
    # Skip comments and empty lines
    [[ "$number" =~ ^#.*$ ]] && continue
    [[ -z "$number" ]] && continue

    # Skip if already deployed
    if [ "$status" == "deployed" ]; then
        log_success "Desktop #$number ($hostname) already deployed, skipping"
        ((SKIPPED++))
        continue
    fi

    # Skip if before start point
    if [ "$number" -lt "$START_FROM" ]; then
        ((SKIPPED++))
        continue
    fi

    # Deploy
    if [ "$PARALLEL" == true ]; then
        # Deploy in background
        (
            deploy_to_desktop "$number" "$hostname" "$ip" "$user" "$port" &> "$LOGDIR/desktop-$number.log"
            if [ $? -eq 0 ]; then
                echo "$number,success" >> "$LOGDIR/results.txt"
            else
                echo "$number,failed" >> "$LOGDIR/results.txt"
            fi
        ) &

        # Limit parallel jobs
        while [ $(jobs -r | wc -l) -ge $MAX_PARALLEL ]; do
            sleep 1
        done
    else
        # Deploy sequentially
        deploy_to_desktop "$number" "$hostname" "$ip" "$user" "$port" 2>&1 | tee "$LOGDIR/desktop-$number.log"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            ((DEPLOYED++))
            # Update inventory
            sed -i "s/^$number,\(.*\),pending$/$number,\1,deployed/" "$INVENTORY_FILE"
        else
            ((FAILED++))
            sed -i "s/^$number,\(.*\),pending$/$number,\1,failed/" "$INVENTORY_FILE"
        fi
    fi

done < "$INVENTORY_FILE"

# Wait for all background jobs if parallel
if [ "$PARALLEL" == true ]; then
    log_info "Waiting for all deployments to complete..."
    wait

    # Count results
    if [ -f "$LOGDIR/results.txt" ]; then
        DEPLOYED=$(grep -c ",success" "$LOGDIR/results.txt" || echo 0)
        FAILED=$(grep -c ",failed" "$LOGDIR/results.txt" || echo 0)
    fi
fi

# Display summary
echo ""
echo "=========================================="
log_success "BULK DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  Deployed:  $DEPLOYED desktops"
echo "  Failed:    $FAILED desktops"
echo "  Skipped:   $SKIPPED desktops"
echo ""
echo "Logs saved to: $LOGDIR/"
echo ""

if [ $FAILED -gt 0 ]; then
    log_warning "Some deployments failed. Check logs in $LOGDIR/"
    echo ""
    echo "To retry failed deployments:"
    echo "  ./bulk-deploy.sh --start-from <desktop_number>"
fi

echo ""
echo "All Systems Status:"
echo "  Check with: ./check-all-desktops.sh"
echo ""
