#!/bin/bash
#
# Verification script for Admin Users & Roles module
# Run this after deploying the infrastructure
#

set -e

echo "=========================================="
echo "Admin Users & Roles Verification Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &>/dev/null; then
    echo -e "${RED}✗ AWS CLI not configured or credentials invalid${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo ""

# 1. Get stack outputs
echo "1. Checking CloudFormation stack outputs..."
STACK_NAME="EnablementPortalStack"

if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" &>/dev/null; then
    echo -e "${YELLOW}⚠ Stack '$STACK_NAME' not found. Trying to find alternative stack names...${NC}"
    STACKS=$(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[].StackName' --output text 2>/dev/null || echo "")
    if [ -z "$STACKS" ]; then
        echo -e "${RED}✗ No CloudFormation stacks found. Please deploy the infrastructure first.${NC}"
        exit 1
    else
        echo "Found stacks: $STACKS"
        echo "Please set STACK_NAME environment variable or update this script"
        exit 1
    fi
fi

USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text 2>/dev/null || echo "")
LAMBDA_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaFunctionName`].OutputValue' --output text 2>/dev/null || echo "")
API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")

if [ -z "$USER_POOL_ID" ]; then
    echo -e "${RED}✗ User Pool ID not found in stack outputs${NC}"
    exit 1
fi

echo -e "${GREEN}✓ User Pool ID: $USER_POOL_ID${NC}"

if [ -z "$LAMBDA_NAME" ]; then
    echo -e "${YELLOW}⚠ Lambda function name not found in stack outputs${NC}"
else
    echo -e "${GREEN}✓ Lambda function: $LAMBDA_NAME${NC}"
fi

if [ -z "$API_URL" ]; then
    echo -e "${YELLOW}⚠ API URL not found in stack outputs${NC}"
else
    echo -e "${GREEN}✓ API URL: $API_URL${NC}"
fi

echo ""

# 2. Verify Lambda environment variables
echo "2. Verifying Lambda environment variables..."
if [ -n "$LAMBDA_NAME" ]; then
    LAMBDA_ENV=$(aws lambda get-function-configuration --function-name "$LAMBDA_NAME" --query 'Environment.Variables' --output json 2>/dev/null || echo "{}")
    
    if echo "$LAMBDA_ENV" | jq -e '.COGNITO_USER_POOL_ID' >/dev/null 2>&1; then
        LAMBDA_POOL_ID=$(echo "$LAMBDA_ENV" | jq -r '.COGNITO_USER_POOL_ID')
        if [ "$LAMBDA_POOL_ID" = "$USER_POOL_ID" ]; then
            echo -e "${GREEN}✓ COGNITO_USER_POOL_ID is set correctly in Lambda: $LAMBDA_POOL_ID${NC}"
        else
            echo -e "${RED}✗ COGNITO_USER_POOL_ID mismatch. Stack: $USER_POOL_ID, Lambda: $LAMBDA_POOL_ID${NC}"
        fi
    else
        echo -e "${RED}✗ COGNITO_USER_POOL_ID not found in Lambda environment variables${NC}"
    fi
    
    if echo "$LAMBDA_ENV" | jq -e '.COGNITO_USER_POOL_CLIENT_ID' >/dev/null 2>&1; then
        CLIENT_ID=$(echo "$LAMBDA_ENV" | jq -r '.COGNITO_USER_POOL_CLIENT_ID')
        echo -e "${GREEN}✓ COGNITO_USER_POOL_CLIENT_ID is set: $CLIENT_ID${NC}"
    else
        echo -e "${YELLOW}⚠ COGNITO_USER_POOL_CLIENT_ID not found in Lambda environment variables${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping Lambda check (function name not found)${NC}"
fi

echo ""

# 3. Verify Cognito groups
echo "3. Verifying Cognito groups..."
EXPECTED_GROUPS=("Viewer" "Contributor" "Approver" "Admin")
EXISTING_GROUPS=$(aws cognito-idp list-groups --user-pool-id "$USER_POOL_ID" --query 'Groups[].GroupName' --output text 2>/dev/null || echo "")

if [ -z "$EXISTING_GROUPS" ]; then
    echo -e "${RED}✗ No groups found in User Pool${NC}"
    echo "   Expected groups: ${EXPECTED_GROUPS[*]}"
else
    echo "   Found groups: $EXISTING_GROUPS"
    ALL_FOUND=true
    for GROUP in "${EXPECTED_GROUPS[@]}"; do
        if echo "$EXISTING_GROUPS" | grep -q "$GROUP"; then
            echo -e "   ${GREEN}✓ Group '$GROUP' exists${NC}"
        else
            echo -e "   ${RED}✗ Group '$GROUP' not found${NC}"
            ALL_FOUND=false
        fi
    done
    
    if [ "$ALL_FOUND" = true ]; then
        echo -e "${GREEN}✓ All required groups exist${NC}"
    else
        echo -e "${RED}✗ Some required groups are missing${NC}"
    fi
fi

echo ""

# 4. Verify Lambda IAM permissions
echo "4. Verifying Lambda IAM permissions..."
if [ -n "$LAMBDA_NAME" ]; then
    ROLE_ARN=$(aws lambda get-function-configuration --function-name "$LAMBDA_NAME" --query 'Role' --output text 2>/dev/null || echo "")
    if [ -n "$ROLE_ARN" ]; then
        ROLE_NAME=$(echo "$ROLE_ARN" | awk -F'/' '{print $NF}')
        echo "   Lambda role: $ROLE_NAME"
        
        # Check for Cognito permissions
        POLICIES=$(aws iam list-attached-role-policies --role-name "$ROLE_NAME" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo "")
        INLINE_POLICIES=$(aws iam list-role-policies --role-name "$ROLE_NAME" --query 'PolicyNames' --output text 2>/dev/null || echo "")
        
        # Check inline policies for Cognito permissions
        COGNITO_PERMS_FOUND=false
        for POLICY_NAME in $INLINE_POLICIES; do
            POLICY_DOC=$(aws iam get-role-policy --role-name "$ROLE_NAME" --policy-name "$POLICY_NAME" --query 'PolicyDocument' --output json 2>/dev/null || echo "{}")
            if echo "$POLICY_DOC" | jq -e '.Statement[] | select(.Action[]? | contains("cognito-idp"))' >/dev/null 2>&1; then
                COGNITO_PERMS_FOUND=true
                echo -e "   ${GREEN}✓ Found Cognito permissions in inline policy: $POLICY_NAME${NC}"
                break
            fi
        done
        
        if [ "$COGNITO_PERMS_FOUND" = false ]; then
            echo -e "${YELLOW}⚠ Cognito permissions not found in inline policies. Checking managed policies...${NC}"
            # This is harder to check without downloading policy documents
            echo "   Note: Cognito permissions should be in an inline policy on the Lambda role"
        fi
    else
        echo -e "${YELLOW}⚠ Could not retrieve Lambda role${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping IAM check (Lambda function name not found)${NC}"
fi

echo ""

# 5. Test API endpoints (if API URL is available)
echo "5. Testing API endpoints..."
if [ -n "$API_URL" ]; then
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ API health check passed${NC}"
    else
        echo -e "${RED}✗ API health check failed (HTTP $HTTP_CODE)${NC}"
    fi
    
    # Note: Admin endpoints require authentication, so we can't fully test them here
    echo "   Note: Admin endpoints require Admin authentication to test"
    echo "   Use the web UI or provide an Admin JWT token to test:"
    echo "   curl -H 'Authorization: Bearer <JWT_TOKEN>' $API_URL/v1/admin/users"
else
    echo -e "${YELLOW}⚠ API URL not found, skipping endpoint tests${NC}"
fi

echo ""

# 6. Check DynamoDB events table
echo "6. Checking DynamoDB events table..."
EVENTS_TABLE=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`EventsTableName`].OutputValue' --output text 2>/dev/null || echo "events")

if aws dynamodb describe-table --table-name "$EVENTS_TABLE" &>/dev/null; then
    echo -e "${GREEN}✓ Events table exists: $EVENTS_TABLE${NC}"
    
    # Count recent admin events (last 24 hours)
    YESTERDAY=$(date -u -v-1d +%Y-%m-%d 2>/dev/null || date -u -d '1 day ago' +%Y-%m-%d)
    echo "   To check for audit events, query the table:"
    echo "   aws dynamodb query --table-name $EVENTS_TABLE \\"
    echo "     --key-condition-expression 'date_bucket = :date' \\"
    echo "     --expression-attribute-values '{ \":date\": { \"S\": \"$YESTERDAY\" } }'"
else
    echo -e "${YELLOW}⚠ Events table '$EVENTS_TABLE' not found${NC}"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test Admin Access: Log in as Admin user and navigate to /enablement/admin/users"
echo "2. Test Invite Flow: Use the UI to invite a test user"
echo "3. Test Role Changes: Change a user's role and verify in Cognito console"
echo "4. Verify Audit Events: Check DynamoDB events table for admin_users_* events"


