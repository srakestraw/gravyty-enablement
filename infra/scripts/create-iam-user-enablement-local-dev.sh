#!/bin/bash
# Create IAM user for local development of enablement portal
# This user has least-privilege permissions for DynamoDB and S3 only

set -e

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "❌ Error: jq is required but not installed."
  echo "   Install with: brew install jq (macOS) or apt-get install jq (Linux)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
IAM_DIR="$SCRIPT_DIR/../iam"

# Configuration
USER_NAME="${USER_NAME:-enablement-local-dev}"
POLICY_NAME="${POLICY_NAME:-EnablementLocalDevPolicy}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔐 Creating IAM User for Local Development"
echo "=============================================="
echo "User Name: $USER_NAME"
echo "Policy Name: $POLICY_NAME"
echo ""

# Auto-detect account ID
echo "📋 Detecting AWS Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "")
if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}❌ Error: Could not detect AWS Account ID. Ensure AWS credentials are configured.${NC}"
  exit 1
fi
echo "✅ Account ID: $ACCOUNT_ID"
echo ""

# Read configuration from apps/api/.env if available
API_ENV_FILE="$PROJECT_ROOT/apps/api/.env"
if [ -f "$API_ENV_FILE" ]; then
  echo "📄 Reading configuration from apps/api/.env..."
  # Extract env vars, handling comments and empty lines
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    # Remove quotes if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    export "$key=$value"
  done < <(grep -E '^(DDB_TABLE_|ENABLEMENT_CONTENT_BUCKET)=' "$API_ENV_FILE" 2>/dev/null || true)
fi

# Get table names (with defaults)
TABLE_CONTENT="${DDB_TABLE_CONTENT:-content_registry}"
TABLE_NOTIFICATIONS="${DDB_TABLE_NOTIFICATIONS:-notifications}"
TABLE_SUBSCRIPTIONS="${DDB_TABLE_SUBSCRIPTIONS:-subscriptions}"
TABLE_EVENTS="${DDB_TABLE_EVENTS:-events}"

# Get bucket name
if [ -z "$ENABLEMENT_CONTENT_BUCKET" ]; then
  echo -e "${YELLOW}⚠️  ENABLEMENT_CONTENT_BUCKET not found in apps/api/.env${NC}"
  echo "Please provide the S3 bucket name:"
  read -p "Bucket name: " ENABLEMENT_CONTENT_BUCKET
  if [ -z "$ENABLEMENT_CONTENT_BUCKET" ]; then
    echo -e "${RED}❌ Error: Bucket name is required${NC}"
    exit 1
  fi
fi

echo "📋 Configuration:"
echo "  DynamoDB Tables:"
echo "    - $TABLE_CONTENT"
echo "    - $TABLE_NOTIFICATIONS"
echo "    - $TABLE_SUBSCRIPTIONS"
echo "    - $TABLE_EVENTS"
echo "  S3 Bucket: $ENABLEMENT_CONTENT_BUCKET"
echo ""

# Create IAM user if it doesn't exist
echo "👤 Creating IAM user: $USER_NAME..."
if aws iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
  echo "✅ User already exists: $USER_NAME"
else
  aws iam create-user --user-name "$USER_NAME" --tags Key=Purpose,Value=LocalDevelopment Key=Project,Value=EnablementPortal >/dev/null
  echo "✅ Created user: $USER_NAME"
fi
echo ""

# Read policy template
POLICY_TEMPLATE="$IAM_DIR/enablement-local-dev-policy.json"
if [ ! -f "$POLICY_TEMPLATE" ]; then
  echo -e "${RED}❌ Error: Policy template not found: $POLICY_TEMPLATE${NC}"
  exit 1
fi

# Replace placeholders in policy
POLICY_DOC=$(cat "$POLICY_TEMPLATE" | sed "s|\${BUCKET}|$ENABLEMENT_CONTENT_BUCKET|g")
# Replace wildcard region/account with actual values for DynamoDB ARNs
POLICY_DOC=$(echo "$POLICY_DOC" | sed "s|arn:aws:dynamodb:\*:\*:|arn:aws:dynamodb:$AWS_REGION:$ACCOUNT_ID:|g")

# Create or update policy
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
echo "📝 Creating/updating IAM policy: $POLICY_NAME..."

