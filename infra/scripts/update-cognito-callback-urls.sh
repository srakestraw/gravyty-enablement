#!/bin/bash
# Update Cognito User Pool Client callback URLs to include localhost URLs

set -e

USER_POOL_ID="${1:-us-east-1_s4q1vjkgD}"
CLIENT_ID="${2:-5p932tqfp5g5jh9h02bn6hskgm}"

echo "🔄 Updating Cognito User Pool Client Callback URLs"
echo "=================================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo ""

# Define callback URLs (must match what's in Amplify config)
CALLBACK_URLS=(
  "http://localhost:3000"
  "http://localhost:3000/"
  "http://localhost:5173"
  "http://localhost:5173/"
  "https://enable.gravytylabs.com"
  "https://enable.gravytylabs.com/"
)

# Convert array to JSON array format for AWS CLI
CALLBACK_URLS_JSON=$(printf '%s\n' "${CALLBACK_URLS[@]}" | jq -R . | jq -s .)

echo "Callback URLs to set:"
echo "$CALLBACK_URLS_JSON" | jq -r '.[]'
echo ""

# Update the User Pool Client
echo "Updating User Pool Client..."
aws cognito-idp update-user-pool-client \
  --user-pool-id "$USER_POOL_ID" \
  --client-id "$CLIENT_ID" \
  --callback-urls "$CALLBACK_URLS_JSON" \
  --logout-urls "$CALLBACK_URLS_JSON" \
  --query 'UserPoolClient.{ClientId:ClientId,CallbackURLs:CallbackURLs,LogoutURLs:LogoutURLs}' \
  --output json

echo ""
echo "✅ Callback URLs updated successfully!"
echo ""
echo "You can now try signing in again."



