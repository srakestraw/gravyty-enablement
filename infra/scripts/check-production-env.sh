#!/bin/bash
#
# Check and display production environment variables needed for Amplify
# This helps diagnose missing VITE_COGNITO_DOMAIN issues
#

set -e

echo "🔍 Production Environment Variables Check"
echo "=========================================="
echo ""

# Get values from CDK stack
echo "Fetching values from CDK stack..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null || echo "")

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text 2>/dev/null || echo "")

DOMAIN_PREFIX=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolDomain`].OutputValue' \
  --output text 2>/dev/null || echo "")

# Extract region from User Pool ID (format: us-east-1_xxxxxxxxx)
REGION="us-east-1"
if [[ "$USER_POOL_ID" =~ ^([a-z0-9-]+)_ ]]; then
  REGION="${BASH_REMATCH[1]}"
fi

API_URL=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$DOMAIN_PREFIX" ]; then
  echo "❌ Error: Could not fetch all required values from CDK stack"
  echo "Make sure the stack is deployed and you have AWS credentials configured"
  exit 1
fi

# Construct full domain (Cognito domain format)
FULL_DOMAIN="${DOMAIN_PREFIX}.auth.${REGION}.amazoncognito.com"

echo "✅ CDK Stack Values:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"
echo "  Domain Prefix: $DOMAIN_PREFIX"
echo "  Full Domain: $FULL_DOMAIN"
echo "  Region: $REGION"
if [ -n "$API_URL" ]; then
  echo "  API URL: $API_URL"
fi
echo ""

echo "📋 Required Amplify Environment Variables:"
echo "==========================================="
echo ""
echo "Copy these to AWS Amplify Console > App Settings > Environment variables:"
echo ""
echo "VITE_COGNITO_USER_POOL_ID=$USER_POOL_ID"
echo "VITE_COGNITO_USER_POOL_CLIENT_ID=$CLIENT_ID"
echo "VITE_COGNITO_DOMAIN=$DOMAIN_PREFIX"
echo "VITE_COGNITO_REGION=$REGION"
if [ -n "$API_URL" ]; then
  echo "VITE_API_BASE_URL=$API_URL"
fi
echo "VITE_AUTH_MODE=cognito"
echo ""

echo "⚠️  IMPORTANT:"
echo "  - VITE_COGNITO_DOMAIN should be set to: $DOMAIN_PREFIX"
echo "  - The code will automatically construct: $FULL_DOMAIN"
echo "  - Do NOT include '.auth.us-east-1.amazoncognito.com' in VITE_COGNITO_DOMAIN"
echo ""

echo "🔗 Cognito Hosted UI URL:"
echo "  https://$FULL_DOMAIN"
echo ""

echo "📝 To update Amplify environment variables:"
echo "  1. Go to: https://console.aws.amazon.com/amplify"
echo "  2. Select your app"
echo "  3. Go to: App Settings > Environment variables"
echo "  4. Add/update the variables listed above"
echo "  5. Save (this will trigger a new build)"
echo ""

