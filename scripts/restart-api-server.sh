#!/bin/bash
# Restart API server with correct Cognito configuration

cd "$(dirname "$0")/../apps/api"

echo "=========================================="
echo "Restarting API Server"
echo "=========================================="
echo ""

# Set Cognito environment variables
export COGNITO_USER_POOL_ID=us-east-1_xBNZh7TaB
export COGNITO_USER_POOL_CLIENT_ID=18b68j5jbm61pthstbk3ngeaa3
export AWS_PROFILE=admin
export AWS_REGION=us-east-1

echo "Environment variables set:"
echo "  COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID"
echo "  COGNITO_USER_POOL_CLIENT_ID=$COGNITO_USER_POOL_CLIENT_ID"
echo "  AWS_PROFILE=$AWS_PROFILE"
echo "  AWS_REGION=$AWS_REGION"
echo ""

echo "Starting API server..."
echo "Look for this log to confirm configuration:"
echo "  [JWT Auth] Configuration: { userPoolId: 'us-east-1_xBNZh7TaB', ... }"
echo ""

# Start the server
npm run dev

