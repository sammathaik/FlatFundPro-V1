#!/bin/bash

# Test Gupshup API Key
# This script tests if your Gupshup API key is valid by making a direct API call

echo "========================================"
echo "Gupshup API Key Validation Test"
echo "========================================"
echo ""

# Check if API key is provided
if [ -z "$1" ]; then
  echo "❌ Error: No API key provided"
  echo ""
  echo "Usage: bash test-gupshup-api-key.sh YOUR_API_KEY_HERE"
  echo ""
  echo "Example:"
  echo "  bash test-gupshup-api-key.sh abc123def456ghi789"
  echo ""
  exit 1
fi

API_KEY="$1"
TEST_PHONE="+919606555442"
TEST_MESSAGE="Test message from FlatFund Pro"

echo "Testing API Key: ${API_KEY:0:10}...${API_KEY: -5}"
echo "Test Phone: $TEST_PHONE"
echo ""
echo "Making request to Gupshup API..."
echo ""

# Make the API call
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "https://api.gupshup.io/sm/api/v1/msg" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "apikey: $API_KEY" \
  -d "channel=whatsapp" \
  -d "source=FlatFundPro" \
  -d "destination=$TEST_PHONE" \
  -d "message={\"type\":\"text\",\"text\":\"$TEST_MESSAGE\"}")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

echo "========================================"
echo "Response:"
echo "========================================"
echo "$RESPONSE_BODY"
echo ""
echo "HTTP Status: $HTTP_STATUS"
echo ""

# Interpret the results
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "202" ]; then
  if echo "$RESPONSE_BODY" | grep -q "success"; then
    echo "✅ SUCCESS: API key is valid and working!"
    echo ""
    echo "Next steps:"
    echo "1. Make sure this exact API key is set in Supabase"
    echo "2. Redeploy the edge function"
    echo "3. Test again in the application"
  elif echo "$RESPONSE_BODY" | grep -q "whitelisted"; then
    echo "✅ API KEY IS VALID!"
    echo "⚠️  Phone number needs to be whitelisted in sandbox"
    echo ""
    echo "Action required:"
    echo "1. Go to: https://www.gupshup.io/whatsappsandbox"
    echo "2. Add phone number: $TEST_PHONE"
    echo "3. Then test should work"
  else
    echo "⚠️  Unexpected response"
    echo "API key might be valid but there's another issue"
  fi
elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
  echo "❌ INVALID API KEY"
  echo ""
  echo "The API key is not recognized by Gupshup."
  echo ""
  echo "Solutions:"
  echo "1. Verify you copied the correct API key from Gupshup dashboard"
  echo "2. Check if API key is active (not expired or disabled)"
  echo "3. Try regenerating the API key in Gupshup"
  echo "4. Make sure you're logged into the correct Gupshup account"
else
  if echo "$RESPONSE_BODY" | grep -qi "portal user"; then
    echo "❌ INVALID API KEY"
    echo ""
    echo "Error: 'Portal User Not Found With APIKey'"
    echo ""
    echo "This means:"
    echo "- The API key format is recognized"
    echo "- But Gupshup doesn't have a user with this API key"
    echo ""
    echo "Solutions:"
    echo "1. Double-check you copied the FULL API key"
    echo "2. Make sure there are no spaces at start or end"
    echo "3. Verify you're using the correct Gupshup account"
    echo "4. Try regenerating the API key in Gupshup dashboard"
  else
    echo "⚠️  Unexpected response (Status: $HTTP_STATUS)"
    echo ""
    echo "The API call didn't return the expected format."
    echo "Check the response above for more details."
  fi
fi

echo ""
echo "========================================"
echo "Additional Information"
echo "========================================"
echo ""
echo "Gupshup Dashboard: https://www.gupshup.io/developer/home"
echo "WhatsApp Sandbox: https://www.gupshup.io/whatsappsandbox"
echo "API Documentation: https://docs.gupshup.io/"
echo ""
