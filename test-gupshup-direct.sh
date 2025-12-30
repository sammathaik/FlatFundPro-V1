#!/bin/bash

# Direct test of Gupshup API with current credentials
# This will show the exact error message from Gupshup

GUPSHUP_API_KEY="rqam3m2adfkf2isvpn0x2v6wgdjws3zw"
GUPSHUP_APP_NAME="fc27d30f_a1e9_e84c_cd55_0de6ee10b598"
PHONE="+919686394010"

echo "============================================"
echo "Testing Gupshup API Directly"
echo "============================================"
echo "Phone: $PHONE"
echo "App Name: $GUPSHUP_APP_NAME"
echo "API Key: ${GUPSHUP_API_KEY:0:10}...${GUPSHUP_API_KEY: -4}"
echo ""

MESSAGE_JSON=$(cat <<EOF
{
  "type": "text",
  "text": "Test message from FlatFund Pro diagnostic test"
}
EOF
)

echo "Sending request to Gupshup..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "https://api.gupshup.io/sm/api/v1/msg" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "apikey: $GUPSHUP_API_KEY" \
  --data-urlencode "channel=whatsapp" \
  --data-urlencode "source=$GUPSHUP_APP_NAME" \
  --data-urlencode "destination=$PHONE" \
  --data-urlencode "message=$MESSAGE_JSON" \
  --data-urlencode "src.name=$GUPSHUP_APP_NAME")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "============================================"
echo "RESPONSE:"
echo "============================================"
echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Response Body:"
echo "$RESPONSE_BODY" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE_BODY"
echo ""
echo "============================================"

# Analyze the response
if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ HTTP 200 OK - Request accepted by Gupshup"
  if echo "$RESPONSE_BODY" | grep -q '"status":"success"'; then
    echo "✅ Status: SUCCESS - Message queued/sent"
  else
    echo "⚠️  Status: NOT SUCCESS - Check response for details"
  fi
else
  echo "❌ HTTP $HTTP_STATUS - Request failed"
fi

echo ""
echo "============================================"
echo "ANALYSIS:"
echo "============================================"

if echo "$RESPONSE_BODY" | grep -qi "portal user"; then
  echo "❌ API Key Invalid: 'Portal User Not Found'"
  echo "   → The API key is not recognized by Gupshup"
  echo "   → Verify you copied the correct API key from Gupshup Dashboard"
elif echo "$RESPONSE_BODY" | grep -qi "unauthorized"; then
  echo "❌ Unauthorized: API key exists but lacks permissions"
  echo "   → Check if the key has WhatsApp API access"
elif echo "$RESPONSE_BODY" | grep -qi "app not found\|source.*not found"; then
  echo "❌ App Not Found: The GUPSHUP_APP_NAME is invalid"
  echo "   → Current: $GUPSHUP_APP_NAME"
  echo "   → Verify the app name/source ID in Gupshup Dashboard"
elif echo "$RESPONSE_BODY" | grep -qi "not authorized\|not whitelisted"; then
  echo "⚠️  Phone Number Not Whitelisted (but API key works!)"
  echo "   → Phone: $PHONE"
  echo "   → Add this number to sandbox whitelist in Gupshup"
  echo "   → This means your API key IS VALID! ✅"
elif echo "$RESPONSE_BODY" | grep -qi "invalid.*phone\|invalid.*destination"; then
  echo "⚠️  Invalid Phone Format"
  echo "   → Current: $PHONE"
  echo "   → Try different format (with/without +91)"
elif echo "$RESPONSE_BODY" | grep -q '"status":"success"'; then
  echo "✅ SUCCESS! Message sent/queued"
  echo "   → API Key: VALID ✅"
  echo "   → App Name: VALID ✅"
  echo "   → Phone: VALID ✅"
else
  echo "⚠️  Unknown Error - Check response body above"
fi

echo ""
