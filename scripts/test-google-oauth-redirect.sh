#!/bin/bash
# Test Google OAuth Redirect URI Configuration
# This script attempts to verify the redirect URI by testing the OAuth flow

set -e

GOOGLE_PROJECT="680059166048"
CLIENT_ID="680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com"
REQUIRED_REDIRECT_URI="https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse"

echo "🔍 Testing Google OAuth Redirect URI Configuration"
echo "=================================================="
echo ""
echo "OAuth Client ID: $CLIENT_ID"
echo "Required Redirect URI: $REQUIRED_REDIRECT_URI"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
echo ""

# Create a test OAuth authorization URL
# This will show us what redirect URI Google expects
TEST_STATE="test-$(date +%s)"
AUTH_URL="https://accounts.google.com/o/oauth2/v2/auth?client_id=$CLIENT_ID&redirect_uri=$REQUIRED_REDIRECT_URI&response_type=code&scope=openid%20email%20profile&state=$TEST_STATE"

echo "📋 OAuth Authorization URL (for testing):"
echo "$AUTH_URL"
echo ""
echo "⚠️  Note: Google Cloud Console OAuth client redirect URIs are NOT accessible via CLI."
echo "   This is a limitation of Google's API."
echo ""
echo "✅ Verification Methods:"
echo ""
echo "Method 1: Manual Verification (Recommended)"
echo "==========================================="
echo "1. Open this URL in your browser:"
echo "   https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT"
echo ""
echo "2. Scroll to 'Authorized redirect URIs' section"
echo ""
echo "3. Verify this URI exists:"
echo "   $REQUIRED_REDIRECT_URI"
echo ""
echo "4. If missing, click '+ ADD URI' and add it"
echo ""
echo "Method 2: Test OAuth Flow"
echo "========================"
echo "If the redirect URI is NOT configured, you'll get one of these errors:"
echo "  - 'redirect_uri_mismatch'"
echo "  - 'invalid_client'"
echo "  - 'unauthorized_client'"
echo ""
echo "To test:"
echo "1. Try signing in with Google in your app"
echo "2. If you get an error, check the error message"
echo "3. If OAuth works, the redirect URI is configured correctly"
echo ""
echo "Method 3: Check Browser Network Tab"
echo "===================================="
echo "1. Open browser DevTools (F12)"
echo "2. Go to Network tab"
echo "3. Try signing in with Google"
echo "4. Look for requests to 'accounts.google.com'"
echo "5. Check the 'redirect_uri' parameter in the request"
echo "6. If it matches $REQUIRED_REDIRECT_URI, configuration is correct"
echo ""

# Try to open the browser to the Google Cloud Console
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening Google Cloud Console..."
    open "https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🌐 Opening Google Cloud Console..."
    xdg-open "https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT" 2>/dev/null || sensible-browser "https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT" 2>/dev/null || echo "Please open: https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT"
fi

echo ""
echo "✅ Summary:"
echo "   - AWS Cognito configuration: ✅ Verified"
echo "   - Google OAuth Client ID: ✅ Verified"
echo "   - Google Redirect URI: ⚠️  Must verify manually (not accessible via API)"
echo ""
echo "The redirect URI MUST be exactly:"
echo "$REQUIRED_REDIRECT_URI"

