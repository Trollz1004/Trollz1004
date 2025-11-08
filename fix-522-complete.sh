#!/bin/bash
# Complete fix for Cloudflare Error 522

echo "🔧 Fixing Cloudflare Error 522..."
echo ""

cd /opt/youandinotai

# Step 1: Check if services are running
echo "[1/5] 📊 Checking services..."
docker-compose ps
echo ""

# Step 2: Restart all services
echo "[2/5] 🔄 Restarting services..."
docker-compose restart
sleep 5
echo ""

# Step 3: Open firewall ports
echo "[3/5] 🔥 Opening firewall ports..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
echo "✅ Ports opened"
echo ""

# Step 4: Fix Nginx config
echo "[4/5] ⚙️  Updating Nginx config..."
cat > config/nginx.conf <<'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;

        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
EOF

docker-compose restart nginx
sleep 3
echo "✅ Nginx updated"
echo ""

# Step 5: Test
echo "[5/5] 🧪 Testing..."
echo ""

# Test local API
echo "Testing API directly..."
curl -s http://localhost:3000/health | head -20
echo ""

# Test through Nginx
echo "Testing through Nginx..."
curl -s http://localhost/health | head -20
echo ""

echo "✅ Fix complete!"
echo ""
echo "📊 Next steps:"
echo "1. Test direct IP: http://71.52.23.215/health"
echo "2. If that works, turn OFF Cloudflare proxy (gray cloud)"
echo "3. Then test: http://youandinotai.com/health"
echo "4. Once working, turn proxy back ON"
