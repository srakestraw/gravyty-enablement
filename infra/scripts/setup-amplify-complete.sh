#!/bin/bash
#
# Complete Amplify setup guide and configuration script
# This script helps you create and configure the Amplify app
#

set -e

echo "🚀 Complete AWS Amplify Setup Guide"
echo "===================================="
echo ""

# Get Cognito values from CDK stack
echo "📋 Fetching configuration from CDK stack..."
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

API_URL=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text 2>/dev/null || echo "")

REGION="us-east-1"
if [[ "$USER_POOL_ID" =~ ^([a-z0-9-]+)_ ]]; then
  REGION="${BASH_REMATCH[1]}"
fi

if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$DOMAIN_PREFIX" ]; then
  echo "❌ Error: Could not fetch required values from CDK stack"
  exit 1
fi

echo "✅ Configuration ready!"
echo ""

# Check if app exists
APP_NAME="enablement-portal"
EXISTING_APP=$(aws amplify list-apps \
  --query "apps[?name=='$APP_NAME'].appId" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_APP" ] && [ "$EXISTING_APP" != "None" ]; then
  echo "✅ Found existing Amplify app: $EXISTING_APP"
  echo ""
  echo "🔧 Configuring existing app..."
  
  # Find main branch
  BRANCH_NAME="main"
  BRANCH_EXISTS=$(aws amplify get-branch \
    --app-id "$EXISTING_APP" \
    --branch-name "$BRANCH_NAME" \
    --query 'branch.branchName' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$BRANCH_EXISTS" ] || [ "$BRANCH_EXISTS" == "None" ]; then
    BRANCH_NAME="master"
  fi
  
  # Prepare environment variables
  ENV_VARS=$(cat <<EOF
{
  "VITE_COGNITO_USER_POOL_ID": "$USER_POOL_ID",
  "VITE_COGNITO_USER_POOL_CLIENT_ID": "$CLIENT_ID",
  "VITE_COGNITO_DOMAIN": "$DOMAIN_PREFIX",
  "VITE_COGNITO_REGION": "$REGION",
  "VITE_AUTH_MODE": "cognito"
}
EOF
)
  
  if [ -n "$API_URL" ]; then
    ENV_VARS=$(echo "$ENV_VARS" | jq ". + {\"VITE_API_BASE_URL\": \"$API_URL\"}")
  fi
  
  echo "Setting environment variables..."
  aws amplify update-branch \
    --app-id "$EXISTING_APP" \
    --branch-name "$BRANCH_NAME" \
    --environment-variables "$ENV_VARS" \
    --output json > /dev/null
  
  echo "✅ Environment variables configured!"
  echo ""
  echo "🔄 Triggering new build..."
  JOB_ID=$(aws amplify start-job \
    --app-id "$EXISTING_APP" \
    --branch-name "$BRANCH_NAME" \
    --job-type RELEASE \
    --query 'jobSummary.jobId' \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "None" ]; then
    echo "✅ Build started!"
    echo ""
    echo "Monitor: https://console.aws.amazon.com/amplify/home?region=$REGION#/$EXISTING_APP/$BRANCH_NAME/$JOB_ID"
  fi
  
  echo ""
  echo "✅ Setup complete!"
  exit 0
fi

# App doesn't exist - provide creation instructions
echo "📝 Step-by-Step Amplify App Creation"
echo "====================================="
echo ""
echo "Since Amplify requires GitHub OAuth, please create the app manually:"
echo ""
echo "1️⃣  Go to AWS Amplify Console:"
echo "   https://console.aws.amazon.com/amplify"
echo ""
echo "2️⃣  Click 'New app' → 'Host web app'"
echo ""
echo "3️⃣  Connect GitHub:"
echo "   - Select 'GitHub' as source"
echo "   - Authorize AWS Amplify (if first time)"
echo "   - Repository: srakestraw/gravyty-enablement"
echo "   - Branch: main"
echo ""
echo "4️⃣  Configure app:"
echo "   - App name: enablement-portal"
echo "   - Build settings: Auto-detect amplify.yml"
echo "   - Base directory: (leave empty)"
echo ""
echo "5️⃣  Click 'Save and deploy'"
echo ""
echo "6️⃣  After first build completes, run this script again:"
echo "   ./infra/scripts/setup-amplify-complete.sh"
echo ""
echo "The script will automatically configure environment variables and trigger a new build."
echo ""
echo "📋 Environment Variables (for reference):"
echo "========================================"
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


