#!/bin/bash
# Import existing lms_transcripts table into CloudFormation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STACK_NAME="EnablementPortalStack"
TABLE_NAME="lms_transcripts"
REGION="us-east-1"
LOGICAL_ID="LmsTranscriptsF89DDEE3"

echo "🔍 Checking if table exists in DynamoDB..."
if ! aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" > /dev/null 2>&1; then
    echo "❌ Table $TABLE_NAME does not exist in DynamoDB"
    echo "   Table will be created by CDK on next deployment"
    exit 0
fi

echo "✅ Table $TABLE_NAME exists in DynamoDB"

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

# Get table details for import
TABLE_ARN=$(aws dynamodb describe-table \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --query 'Table.TableArn' \
    --output text)

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
    --region "$REGION" \
    || {
        echo ""
        echo "⚠️  CDK import failed. This might be because:"
        echo "   1. The table structure doesn't match what CDK expects"
        echo "   2. CDK import requires interactive confirmation"
        echo ""
        echo "Alternative: Delete the table and let CDK create it fresh:"
        echo "   aws dynamodb delete-table --table-name $TABLE_NAME --region $REGION"
        echo "   (Only if table is empty and you're OK with recreating it)"
        exit 1
    }

echo ""
echo "✅ Import complete!"
echo "   You can now deploy the stack with: cd infra && npx cdk deploy"

# Cleanup
rm -f "$IMPORT_MAPPING_FILE"
