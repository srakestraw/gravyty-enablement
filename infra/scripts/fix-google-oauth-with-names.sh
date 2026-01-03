#!/bin/bash
# Fix Google OAuth Identity Provider with first/last name attribute mappings
# This script updates the identity provider to include given_name and family_name mappings

set -e

USER_POOL_ID="${1:-us-east-1_xBNZh7TaB}"

echo "🔧 Fix Google OAuth Configuration with First/Last Name"
echo "======================================================"
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo ""

# Try to get credentials from SSM
CLIENT_ID_PARAM="/enablement-portal/cognito/google-client-id"
CLIENT_SECRET_PARAM="/enablement-portal/cognito/google-client-secret"

echo "📋 Step 1: Retrieving credentials from SSM..."
echo "============================================="

GOOGLE_CLIENT_ID=$(aws ssm get-parameter \
  --name "$CLIENT_ID_PARAM" \
  --query 'Parameter.Value' \
  --output text 2>/dev/null || echo "")

if [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo "⚠️  Could not retrieve Client ID from SSM: $CLIENT_ID_PARAM"
  echo ""
  read -p "Enter Google OAuth Client ID: " GOOGLE_CLIENT_ID
  if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo "❌ Client ID is required"
    exit 1
  fi
else
  echo "✅ Retrieved Client ID from SSM"
fi

GOOGLE_CLIENT_SECRET=$(aws ssm get-parameter \
  --name "$CLIENT_SECRET_PARAM" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text 2>/dev/null || echo "")

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "⚠️  Could not retrieve Client Secret from SSM: $CLIENT_SECRET_PARAM"
  echo ""
  read -sp "Enter Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
  echo ""
  if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "❌ Client Secret is required"
    exit 1
  fi
else
  echo "✅ Retrieved Client Secret from SSM"
fi

echo ""
echo "📋 Step 2: Verifying User Pool has given_name and family_name attributes..."
echo "============================================================================"

HAS_GIVEN_NAME=$(aws cognito-idp describe-user-pool \
  --user-pool-id "$USER_POOL_ID" \
  --query 'UserPool.SchemaAttributes[?Name==`given_name`]' \
  --output json 2>/dev/null | jq 'length > 0' || echo "false")

HAS_FAMILY_NAME=$(aws cognito-idp describe-user-pool \
  --user-pool-id "$USER_POOL_ID" \
  --query 'UserPool.SchemaAttributes[?Name==`family_name`]' \
  --output json 2>/dev/null | jq 'length > 0' || echo "false")

if [ "$HAS_GIVEN_NAME" != "true" ] || [ "$HAS_FAMILY_NAME" != "true" ]; then
  echo "⚠️  User Pool does not have given_name or family_name attributes"
  echo "   These are standard Cognito attributes and should be available"
  echo "   Continuing anyway..."
else
  echo "✅ User Pool has given_name and family_name attributes"
fi

echo ""
echo "📋 Step 3: Updating Identity Provider with correct attribute mappings..."
echo "======================================================================="

# Update with all standard mappings plus given_name and family_name
# Note: Google provides given_name and family_name in the profile scope
ATTRIBUTE_MAPPING="email=email,email_verified=email_verified,name=name,picture=picture,username=sub,given_name=given_name,family_name=family_name"

echo "Attribute Mapping: $ATTRIBUTE_MAPPING"
echo ""

aws cognito-idp update-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --provider-details "client_id=$GOOGLE_CLIENT_ID,client_secret=$GOOGLE_CLIENT_SECRET,authorize_scopes=openid email profile" \
  --attribute-mapping "$ATTRIBUTE_MAPPING" \
  > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Identity Provider updated successfully!"
else
  echo "❌ Failed to update Identity Provider"
  exit 1
fi

echo ""
echo "📋 Step 4: Verifying configuration..."
echo "====================================="

PROVIDER=$(aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --output json 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✅ Configuration verified!"
  echo ""
  echo "Current Attribute Mapping:"
  echo "$PROVIDER" | jq -r '.IdentityProvider.AttributeMapping | to_entries[] | "  \(.key) = \(.value)"'
  echo ""
  echo "Scopes:"
  echo "$PROVIDER" | jq -r '.IdentityProvider.ProviderDetails.authorize_scopes'
  echo ""
else
  echo "⚠️  Could not verify configuration"
fi

echo ""
echo "📋 Step 5: Important Verification Steps"
echo "======================================="
echo ""
echo "1. ✅ Verify redirect URI in Google Cloud Console:"
echo "   https://console.cloud.google.com/apis/credentials?project=680059166048"
echo "   Ensure this URI is in 'Authorized redirect URIs':"
echo "   https://enablement-portal-75874255.auth.us-east-1.amazoncognito.com/oauth2/idpresponse"
echo ""
echo "2. ✅ Verify Client ID matches:"
echo "   Cognito: $GOOGLE_CLIENT_ID"
echo "   Google Console: https://console.cloud.google.com/apis/credentials?project=680059166048"
echo ""
echo "3. ✅ Verify OAuth Consent Screen is configured:"
echo "   https://console.cloud.google.com/apis/credentials/consent?project=680059166048"
echo ""
echo "✅ Fix complete! Wait 1-2 minutes, then try signing in again."
echo ""

