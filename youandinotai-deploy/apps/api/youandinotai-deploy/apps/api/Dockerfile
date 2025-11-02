# Base image - Using slim for better native module support
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install build tools for native dependencies
RUN apt-get update && apt-get install -y python3 make g++ --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Install all dependencies (including dev) for the build step
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies for a smaller production image
RUN npm prune --production

# Expose port and start app
EXPOSE 3000
CMD [ "node", "dist/index.js" ]
