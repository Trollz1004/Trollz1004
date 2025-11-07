#!/bin/bash
# Quick OAuth flow test script

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}=========================================="
echo "Testing Anthropic OAuth Flow"
echo "==========================================${NC}"
echo ""

# Check if server is running
if ! curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend server is not running!${NC}"
    echo "Please start it with:"
    echo "  cd /home/user/Trollz1004/date-app-dashboard/backend"
    echo "  npm start"
    exit 1
fi

echo -e "${GREEN}✓ Backend server is running${NC}"
echo ""

# Step 1: Login
echo -e "${YELLOW}Step 1: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456789"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}Login failed!${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Login successful${NC}"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get authorization URL
echo -e "${YELLOW}Step 2: Getting authorization URL...${NC}"
AUTH_RESPONSE=$(curl -s -X GET http://localhost:4000/api/oauth/anthropic/authorize \
  -H "Authorization: Bearer $TOKEN")

AUTH_URL=$(echo "$AUTH_RESPONSE" | jq -r '.authorizationUrl')

if [ "$AUTH_URL" == "null" ] || [ -z "$AUTH_URL" ]; then
    echo -e "${RED}Failed to get authorization URL!${NC}"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Authorization URL generated${NC}"
echo ""
echo -e "${YELLOW}=========================================="
echo "Next Steps:"
echo "==========================================${NC}"
echo ""
echo "1. Visit this URL in your browser:"
echo -e "${GREEN}${AUTH_URL}${NC}"
echo ""
echo "2. After authorizing, you'll be redirected to the callback URL"
echo ""
echo "3. Check OAuth status with:"
echo "   curl -X GET http://localhost:4000/api/oauth/anthropic/status \\"
echo "     -H \"Authorization: Bearer $TOKEN\""
echo ""
echo "4. To use the Anthropic API, see examples in:"
echo "   docs/ANTHROPIC_OAUTH_SETUP.md"
echo ""

# Step 3: Check current status
echo -e "${YELLOW}Step 3: Checking current OAuth status...${NC}"
STATUS_RESPONSE=$(curl -s -X GET http://localhost:4000/api/oauth/anthropic/status \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | jq '.'
echo ""

AUTHORIZED=$(echo "$STATUS_RESPONSE" | jq -r '.authorized')

if [ "$AUTHORIZED" == "true" ]; then
    echo -e "${GREEN}✓ OAuth is already authorized!${NC}"
    echo ""
    echo "You can now use the Anthropic API. Example:"
    echo ""
    echo "  # Test with a simple AI request"
    echo "  curl -X POST http://localhost:4000/api/ai/test \\"
    echo "    -H \"Authorization: Bearer $TOKEN\" \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -d '{\"prompt\":\"Say hello in a friendly way\"}'"
else
    echo -e "${YELLOW}⚠ OAuth not yet authorized${NC}"
    echo "Please visit the authorization URL above"
fi

echo ""
echo -e "${GREEN}Test complete!${NC}"
