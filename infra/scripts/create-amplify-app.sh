#!/bin/bash
#
# Create and configure AWS Amplify app for enablement portal
#

set -e

echo "🚀 Creating AWS Amplify App"
echo "============================"
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

# Extract region from User Pool ID
REGION="us-east-1"
if [[ "$USER_POOL_ID" =~ ^([a-z0-9-]+)_ ]]; then
  REGION="${BASH_REMATCH[1]}"
fi

if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$DOMAIN_PREFIX" ]; then
  echo "❌ Error: Could not fetch required values from CDK stack"
  echo "Make sure the stack is deployed: npm run cdk:deploy"
  exit 1
fi

echo "✅ Configuration loaded:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"
echo "  Domain Prefix: $DOMAIN_PREFIX"
echo "  Region: $REGION"
if [ -n "$API_URL" ]; then
  echo "  API URL: $API_URL"
fi
echo ""

# Check if app already exists
APP_NAME="enablement-portal"
EXISTING_APP=$(aws amplify list-apps \
  --query "apps[?name=='$APP_NAME'].appId" \
  --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_APP" ] && [ "$EXISTING_APP" != "None" ]; then
  echo "⚠️  Amplify app '$APP_NAME' already exists (ID: $EXISTING_APP)"
  echo ""
  read -p "Do you want to continue and configure it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Exiting. Use AWS Console to manage the app."
    exit 0
  fi
  APP_ID="$EXISTING_APP"
else
  echo "📝 Note: Amplify app creation via CLI requires GitHub connection"
  echo "   For now, please create the app manually in AWS Console:"
  echo ""
  echo "   1. Go to: https://console.aws.amazon.com/amplify"
  echo "   2. Click 'New app' > 'Host web app'"
  echo "   3. Connect GitHub repository"
  echo "   4. Select branch (main/master)"
  echo "   5. App name: $APP_NAME"
  echo "   6. Build settings: Auto-detect amplify.yml"
  echo "   7. Click 'Save and deploy'"
  echo ""
  echo "   After the app is created, run this script again with:"
  echo "   APP_ID=<your-app-id> ./infra/scripts/create-amplify-app.sh"
  echo ""
  
  read -p "Do you have an existing Amplify app ID? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter Amplify App ID: " APP_ID
  else
    echo ""
    echo "Please create the app in AWS Console first, then run this script again."
    exit 0
  fi
fi

echo ""
echo "🔧 Configuring Amplify App: $APP_ID"
echo "===================================="
echo ""

# Get current app details
echo "📋 Fetching app details..."
APP_DETAILS=$(aws amplify get-app --app-id "$APP_ID" --output json 2>/dev/null || echo "{}")

if [ "$APP_DETAILS" == "{}" ]; then
  echo "❌ Error: Could not find app with ID: $APP_ID"
  exit 1
fi

APP_NAME=$(echo "$APP_DETAILS" | jq -r '.app.name // "enablement-portal"')
echo "✅ Found app: $APP_NAME"
echo ""

# Update environment variables
echo "📝 Setting environment variables..."
echo ""

# Prepare environment variables JSON
ENV_VARS=$(cat <<EOF
[
  {
    "name": "VITE_COGNITO_USER_POOL_ID",
    "value": "$USER_POOL_ID"
  },
  {
    "name": "VITE_COGNITO_USER_POOL_CLIENT_ID",
    "value": "$CLIENT_ID"
  },
  {
    "name": "VITE_COGNITO_DOMAIN",
    "value": "$DOMAIN_PREFIX"
  },
  {
    "name": "VITE_COGNITO_REGION",
    "value": "$REGION"
  },
  {
    "name": "VITE_AUTH_MODE",
    "value": "cognito"
  }
]
EOF
)

# Add API URL if available
if [ -n "$API_URL" ]; then
  ENV_VARS=$(echo "$ENV_VARS" | jq ". + [{\"name\": \"VITE_API_BASE_URL\", \"value\": \"$API_URL\"}]")
fi

echo "Environment variables to set:"
echo "$ENV_VARS" | jq -r '.[] | "  \(.name)=\(.value)"'
echo ""

# Update environment variables for main branch
BRANCH_NAME="main"
BRANCH_EXISTS=$(aws amplify get-branch \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --query 'branch.branchName' \
  --output text 2>/dev/null || echo "")

if [ -z "$BRANCH_EXISTS" ] || [ "$BRANCH_EXISTS" == "None" ]; then
  echo "⚠️  Branch '$BRANCH_NAME' not found. Checking for 'master'..."
  BRANCH_NAME="master"
  BRANCH_EXISTS=$(aws amplify get-branch \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --query 'branch.branchName' \
    --output text 2>/dev/null || echo "")
fi

if [ -z "$BRANCH_EXISTS" ] || [ "$BRANCH_EXISTS" == "None" ]; then
  echo "❌ Error: Could not find 'main' or 'master' branch"
  echo "Available branches:"
  aws amplify list-branches --app-id "$APP_ID" --query 'branches[*].branchName' --output table
  exit 1
fi

echo "✅ Found branch: $BRANCH_NAME"
echo ""

# Update branch environment variables
echo "Updating environment variables for branch '$BRANCH_NAME'..."
aws amplify update-branch \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --environment-variables "$ENV_VARS" \
  --output json > /dev/null

echo "✅ Environment variables updated!"
echo ""

# Trigger a new build
echo "🔄 Triggering new build..."
JOB_ID=$(aws amplify start-job \
  --app-id "$APP_ID" \
  --branch-name "$BRANCH_NAME" \
  --job-type RELEASE \
  --query 'jobSummary.jobId' \
  --output text 2>/dev/null || echo "")

if [ -n "$JOB_ID" ] && [ "$JOB_ID" != "None" ]; then
  echo "✅ Build started (Job ID: $JOB_ID)"
  echo ""
  echo "Monitor build progress:"
  echo "  https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID/$BRANCH_NAME/$JOB_ID"
else
  echo "⚠️  Could not trigger build automatically"
  echo "   Please trigger manually in AWS Console"
fi

echo ""
echo "✅ Configuration Complete!"
echo "=========================="
echo ""
echo "Next steps:"
echo "1. Wait for build to complete (~5-10 minutes)"
echo "2. Get Amplify domain URL from AWS Console"
echo "3. Update CDK stack CORS with Amplify domain:"
echo "   export WEB_ALLOWED_ORIGINS=\"https://<amplify-domain>\""
echo "   npm run cdk:deploy"
echo "4. Add custom domain 'enable.gravytylabs.com' in Amplify Console"
echo ""
echo "App Console:"
echo "  https://console.aws.amazon.com/amplify/home?region=$REGION#/$APP_ID"


