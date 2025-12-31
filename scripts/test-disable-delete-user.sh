#!/bin/bash
#
# Test disable and delete user functionality
#

set -e

API_URL="${API_URL:-http://localhost:4000}"
JWT_TOKEN="${ADMIN_JWT_TOKEN:-}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Test Disable/Delete User Functionality"
echo "=========================================="
echo "API URL: $API_URL"
echo ""

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
    echo -e "${YELLOW}⚠ ADMIN_JWT_TOKEN not set. Using dev headers instead.${NC}"
    DEV_ROLE="${VITE_DEV_ROLE:-Admin}"
    DEV_USER_ID="${VITE_DEV_USER_ID:-admin-user}"
    HEADERS=(
        -H "Content-Type: application/json"
        -H "x-dev-role: $DEV_ROLE"
        -H "x-dev-user-id: $DEV_USER_ID"
    )
else
    HEADERS=(
        -H "Content-Type: application/json"
        -H "Authorization: Bearer $JWT_TOKEN"
    )
fi

# Test user email (use a test email)
TEST_EMAIL="${1:-test-disable-$(date +%s)@gravyty.com}"

echo "Using test email: $TEST_EMAIL"
echo ""

# Step 1: Create a test user
echo "1. Creating test user..."
INVITE_PAYLOAD=$(jq -n --arg email "$TEST_EMAIL" --arg role "Viewer" '{email: $email, role: $role}')

INVITE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
    -X POST \
    -d "$INVITE_PAYLOAD" \
    "$API_URL/v1/admin/users/invite" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$INVITE_RESPONSE" | tail -n1)
BODY=$(echo "$INVITE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Test user created${NC}"
    USERNAME=$(echo "$BODY" | jq -r '.data.username' 2>/dev/null || echo "$TEST_EMAIL")
    echo "   Username: $USERNAME"
elif [ "$HTTP_CODE" = "409" ]; then
    echo -e "${YELLOW}⚠ User already exists, using existing user${NC}"
    USERNAME="$TEST_EMAIL"
else
    echo -e "${RED}✗ Failed to create test user (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
    exit 1
fi

echo ""

# Step 2: Get user details before disable
echo "2. Getting user details before disable..."
GET_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
    "$API_URL/v1/admin/users?query=$TEST_EMAIL" 2>/dev/null || echo "000")
GET_HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
GET_BODY=$(echo "$GET_RESPONSE" | sed '$d')

if [ "$GET_HTTP_CODE" = "200" ]; then
    ENABLED_BEFORE=$(echo "$GET_BODY" | jq -r ".data.items[] | select(.email==\"$TEST_EMAIL\") | .enabled" 2>/dev/null || echo "")
    echo "   Enabled before: $ENABLED_BEFORE"
else
    echo -e "${YELLOW}⚠ Could not get user details${NC}"
fi

echo ""

# Step 3: Disable user
echo "3. Testing disable user..."
DISABLE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
    -X PATCH \
    "$API_URL/v1/admin/users/$(echo "$USERNAME" | jq -sRr @uri)/disable" 2>/dev/null || echo "000")
DISABLE_HTTP_CODE=$(echo "$DISABLE_RESPONSE" | tail -n1)
DISABLE_BODY=$(echo "$DISABLE_RESPONSE" | sed '$d')

if [ "$DISABLE_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Disable user endpoint works${NC}"
    ENABLED_AFTER=$(echo "$DISABLE_BODY" | jq -r '.data.enabled' 2>/dev/null || echo "")
    echo "   Enabled after: $ENABLED_AFTER"
    if [ "$ENABLED_AFTER" = "false" ]; then
        echo -e "${GREEN}✓ User successfully disabled${NC}"
    else
        echo -e "${RED}✗ User still enabled (expected false)${NC}"
    fi
else
    echo -e "${RED}✗ Disable user failed (HTTP $DISABLE_HTTP_CODE)${NC}"
    echo "   Response: $DISABLE_BODY"
    echo ""
    echo "Common issues:"
    echo "  1. Check API logs for errors"
    echo "  2. Verify IAM permissions include cognito-idp:AdminDisableUser"
    echo "  3. Check if COGNITO_USER_POOL_ID is set correctly"
    echo "  4. Verify AWS credentials are configured"
fi

echo ""

# Step 4: Enable user (to test delete)
echo "4. Enabling user before delete test..."
ENABLE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
    -X PATCH \
    "$API_URL/v1/admin/users/$(echo "$USERNAME" | jq -sRr @uri)/enable" 2>/dev/null || echo "000")
ENABLE_HTTP_CODE=$(echo "$ENABLE_RESPONSE" | tail -n1)

if [ "$ENABLE_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ User enabled${NC}"
else
    echo -e "${YELLOW}⚠ Could not enable user (HTTP $ENABLE_HTTP_CODE)${NC}"
fi

echo ""

# Step 5: Delete user
echo "5. Testing delete user..."
DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
    -X DELETE \
    "$API_URL/v1/admin/users/$(echo "$USERNAME" | jq -sRr @uri)" 2>/dev/null || echo "000")
DELETE_HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
DELETE_BODY=$(echo "$DELETE_RESPONSE" | sed '$d')

if [ "$DELETE_HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✓ Delete user endpoint works${NC}"
    echo -e "${GREEN}✓ User successfully deleted${NC}"
elif [ "$DELETE_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Delete user endpoint works (HTTP 200)${NC}"
else
    echo -e "${RED}✗ Delete user failed (HTTP $DELETE_HTTP_CODE)${NC}"
    echo "   Response: $DELETE_BODY"
    echo ""
    echo "Common issues:"
    echo "  1. Check API logs for errors"
    echo "  2. Verify IAM permissions include cognito-idp:AdminDeleteUser"
    echo "  3. Check if COGNITO_USER_POOL_ID is set correctly"
    echo "  4. Verify AWS credentials are configured"
    echo "  5. Check if user exists: aws cognito-idp admin-get-user --user-pool-id <POOL_ID> --username $USERNAME"
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="

