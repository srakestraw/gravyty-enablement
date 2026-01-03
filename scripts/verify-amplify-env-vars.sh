#!/bin/bash
# Script to verify Amplify environment variables
# This script checks what variables are needed and helps verify they're set correctly

set -e

echo "🔍 Amplify Environment Variables Verification"
echo "=============================================="
echo ""

# Required variables for production
REQUIRED_VARS=(
  "VITE_API_BASE_URL"
  "VITE_COGNITO_USER_POOL_ID"
  "VITE_COGNITO_USER_POOL_CLIENT_ID"
  "VITE_COGNITO_DOMAIN"
  "VITE_COGNITO_REGION"
  "VITE_AUTH_MODE"
)

# Optional variables (have defaults)
OPTIONAL_VARS=(
  "VITE_PRODUCTION_DOMAIN"
  "VITE_DEV_ROLE"
  "VITE_DEV_USER_ID"
  "VITE_ADMIN_EMAILS"
)

echo "📋 Required Environment Variables:"
echo "-----------------------------------"
for var in "${REQUIRED_VARS[@]}"; do
  echo "  ✓ $var"
done
echo ""

echo "📋 Optional Environment Variables (have defaults):"
echo "---------------------------------------------------"
for var in "${OPTIONAL_VARS[@]}"; do
  echo "  ○ $var"
done
echo ""

echo "📝 Variable Descriptions:"
echo "-------------------------"
echo ""
echo "VITE_API_BASE_URL"
echo "  Description: Base URL for the API Gateway"
echo "  Example: https://xxxxx.execute-api.us-east-1.amazonaws.com"
echo "  Required: Yes"
echo ""

echo "VITE_COGNITO_USER_POOL_ID"
echo "  Description: AWS Cognito User Pool ID"
echo "  Example: us-east-1_xxxxxxxxx"
echo "  Required: Yes"
echo ""

echo "VITE_COGNITO_USER_POOL_CLIENT_ID"
echo "  Description: AWS Cognito User Pool Client ID"
echo "  Example: xxxxxxxxxxxxxxxxxxxxxxxxxx"
echo "  Required: Yes"
echo ""

echo "VITE_COGNITO_DOMAIN"
echo "  Description: Cognito domain (can be prefix or full domain)"
echo "  Example (prefix): enablement-portal-xxxxxxx"
echo "  Example (full): enablement-portal-xxxxxxx.auth.us-east-1.amazoncognito.com"
echo "  Required: Yes"
echo ""

echo "VITE_COGNITO_REGION"
echo "  Description: AWS region where Cognito is deployed"
echo "  Example: us-east-1"
echo "  Default: us-east-1"
echo "  Required: Yes (but has default)"
echo ""

echo "VITE_AUTH_MODE"
echo "  Description: Authentication mode"
echo "  Example: cognito"
echo "  Required: Yes"
echo ""

echo "🔧 How to Get Values from CDK Stack:"
echo "------------------------------------"
echo ""
echo "Run this command to get all values in Amplify format:"
echo ""
echo "  ./infra/scripts/update-web-env-from-cdk.sh --amplify-format"
echo ""
echo "This will output:"
echo "  VITE_API_BASE_URL=..."
echo "  VITE_COGNITO_REGION=..."
echo "  VITE_COGNITO_USER_POOL_ID=..."
echo "  VITE_COGNITO_USER_POOL_CLIENT_ID=..."
echo "  VITE_COGNITO_DOMAIN=..."
echo "  VITE_AUTH_MODE=cognito"
echo ""

echo "📱 How to Set in Amplify Console:"
echo "---------------------------------"
echo ""
echo "1. Go to AWS Amplify Console"
echo "2. Select your app"
echo "3. Go to: App settings → Environment variables"
echo "4. Click 'Manage variables'"
echo "5. Add each variable from the list above"
echo "6. Click 'Save'"
echo "7. Redeploy the app"
echo ""

echo "✅ Verification Checklist:"
echo "-------------------------"
echo ""
echo "In Amplify Console, verify these are set:"
for var in "${REQUIRED_VARS[@]}"; do
  echo "  [ ] $var"
done
echo ""

echo "💡 Tips:"
echo "--------"
echo ""
echo "• All variable names must start with 'VITE_' for Vite to include them"
echo "• Values are injected at build time, not runtime"
echo "• After adding/updating variables, you must redeploy"
echo "• Check build logs to see if variables are being read (they're logged in preBuild phase)"
echo ""