if aws iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  echo "✅ Policy exists, creating new version..."
  # Create new policy version
  VERSION_ID=$(aws iam create-policy-version \
    --policy-arn "$POLICY_ARN" \
    --policy-document "$POLICY_DOC" \
    --set-as-default \
    --query 'PolicyVersion.VersionId' \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$VERSION_ID" ]; then
    echo "✅ Created policy version: $VERSION_ID"
    # Delete old versions (keep max 5)
    aws iam list-policy-versions --policy-arn "$POLICY_ARN" --query 'Versions[?IsDefaultVersion==`false`].VersionId' --output text | \
      tr '\t' '\n' | head -4 | while read -r old_version; do
        if [ -n "$old_version" ]; then
          aws iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$old_version" >/dev/null 2>&1 || true
        fi
      done
  fi
else
  echo "✅ Creating new policy..."
  aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" \
    --description "Least-privilege policy for enablement portal local development" \
    >/dev/null
  echo "✅ Created policy: $POLICY_ARN"
fi
echo ""

# Attach policy to user
echo "🔗 Attaching policy to user..."
if aws iam list-attached-user-policies --user-name "$USER_NAME" --query "AttachedPolicies[?PolicyArn=='$POLICY_ARN']" --output text | grep -q "$POLICY_ARN"; then
  echo "✅ Policy already attached"
else
  aws iam attach-user-policy --user-name "$USER_NAME" --policy-arn "$POLICY_ARN" >/dev/null
  echo "✅ Attached policy to user"
fi
echo ""

# Create access key if requested
if [ "${CREATE_ACCESS_KEY:-false}" = "true" ]; then
  echo -e "${YELLOW}⚠️  SECURITY WARNING: Creating access keys${NC}"
  echo -e "${YELLOW}   - Never commit access keys to git${NC}"
  echo -e "${YELLOW}   - Store securely in ~/.aws/credentials${NC}"
  echo -e "${YELLOW}   - Rotate keys every 90 days${NC}"
  echo ""
  
  # Check for existing keys
  EXISTING_KEYS=$(aws iam list-access-keys --user-name "$USER_NAME" --query 'AccessKeyMetadata[].AccessKeyId' --output text)
  if [ -n "$EXISTING_KEYS" ]; then
    KEY_COUNT=$(echo "$EXISTING_KEYS" | wc -w | tr -d ' ')
    if [ "$KEY_COUNT" -ge 2 ]; then
      echo -e "${RED}❌ Error: User already has 2 access keys (AWS limit). Delete one first.${NC}"
      echo "Existing keys: $EXISTING_KEYS"
      exit 1
    fi
  fi
  
  echo "🔑 Creating access key..."
  KEY_OUTPUT=$(aws iam create-access-key --user-name "$USER_NAME" --output json)
  ACCESS_KEY_ID=$(echo "$KEY_OUTPUT" | jq -r '.AccessKey.AccessKeyId')
  SECRET_ACCESS_KEY=$(echo "$KEY_OUTPUT" | jq -r '.AccessKey.SecretAccessKey')
  
  echo ""
  echo -e "${GREEN}✅ Access Key Created${NC}"
  echo "Access Key ID: $ACCESS_KEY_ID"
  echo -e "${RED}Secret Access Key: [HIDDEN - save this securely]${NC}"
  echo ""
  echo "⚠️  IMPORTANT: Save the Secret Access Key now. It cannot be retrieved later."
  echo ""
  echo "To configure AWS CLI:"
  echo "  aws configure --profile $USER_NAME"
  echo "  # Enter Access Key ID: $ACCESS_KEY_ID"
  echo "  # Enter Secret Access Key: [paste from above]"
  echo "  # Enter region: $AWS_REGION"
  echo "  # Enter output format: json"
  echo ""
else
  echo "ℹ️  Skipping access key creation (set CREATE_ACCESS_KEY=true to create)"
  echo ""
fi

echo "✅ Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Configure AWS profile:"
echo "   aws configure --profile $USER_NAME"
echo ""
echo "2. Test configuration:"
echo "   export AWS_PROFILE=$USER_NAME"
echo "   ./infra/scripts/verify-enablement-local-dev.sh"
echo ""
echo "3. Use in local development:"
echo "   export AWS_PROFILE=$USER_NAME"
echo "   STORAGE_BACKEND=aws npm run dev:api"
echo ""

