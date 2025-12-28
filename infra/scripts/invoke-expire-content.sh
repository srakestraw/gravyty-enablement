#!/bin/bash
# Manually invoke the content expiry Lambda function

set -e

STACK_NAME="EnablementPortalStack"
OUTPUT_KEY="ExpiryJobLambdaFunctionName"

echo "🔧 Invoking Content Expiry Job Lambda"
echo "======================================"

# Get Lambda function name from CDK outputs
echo "Fetching Lambda function name..."
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='$OUTPUT_KEY'].OutputValue" \
  --output text 2>/dev/null)

if [ -z "$FUNCTION_NAME" ] || [ "$FUNCTION_NAME" == "None" ]; then
  echo "❌ Failed to get Lambda function name. Ensure stack is deployed: npm run cdk:deploy"
  exit 1
fi

echo "Found Lambda function: $FUNCTION_NAME"
echo ""

# Invoke the Lambda function
echo "Invoking Lambda function..."
RESPONSE=$(aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/expiry-job-response.json 2>&1)

if [ $? -ne 0 ]; then
  echo "❌ Failed to invoke Lambda function"
  echo "$RESPONSE"
  exit 1
fi

# Parse and display response
echo "✅ Lambda invoked successfully"
echo ""
echo "Response:"
cat /tmp/expiry-job-response.json | jq '.' 2>/dev/null || cat /tmp/expiry-job-response.json
echo ""

# Extract result summary if available
if command -v jq &> /dev/null; then
  RESULT=$(cat /tmp/expiry-job-response.json | jq -r '.body' 2>/dev/null | jq -r '.result' 2>/dev/null || echo "")
  if [ -n "$RESULT" ] && [ "$RESULT" != "null" ]; then
    echo "Summary:"
    echo "$RESULT" | jq '.'
  fi
fi

# Cleanup
rm -f /tmp/expiry-job-response.json

