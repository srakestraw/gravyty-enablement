#!/bin/bash
# Update apps/web/.env.local with Cognito configuration from CDK stack outputs
# Or output Amplify environment variables format with --amplify-format flag

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WEB_ENV="$PROJECT_ROOT/apps/web/.env.local"
STACK_NAME="EnablementPortalStack"

# Check for --amplify-format flag
AMPLIFY_FORMAT=false
if [[ "$1" == "--amplify-format" ]]; then
  AMPLIFY_FORMAT=true
fi

# Get outputs from CloudFormation stack
echo "Fetching stack outputs..."
STACK_INFO=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0]' \
  --output json 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$STACK_INFO" ]; then
  echo "❌ Failed to get stack outputs. Ensure stack is deployed: npm run cdk:deploy"
  exit 1
fi

OUTPUTS=$(echo "$STACK_INFO" | jq -r '.Outputs')
REGION=$(echo "$STACK_INFO" | jq -r '.StackRegion // .Region // "us-east-1"')

# Extract values
USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
DOMAIN=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolDomain") | .OutputValue')
API_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiUrl") | .OutputValue // ""')

# Extract region from User Pool ID if available (format: us-east-1_xxxxxxxxx)
if [[ "$USER_POOL_ID" =~ ^([a-z0-9-]+)_ ]]; then
  REGION="${BASH_REMATCH[1]}"
fi

if [ "$AMPLIFY_FORMAT" = true ]; then
  # Output in Amplify environment variables format (KEY=VALUE)
  echo "# Copy these environment variables to AWS Amplify Console"
  echo "# App Settings > Environment variables"
  echo ""
  echo "VITE_API_BASE_URL=${API_URL}"
  echo "VITE_COGNITO_REGION=${REGION}"
  echo "VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID}"
  echo "VITE_COGNITO_USER_POOL_CLIENT_ID=${CLIENT_ID}"
  echo "VITE_COGNITO_DOMAIN=${DOMAIN}"
  echo "VITE_AUTH_MODE=cognito"
  exit 0
fi

# Original behavior: update .env.local file
echo "📝 Updating apps/web/.env.local with CDK stack outputs"
echo "======================================================"

echo "Found Cognito resources:"
echo "  User Pool ID: $USER_POOL_ID"
echo "  Client ID: $CLIENT_ID"
echo "  Domain: $DOMAIN"
if [ -n "$API_URL" ]; then
  echo "  API URL: $API_URL"
fi
echo ""

# Create .env.local file if it doesn't exist
if [ ! -f "$WEB_ENV" ]; then
  echo "Creating $WEB_ENV..."
  touch "$WEB_ENV"
fi

# Update values in .env.local file
update_env_var() {
  local key=$1
  local value=$2
  
  if grep -q "^${key}=" "$WEB_ENV"; then
    # Update existing line
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$WEB_ENV"
    else
      # Linux
      sed -i "s|^${key}=.*|${key}=${value}|" "$WEB_ENV"
    fi
  else
    # Add new line
    echo "${key}=${value}" >> "$WEB_ENV"
  fi
}

# Update all variables
update_env_var "VITE_COGNITO_USER_POOL_ID" "$USER_POOL_ID"
update_env_var "VITE_COGNITO_USER_POOL_CLIENT_ID" "$CLIENT_ID"
# Support both VITE_COGNITO_DOMAIN (new) and VITE_COGNITO_USER_POOL_DOMAIN (legacy)
update_env_var "VITE_COGNITO_DOMAIN" "$DOMAIN"
update_env_var "VITE_COGNITO_USER_POOL_DOMAIN" "$DOMAIN"

# Add API base URL
if [ -n "$API_URL" ]; then
  update_env_var "VITE_API_BASE_URL" "$API_URL"
elif ! grep -q "^VITE_API_BASE_URL=" "$WEB_ENV"; then
  echo "VITE_API_BASE_URL=http://localhost:4000" >> "$WEB_ENV"
fi

echo "✅ Updated $WEB_ENV"
echo ""
echo "Current Cognito configuration:"
grep -E "^(VITE_COGNITO_|VITE_API_BASE_URL)" "$WEB_ENV"



