#!/bin/bash
# Check OAuth Consent Screen status and provide configuration steps

set -e

PROJECT_ID="${1:-680059166048}"

echo "🔍 Check OAuth Consent Screen Status"
echo "===================================="
echo ""
echo "Project ID: $PROJECT_ID"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud"
    echo "Run: gcloud auth login"
    exit 1
fi

gcloud config set project "$PROJECT_ID" > /dev/null 2>&1

echo "✅ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
echo ""

# Try to get consent screen info
ACCESS_TOKEN=$(gcloud auth print-access-token)

echo "📋 Checking OAuth Consent Screen status..."
echo ""

# Check if OAuth API is enabled
echo "1. Checking if OAuth2 API is enabled..."
OAUTH_ENABLED=$(gcloud services list --enabled --filter="name:oauth2.googleapis.com" --format="value(name)" 2>/dev/null || echo "")

if [ -z "$OAUTH_ENABLED" ]; then
    echo "   ⚠️  OAuth2 API might not be enabled"
    echo "   Enable it with: gcloud services enable oauth2.googleapis.com"
else
    echo "   ✅ OAuth2 API is enabled"
fi

echo ""
echo "2. OAuth Consent Screen Configuration:"
echo "   ==================================="
echo ""
echo "   The OAuth Consent Screen is configured at:"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo "   If you don't see 'Configure Consent Screen' button, it might mean:"
echo "   - The consent screen is already configured"
echo "   - You need to enable the OAuth2 API first"
echo "   - You're looking at the wrong project"
echo ""

# Try to get consent screen configuration via API
echo "3. Attempting to fetch consent screen configuration..."
CONSENT_CONFIG=$(curl -s -X GET \
  "https://oauth2.googleapis.com/v1/projects/$PROJECT_ID/consentConfig" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" 2>&1)

if echo "$CONSENT_CONFIG" | grep -q "consentConfig"; then
    echo "   ✅ Consent screen configuration found!"
    echo ""
    echo "$CONSENT_CONFIG" | jq '.' 2>/dev/null || echo "$CONSENT_CONFIG"
else
    echo "   ⚠️  Could not fetch consent screen configuration via API"
    echo "   This might mean it's not configured yet"
fi

echo ""
echo "📝 Next Steps:"
echo "=============="
echo ""
echo "Option 1: Enable OAuth2 API (if not enabled)"
echo "  gcloud services enable oauth2.googleapis.com"
echo ""
echo "Option 2: Check Consent Screen Status"
echo "  Open: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo ""
echo "  If you see 'Publish App' or 'Add Users' buttons, consent screen is configured"
echo "  If you see 'Configure Consent Screen', click it to configure"
echo ""
echo "Option 3: Configure via API (if needed)"
echo "  See: https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateOAuthIdpConfig"
echo ""

