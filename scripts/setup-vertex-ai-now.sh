#!/bin/bash
# Complete Vertex AI setup - creates SSM parameter and configures Lambda
# Usage: ./scripts/setup-vertex-ai-now.sh <gcp-project-id> <service-account-json-file> [gcp-region]

set -e

GCP_PROJECT_ID="$1"
SERVICE_ACCOUNT_FILE="$2"
GCP_REGION="${3:-us-central1}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PARAM_NAME="/enablement-portal/gcp/service-account-json"
STACK_NAME="EnablementPortalStack"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Vertex AI Setup"
echo "=================="
echo ""

# Validate inputs
if [ -z "$GCP_PROJECT_ID" ] || [ -z "$SERVICE_ACCOUNT_FILE" ]; then
    echo -e "${RED}❌ Missing required arguments${NC}"
    echo ""
    echo "Usage: $0 <gcp-project-id> <service-account-json-file> [gcp-region]"
    echo ""
    echo "Example:"
    echo "  $0 my-gcp-project /path/to/service-account-key.json us-central1"
    echo ""
    echo "If you don't have a service account JSON file yet:"
    echo "  1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts"
    echo "  2. Create a service account with 'Vertex AI User' role"
    echo "  3. Create and download a JSON key"
    exit 1
fi

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo -e "${RED}❌ Service account file not found: $SERVICE_ACCOUNT_FILE${NC}"
    exit 1
fi

# Validate JSON
if command -v jq &> /dev/null; then
    if ! jq empty "$SERVICE_ACCOUNT_FILE" 2>/dev/null; then
        echo -e "${RED}❌ Invalid JSON file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ JSON file is valid${NC}"
fi

echo "Configuration:"
echo "  GCP Project: $GCP_PROJECT_ID"
echo "  GCP Region: $GCP_REGION"
echo "  Service Account File: $SERVICE_ACCOUNT_FILE"
echo ""

# Step 1: Create/Update SSM Parameter
echo "Step 1: Creating SSM Parameter..."
if aws ssm get-parameter --name "$PARAM_NAME" --region "$AWS_REGION" &>/dev/null; then
    echo "  Parameter exists, updating..."
    aws ssm put-parameter \
        --name "$PARAM_NAME" \
        --value "file://${SERVICE_ACCOUNT_FILE}" \
        --type SecureString \
        --description "GCP Service Account JSON for Vertex AI Imagen" \
        --overwrite \
        --region "$AWS_REGION" \
        > /dev/null
    echo -e "  ${GREEN}✅ Parameter updated${NC}"
else
    echo "  Creating new parameter..."
    aws ssm put-parameter \
        --name "$PARAM_NAME" \
        --value "file://${SERVICE_ACCOUNT_FILE}" \
        --type SecureString \
        --description "GCP Service Account JSON for Vertex AI Imagen" \
        --region "$AWS_REGION" \
        > /dev/null
    echo -e "  ${GREEN}✅ Parameter created${NC}"
fi

# Verify parameter
if aws ssm get-parameter --name "$PARAM_NAME" --with-decryption --region "$AWS_REGION" &>/dev/null; then
    echo -e "  ${GREEN}✅ Parameter verified${NC}"
else
    echo -e "  ${RED}❌ Failed to verify parameter${NC}"
    exit 1
fi

echo ""

# Step 2: Update Lambda Environment Variables
echo "Step 2: Updating Lambda Environment Variables..."

# Get Lambda function name
FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaFunctionName`].OutputValue' \
    --output text \
    --region "$AWS_REGION" 2>/dev/null || echo "")

if [ -z "$FUNCTION_NAME" ] || [ "$FUNCTION_NAME" == "None" ]; then
    echo -e "  ${YELLOW}⚠️  Lambda function not found in stack outputs${NC}"
    echo "  You'll need to set environment variables manually:"
    echo "    GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID"
    echo "    GOOGLE_CLOUD_REGION=$GCP_REGION"
    echo ""
    echo "  Set via AWS Console:"
    echo "    1. Go to Lambda Console"
    echo "    2. Find your API Lambda function"
    echo "    3. Configuration > Environment variables"
    echo "    4. Add the variables above"
else
    echo "  Found Lambda function: $FUNCTION_NAME"
    
    # Get current environment variables
    CURRENT_ENV=$(aws lambda get-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --query 'Environment.Variables' \
        --output json \
        --region "$AWS_REGION" 2>/dev/null || echo "{}")
    
    # Merge with new variables
    NEW_ENV=$(echo "$CURRENT_ENV" | jq --arg proj "$GCP_PROJECT_ID" --arg reg "$GCP_REGION" \
        '. + {GOOGLE_CLOUD_PROJECT: $proj, GOOGLE_CLOUD_REGION: $reg}' 2>/dev/null || echo "{}")
    
    # Build environment variables string for AWS CLI
    # Convert JSON to KEY=VALUE,KEY2=VALUE2 format
    ENV_STRING=$(echo "$NEW_ENV" | jq -r 'to_entries | map("\(.key)=\(.value)") | join(",")')
    
    echo "  Updating environment variables..."
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --environment "Variables={${ENV_STRING}}" \
        --region "$AWS_REGION" \
        > /dev/null
    
    echo -e "  ${GREEN}✅ Lambda environment variables updated${NC}"
    echo "    GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID"
    echo "    GOOGLE_CLOUD_REGION=$GCP_REGION"
fi

echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Summary:"
echo "  • SSM Parameter: $PARAM_NAME"
echo "  • GCP Project: $GCP_PROJECT_ID"
echo "  • GCP Region: $GCP_REGION"
if [ -n "$FUNCTION_NAME" ]; then
    echo "  • Lambda Function: $FUNCTION_NAME"
fi
echo ""
echo "Next: Test image generation with Gemini provider in your application"
echo ""

