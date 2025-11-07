#!/bin/bash
# G1 Sniper 5 Dual NIC Gateway Configuration
# FOR THE KIDS - Network Gateway Setup 💙
#
# This configures the G1 Sniper 5 Assassin (32GB RAM, i7, Dual Ethernet) as:
# - External gateway (WAN) - Public IP from 1Gbps fiber
# - Internal gateway (LAN) - 10.0.0.1 for cluster network
# - Load balancer (MetalLB)
# - Firewall and routing
# - DDoS protection
#
# Hardware: G1 Sniper 5 Assassin with 2× Ethernet ports

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXTERNAL_INTERFACE="eth0"  # WAN - Public internet (1Gbps fiber)
INTERNAL_INTERFACE="eth1"  # LAN - Internal cluster network
INTERNAL_NETWORK="10.0.0.0/24"
GATEWAY_IP="10.0.0.1"
DNS_SERVERS="8.8.8.8,8.8.4.4,1.1.1.1"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   G1 Sniper 5 Gateway Configuration${NC}"
echo -e "${BLUE}   FOR THE KIDS! 💙${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}ERROR: This script must be run as root (sudo)${NC}"
   exit 1
fi

# Detect available network interfaces
echo -e "${YELLOW}Detecting network interfaces...${NC}"
ip link show
echo ""
echo -e "${YELLOW}Available interfaces:${NC}"
ls /sys/class/net/ | grep -v lo
echo ""

# Prompt for interface names if different
read -p "External interface (default: eth0): " EXT_INPUT
EXTERNAL_INTERFACE=${EXT_INPUT:-$EXTERNAL_INTERFACE}

read -p "Internal interface (default: eth1): " INT_INPUT
INTERNAL_INTERFACE=${INT_INPUT:-$INTERNAL_INTERFACE}

echo ""
echo -e "${GREEN}Configuration:${NC}"
echo -e "  External (WAN): ${EXTERNAL_INTERFACE}"
echo -e "  Internal (LAN): ${INTERNAL_INTERFACE} → ${GATEWAY_IP}"
echo -e "  Internal Network: ${INTERNAL_NETWORK}"
echo ""

read -p "Continue with this configuration? (y/n): " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    echo "Aborted."
    exit 1
fi

# Install required packages
echo ""
echo -e "${YELLOW}Installing required packages...${NC}"
apt-get update
apt-get install -y \
    iptables \
    iptables-persistent \
    netfilter-persistent \
    dnsmasq \
    net-tools \
    bridge-utils \
    fail2ban \
    ufw

# Configure internal interface with static IP
echo ""
echo -e "${YELLOW}Configuring internal interface ${INTERNAL_INTERFACE}...${NC}"

# Create netplan configuration (Ubuntu 18.04+)
if [ -d /etc/netplan ]; then
    cat > /etc/netplan/01-gateway-config.yaml <<EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    ${EXTERNAL_INTERFACE}:
      dhcp4: yes
      dhcp6: no
      nameservers:
        addresses: [${DNS_SERVERS}]
    ${INTERNAL_INTERFACE}:
      dhcp4: no
      dhcp6: no
      addresses:
        - ${GATEWAY_IP}/24
EOF

    netplan apply
    echo -e "${GREEN}✓ Netplan configuration applied${NC}"
else
    # Fallback to /etc/network/interfaces (Debian/older Ubuntu)
    cat > /etc/network/interfaces.d/${INTERNAL_INTERFACE} <<EOF
auto ${INTERNAL_INTERFACE}
iface ${INTERNAL_INTERFACE} inet static
    address ${GATEWAY_IP}
    netmask 255.255.255.0
EOF

    ifdown ${INTERNAL_INTERFACE} 2>/dev/null || true
    ifup ${INTERNAL_INTERFACE}
    echo -e "${GREEN}✓ Network interfaces configured${NC}"
fi

# Enable IP forwarding
echo ""
echo -e "${YELLOW}Enabling IP forwarding...${NC}"
cat >> /etc/sysctl.conf <<EOF

# Gateway forwarding configuration
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=0
net.ipv4.conf.all.rp_filter=1
net.ipv4.conf.default.rp_filter=1
net.ipv4.tcp_syncookies=1
EOF

