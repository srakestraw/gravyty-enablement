#!/bin/bash
#
# Test script for Admin Users API endpoints
# Requires: API_URL and ADMIN_JWT_TOKEN environment variables
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
echo "Admin Users API Test Script"
echo "=========================================="
echo ""
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

# Test 1: Health check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" "$API_URL/health" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

# Test 2: List users
echo ""
echo "2. Testing GET /v1/admin/users..."
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" "$API_URL/v1/admin/users" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
BODY=$(echo "$LIST_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ List users endpoint works${NC}"
    USER_COUNT=$(echo "$BODY" | jq -r '.data.items | length' 2>/dev/null || echo "0")
    echo "   Found $USER_COUNT users"
    if [ "$USER_COUNT" -gt 0 ]; then
        FIRST_USER=$(echo "$BODY" | jq -r '.data.items[0].email' 2>/dev/null || echo "")
        echo "   First user: $FIRST_USER"
    fi
else
    echo -e "${RED}✗ List users failed (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
fi

# Test 3: Invite user (dry run - will fail if user exists, but tests endpoint)
echo ""
echo "3. Testing POST /v1/admin/users/invite..."
TEST_EMAIL="test-$(date +%s)@gravyty.com"
INVITE_PAYLOAD=$(jq -n --arg email "$TEST_EMAIL" --arg role "Viewer" '{email: $email, role: $role}')

INVITE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
    -X POST \
    -d "$INVITE_PAYLOAD" \
    "$API_URL/v1/admin/users/invite" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$INVITE_RESPONSE" | tail -n1)
BODY=$(echo "$INVITE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ Invite user endpoint works${NC}"
    USERNAME=$(echo "$BODY" | jq -r '.data.username' 2>/dev/null || echo "")
    echo "   Created user: $USERNAME"
    TEST_USERNAME="$USERNAME"
elif [ "$HTTP_CODE" = "409" ]; then
    echo -e "${YELLOW}⚠ User already exists (expected if running multiple times)${NC}"
    TEST_USERNAME="$TEST_EMAIL"
else
    echo -e "${RED}✗ Invite user failed (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
    TEST_USERNAME=""
fi

# Test 4: Change role (if we have a test user)
if [ -n "$TEST_USERNAME" ]; then
    echo ""
    echo "4. Testing PATCH /v1/admin/users/:username/role..."
    ROLE_PAYLOAD=$(jq -n '{role: "Contributor"}')
    
    ROLE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
        -X PATCH \
        -d "$ROLE_PAYLOAD" \
        "$API_URL/v1/admin/users/$(echo "$TEST_USERNAME" | jq -sRr @uri)/role" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$ROLE_RESPONSE" | tail -n1)
    BODY=$(echo "$ROLE_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Change role endpoint works${NC}"
        NEW_ROLE=$(echo "$BODY" | jq -r '.data.role' 2>/dev/null || echo "")
        echo "   Updated role to: $NEW_ROLE"
    else
        echo -e "${RED}✗ Change role failed (HTTP $HTTP_CODE)${NC}"
        echo "   Response: $BODY"
    fi
fi

# Test 5: Disable user (if we have a test user)
if [ -n "$TEST_USERNAME" ]; then
    echo ""
    echo "5. Testing PATCH /v1/admin/users/:username/disable..."
    
    DISABLE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
        -X PATCH \
        "$API_URL/v1/admin/users/$(echo "$TEST_USERNAME" | jq -sRr @uri)/disable" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$DISABLE_RESPONSE" | tail -n1)
    BODY=$(echo "$DISABLE_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Disable user endpoint works${NC}"
        ENABLED=$(echo "$BODY" | jq -r '.data.enabled' 2>/dev/null || echo "")
        echo "   User enabled: $ENABLED"
    else
        echo -e "${RED}✗ Disable user failed (HTTP $HTTP_CODE)${NC}"
        echo "   Response: $BODY"
    fi
fi

# Test 6: Enable user (if we have a test user)
if [ -n "$TEST_USERNAME" ]; then
    echo ""
    echo "6. Testing PATCH /v1/admin/users/:username/enable..."
    
    ENABLE_RESPONSE=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" \
        -X PATCH \
        "$API_URL/v1/admin/users/$(echo "$TEST_USERNAME" | jq -sRr @uri)/enable" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$ENABLE_RESPONSE" | tail -n1)
    BODY=$(echo "$ENABLE_RESPONSE" | sed '$d')
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Enable user endpoint works${NC}"
        ENABLED=$(echo "$BODY" | jq -r '.data.enabled' 2>/dev/null || echo "")
        echo "   User enabled: $ENABLED"
    else
        echo -e "${RED}✗ Enable user failed (HTTP $HTTP_CODE)${NC}"
        echo "   Response: $BODY"
    fi
fi

echo ""
echo "=========================================="
echo "API Tests Complete"
echo "=========================================="


