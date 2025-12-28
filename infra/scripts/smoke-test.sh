#!/bin/bash

# Smoke Test Script for Enablement Portal API
# Tests events and analytics endpoints

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"
X_DEV_ROLE="${X_DEV_ROLE:-Viewer}"
X_DEV_USER_ID="${X_DEV_USER_ID:-smoke-test-user}"

echo "🧪 Enablement Portal API Smoke Test"
echo "===================================="
echo "API Base URL: $API_BASE_URL"
if [ -n "$AUTH_TOKEN" ]; then
  echo "Auth: Using AUTH_TOKEN (JWT)"
else
  echo "Auth: Using dev headers (role: $X_DEV_ROLE, user: $X_DEV_USER_ID)"
fi
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to print success
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Helper function to print error
error() {
  echo -e "${RED}❌ $1${NC}"
}

# Helper function to print info
info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Helper function to build auth headers
# Usage: build_auth_headers [role] [user_id]
# Returns space-separated header flags for curl
build_auth_headers() {
  local role="${1:-$X_DEV_ROLE}"
  local user_id="${2:-$X_DEV_USER_ID}"
  
  if [ -n "$AUTH_TOKEN" ]; then
    echo "-H \"Authorization: Bearer $AUTH_TOKEN\""
  else
    echo "-H \"x-dev-role: $role\" -H \"x-dev-user-id: $user_id\""
  fi
}

# Test 1: GET /health (API health check)
echo "Test 1: GET /health"
echo "-------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  success "Health check: HTTP $HTTP_CODE"
else
  error "Health check failed: HTTP $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
echo ""

# Test 2: POST /v1/events (post event)
echo "Test 2: POST /v1/events"
echo "------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE_URL/v1/events" \
  -H "Content-Type: application/json" \
  -H "x-dev-role: Viewer" \
  -d "{
    \"event_name\": \"smoke_test\",
    \"user_id\": \"smoke-test-user\",
    \"metadata\": {
      \"test\": true
    }
  }")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  success "Post event: HTTP $HTTP_CODE"
  REQUEST_ID=$(echo "$BODY" | grep -o '"request_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$REQUEST_ID" ]; then
    info "Request ID: $REQUEST_ID"
  fi
else
  error "Post event failed: HTTP $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
echo ""

# Test 3: GET /v1/analytics/overview (Admin only)
echo "Test 3: GET /v1/analytics/overview"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/v1/analytics/overview?days=30" \
  -H "x-dev-role: Admin")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  success "Get analytics overview: HTTP $HTTP_CODE"
  REQUEST_ID=$(echo "$BODY" | grep -o '"request_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$REQUEST_ID" ]; then
    info "Request ID: $REQUEST_ID"
  fi
  
  # Check if analytics data is present
  ACTIVE_USERS=$(echo "$BODY" | jq -r '.data.active_users' 2>/dev/null || echo "0")
  TOTAL_EVENTS=$(echo "$BODY" | jq -r '.data.total_events' 2>/dev/null || echo "0")
  info "Active users: $ACTIVE_USERS"
  info "Total events: $TOTAL_EVENTS"
else
  error "Get analytics overview failed: HTTP $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
echo ""

# Test 4: GET /v1/analytics/content (Admin only)
echo "Test 4: GET /v1/analytics/content"
echo "----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/v1/analytics/content?days=30" \
  -H "x-dev-role: Admin")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  success "Get content analytics: HTTP $HTTP_CODE"
  REQUEST_ID=$(echo "$BODY" | grep -o '"request_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$REQUEST_ID" ]; then
    info "Request ID: $REQUEST_ID"
  fi
else
  error "Get content analytics failed: HTTP $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
echo ""

# Test 5: GET /v1/analytics/users (Admin only)
echo "Test 5: GET /v1/analytics/users"
echo "--------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE_URL/v1/analytics/users?days=30" \
  -H "x-dev-role: Admin")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  success "Get user analytics: HTTP $HTTP_CODE"
  REQUEST_ID=$(echo "$BODY" | grep -o '"request_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$REQUEST_ID" ]; then
    info "Request ID: $REQUEST_ID"
  fi
else
  error "Get user analytics failed: HTTP $HTTP_CODE"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
echo ""

# Summary
echo "===================================="
success "All smoke tests passed! 🎉"
echo ""
info "Script Auth Convention:"
info "  - AUTH_TOKEN (JWT) takes precedence if set"
info "  - Else: X_DEV_ROLE (default Viewer), X_DEV_USER_ID (default smoke-test-user)"
