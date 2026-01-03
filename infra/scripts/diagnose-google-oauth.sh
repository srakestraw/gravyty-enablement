#!/bin/bash
# Diagnose Google OAuth Configuration Issues
# This script helps identify and fix Google OAuth "invalid_client" errors

set -e

USER_POOL_ID="${1:-us-east-1_xBNZh7TaB}"
GOOGLE_PROJECT="${2:-680059166048}"

echo "🔍 Google OAuth Configuration Diagnostic"
echo "========================================"
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Google Project: $GOOGLE_PROJECT"
echo ""

# Get Cognito domain
echo "📋 Step 1: Checking Cognito Configuration"
echo "==========================================="
COGNITO_DOMAIN=$(aws cognito-idp describe-user-pool-domain \
  --domain enablement-portal-75874255 \
  --query 'DomainDescription.Domain' \
  --output text 2>/dev/null || echo "")

if [ -z "$COGNITO_DOMAIN" ]; then
  echo "⚠️  Could not retrieve Cognito domain automatically"
  echo "   Using default: enablement-portal-75874255.auth.us-east-1.amazoncognito.com"
  COGNITO_DOMAIN="enablement-portal-75874255.auth.us-east-1.amazoncognito.com"
else
  echo "✅ Cognito Domain: $COGNITO_DOMAIN"
fi

REDIRECT_URI="https://${COGNITO_DOMAIN}/oauth2/idpresponse"
echo "   Required Redirect URI: $REDIRECT_URI"
echo ""

# Get Google Identity Provider details
echo "📋 Step 2: Checking Cognito Identity Provider"
echo "=============================================="
if aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  > /dev/null 2>&1; then
  
  echo "✅ Google Identity Provider exists"
  
  PROVIDER_DETAILS=$(aws cognito-idp describe-identity-provider \
    --user-pool-id "$USER_POOL_ID" \
    --provider-name Google \
    --query 'IdentityProvider.{Status:Status,ClientId:ProviderDetails.client_id}' \
    --output json 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo "$PROVIDER_DETAILS" | jq '.' 2>/dev/null || echo "$PROVIDER_DETAILS"
    
    CLIENT_ID=$(echo "$PROVIDER_DETAILS" | jq -r '.ClientId' 2>/dev/null || echo "")
    if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
      echo ""
      echo "   Google Client ID: $CLIENT_ID"
    fi
  fi
else
  echo "❌ Google Identity Provider NOT FOUND"
  echo ""
  echo "   Run this to create it:"
  echo "   cd infra/scripts && ./create-or-update-google-oauth.sh $USER_POOL_ID"
  exit 1
fi
echo ""

# Check User Pool Client
echo "📋 Step 3: Checking User Pool Client"
echo "====================================="
CLIENT_ID="18b68j5jbm61pthstbk3ngeaa3"
SUPPORTED_PROVIDERS=$(aws cognito-idp describe-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-id "$CLIENT_ID" \
  --query 'UserPoolClient.SupportedIdentityProviders' \
  --output json 2>/dev/null || echo "[]")

if echo "$SUPPORTED_PROVIDERS" | jq -e 'contains(["Google"])' > /dev/null 2>&1; then
  echo "✅ User Pool Client supports Google"
  echo "   Supported Providers: $SUPPORTED_PROVIDERS"
else
  echo "❌ User Pool Client does NOT support Google"
  echo "   Supported Providers: $SUPPORTED_PROVIDERS"
  echo ""
  echo "   Google must be in SupportedIdentityProviders"
fi
echo ""

# Diagnostic summary
echo "📋 Step 4: Diagnostic Summary"
echo "=============================="
echo ""
echo "🔴 If you're getting 'invalid_client' error, check these:"
echo ""
echo "1. ✅ Redirect URI in Google Cloud Console"
echo "   Go to: https://console.cloud.google.com/apis/credentials?project=$GOOGLE_PROJECT"
echo "   Find your OAuth 2.0 Client ID and ensure this URI is in 'Authorized redirect URIs':"
echo "   $REDIRECT_URI"
echo ""
echo "   Requirements:"
echo "   - Must use HTTPS (not HTTP)"
echo "   - Must include /oauth2/idpresponse path"
echo "   - No trailing slash"
echo "   - Must match exactly (case-sensitive)"
echo ""

if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ] && [ "$CLIENT_ID" != "" ]; then
  echo "2. ✅ Verify Client ID matches"
  echo "   Cognito Client ID: $CLIENT_ID"
  echo "   Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=$GOOGLE_PROJECT"
  echo "   Ensure the Client ID matches exactly"
  echo ""
fi

echo "3. ✅ OAuth Consent Screen Configuration"
echo "   Go to: https://console.cloud.google.com/apis/credentials/consent?project=$GOOGLE_PROJECT"
echo "   Ensure:"
echo "   - Consent screen is configured"
echo "   - Scopes include: email, profile, openid"
echo "   - If in testing mode, your email is in test users"
echo ""

echo "4. ✅ Client Secret"
echo "   Verify the Client Secret in Cognito matches Google Cloud Console"
echo "   (Secrets are not displayed for security)"
echo ""

echo "📝 Quick Fix Commands"
echo "===================="
echo ""
echo "To update redirect URI in Google Cloud Console:"
echo "  cd infra/scripts && ./update-google-oauth-redirect-uri.sh"
echo ""
echo "To verify Cognito configuration:"
echo "  aws cognito-idp describe-identity-provider \\"
echo "    --user-pool-id $USER_POOL_ID \\"
echo "    --provider-name Google"
echo ""
echo "To check User Pool Client:"
echo "  aws cognito-idp describe-user-pool-client \\"
echo "    --user-pool-id $USER_POOL_ID \\"
echo "    --client-id $CLIENT_ID"
echo ""

echo "🌐 Direct Links"
echo "=============="
echo ""
echo "Google Cloud Console Credentials:"
echo "  https://console.cloud.google.com/apis/credentials?project=$GOOGLE_PROJECT"
echo ""
echo "OAuth Consent Screen:"
echo "  https://console.cloud.google.com/apis/credentials/consent?project=$GOOGLE_PROJECT"
echo ""

if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ] && [ "$CLIENT_ID" != "" ]; then
  echo "OAuth Client Edit Page:"
  echo "  https://console.cloud.google.com/apis/credentials/oauthclient/$CLIENT_ID?project=$GOOGLE_PROJECT"
  echo ""
fi

echo "✅ Diagnostic complete!"
echo ""
echo "After fixing any issues:"
echo "  1. Wait 1-2 minutes for changes to propagate"
echo "  2. Clear browser cache/cookies"
echo "  3. Try signing in again"
echo ""

