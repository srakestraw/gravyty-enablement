#!/bin/bash
# Update Google OAuth configuration using gcloud CLI

set -e

PROJECT_ID="${1:-680059166048}"
CLIENT_ID="${2:-680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com}"
COGNITO_DOMAIN="${3:-enablement-portal-75874255}"
COGNITO_REGION="${4:-us-east-1}"

REDIRECT_URI="https://${COGNITO_DOMAIN}.auth.${COGNITO_REGION}.amazoncognito.com/oauth2/idpresponse"

echo "🔐 Update Google OAuth Configuration via CLI"
echo "=============================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo "Client ID: $CLIENT_ID"
echo "Cognito Domain: $COGNITO_DOMAIN"
echo "Redirect URI: $REDIRECT_URI"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed"
    echo ""
    echo "Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting Google Cloud project..."
gcloud config set project "$PROJECT_ID" 2>&1

# Get current OAuth client configuration
echo ""
echo "🔍 Current OAuth client configuration..."
gcloud alpha iap oauth-clients describe "$CLIENT_ID" --format=json 2>/dev/null || \
gcloud projects describe-oauth-client "$CLIENT_ID" --format=json 2>/dev/null || \
echo "Note: Using alternative method to update OAuth client"

# Update redirect URIs
echo ""
echo "🔄 Updating Authorized redirect URIs..."
echo "Adding: $REDIRECT_URI"

# Get current redirect URIs
CURRENT_URIS=$(gcloud projects describe-oauth-client "$CLIENT_ID" --format="value(redirectUris)" 2>/dev/null || echo "")

if [ -z "$CURRENT_URIS" ]; then
    echo "⚠️  Could not retrieve current redirect URIs via CLI"
    echo ""
    echo "Please update manually in Google Cloud Console:"
    echo "  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo ""
    echo "Or use the REST API method below."
    exit 0
fi

echo "Current redirect URIs: $CURRENT_URIS"

# Check if redirect URI already exists
if echo "$CURRENT_URIS" | grep -q "$REDIRECT_URI"; then
    echo "✅ Redirect URI already exists: $REDIRECT_URI"
else
    echo "📝 Adding redirect URI..."
    # Note: gcloud doesn't have a direct command to update OAuth client redirect URIs
    # We'll need to use the REST API or guide the user
    echo ""
    echo "⚠️  gcloud CLI doesn't support updating OAuth client redirect URIs directly"
    echo ""
    echo "Please update manually in Google Cloud Console:"
    echo "  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo ""
    echo "Or use the REST API (requires OAuth token):"
    echo "  See: https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects.oauthClients/update"
fi

echo ""
echo "✅ Configuration check complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Verify OAuth Consent Screen is configured:"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo "2. Verify redirect URI is configured:"
echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "   Look for: $REDIRECT_URI"

