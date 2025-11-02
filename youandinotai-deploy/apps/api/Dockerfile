# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install build tools for native dependencies
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# Expose port and start app
EXPOSE 3000
CMD [ "node", "dist/index.js" ]
