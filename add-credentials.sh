#!/bin/bash

# ============================================
# Secure Credential Setup Script
# Run this to add your Square credentials
# ============================================

echo "=== SECURE CREDENTIAL SETUP ==="
echo ""
echo "This will update your .env file with Square credentials"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Run this from the repository root directory"
    exit 1
fi

echo "Please enter your Square PRODUCTION credentials:"
echo "(Press Ctrl+C to cancel at any time)"
echo ""

# Get Square Access Token
read -p "SQUARE_ACCESS_TOKEN (starts with EAAA): " SQUARE_TOKEN
if [[ ! $SQUARE_TOKEN == EAAA* ]]; then
    echo "⚠️  Warning: Token doesn't start with EAAA (production)"
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Get Location ID
read -p "SQUARE_LOCATION_ID (starts with L): " LOCATION_ID

# Get Application ID
read -p "SQUARE_APPLICATION_ID (starts with sq0idp-): " APP_ID

echo ""
echo "Updating .env file..."

# Update .env file
sed -i "s|SQUARE_ACCESS_TOKEN=.*|SQUARE_ACCESS_TOKEN=${SQUARE_TOKEN}|g" .env
sed -i "s|SQUARE_LOCATION_ID=.*|SQUARE_LOCATION_ID=${LOCATION_ID}|g" .env
sed -i "s|SQUARE_APPLICATION_ID=.*|SQUARE_APPLICATION_ID=${APP_ID}|g" .env

echo ""
echo "✅ Credentials updated successfully!"
echo ""
echo "To verify:"
echo "  grep SQUARE .env | head -3"
echo ""
echo "⚠️  IMPORTANT: Keep .env file secure!"
echo "   - Never commit to git (already in .gitignore)"
echo "   - Backup securely (encrypted)"
echo "   - Rotate keys every 90 days"
echo ""
