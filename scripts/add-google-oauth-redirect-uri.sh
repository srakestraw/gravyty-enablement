#!/bin/bash
# Add Google OAuth Redirect URI - Opens browser to exact edit page
# Note: Google Cloud doesn't provide CLI/API for this, so we open the browser

set -e

GOOGLE_PROJECT="680059166048"
CLIENT_ID="680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com"
REDIRECT_URI="https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse"

echo "🔐 Add Google OAuth Redirect URI"
echo "================================"
echo ""
echo "Project: $GOOGLE_PROJECT"
echo "Client ID: $CLIENT_ID"
echo "Redirect URI to add:"
echo "  $REDIRECT_URI"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
echo ""

# Direct link to edit the OAuth client
EDIT_URL="https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT"

echo "📋 Opening Google Cloud Console..."
echo ""
echo "URL: $EDIT_URL"
echo ""
echo "📝 Instructions:"
echo "1. Scroll down to 'Authorized redirect URIs' section"
echo "2. Click '+ ADD URI' button"
echo "3. Paste this exact URI:"
echo "   $REDIRECT_URI"
echo "4. Click 'SAVE' button"
echo "5. Wait 1-2 minutes for changes to propagate"
echo ""

# Open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🌐 Opening browser..."
    open "$EDIT_URL"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🌐 Opening browser..."
    xdg-open "$EDIT_URL" 2>/dev/null || sensible-browser "$EDIT_URL" 2>/dev/null || echo "Please open: $EDIT_URL"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "🌐 Opening browser..."
    start "$EDIT_URL"
else
    echo "Please open this URL in your browser:"
    echo "$EDIT_URL"
fi

echo ""
echo "✅ After saving in Google Cloud Console, OAuth will work!"
echo ""
echo "💡 Tip: You can verify it was added by checking the 'Authorized redirect URIs' list"
echo "   It should show: $REDIRECT_URI"

