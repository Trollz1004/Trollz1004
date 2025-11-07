#!/bin/bash
# Ollama Installation Script for Kali Linux

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=========================================="
echo "Ollama Installation for Kali Linux"
echo "==========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}Please do not run as root${NC}"
   exit 1
fi

# Step 1: Install Ollama
echo -e "${YELLOW}Step 1: Installing Ollama...${NC}"
if command -v ollama &> /dev/null; then
    echo -e "${GREEN}✓ Ollama already installed${NC}"
    ollama --version
else
    echo "Downloading and installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo -e "${GREEN}✓ Ollama installed successfully${NC}"
fi
echo ""

# Step 2: Start Ollama service
echo -e "${YELLOW}Step 2: Starting Ollama service...${NC}"
if systemctl is-active --quiet ollama; then
    echo -e "${GREEN}✓ Ollama service already running${NC}"
else
    echo "Starting Ollama service..."
    sudo systemctl start ollama
    sudo systemctl enable ollama
    echo -e "${GREEN}✓ Ollama service started${NC}"
fi
echo ""

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
sleep 3

# Step 3: Pull recommended models
echo -e "${YELLOW}Step 3: Pulling recommended models...${NC}"
echo ""

# Llama 3.2 (3B) - Fast, general purpose
echo -e "${GREEN}Pulling Llama 3.2 (3B) - Recommended for general tasks${NC}"
ollama pull llama3.2
echo ""

# Llama 3.2 (1B) - Very fast, lightweight
echo -e "${GREEN}Pulling Llama 3.2 (1B) - Ultra-fast for simple tasks${NC}"
ollama pull llama3.2:1b
echo ""

# Mistral (7B) - Good for business tasks
echo -e "${GREEN}Pulling Mistral (7B) - Great for business applications${NC}"
ollama pull mistral
echo ""

# Step 4: Pull specialized models (optional)
echo -e "${YELLOW}Step 4: Pulling specialized models...${NC}"
echo ""

# Nomic Embed - For embeddings/semantic search
echo -e "${GREEN}Pulling Nomic Embed - For embeddings and semantic search${NC}"
ollama pull nomic-embed-text
echo ""

# CodeLlama - For code-related tasks
echo -e "${GREEN}Pulling CodeLlama (7B) - For code generation${NC}"
ollama pull codellama:7b
echo ""

# Step 5: Test installation
echo -e "${YELLOW}Step 5: Testing Ollama...${NC}"
echo ""

echo "Testing Llama 3.2..."
TEST_RESPONSE=$(ollama run llama3.2 "Say 'Hello from Ollama!' and nothing else." 2>&1 | head -n 1)
echo "Response: $TEST_RESPONSE"
echo ""

# Step 6: Display info
echo -e "${GREEN}=========================================="
echo "Installation Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Installed Models:${NC}"
ollama list
echo ""

echo -e "${YELLOW}System Information:${NC}"
echo "Ollama API: http://localhost:11434"
echo "Service status: $(systemctl is-active ollama)"
echo ""

echo -e "${YELLOW}Usage Examples:${NC}"
echo ""
echo "# Run a model interactively:"
echo "ollama run llama3.2"
echo ""
echo "# List models:"
echo "ollama list"
echo ""
echo "# Pull a new model:"
echo "ollama pull <model-name>"
echo ""
echo "# Remove a model:"
echo "ollama rm <model-name>"
echo ""
echo "# Check service status:"
echo "systemctl status ollama"
echo ""

echo -e "${YELLOW}Model Recommendations by Task:${NC}"
echo ""
echo "Fast, simple tasks:"
echo "  - llama3.2:1b (1B params, very fast)"
echo ""
echo "General purpose:"
echo "  - llama3.2 (3B params, balanced)"
echo "  - mistral (7B params, high quality)"
echo ""
echo "Code generation:"
echo "  - codellama:7b (specialized for code)"
echo ""
echo "Embeddings/Search:"
echo "  - nomic-embed-text (specialized)"
echo ""

echo -e "${YELLOW}Backend Configuration:${NC}"
echo "Your .env file should have:"
echo "  OLLAMA_ENABLED=true"
echo "  OLLAMA_BASE_URL=http://localhost:11434"
echo "  OLLAMA_DEFAULT_MODEL=llama3.2"
echo ""

echo -e "${GREEN}Ready to use! Start your backend server now.${NC}"
echo ""
