#!/bin/bash
# Check API Cognito configuration

echo "=========================================="
echo "API Cognito Configuration Check"
echo "=========================================="
echo ""

# Check if API is running
if ! curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "⚠️  API server is not running on http://localhost:4000"
    echo ""
    echo "To start the API server:"
    echo "  cd apps/api && npm run dev"
    echo ""
    exit 1
fi

echo "✅ API server is running"
echo ""

# Check environment variables that would be used
echo "Frontend User Pool ID (from browser logs):"
echo "  us-east-1_xBNZh7TaB"
echo ""

echo "To check API configuration, look for this log when API starts:"
echo "  [JWT Auth] Configuration: { userPoolId: '...', ... }"
echo ""

echo "To check what the API sees, look for this log on each request:"
echo "  [JWT Auth] Token verified: { groups: [...], extractedRole: '...' }"
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Check your API server terminal for startup logs"
echo "2. Look for '[JWT Auth] Configuration:' log"
echo "3. Verify userPoolId matches: us-east-1_xBNZh7TaB"
echo "4. If it doesn't match, set COGNITO_USER_POOL_ID environment variable"
echo ""
echo "To set environment variables for API:"
echo "  export COGNITO_USER_POOL_ID=us-east-1_xBNZh7TaB"
echo "  export COGNITO_USER_POOL_CLIENT_ID=18b68j5jbm61pthstbk3ngeaa3"
echo "  cd apps/api && npm run dev"
echo ""

