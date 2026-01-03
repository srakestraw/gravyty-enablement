#!/bin/bash
# Diagnose Admin role issue - check Cognito groups and provide fix steps

USER_POOL_ID="${1:-us-east-1_s4q1vjkgD}"
USERNAME="${2:-scott.rakestraw@gravyty.com}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Admin Role Diagnostic Tool"
echo "=========================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Username/Email: $USERNAME"
echo ""

# Check if user exists
echo "1. Checking if user exists..."
if ! aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" &>/dev/null; then
    echo -e "${RED}✗ User not found${NC}"
    echo ""
    echo "The user '$USERNAME' does not exist in User Pool '$USER_POOL_ID'"
    echo ""
    echo "Possible reasons:"
    echo "1. User hasn't signed in yet (Cognito creates users on first sign-in)"
    echo "2. Username format is different (try email or user ID)"
    echo ""
    echo "To list all users:"
    echo "  aws cognito-idp list-users --user-pool-id $USER_POOL_ID --limit 10"
    exit 1
fi

echo -e "${GREEN}✓ User exists${NC}"
echo ""

# Get user groups
echo "2. Checking user groups in Cognito..."
GROUPS=$(aws cognito-idp admin-list-groups-for-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" --output json 2>/dev/null)

if [ -n "$GROUPS" ] && echo "$GROUPS" | jq -e '.Groups | length > 0' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ User groups in Cognito:${NC}"
    echo "$GROUPS" | jq -r '.Groups[] | "  - \(.GroupName) (precedence: \(.Precedence))"'
    echo ""
    
    # Check if Admin group is present
    if echo "$GROUPS" | jq -e '.Groups[] | select(.GroupName=="Admin")' >/dev/null 2>&1; then
        echo -e "${GREEN}✓ User IS in Admin group in Cognito${NC}"
        echo ""
        echo -e "${YELLOW}⚠ DIAGNOSIS: Your Cognito groups are correct, but your JWT token may be stale${NC}"
        echo ""
        echo "SOLUTION:"
        echo "1. Sign out of the application completely"
        echo "2. Sign back in with Google"
        echo "3. This will refresh your JWT token with the updated Admin group"
        echo ""
        echo "If signing out/in doesn't work, try:"
        echo "1. Clear browser cache and cookies for the application"
        echo "2. Sign out and sign back in"
        echo ""
    else
        echo -e "${RED}✗ User is NOT in Admin group${NC}"
        echo ""
        echo "SOLUTION: Add yourself to Admin group:"
        echo "  ./scripts/add-user-to-admin-group.sh $USER_POOL_ID $USERNAME"
        echo ""
        echo "After adding to Admin group:"
        echo "1. Sign out of the application"
        echo "2. Sign back in to refresh your token"
    fi
else
    echo -e "${YELLOW}⚠ User is not in any groups${NC}"
    echo ""
    echo "SOLUTION: Add yourself to Admin group:"
    echo "  ./scripts/add-user-to-admin-group.sh $USER_POOL_ID $USERNAME"
    echo ""
    echo "After adding to Admin group:"
    echo "1. Sign out of the application"
    echo "2. Sign back in to refresh your token"
fi

echo ""
echo "=========================================="
echo "Additional Debugging"
echo "=========================================="
echo ""
echo "To check your JWT token groups in the browser:"
echo "1. Open browser DevTools (F12)"
echo "2. Go to Console tab"
echo "3. Look for '[Auth] ID Token claims:' logs"
echo "4. Check if 'cognito:groups' includes 'Admin'"
echo ""
echo "If groups are missing from token but present in Cognito:"
echo "- The token needs to be refreshed (sign out/in)"
echo "- Or Cognito User Pool Client may need configuration update"
echo ""

