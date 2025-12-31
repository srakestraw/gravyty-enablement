#!/bin/bash
#
# Quick script to verify Cognito groups exist
# Usage: ./verify-cognito-groups.sh <USER_POOL_ID>
#

set -e

USER_POOL_ID="${1:-}"

if [ -z "$USER_POOL_ID" ]; then
    echo "Usage: $0 <USER_POOL_ID>"
    echo ""
    echo "To find your User Pool ID:"
    echo "  aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[].{Name:Name,Id:Id}' --output table"
    exit 1
fi

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Verifying Cognito groups for User Pool: $USER_POOL_ID"
echo ""

EXPECTED_GROUPS=("Viewer" "Contributor" "Approver" "Admin")
EXISTING_GROUPS=$(aws cognito-idp list-groups --user-pool-id "$USER_POOL_ID" --query 'Groups[].GroupName' --output text 2>/dev/null || echo "")

if [ -z "$EXISTING_GROUPS" ]; then
    echo -e "${RED}✗ No groups found in User Pool${NC}"
    echo ""
    echo "Expected groups:"
    for GROUP in "${EXPECTED_GROUPS[@]}"; do
        echo "  - $GROUP"
    done
    echo ""
    echo "To create groups, use the CDK stack or AWS Console."
    exit 1
fi

echo "Found groups: $EXISTING_GROUPS"
echo ""

ALL_FOUND=true
for GROUP in "${EXPECTED_GROUPS[@]}"; do
    if echo "$EXISTING_GROUPS" | grep -qw "$GROUP"; then
        echo -e "${GREEN}✓ Group '$GROUP' exists${NC}"
        
        # Get group details
        GROUP_INFO=$(aws cognito-idp get-group --user-pool-id "$USER_POOL_ID" --group-name "$GROUP" --query '{Name:GroupName,Precedence:Precedence,Description:Description}' --output json 2>/dev/null || echo "{}")
        PRECEDENCE=$(echo "$GROUP_INFO" | jq -r '.Precedence' 2>/dev/null || echo "N/A")
        DESCRIPTION=$(echo "$GROUP_INFO" | jq -r '.Description' 2>/dev/null || echo "N/A")
        echo "    Precedence: $PRECEDENCE"
        echo "    Description: $DESCRIPTION"
    else
        echo -e "${RED}✗ Group '$GROUP' not found${NC}"
        ALL_FOUND=false
    fi
    echo ""
done

if [ "$ALL_FOUND" = true ]; then
    echo -e "${GREEN}✓ All required groups exist${NC}"
    exit 0
else
    echo -e "${RED}✗ Some required groups are missing${NC}"
    exit 1
fi

