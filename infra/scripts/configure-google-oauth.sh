#!/bin/bash
# Configure Google OAuth credentials for Cognito

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STACK_NAME="EnablementPortalStack"

echo "🔐 Google OAuth Configuration for Cognito"
echo "=========================================="
echo ""

# Get Cognito domain from stack
echo "📋 Step 1: Getting Cognito domain from CDK stack..."
COGNITO_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$COGNITO_DOMAIN" ]; then
  echo "❌ Could not retrieve Cognito domain. Ensure the CDK stack is deployed."
  echo "   Run: npm run cdk:deploy"
  exit 1
fi

echo "✅ Cognito Domain: $COGNITO_DOMAIN"
echo ""

# Get User Pool ID
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$USER_POOL_ID" ]; then
  echo "❌ Could not retrieve User Pool ID. Ensure the CDK stack is deployed."
  exit 1
fi

echo "✅ User Pool ID: $USER_POOL_ID"
echo ""

# Get SSM parameter names
CLIENT_ID_PARAM=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`GoogleClientIdParamName`].OutputValue' \
  --output text 2>/dev/null)

CLIENT_SECRET_PARAM=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`GoogleClientSecretParamName`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$CLIENT_ID_PARAM" ] || [ -z "$CLIENT_SECRET_PARAM" ]; then
  echo "❌ Could not retrieve SSM parameter names. Ensure the CDK stack is deployed."
  exit 1
fi

echo "📋 Step 2: Google Cloud Console Setup"
echo "======================================"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Select your project (or create a new one)"
echo "3. Click 'Create Credentials' → 'OAuth client ID'"
echo "4. Application type: 'Web application'"
echo "5. Name: 'Enablement Portal' (or your preferred name)"
echo ""
echo "6. Authorized redirect URIs (add these):"
echo "   https://${COGNITO_DOMAIN}/oauth2/idpresponse"
echo ""
echo "   For local development, also add:"
echo "   http://localhost:5173"
echo "   http://localhost:3000"
echo ""
echo "7. Click 'Create'"
echo "8. Copy the Client ID and Client Secret"
echo ""

read -p "Press Enter when you have the Client ID and Client Secret ready..."

# Prompt for credentials
echo ""
echo "📝 Step 3: Enter Google OAuth Credentials"
echo "=========================================="
read -p "Google OAuth Client ID: " GOOGLE_CLIENT_ID
read -sp "Google OAuth Client Secret: " GOOGLE_CLIENT_SECRET
echo ""

if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ Client ID and Client Secret are required"
  exit 1
fi

# Store in SSM
echo ""
echo "📦 Step 4: Storing credentials in SSM Parameter Store..."
echo "======================================================"

aws ssm put-parameter \
  --name "$CLIENT_ID_PARAM" \
  --value "$GOOGLE_CLIENT_ID" \
  --type String \
  --overwrite \
  --description "Google OAuth Client ID for Cognito" \
  > /dev/null

echo "✅ Stored Client ID in SSM: $CLIENT_ID_PARAM"

aws ssm put-parameter \
  --name "$CLIENT_SECRET_PARAM" \
  --value "$GOOGLE_CLIENT_SECRET" \
  --type SecureString \
  --overwrite \
  --description "Google OAuth Client Secret for Cognito" \
  > /dev/null

echo "✅ Stored Client Secret in SSM: $CLIENT_SECRET_PARAM"
echo ""

# Update Cognito Identity Provider
echo "🔄 Step 5: Updating Cognito Identity Provider..."
echo "==============================================="

aws cognito-idp update-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --provider-details "client_id=$GOOGLE_CLIENT_ID,client_secret=$GOOGLE_CLIENT_SECRET,authorize_scopes=openid email profile" \
  > /dev/null

echo "✅ Updated Cognito Identity Provider"
echo ""

# Verify configuration
echo "✅ Step 6: Verifying configuration..."
echo "===================================="

PROVIDER=$(aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --query 'IdentityProvider.{Name:ProviderName,Type:ProviderType,Status:ProviderDetails}' \
  --output json 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✅ Google Identity Provider configured successfully!"
  echo ""
  echo "Provider Details:"
  echo "$PROVIDER" | jq '.'
else
  echo "⚠️  Could not verify provider configuration"
fi

echo ""
echo "🎉 Configuration Complete!"
echo "=========================="
echo ""
echo "Next Steps:"
echo "1. Test Google Sign-In in your web app"
echo "2. Assign users to Cognito groups (Viewer, Contributor, Approver, Admin)"
echo ""
echo "To assign a user to a group:"
echo "  aws cognito-idp admin-add-user-to-group \\"
echo "    --user-pool-id $USER_POOL_ID \\"
echo "    --username user@example.com \\"
echo "    --group-name Contributor"
echo ""




