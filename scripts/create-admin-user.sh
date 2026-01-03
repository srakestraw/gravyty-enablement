#!/bin/bash
#
# Create an admin user in Cognito with full admin rights
# This script creates the user, sets a permanent password, confirms them, and adds them to the Admin group
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get User Pool ID from CloudFormation stack
STACK_NAME="EnablementPortalStack"

echo "Fetching User Pool ID from CloudFormation stack..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$USER_POOL_ID" ]; then
    echo -e "${RED}✗ Error: Could not fetch User Pool ID from stack '$STACK_NAME'${NC}"
    echo "Make sure the stack is deployed and you have AWS credentials configured"
    exit 1
fi

echo -e "${GREEN}✓ User Pool ID: $USER_POOL_ID${NC}"
echo ""

# Get user details from command line or use defaults
EMAIL="${1:-scott@rakestraw.com}"
PASSWORD="${2:-u\$&qccz@eX7%LOS9}"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 <EMAIL> <PASSWORD>"
    echo "Example: $0 scott@rakestraw.com 'u\$&qccz@eX7%LOS9'"
    exit 1
fi

echo "Creating admin user: $EMAIL"
echo ""

# Check if user already exists
if aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$EMAIL" &>/dev/null; then
    echo -e "${YELLOW}⚠ User '$EMAIL' already exists${NC}"
    echo "Checking current status..."
    
    USER_STATUS=$(aws cognito-idp admin-get-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --query 'UserStatus' \
        --output text)
    
    echo "Current status: $USER_STATUS"
    
    # Check if user is already in Admin group
    GROUPS=$(aws cognito-idp admin-list-groups-for-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --query 'Groups[].GroupName' \
        --output text)
    
    if echo "$GROUPS" | grep -q "Admin"; then
        echo -e "${GREEN}✓ User is already in Admin group${NC}"
        echo ""
        echo "To update the password, use:"
        echo "  aws cognito-idp admin-set-user-password \\"
        echo "    --user-pool-id $USER_POOL_ID \\"
        echo "    --username $EMAIL \\"
        echo "    --password '$PASSWORD' \\"
        echo "    --permanent"
        exit 0
    else
        echo "User is not in Admin group. Adding to Admin group..."
    fi
else
    # Create the user
    echo "Creating new user..."
    aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --user-attributes Name=email,Value="$EMAIL" Name=email_verified,Value=true \
        --message-action SUPPRESS \
        --no-cli-pager
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ User created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create user${NC}"
        exit 1
    fi
fi

# Set permanent password
echo ""
echo "Setting permanent password..."
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --password "$PASSWORD" \
    --permanent \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Password set successfully${NC}"
else
    echo -e "${RED}✗ Failed to set password${NC}"
    exit 1
fi

# Confirm the user (enable them)
echo ""
echo "Confirming user (enabling account)..."
aws cognito-idp admin-enable-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ User confirmed and enabled${NC}"
else
    echo -e "${RED}✗ Failed to enable user${NC}"
    exit 1
fi

# Ensure Admin group exists
echo ""
echo "Checking Admin group..."
if ! aws cognito-idp get-group --user-pool-id "$USER_POOL_ID" --group-name Admin &>/dev/null; then
    echo "Admin group not found. Creating it..."
    aws cognito-idp create-group \
        --user-pool-id "$USER_POOL_ID" \
        --group-name Admin \
        --precedence 4 \
        --description "Full administrative access" \
        --no-cli-pager
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Admin group created${NC}"
    else
        echo -e "${RED}✗ Failed to create Admin group${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Admin group exists${NC}"
fi

# Remove user from other role groups first (if any)
echo ""
echo "Removing user from other role groups (if any)..."
for GROUP in Viewer Contributor Approver; do
    if aws cognito-idp admin-list-groups-for-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "$EMAIL" \
        --query "Groups[?GroupName=='$GROUP'].GroupName" \
        --output text 2>/dev/null | grep -q "$GROUP"; then
        echo "Removing from $GROUP group..."
        aws cognito-idp admin-remove-user-from-group \
            --user-pool-id "$USER_POOL_ID" \
            --username "$EMAIL" \
            --group-name "$GROUP" \
            --no-cli-pager 2>/dev/null || true
    fi
done

# Add user to Admin group
echo ""
echo "Adding user to Admin group..."
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --group-name Admin \
    --no-cli-pager

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully added to Admin group${NC}"
else
    echo -e "${RED}✗ Failed to add user to Admin group${NC}"
    exit 1
fi

# Verify the setup
echo ""
echo "Verifying user setup..."
USER_INFO=$(aws cognito-idp admin-get-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --query '{Status:UserStatus,Enabled:Enabled,Email:Attributes[?Name==`email`].Value|[0]}' \
    --output json)

GROUPS=$(aws cognito-idp admin-list-groups-for-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$EMAIL" \
    --query 'Groups[].GroupName' \
    --output text)

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Admin User Setup Complete${NC}"
echo "=========================================="
echo ""
echo "User Details:"
echo "$USER_INFO" | jq .
echo ""
echo "Groups: $GROUPS"
echo ""
echo "You can now log in with:"
echo "  Email: $EMAIL"
echo "  Password: [as provided]"
echo ""
echo "Note: The user will have full admin access to the application."


