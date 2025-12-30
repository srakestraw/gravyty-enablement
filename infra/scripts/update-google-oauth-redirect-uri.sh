#!/bin/bash
# Update Google OAuth Client Authorized Redirect URIs
# This script helps you update the redirect URI in Google Cloud Console

set -e

GOOGLE_PROJECT="680059166048"
CLIENT_ID="680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com"
COGNITO_DOMAIN="enablement-portal-75874255.auth.us-east-1.amazoncognito.com"
REDIRECT_URI="https://${COGNITO_DOMAIN}/oauth2/idpresponse"

echo "🔐 Google OAuth Redirect URI Update"
echo "===================================="
echo ""
echo "Project: $GOOGLE_PROJECT"
echo "Client ID: $CLIENT_ID"
echo "Cognito Domain: $COGNITO_DOMAIN"
echo "Redirect URI to add: $REDIRECT_URI"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

echo "📋 Option 1: Manual Update (Recommended)"
echo "========================================"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://console.cloud.google.com/apis/credentials/oauthclient/${CLIENT_ID}?project=${GOOGLE_PROJECT}"
echo ""
echo "2. Scroll down to 'Authorized redirect URIs'"
echo ""
echo "3. Click '+ ADD URI'"
echo ""
echo "4. Add this exact URI:"
echo "   $REDIRECT_URI"
echo ""
echo "5. Click 'SAVE'"
echo ""
echo "✅ After saving, wait 1-2 minutes and try signing in again!"
echo ""

echo "📋 Option 2: Using Google Cloud Console API"
echo "============================================="
echo ""
echo "To use the API, you'll need:"
echo "1. OAuth 2.0 access token with cloud-platform scope"
echo "2. Current OAuth client configuration"
echo ""
echo "Get access token:"
echo "  gcloud auth print-access-token"
echo ""
echo "Then use the Google Cloud Console API to update the client."
echo "See: https://cloud.google.com/apis/design/design_patterns#update_mask"
echo ""

# Try to open the URL directly if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening Google Cloud Console in your browser..."
    open "https://console.cloud.google.com/apis/credentials/oauthclient/${CLIENT_ID}?project=${GOOGLE_PROJECT}"
    echo ""
    echo "The browser should open to the OAuth client edit page."
    echo "Add the redirect URI: $REDIRECT_URI"
fi

echo ""
echo "📝 Quick Reference:"
echo "   Redirect URI: $REDIRECT_URI"
echo "   Must use HTTPS (not HTTP)"
echo "   Must include /oauth2/idpresponse path"
echo "   No trailing slash"
echo ""

