#!/bin/bash
#
# Check if an invited user exists in Cognito and their status
# This helps verify that user invitation worked (even if emails aren't sent)
#

set -e

USER_POOL_ID="${COGNITO_USER_POOL_ID:-us-east-1_s4q1vjkgD}"
EMAIL="${1:-}"

if [ -z "$EMAIL" ]; then
    echo "Usage: $0 <email-address>"
    echo "Example: $0 user@gravyty.com"
    echo ""
    echo "Environment variables:"
    echo "  COGNITO_USER_POOL_ID - Cognito User Pool ID (default: us-east-1_s4q1vjkgD)"
    exit 1
fi

echo "=========================================="
echo "Checking Invited User Status"
echo "=========================================="
echo "User Pool ID: $USER_POOL_ID"
echo "Email: $EMAIL"
echo ""

# Check if user exists
echo "Checking if user exists..."
if aws cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --output json > /tmp/user-info.json 2>&1; then
    
    echo "✅ User exists in Cognito"
    echo ""
    
    # Extract user info
    USERNAME=$(jq -r '.Username' /tmp/user-info.json)
    STATUS=$(jq -r '.UserStatus' /tmp/user-info.json)
    ENABLED=$(jq -r '.Enabled' /tmp/user-info.json)
    EMAIL_ATTR=$(jq -r '.UserAttributes[] | select(.Name=="email") | .Value' /tmp/user-info.json)
    NAME_ATTR=$(jq -r '.UserAttributes[] | select(.Name=="name") | .Value' /tmp/user-info.json)
    
    echo "User Details:"
    echo "  Username: $USERNAME"
    echo "  Email: $EMAIL_ATTR"
    echo "  Name: ${NAME_ATTR:-<not set>}"
    echo "  Status: $STATUS"
    echo "  Enabled: $ENABLED"
    echo ""
    
    # Check groups
    echo "Checking user groups..."
    if aws cognito-idp admin-list-groups-for-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --output json > /tmp/user-groups.json 2>&1; then
        
        GROUPS=$(jq -r '.Groups[].GroupName' /tmp/user-groups.json 2>/dev/null || echo "")
        if [ -n "$GROUPS" ]; then
            echo "  Groups:"
            echo "$GROUPS" | while read -r group; do
                echo "    - $group"
            done
        else
            echo "  ⚠️  No groups assigned"
        fi
    else
        echo "  ⚠️  Could not retrieve groups"
    fi
    
    echo ""
    echo "Email Status:"
    echo "  ❌ NO EMAIL WAS SENT"
    echo "  Reason: MessageAction is set to 'SUPPRESS' in code"
    echo "  Location: apps/api/src/aws/cognitoClient.ts:146"
    echo ""
    echo "User can still sign in:"
    echo "  ✅ Yes - User can sign in with Google OAuth"
    echo "  ✅ If email matches, authentication will work"
    echo "  ✅ Role will be applied from Cognito groups"
    
else
    ERROR=$(cat /tmp/user-info.json)
    if echo "$ERROR" | grep -q "UserNotFoundException"; then
        echo "❌ User NOT found in Cognito"
        echo ""
        echo "Possible reasons:"
        echo "  1. User invitation failed"
        echo "  2. Wrong email address"
        echo "  3. User Pool ID is incorrect"
        echo ""
        echo "Check API logs for errors during invitation"
    else
        echo "❌ Error checking user:"
        echo "$ERROR"
    fi
fi

echo ""
echo "=========================================="


