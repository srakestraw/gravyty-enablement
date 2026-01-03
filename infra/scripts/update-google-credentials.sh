#!/bin/bash
# Update Google OAuth credentials in Cognito Identity Provider

set -e

USER_POOL_ID="${1:-us-east-1_s4q1vjkgD}"
GOOGLE_CLIENT_ID="${2:-680059166048-mi2e4a21fk9jt7l4lui6alrlngddsr9f.apps.googleusercontent.com}"

echo "🔐 Update Google OAuth Credentials"
echo "==================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $GOOGLE_CLIENT_ID"
echo ""

if [ -z "$3" ]; then
  echo "Please provide the Google OAuth Client Secret:"
  echo "Usage: $0 [USER_POOL_ID] [CLIENT_ID] [CLIENT_SECRET]"
  echo ""
  echo "Or run interactively:"
  read -sp "Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
  echo ""
else
  GOOGLE_CLIENT_SECRET="$3"
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Client Secret is required"
  exit 1
fi

echo "🔄 Updating Cognito Identity Provider..."
aws cognito-idp update-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --provider-details "client_id=$GOOGLE_CLIENT_ID,client_secret=$GOOGLE_CLIENT_SECRET,authorize_scopes=openid email profile" \
  --attribute-mapping email=email,email_verified=email_verified,name=name,picture=picture,username=sub,given_name=given_name,family_name=family_name \
  --query 'IdentityProvider.{ProviderName:ProviderName,Status:Status}' \
  --output json

echo ""
echo "✅ Google Identity Provider updated!"
echo ""
echo "📝 IMPORTANT: Verify in Google Cloud Console:"
echo "   https://console.cloud.google.com/apis/credentials?project=680059166048"
echo ""
echo "   Ensure Authorized redirect URIs includes:"
echo "   https://enable.gravytylabs.com/oauth2/idpresponse"





