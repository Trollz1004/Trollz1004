#!/bin/bash
# Run YouAndINotAI V8 locally with Docker

# Create files
mkdir -p ~/youandinotai-local && cd ~/youandinotai-local

cat > server.js << 'JS'
const express = require('express');
const app = express();
app.use(express.json());
app.get('/', (req, res) => res.json({service: 'YouAndINotAI V8', status: 'running', ein: '33-4655313'}));
app.get('/health', (req, res) => res.json({status: 'ok'}));
app.listen(8080, () => console.log('Server on http://localhost:8080'));
JS

echo '{"name":"youandinotai","version":"8.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{"express":"^4.18.2"}}' > package.json

cat > Dockerfile << 'DOCKER'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm","start"]
DOCKER

# Build and run
docker build -t youandinotai .
docker run -d -p 8080:8080 --name youandinotai youandinotai

echo ""
echo "✅ Running at: http://localhost:8080"
echo "✅ Health: http://localhost:8080/health"
echo ""
echo "View logs: docker logs youandinotai"
echo "Stop: docker stop youandinotai"
