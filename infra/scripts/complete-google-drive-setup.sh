#!/bin/bash
# Complete Google Drive Setup
# Uses existing OAuth client or creates new one

set -e

PROJECT_ID=$(gcloud config get-value project)
EXISTING_CLIENT_ID="680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com"
DRIVE_REDIRECT_URI="http://localhost:4000/v1/integrations/google-drive/callback"

echo "🔧 Complete Google Drive Setup"
echo "=============================="
echo ""
echo "Project: $PROJECT_ID"
echo ""

# Check if Google Drive API is enabled
echo "📋 Step 1: Verifying Google Drive API..."
if gcloud services list --enabled --filter="name:drive.googleapis.com" --format="value(name)" --project="$PROJECT_ID" | grep -q "drive.googleapis.com"; then
  echo "✅ Google Drive API is enabled"
else
  echo "Enabling Google Drive API..."
  gcloud services enable drive.googleapis.com --project="$PROJECT_ID"
  echo "✅ Google Drive API enabled"
fi
echo ""

# Check if credentials already exist
echo "📋 Step 2: Checking existing credentials..."
EXISTING_CLIENT_ID_IN_SSM=$(aws ssm get-parameter --name "/enablement-portal/google-drive/client-id" --query 'Parameter.Value' --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_CLIENT_ID_IN_SSM" ]; then
  echo "✅ Credentials already exist in SSM"
  echo "   Client ID: $EXISTING_CLIENT_ID_IN_SSM"
  echo ""
  read -p "Do you want to update them? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Keeping existing credentials."
    exit 0
  fi
fi

echo ""
echo "📋 Step 3: OAuth Client Configuration"
echo "======================================"
echo ""
echo "We found an existing OAuth client: $EXISTING_CLIENT_ID"
echo ""
echo "Choose an option:"
echo "1. Reuse existing client (add Drive redirect URI to it)"
echo "2. Create new client specifically for Google Drive"
echo ""
read -p "Enter choice (1 or 2): " CHOICE

if [ "$CHOICE" = "1" ]; then
  CLIENT_ID="$EXISTING_CLIENT_ID"
  echo ""
  echo "✅ Using existing client: $CLIENT_ID"
  echo ""
  echo "⚠️  IMPORTANT: You need to add this redirect URI to the existing client:"
  echo "   $DRIVE_REDIRECT_URI"
  echo ""
  echo "Opening Google Cloud Console to add redirect URI..."
  open "https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$PROJECT_ID" 2>&1 || \
    echo "Please visit: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
  echo ""
  read -p "Press Enter after you've added the redirect URI and copied the Client Secret..."
elif [ "$CHOICE" = "2" ]; then
  echo ""
  echo "Creating new OAuth client..."
  echo ""
  echo "Opening Google Cloud Console to create new client..."
  open "https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID" 2>&1 || \
    echo "Please visit: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
  echo ""
  echo "Please:"
  echo "1. Click 'Create Credentials' → 'OAuth client ID'"
  echo "2. Application type: Web application"
  echo "3. Name: 'Enablement Portal - Google Drive'"
  echo "4. Authorized redirect URIs: $DRIVE_REDIRECT_URI"
  echo "5. Click 'Create'"
  echo "6. Copy the Client ID and Client Secret"
  echo ""
  read -p "Press Enter after creating the client..."
  echo ""
  read -p "Enter the new Client ID: " CLIENT_ID
else
  echo "❌ Invalid choice. Exiting."
  exit 1
fi

if [ -z "$CLIENT_ID" ]; then
  echo "❌ Client ID is required. Exiting."
  exit 1
fi

echo ""
read -sp "Enter Client Secret: " CLIENT_SECRET
echo ""

if [ -z "$CLIENT_SECRET" ]; then
  echo "❌ Client Secret is required. Exiting."
  exit 1
fi

# Store in SSM
echo ""
echo "📋 Step 4: Storing credentials in AWS SSM..."
echo "============================================"

aws ssm put-parameter \
  --name "/enablement-portal/google-drive/client-id" \
  --value "$CLIENT_ID" \
  --type String \
  --overwrite \
  --description "Google Drive OAuth Client ID" \
  2>&1 | grep -v "Parameter" || true

echo "✅ Client ID stored"

aws ssm put-parameter \
  --name "/enablement-portal/google-drive/client-secret" \
  --value "$CLIENT_SECRET" \
  --type SecureString \
  --overwrite \
  --description "Google Drive OAuth Client Secret" \
  2>&1 | grep -v "Parameter" || true

echo "✅ Client Secret stored"
echo ""

# Verify
echo "📋 Step 5: Verifying setup..."
STORED_ID=$(aws ssm get-parameter --name "/enablement-portal/google-drive/client-id" --query 'Parameter.Value' --output text 2>&1)
STORED_SECRET=$(aws ssm get-parameter --name "/enablement-portal/google-drive/client-secret" --with-decryption --query 'Parameter.Value' --output text 2>&1)

if [ -n "$STORED_ID" ] && [ -n "$STORED_SECRET" ]; then
  echo "✅ Setup complete!"
  echo ""
  echo "📋 Next Steps:"
  echo "1. Restart the API server (if running)"
  echo "2. Go to Admin → Integrations in the web app"
  echo "3. Click 'Connect Google Drive'"
  echo "4. Complete the OAuth authorization flow"
  echo ""
  echo "The refresh token will be stored automatically after authorization."
else
  echo "❌ Failed to verify credentials. Please check AWS permissions."
  exit 1
fi


