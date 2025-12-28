#!/bin/bash
# Create IAM User with Limited Permissions for Enablement Portal

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

USER_NAME="enablement-portal-api"
POLICY_NAME="EnablementPortalPolicy"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POLICY_FILE="$SCRIPT_DIR/../iam/enablement-portal-policy.json"
REGION=${AWS_REGION:-us-east-1}

echo -e "${GREEN}🔐 Creating IAM User with Limited Permissions${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    exit 1
fi

# Check if policy file exists
if [ ! -f "$POLICY_FILE" ]; then
    echo -e "${RED}❌ Policy file not found: $POLICY_FILE${NC}"
    exit 1
fi

# Check if user already exists
if aws iam get-user --user-name "$USER_NAME" &> /dev/null; then
    echo -e "${YELLOW}⚠️  User $USER_NAME already exists${NC}"
    read -p "Do you want to recreate access keys? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 0
    fi
else
    # Create IAM user
    echo -e "${YELLOW}Creating IAM user: $USER_NAME${NC}"
    aws iam create-user --user-name "$USER_NAME" --output text
    echo -e "${GREEN}✅ User created${NC}"
fi

# Create or update policy
echo -e "${YELLOW}Creating/updating IAM policy: $POLICY_NAME${NC}"
POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "file://$POLICY_FILE" \
    --output text \
    --query 'Policy.Arn' 2>/dev/null || \
    aws iam get-policy --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/$POLICY_NAME" --query 'Policy.Arn' --output text 2>/dev/null)

if [ -z "$POLICY_ARN" ]; then
    echo -e "${RED}❌ Failed to create/get policy${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Policy ARN: $POLICY_ARN${NC}"

# Attach policy to user
echo -e "${YELLOW}Attaching policy to user...${NC}"
aws iam attach-user-policy \
    --user-name "$USER_NAME" \
    --policy-arn "$POLICY_ARN" \
    --output text 2>/dev/null || echo "Policy may already be attached"

echo -e "${GREEN}✅ Policy attached${NC}"

# Create access key
echo -e "${YELLOW}Creating access key...${NC}"
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$USER_NAME" --output json)

ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | grep -o '"AccessKeyId": "[^"]*' | cut -d'"' -f4)
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | grep -o '"SecretAccessKey": "[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_KEY_ID" ] || [ -z "$SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}❌ Failed to create access key${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Access Key Created!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials securely!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Access Key ID:     $ACCESS_KEY_ID"
echo "Secret Access Key: $SECRET_ACCESS_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Update AWS credentials
read -p "Do you want to update your AWS credentials file with these keys? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Backup existing credentials
    if [ -f ~/.aws/credentials ]; then
        cp ~/.aws/credentials ~/.aws/credentials.backup.$(date +%Y%m%d_%H%M%S)
        echo "Backed up existing credentials"
    fi
    
    # Update credentials file
    cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = $ACCESS_KEY_ID
aws_secret_access_key = $SECRET_ACCESS_KEY
EOF
    
    chmod 600 ~/.aws/credentials
    echo -e "${GREEN}✅ Credentials file updated${NC}"
    
    # Verify
    echo ""
    echo -e "${YELLOW}Verifying new credentials...${NC}"
    if aws sts get-caller-identity &> /dev/null; then
        echo -e "${GREEN}✅ Credentials verified!${NC}"
        aws sts get-caller-identity
    else
        echo -e "${RED}❌ Verification failed${NC}"
    fi
else
    echo ""
    echo "To configure manually, run:"
    echo "  aws configure"
    echo "Then enter:"
    echo "  Access Key ID: $ACCESS_KEY_ID"
    echo "  Secret Access Key: $SECRET_ACCESS_KEY"
    echo "  Region: $REGION"
    echo "  Output: json"
fi

echo ""
echo -e "${GREEN}✅ IAM User Setup Complete!${NC}"
echo ""
echo "User: $USER_NAME"
echo "Policy: $POLICY_NAME"
echo ""
echo "Permissions granted:"
echo "  ✅ DynamoDB: content_registry, notifications, subscriptions, events"
echo "  ✅ S3: enablement-content bucket"
echo "  ✅ STS: GetCallerIdentity (for verification)"
echo ""
echo "The IAM user has LIMITED permissions (not root access)."

