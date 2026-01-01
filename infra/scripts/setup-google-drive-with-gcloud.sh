#!/bin/bash
# Setup Google Drive Integration using gcloud + AWS CLI
# 
# This script helps configure Google Drive OAuth credentials

set -e

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
REDIRECT_URI="http://localhost:4000/v1/integrations/google-drive/callback"

echo "🔧 Google Drive Integration Setup"
echo "=================================="
echo ""

if [ -z "$PROJECT_ID" ]; then
  echo "❌ No Google Cloud project configured"
  echo "   Run: gcloud config set project PROJECT_ID"
  exit 1
fi

echo "✅ Project: $PROJECT_ID"
echo ""

# Step 1: Enable Google Drive API
echo "📋 Step 1: Enabling Google Drive API..."
gcloud services enable drive.googleapis.com --project="$PROJECT_ID" 2>&1 | grep -v "Operation\|finished" || true
echo "✅ Google Drive API enabled"
echo ""

# Step 2: Open credentials page
echo "📋 Step 2: Opening Google Cloud Console..."
echo ""
echo "⚠️  OAuth Client IDs must be created via the web console."
echo ""
echo "The console will open. Please:"
echo "1. Click 'Create Credentials' → 'OAuth client ID'"
echo "2. Application type: Web application"
echo "3. Name: 'Enablement Portal - Google Drive'"
echo "4. Authorized redirect URIs:"
echo "   - $REDIRECT_URI"
echo "5. Click 'Create'"
echo "6. Copy the Client ID and Client Secret"
echo ""

# Open the console
if command -v open &> /dev/null; then
  open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
elif command -v xdg-open &> /dev/null; then
  xdg-open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
else
  echo "Please open: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
fi

echo ""
read -p "Press Enter after you've created the OAuth client and copied the credentials..."

# Step 3: Get credentials from user
echo ""
echo "📋 Step 3: Storing credentials in AWS SSM..."
echo ""

read -p "Enter Google OAuth Client ID: " CLIENT_ID
if [ -z "$CLIENT_ID" ]; then
  echo "❌ Client ID is required. Exiting."
  exit 1
fi

read -sp "Enter Google OAuth Client Secret: " CLIENT_SECRET
echo ""
if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Client Secret is required. Exiting."
  exit 1
fi

# Step 4: Store in AWS SSM
echo ""
echo "Storing Client ID..."
aws ssm put-parameter \
  --name "/enablement-portal/google-drive/client-id" \
  --value "$CLIENT_ID" \
  --type String \
  --overwrite \
  --description "Google Drive OAuth Client ID" \
  2>&1 | grep -v "Parameter" || true

echo "Storing Client Secret..."
aws ssm put-parameter \
  --name "/enablement-portal/google-drive/client-secret" \
  --value "$CLIENT_SECRET" \
  --type SecureString \
  --overwrite \
  --description "Google Drive OAuth Client Secret" \
  2>&1 | grep -v "Parameter" || true

# Step 5: Verify
echo ""
echo "📋 Step 4: Verifying setup..."
STORED_CLIENT_ID=$(aws ssm get-parameter --name "/enablement-portal/google-drive/client-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")
STORED_CLIENT_SECRET=$(aws ssm get-parameter --name "/enablement-portal/google-drive/client-secret" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -n "$STORED_CLIENT_ID" ] && [ -n "$STORED_CLIENT_SECRET" ]; then
  echo "✅ Credentials stored successfully!"
  echo ""
  echo "📋 Next Steps:"
  echo "1. Go to Admin → Integrations in the web app"
  echo "2. Click 'Connect Google Drive'"
  echo "3. Complete the OAuth authorization flow"
  echo ""
  echo "The refresh token will be stored automatically after authorization."
else
  echo "❌ Failed to verify credentials. Please check AWS permissions."
  exit 1
fi

