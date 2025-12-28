#!/bin/bash
# Get API Gateway URL from CDK stack outputs

STACK_NAME="EnablementPortalStack"
OUTPUT_NAME="ApiUrl"

echo "Retrieving API URL for stack: $STACK_NAME"

# Try to get the output directly from cdk
API_URL=$(cdk output "$OUTPUT_NAME" --json 2>/dev/null | jq -r ".\"$STACK_NAME\".\"$OUTPUT_NAME\"")

if [ -z "$API_URL" ] || [ "$API_URL" == "null" ]; then
  echo "Attempting to retrieve from deployed stack..."
  API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='$OUTPUT_NAME'].OutputValue" \
    --output text 2>/dev/null)
fi

if [ -z "$API_URL" ]; then
  echo "❌ Could not retrieve API URL. Ensure the CDK stack '$STACK_NAME' is deployed and the output '$OUTPUT_NAME' exists."
  exit 1
else
  echo "✅ API URL: $API_URL"
  echo "$API_URL" # Output the URL for scripting
fi




