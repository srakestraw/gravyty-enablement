#!/bin/bash
# Quick configuration script for Google OAuth credentials
# Use this after CDK stack is deployed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STACK_NAME="EnablementPortalStack"

# Pre-filled credentials from Google Console
# Replace these with your actual Google OAuth credentials
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

echo "🔐 Quick Google OAuth Configuration"
echo "===================================="
echo ""

# Get Cognito domain from stack
echo "📋 Getting Cognito domain from CDK stack..."
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

echo "📦 Storing credentials in SSM Parameter Store..."
echo "==============================================="

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
echo "🔄 Updating Cognito Identity Provider..."
echo "========================================="

aws cognito-idp update-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --provider-details "client_id=$GOOGLE_CLIENT_ID,client_secret=$GOOGLE_CLIENT_SECRET,authorize_scopes=openid email profile" \
  > /dev/null

echo "✅ Updated Cognito Identity Provider"
echo ""

# Verify configuration
echo "✅ Verifying configuration..."
echo "============================="

PROVIDER=$(aws cognito-idp describe-identity-provider \
  --user-pool-id "$USER_POOL_ID" \
  --provider-name Google \
  --query 'IdentityProvider.{Name:ProviderName,Type:ProviderType}' \
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
echo "📝 IMPORTANT: Add Redirect URI in Google Console"
echo "================================================="
echo ""
echo "Go to: https://console.cloud.google.com/apis/credentials?project=YOUR_GOOGLE_PROJECT_ID"
echo "Edit your OAuth client and add this redirect URI:"
echo ""
echo "  https://${COGNITO_DOMAIN}/oauth2/idpresponse"
echo ""
echo "Next Steps:"
echo "1. Add redirect URI in Google Console (see above)"
echo "2. Test Google Sign-In in your web app"
echo "3. Assign users to Cognito groups (Viewer, Contributor, Approver, Admin)"
echo ""
echo "To assign a user to a group:"
echo "  aws cognito-idp admin-add-user-to-group \\"
echo "    --user-pool-id $USER_POOL_ID \\"
echo "    --username user@example.com \\"
echo "    --group-name Contributor"
echo ""