sysctl -p
echo -e "${GREEN}✓ IP forwarding enabled${NC}"

# Configure NAT and firewall rules
echo ""
echo -e "${YELLOW}Configuring iptables (NAT + firewall)...${NC}"

# Clear existing rules
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (port 22) from anywhere (for management)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Allow internal network traffic
iptables -A INPUT -i ${INTERNAL_INTERFACE} -j ACCEPT
iptables -A FORWARD -i ${INTERNAL_INTERFACE} -o ${EXTERNAL_INTERFACE} -j ACCEPT

# NAT for internal network (masquerade)
iptables -t nat -A POSTROUTING -o ${EXTERNAL_INTERFACE} -j MASQUERADE

# Allow forwarding from internal to external
iptables -A FORWARD -i ${INTERNAL_INTERFACE} -o ${EXTERNAL_INTERFACE} -j ACCEPT
iptables -A FORWARD -i ${EXTERNAL_INTERFACE} -o ${INTERNAL_INTERFACE} -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow HTTP/HTTPS traffic (for web services)
iptables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Allow Kubernetes API server (port 6443)
iptables -A INPUT -p tcp --dport 6443 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Allow ICMP (ping)
iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Rate limiting for SSH (prevent brute force)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP

# Log dropped packets (optional - comment out if too verbose)
# iptables -A INPUT -j LOG --log-prefix "IPTables-Dropped: " --log-level 4

# Save iptables rules
iptables-save > /etc/iptables/rules.v4
netfilter-persistent save

echo -e "${GREEN}✓ Iptables configured and saved${NC}"

# Configure DHCP server for internal network (dnsmasq)
echo ""
echo -e "${YELLOW}Configuring DHCP server (dnsmasq) for internal network...${NC}"

# Backup original config
cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup 2>/dev/null || true

cat > /etc/dnsmasq.conf <<EOF
# FOR THE KIDS - Internal Network DHCP + DNS
# G1 Sniper 5 Gateway Configuration

# Listen only on internal interface
interface=${INTERNAL_INTERFACE}
bind-interfaces

# DHCP range for cluster nodes
dhcp-range=10.0.0.10,10.0.0.200,255.255.255.0,24h

# Gateway
dhcp-option=3,${GATEWAY_IP}

# DNS servers
dhcp-option=6,${GATEWAY_IP},8.8.8.8,8.8.4.4

# Domain name
domain=cluster.local
local=/cluster.local/

# Static IP reservations (add your machines here)
# Format: dhcp-host=MAC_ADDRESS,HOSTNAME,IP_ADDRESS

# Example static IPs for critical machines:
# dhcp-host=00:11:22:33:44:55,dell-t5500,10.0.0.10
# dhcp-host=00:11:22:33:44:66,x79-sabertooth,10.0.0.11
# dhcp-host=00:11:22:33:44:77,evga-x58,10.0.0.12
# dhcp-host=00:11:22:33:44:88,dell-9020,10.0.0.13

# DNS caching
cache-size=1000

# Log queries (comment out in production)
# log-queries
log-dhcp

# Don't read /etc/resolv.conf (we are the DNS server)
no-resolv

# Upstream DNS servers
server=8.8.8.8
server=8.8.4.4
server=1.1.1.1

# Enable DNSSEC
dnssec
dnssec-check-unsigned
EOF

# Restart dnsmasq
systemctl enable dnsmasq
systemctl restart dnsmasq

echo -e "${GREEN}✓ DHCP server configured and started${NC}"

# Configure fail2ban for SSH protection
echo ""
echo -e "${YELLOW}Configuring fail2ban (SSH brute-force protection)...${NC}"

cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

echo -e "${GREEN}✓ Fail2ban configured${NC}"

# Create monitoring script
echo ""
echo -e "${YELLOW}Creating network monitoring script...${NC}"

