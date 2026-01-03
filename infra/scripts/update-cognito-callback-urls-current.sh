#!/bin/bash
# Update Cognito User Pool Client callback URLs for current configuration
# Uses the correct User Pool ID and Client ID from .env.local

set -e

USER_POOL_ID="us-east-1_xBNZh7TaB"
CLIENT_ID="18b68j5jbm61pthstbk3ngeaa3"

echo "🔄 Updating Cognito User Pool Client Callback URLs"
echo "=================================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo ""

# Get additional URLs from command line arguments
ADDITIONAL_URLS=("$@")

# Define base callback URLs
CALLBACK_URLS=(
  "http://localhost:3000"
  "http://localhost:3000/"
  "http://localhost:3000/auth/callback"
  "http://localhost:5173"
  "http://localhost:5173/"
  "http://localhost:5173/auth/callback"
  "https://enable.gravytylabs.com"
  "https://enable.gravytylabs.com/"
  "https://enable.gravytylabs.com/auth/callback"
)

# Add additional URLs (e.g., Amplify preview URLs)
# Each URL is added with and without trailing slash, and with /auth/callback
for url in "${ADDITIONAL_URLS[@]}"; do
  if [[ -n "$url" ]]; then
    CALLBACK_URLS+=("$url")
    CALLBACK_URLS+=("${url}/")
    CALLBACK_URLS+=("${url}/auth/callback")
  fi
done

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
echo ""
echo "If you're accessing from a different origin, run:"
echo "  ./update-cognito-callback-urls-current.sh \"https://your-origin.com\""

