#!/bin/bash
#
# Add a user to the Admin Cognito group
#
# Usage:
#   ./infra/scripts/add-user-to-admin-group.sh <email>
#
# Example:
#   ./infra/scripts/add-user-to-admin-group.sh scott.rakestraw@gravyty.com

set -e

EMAIL="${1:-scott.rakestraw@gravyty.com}"
GROUP_NAME="Admin"

echo "Adding user to Admin group..."
echo "Email: $EMAIL"
echo "Group: $GROUP_NAME"
echo ""

# Get User Pool ID from CDK stack or use from env
if [ -z "$USER_POOL_ID" ]; then
  USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name EnablementPortalStack \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text 2>/dev/null || echo "")
  
  # Fallback to env var or hardcoded value
  if [ -z "$USER_POOL_ID" ]; then
    USER_POOL_ID="${VITE_COGNITO_USER_POOL_ID:-us-east-1_s4q1vjkgD}"
  fi
fi

if [ -z "$USER_POOL_ID" ]; then
  echo "❌ Error: Could not determine User Pool ID"
  echo "Please set USER_POOL_ID environment variable or ensure CDK stack is deployed"
  exit 1
fi

echo "User Pool ID: $USER_POOL_ID"
echo ""

# Check if user exists
echo "Checking if user exists..."
USER_EXISTS=$(aws cognito-idp admin-get-user \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --query 'Username' \
  --output text 2>&1 || echo "")

if [ -z "$USER_EXISTS" ]; then
  echo "⚠️  Warning: User '$EMAIL' not found in Cognito"
  echo "The user must sign in at least once via Google OAuth before they can be added to a group"
  echo ""
  echo "Please:"
  echo "1. Sign in to the app with Google OAuth using $EMAIL"
  echo "2. Then run this script again"
  exit 1
fi

echo "✅ User found: $USER_EXISTS"
echo ""

# Check if group exists
echo "Checking if Admin group exists..."
GROUP_EXISTS=$(aws cognito-idp get-group \
  --user-pool-id "$USER_POOL_ID" \
  --group-name "$GROUP_NAME" \
  --query 'Group.GroupName' \
  --output text 2>&1 || echo "")

if [ -z "$GROUP_EXISTS" ]; then
  echo "⚠️  Warning: Group '$GROUP_NAME' not found"
  echo "Creating Admin group..."
  
  aws cognito-idp create-group \
    --user-pool-id "$USER_POOL_ID" \
    --group-name "$GROUP_NAME" \
    --description "Full administrative access" \
    --precedence 4
  
  echo "✅ Created Admin group"
else
  echo "✅ Group exists: $GROUP_EXISTS"
fi

echo ""

# Add user to group
echo "Adding user to Admin group..."
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$USER_POOL_ID" \
  --username "$EMAIL" \
  --group-name "$GROUP_NAME"

echo ""
echo "✅ Successfully added $EMAIL to $GROUP_NAME group"
echo ""
echo "The user will need to sign out and sign back in for the changes to take effect."




