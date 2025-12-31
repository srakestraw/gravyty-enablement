#!/bin/bash
# Script to import existing lms_transcripts table into CloudFormation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_NAME="EnablementPortalStack"
TABLE_NAME="lms_transcripts"
REGION="us-east-1"
LOGICAL_ID="LmsTranscriptsF89DDEE3"

echo "🔍 Checking if table exists..."
if ! aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "❌ Table $TABLE_NAME does not exist in DynamoDB"
    echo "   Skipping import - table will be created by CDK"
    exit 0
fi

echo "✅ Table $TABLE_NAME exists"

echo "🔍 Checking if table is already in CloudFormation..."
if aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --logical-resource-id "$LOGICAL_ID" \
    --region "$REGION" > /dev/null 2>&1; then
    echo "✅ Table is already imported into CloudFormation"
    exit 0
fi

echo "📝 Creating import mapping file..."
IMPORT_MAPPING_FILE="/tmp/cdk-import-mapping-$$.json"
cat > "$IMPORT_MAPPING_FILE" << EOF
{
  "$LOGICAL_ID": {
    "TableName": "$TABLE_NAME"
  }
}
EOF

echo "📋 Import mapping:"
cat "$IMPORT_MAPPING_FILE"
echo ""

echo "🚀 Importing table into CloudFormation..."
cd "$INFRA_DIR"
npx cdk import \
    --resource-mapping-file "$IMPORT_MAPPING_FILE" \
    "$STACK_NAME" \
    --region "$REGION"

echo ""
echo "✅ Import complete!"
echo "   You can now deploy the stack with: cd infra && npx cdk deploy"

# Cleanup
rm -f "$IMPORT_MAPPING_FILE"

