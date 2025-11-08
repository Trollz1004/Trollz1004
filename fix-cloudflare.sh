#!/bin/bash
# Fix Cloudflare connectivity issue

echo "🔧 Fixing Cloudflare connection..."

cd /opt/youandinotai

# Update Nginx config with proper domain
cat > config/nginx.conf <<'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name youandinotai.com www.youandinotai.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS
    server {
        listen 443 ssl http2;
        server_name youandinotai.com www.youandinotai.com;

        ssl_certificate /etc/letsencrypt/live/youandinotai.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/youandinotai.com/privkey.pem;

        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $real_ip;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOF

# Restart Nginx
docker-compose restart nginx

echo "✅ Nginx restarted with proper config"
echo "🧪 Testing..."

sleep 3
curl -I http://localhost:3000/health

echo ""
echo "✅ Fix complete! Test: https://youandinotai.com/health"