cat > /usr/local/bin/gateway-monitor.sh <<'EOF'
#!/bin/bash
# Gateway monitoring script - FOR THE KIDS! 💙

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   G1 Sniper 5 Gateway Status${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${GREEN}Network Interfaces:${NC}"
ip -brief addr show | grep -v lo
echo ""

echo -e "${GREEN}Routing Table:${NC}"
ip route
echo ""

echo -e "${GREEN}NAT Status:${NC}"
iptables -t nat -L POSTROUTING -n -v | head -5
echo ""

echo -e "${GREEN}Active Connections:${NC}"
ss -tuln | grep LISTEN
echo ""

echo -e "${GREEN}DHCP Leases (last 10):${NC}"
tail -10 /var/lib/misc/dnsmasq.leases 2>/dev/null || echo "No leases yet"
echo ""

echo -e "${GREEN}Bandwidth Usage:${NC}"
vnstat -i eth0 --oneline 2>/dev/null || echo "Install vnstat for bandwidth monitoring: apt install vnstat"
echo ""

echo -e "${GREEN}Fail2ban Status:${NC}"
fail2ban-client status sshd 2>/dev/null || echo "Fail2ban not running"
echo ""

echo -e "${YELLOW}Gateway IP: $(hostname -I | awk '{print $1}')${NC}"
echo -e "${YELLOW}Uptime: $(uptime -p)${NC}"
echo ""
EOF

chmod +x /usr/local/bin/gateway-monitor.sh

echo -e "${GREEN}✓ Monitoring script created: /usr/local/bin/gateway-monitor.sh${NC}"

# Create systemd service for gateway (keeps it running)
echo ""
echo -e "${YELLOW}Creating gateway health check service...${NC}"

cat > /etc/systemd/system/gateway-healthcheck.service <<EOF
[Unit]
Description=Gateway Health Check - FOR THE KIDS
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/gateway-healthcheck.sh
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF

cat > /usr/local/bin/gateway-healthcheck.sh <<'EOF'
#!/bin/bash
# Gateway health check - ensures NAT and routing stay active

while true; do
    # Check if IP forwarding is enabled
    if [ "$(cat /proc/sys/net/ipv4/ip_forward)" != "1" ]; then
        echo "IP forwarding disabled! Re-enabling..."
        echo 1 > /proc/sys/net/ipv4/ip_forward
    fi

    # Check if NAT rule exists
    if ! iptables -t nat -C POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null; then
        echo "NAT rule missing! Re-adding..."
        iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
    fi

    sleep 300  # Check every 5 minutes
done
EOF

chmod +x /usr/local/bin/gateway-healthcheck.sh
systemctl daemon-reload
systemctl enable gateway-healthcheck
systemctl start gateway-healthcheck

echo -e "${GREEN}✓ Health check service enabled${NC}"

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   GATEWAY SETUP COMPLETE! 🎉${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Network Configuration:${NC}"
echo -e "  External Interface: ${EXTERNAL_INTERFACE} (DHCP from ISP)"
echo -e "  Internal Interface: ${INTERNAL_INTERFACE} → ${GATEWAY_IP}"
echo -e "  DHCP Range: 10.0.0.10 - 10.0.0.200"
echo -e "  DNS: ${GATEWAY_IP} (dnsmasq)"
echo ""
echo -e "${GREEN}Services Running:${NC}"
echo -e "  ✓ NAT/Routing (iptables)"
echo -e "  ✓ DHCP Server (dnsmasq)"
echo -e "  ✓ DNS Caching (dnsmasq)"
echo -e "  ✓ Firewall (iptables)"
echo -e "  ✓ SSH Protection (fail2ban)"
echo -e "  ✓ Health Monitoring (systemd)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Connect cluster machines to ${INTERNAL_INTERFACE} switch"
echo -e "  2. Machines will auto-receive IPs (10.0.0.10+)"
echo -e "  3. Run: gateway-monitor.sh (to check status)"
echo -e "  4. Edit /etc/dnsmasq.conf to add static IP reservations"
echo ""
echo -e "${GREEN}Monitoring Commands:${NC}"
echo -e "  gateway-monitor.sh          - Check gateway status"
echo -e "  systemctl status dnsmasq    - DHCP server status"
echo -e "  systemctl status fail2ban   - Security status"
echo -e "  iptables -L -n -v           - View firewall rules"
echo -e "  tail -f /var/log/syslog     - Live logs"
echo ""
echo -e "${BLUE}FOR THE KIDS! 💙 Gateway is ready!${NC}"
echo ""

# Show current status
/usr/local/bin/gateway-monitor.sh
