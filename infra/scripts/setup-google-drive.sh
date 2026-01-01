#!/bin/bash
# Setup Google Drive Integration
# 
# This script helps configure Google Drive OAuth credentials in AWS SSM Parameter Store

set -e

CLIENT_ID_PARAM="/enablement-portal/google-drive/client-id"
CLIENT_SECRET_PARAM="/enablement-portal/google-drive/client-secret"

echo "🔧 Google Drive Integration Setup"
echo "=================================="
echo ""
echo "This script will store your Google OAuth credentials in AWS SSM Parameter Store."
echo ""
echo "Prerequisites:"
echo "1. Google Cloud Console OAuth Client ID and Secret"
echo "2. AWS CLI configured with appropriate permissions"
echo ""
echo "To get Google OAuth credentials:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Create OAuth 2.0 Client ID (Web application)"
echo "3. Enable Google Drive API: https://console.cloud.google.com/apis/library/drive.googleapis.com"
echo "4. Add authorized redirect URI: http://localhost:4000/v1/integrations/google-drive/callback"
echo ""

# Check if parameters already exist
if aws ssm get-parameter --name "$CLIENT_ID_PARAM" &>/dev/null; then
  echo "⚠️  Client ID parameter already exists."
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping Client ID..."
    SKIP_CLIENT_ID=true
  fi
fi

if aws ssm get-parameter --name "$CLIENT_SECRET_PARAM" &>/dev/null; then
  echo "⚠️  Client Secret parameter already exists."
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping Client Secret..."
    SKIP_CLIENT_SECRET=true
  fi
fi

# Get Client ID
if [ -z "$SKIP_CLIENT_ID" ]; then
  echo ""
  read -p "Enter Google OAuth Client ID: " CLIENT_ID
  if [ -z "$CLIENT_ID" ]; then
    echo "❌ Client ID is required. Exiting."
    exit 1
  fi
  
  echo "Storing Client ID..."
  aws ssm put-parameter \
    --name "$CLIENT_ID_PARAM" \
    --value "$CLIENT_ID" \
    --type String \
    --overwrite \
    --description "Google Drive OAuth Client ID"
  
  echo "✅ Client ID stored successfully"
fi

# Get Client Secret
if [ -z "$SKIP_CLIENT_SECRET" ]; then
  echo ""
  read -sp "Enter Google OAuth Client Secret: " CLIENT_SECRET
  echo ""
  if [ -z "$CLIENT_SECRET" ]; then
    echo "❌ Client Secret is required. Exiting."
    exit 1
  fi
  
  echo "Storing Client Secret..."
  aws ssm put-parameter \
    --name "$CLIENT_SECRET_PARAM" \
    --value "$CLIENT_SECRET" \
    --type SecureString \
    --overwrite \
    --description "Google Drive OAuth Client Secret"
  
  echo "✅ Client Secret stored successfully"
fi

echo ""
echo "🎉 Google Drive credentials configured!"
echo ""
echo "Next steps:"
echo "1. Go to Admin → Integrations in the web app"
echo "2. Click 'Connect Google Drive'"
echo "3. Complete the OAuth authorization flow"
echo ""
echo "The refresh token will be stored automatically after authorization."

