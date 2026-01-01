#!/bin/bash
# Update Google OAuth Client redirect URI using Google Cloud REST API

set -e

PROJECT_ID="${1:-680059166048}"
CLIENT_ID="${2:-680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com}"
COGNITO_DOMAIN="${3:-enablement-portal-75874255}"
COGNITO_REGION="${4:-us-east-1}"

REDIRECT_URI="https://${COGNITO_DOMAIN}.auth.${COGNITO_REGION}.amazoncognito.com/oauth2/idpresponse"

echo "🔐 Update Google OAuth via REST API"
echo "===================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Client ID: $CLIENT_ID"
echo "Redirect URI: $REDIRECT_URI"
echo ""

# Check if gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
echo ""

# Set project
gcloud config set project "$PROJECT_ID" > /dev/null 2>&1

# Get access token
echo "📋 Getting access token..."
ACCESS_TOKEN=$(gcloud auth print-access-token)

# Get current OAuth client configuration
echo "🔍 Fetching current OAuth client configuration..."
CLIENT_NAME="projects/$PROJECT_ID/oauthClients/$CLIENT_ID"

# Try to get current configuration using Identity Platform API
CURRENT_CONFIG=$(curl -s -X GET \
  "https://identitytoolkit.googleapis.com/admin/v2/$CLIENT_NAME" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" 2>/dev/null || echo "")

if [ -z "$CURRENT_CONFIG" ] || echo "$CURRENT_CONFIG" | grep -q "error"; then
    echo "⚠️  Could not fetch current configuration via Identity Platform API"
    echo ""
    echo "Trying alternative method..."
    echo ""
    
    # Alternative: Use the OAuth2 API (if available)
    echo "📝 Note: Google Cloud doesn't provide a direct CLI command to update OAuth client redirect URIs"
    echo ""
    echo "You have two options:"
    echo ""
    echo "Option 1: Update via Google Cloud Console (Recommended)"
    echo "====================================================="
    echo "1. Open: https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$PROJECT_ID"
    echo "2. Scroll to 'Authorized redirect URIs'"
    echo "3. Ensure this URI exists: $REDIRECT_URI"
    echo "4. Click 'SAVE'"
    echo ""
    
    # Try to open browser on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Opening browser..."
        open "https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$PROJECT_ID" 2>/dev/null || true
    fi
    
    echo ""
    echo "Option 2: Configure OAuth Consent Screen (if not configured)"
    echo "============================================================="
    echo "This is often the cause of 'invalid_client' errors"
    echo ""
    echo "Run this to configure via CLI:"
    echo "  gcloud alpha iap oauth-brands create --application_title='Enablement Portal' --support_email=YOUR_EMAIL"
    echo ""
    echo "Or configure via console:"
    echo "  https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
    echo ""
    
    exit 0
fi

# Parse current redirect URIs
CURRENT_URIS=$(echo "$CURRENT_CONFIG" | jq -r '.redirectUris[]?' 2>/dev/null || echo "")

if [ -z "$CURRENT_URIS" ]; then
    echo "📝 No existing redirect URIs found"
    NEW_URIS="[\"$REDIRECT_URI\"]"
else
    echo "📋 Current redirect URIs:"
    echo "$CURRENT_URIS" | while read -r uri; do
        echo "  - $uri"
    done
    
    # Check if redirect URI already exists
    if echo "$CURRENT_URIS" | grep -q "$REDIRECT_URI"; then
        echo ""
        echo "✅ Redirect URI already exists: $REDIRECT_URI"
        echo ""
        echo "The redirect URI is configured. If you're still getting 'invalid_client' error,"
        echo "check the OAuth Consent Screen configuration:"
        echo "  https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
        exit 0
    fi
    
    # Add new URI to existing list
    NEW_URIS=$(echo "$CURRENT_URIS" | jq -s ". + [\"$REDIRECT_URI\"]" 2>/dev/null || echo "[\"$REDIRECT_URI\"]")
fi

echo ""
echo "🔄 Updating OAuth client with new redirect URI..."
echo "New redirect URIs:"
echo "$NEW_URIS" | jq -r '.[]' | while read -r uri; do
    echo "  - $uri"
done

# Update OAuth client
UPDATE_RESPONSE=$(curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/admin/v2/$CLIENT_NAME?updateMask=redirectUris" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"redirectUris\": $NEW_URIS
  }" 2>&1)

if echo "$UPDATE_RESPONSE" | grep -q "error"; then
    echo ""
    echo "❌ Error updating OAuth client:"
    echo "$UPDATE_RESPONSE" | jq -r '.error.message' 2>/dev/null || echo "$UPDATE_RESPONSE"
    echo ""
    echo "This API might not be available for your project type."
    echo "Please update manually via Google Cloud Console:"
    echo "  https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$PROJECT_ID"
    exit 1
fi

echo ""
echo "✅ OAuth client updated successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Wait 1-2 minutes for changes to propagate"
echo "2. Verify OAuth Consent Screen is configured:"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo "3. Try signing in again"

