#!/bin/bash
# Create or update Google OAuth Identity Provider in Cognito

set -e

USER_POOL_ID="${1:-us-east-1_s4q1vjkgD}"
GOOGLE_CLIENT_ID="${2}"
GOOGLE_CLIENT_SECRET="${3}"

echo "🔐 Create or Update Google OAuth Identity Provider"
echo "=================================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo ""

# Check if credentials are provided
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "Usage: $0 [USER_POOL_ID] [CLIENT_ID] [CLIENT_SECRET]"
  echo ""
  echo "Example:"
  echo "  $0 us-east-1_s4q1vjkgD YOUR_CLIENT_ID.apps.googleusercontent.com YOUR_CLIENT_SECRET"
  echo ""
  echo "Or run interactively:"
  read -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
  read -sp "Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
  echo ""
fi

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Client ID and Client Secret are required"
  exit 1
fi

# Check if provider exists
echo "🔍 Checking if Google Identity Provider exists..."
if aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  > /dev/null 2>&1; then
  echo "✅ Google Identity Provider exists - updating..."
  
  aws cognito-idp update-identity-provider \
    --user-pool-id "$USER_POOL_ID" \
    --provider-name Google \
    --provider-details "client_id=$GOOGLE_CLIENT_ID,client_secret=$GOOGLE_CLIENT_SECRET,authorize_scopes=openid email profile" \
    --attribute-mapping email=email,email_verified=email_verified,name=name,picture=picture,username=sub,given_name=given_name,family_name=family_name \
    > /dev/null
  
  echo "✅ Google Identity Provider updated!"
else
  echo "📝 Google Identity Provider does not exist - creating..."
  
  aws cognito-idp create-identity-provider \
    --user-pool-id "$USER_POOL_ID" \
    --provider-name Google \
    --provider-type Google \
    --provider-details "client_id=$GOOGLE_CLIENT_ID,client_secret=$GOOGLE_CLIENT_SECRET,authorize_scopes=openid email profile" \
    --attribute-mapping email=email,email_verified=email_verified,name=name,picture=picture,username=sub,given_name=given_name,family_name=family_name \
    > /dev/null
  
  echo "✅ Google Identity Provider created!"
fi

# Verify configuration
echo ""
echo "🔍 Verifying configuration..."
PROVIDER=$(aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --query 'IdentityProvider.{Name:ProviderName,Type:ProviderType,Status:Status}' \
  --output json 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✅ Configuration verified!"
  echo ""
  echo "Provider Details:"
  echo "$PROVIDER" | jq '.' 2>/dev/null || echo "$PROVIDER"
else
  echo "⚠️  Could not verify provider configuration"
fi

echo ""
echo "📝 IMPORTANT: Verify in Google Cloud Console"
echo "==========================================="
echo "Go to: https://console.cloud.google.com/apis/credentials"
echo ""
echo "Ensure your OAuth client has this Authorized redirect URI:"
echo "  https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse"
echo ""
echo "✅ Google OAuth configuration complete!"


