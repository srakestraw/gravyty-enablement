#!/bin/bash
# Check your Cognito user status and groups

USER_POOL_ID="${1:-us-east-1_s4q1vjkgD}"
USERNAME="${2:-scott.rakestraw@gravyty.com}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "Checking Cognito User Status"
echo "=========================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "Username/Email: $USERNAME"
echo ""

# Check if user exists
echo "1. Checking if user exists..."
if aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" &>/dev/null; then
    echo -e "${GREEN}✓ User exists${NC}"
    echo ""
    
    # Get user details
    echo "2. User details:"
    aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" \
        --query '{Username:Username,Enabled:Enabled,UserStatus:UserStatus,UserCreateDate:UserCreateDate,Email:UserAttributes[?Name==`email`].Value|[0]}' \
        --output json | jq '.'
    echo ""
    
    # Get user groups
    echo "3. User groups:"
    GROUPS=$(aws cognito-idp admin-list-groups-for-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" --output json 2>/dev/null)
    if [ -n "$GROUPS" ] && echo "$GROUPS" | jq -e '.Groups | length > 0' >/dev/null 2>&1; then
        echo -e "${GREEN}✓ User is in the following groups:${NC}"
        echo "$GROUPS" | jq -r '.Groups[] | "  - \(.GroupName) (precedence: \(.Precedence))"'
        
        # Check if Admin group is present
        if echo "$GROUPS" | jq -e '.Groups[] | select(.GroupName=="Admin")' >/dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✓ User is in Admin group${NC}"
        else
            echo ""
            echo -e "${YELLOW}⚠ User is NOT in Admin group${NC}"
            echo ""
            echo "To add yourself to Admin group, run:"
            echo "  ./scripts/add-user-to-admin-group.sh $USER_POOL_ID $USERNAME"
        fi
    else
        echo -e "${YELLOW}⚠ User is not in any groups${NC}"
        echo ""
        echo "To add yourself to Admin group, run:"
        echo "  ./scripts/add-user-to-admin-group.sh $USER_POOL_ID $USERNAME"
    fi
else
    echo -e "${RED}✗ User not found${NC}"
    echo ""
    echo "The user '$USERNAME' does not exist in User Pool '$USER_POOL_ID'"
    echo ""
    echo "Possible reasons:"
    echo "1. User hasn't signed in yet (Cognito creates users on first sign-in)"
    echo "2. Username format is different (try email or user ID)"
    echo ""
    echo "To list all users in the pool:"
    echo "  aws cognito-idp list-users --user-pool-id $USER_POOL_ID --limit 10"
fi

echo ""
echo "=========================================="
