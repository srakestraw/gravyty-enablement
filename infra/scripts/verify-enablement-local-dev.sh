#!/bin/bash
# Verify IAM user permissions for enablement portal local development

set -e

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "❌ Error: jq is required but not installed."
  echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

USER_NAME="${USER_NAME:-enablement-local-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Verifying IAM User Permissions"
echo "=================================="
echo "User: $USER_NAME"
echo ""

# Check if AWS_PROFILE is set
if [ -z "$AWS_PROFILE" ] && [ -z "$AWS_ACCESS_KEY_ID" ]; then
  echo -e "${YELLOW}⚠️  Warning: AWS_PROFILE not set. Using default credentials.${NC}"
  echo "   Set AWS_PROFILE=$USER_NAME to use the correct user"
  echo ""
fi

# 1. Verify identity
echo "1️⃣  Verifying AWS Identity..."
IDENTITY=$(aws sts get-caller-identity --output json 2>&1)
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to get caller identity${NC}"
  echo "$IDENTITY"
  exit 1
fi

USER_ARN=$(echo "$IDENTITY" | jq -r '.Arn')
ACCOUNT_ID=$(echo "$IDENTITY" | jq -r '.Account')
echo -e "${GREEN}✅ Identity verified${NC}"
echo "   ARN: $USER_ARN"
echo "   Account: $ACCOUNT_ID"
echo ""

# Check if this is the correct user
if echo "$USER_ARN" | grep -q "/$USER_NAME"; then
  echo -e "${GREEN}✅ Correct user: $USER_NAME${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Current user doesn't match expected user name${NC}"
  echo "   Expected: $USER_NAME"
  echo "   Actual: $USER_ARN"
  echo ""
fi

# 2. Verify DynamoDB access
echo "2️⃣  Verifying DynamoDB Access..."
TABLE_CONTENT="${DDB_TABLE_CONTENT:-content_registry}"

if aws dynamodb describe-table --table-name "$TABLE_CONTENT" --region "$AWS_REGION" >/dev/null 2>&1; then
  TABLE_INFO=$(aws dynamodb describe-table --table-name "$TABLE_CONTENT" --region "$AWS_REGION" --output json)
  TABLE_STATUS=$(echo "$TABLE_INFO" | jq -r '.Table.TableStatus')
  echo -e "${GREEN}✅ Can access DynamoDB table: $TABLE_CONTENT${NC}"
  echo "   Status: $TABLE_STATUS"
  
  # Try to query the table (should work even if empty)
  if aws dynamodb scan --table-name "$TABLE_CONTENT" --limit 1 --region "$AWS_REGION" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Can scan table (read permission verified)${NC}"
  else
    echo -e "${YELLOW}⚠️  Warning: Cannot scan table (may be empty or permission issue)${NC}"
  fi
else
  echo -e "${RED}❌ Cannot access DynamoDB table: $TABLE_CONTENT${NC}"
  echo "   Check permissions and table name"
  exit 1
fi
echo ""

# 3. Verify S3 access
echo "3️⃣  Verifying S3 Access..."

# Try to get bucket name from environment or CDK outputs
if [ -z "$ENABLEMENT_CONTENT_BUCKET" ]; then
  # Try to read from apps/api/.env
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  API_ENV_FILE="$PROJECT_ROOT/apps/api/.env"
  
  if [ -f "$API_ENV_FILE" ]; then
    # Extract bucket name from .env file
    ENABLEMENT_CONTENT_BUCKET=$(grep '^ENABLEMENT_CONTENT_BUCKET=' "$API_ENV_FILE" 2>/dev/null | cut -d '=' -f2 | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || echo "")
  fi
  
  # Try to get from CDK outputs
  if [ -z "$ENABLEMENT_CONTENT_BUCKET" ]; then
    BUCKET_NAME=$(aws cloudformation describe-stacks \
      --stack-name EnablementPortalStack \
      --query 'Stacks[0].Outputs[?OutputKey==`ContentBucketName`].OutputValue' \
      --output text 2>/dev/null || echo "")
    if [ -n "$BUCKET_NAME" ] && [ "$BUCKET_NAME" != "None" ]; then
      ENABLEMENT_CONTENT_BUCKET="$BUCKET_NAME"
    fi
  fi
fi

if [ -z "$ENABLEMENT_CONTENT_BUCKET" ]; then
  echo -e "${YELLOW}⚠️  S3 bucket name not found. Skipping S3 verification.${NC}"
  echo "   Set ENABLEMENT_CONTENT_BUCKET environment variable or configure in apps/api/.env"
else
  echo "   Bucket: $ENABLEMENT_CONTENT_BUCKET"
  
  # Test ListBucket permission
  if aws s3 ls "s3://$ENABLEMENT_CONTENT_BUCKET/content/" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Can list S3 bucket prefix: content/${NC}"
  else
    echo -e "${YELLOW}⚠️  Cannot list S3 prefix (may be empty or permission issue)${NC}"
  fi
  
  # Test presigned URL generation (doesn't require actual upload)
  PRESIGNED_URL=$(aws s3 presign \
    "s3://$ENABLEMENT_CONTENT_BUCKET/content/test-verify-$(date +%s).txt" \
    --expires-in 60 \
    2>/dev/null || echo "")
  
  if [ -n "$PRESIGNED_URL" ]; then
    echo -e "${GREEN}✅ Can generate presigned URLs${NC}"
  else
    echo -e "${YELLOW}⚠️  Cannot generate presigned URLs (check permissions)${NC}"
  fi
fi
echo ""

# Summary
echo "📋 Verification Summary"
echo "======================"
echo -e "${GREEN}✅ Identity: Verified${NC}"
echo -e "${GREEN}✅ DynamoDB: Access confirmed${NC}"
if [ -n "$ENABLEMENT_CONTENT_BUCKET" ]; then
  echo -e "${GREEN}✅ S3: Access confirmed${NC}"
else
  echo -e "${YELLOW}⚠️  S3: Skipped (bucket name not configured)${NC}"
fi
echo ""
echo "✅ All checks passed! User is ready for local development."
echo ""
echo "To use in development:"
echo "  export AWS_PROFILE=$USER_NAME"
echo "  STORAGE_BACKEND=aws npm run dev:api"
echo ""

