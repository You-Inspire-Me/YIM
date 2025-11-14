#!/bin/bash

# Script to import voorraad.csv via API
# Usage: ./scripts/import-voorraad.sh

CSV_FILE="/Users/dremy/Downloads/voorraad.csv"
API_BASE="http://localhost:3000/api"

echo "🔐 Step 1: Logging in as creator..."

# Try to login (you may need to adjust credentials)
LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "creator@example.com",
    "password": "password123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q "token\|user"; then
  echo "✅ Login successful"
else
  echo "❌ Login failed. Please check credentials or register a creator user first."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""
echo "📤 Step 2: Uploading CSV file..."

# Upload CSV
UPLOAD_RESPONSE=$(curl -s -b /tmp/cookies.txt -X POST "$API_BASE/merchant/inventory/import" \
  -F "csv=@$CSV_FILE" \
  -H "Content-Type: multipart/form-data")

echo "Upload response:"
echo "$UPLOAD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESPONSE"

# Cleanup
rm -f /tmp/cookies.txt

echo ""
echo "✅ Import complete!"

