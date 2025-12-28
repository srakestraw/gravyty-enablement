#!/bin/bash
# Manual invocation script for brain document expiry Lambda

set -e

STACK_NAME="${STACK_NAME:-EnablementPortalStack}"
FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`BrainExpiryJobLambdaFunctionName`].OutputValue' \
  --output text)

if [ -z "$FUNCTION_NAME" ] || [ "$FUNCTION_NAME" == "None" ]; then
  echo "Error: Could not find BrainExpiryJobLambdaFunctionName output"
  echo "Make sure the stack is deployed and the Lambda exists"
  exit 1
fi

echo "Invoking brain expiry Lambda: $FUNCTION_NAME"
echo ""

aws lambda invoke \
  --function-name "$FUNCTION_NAME" \
  --payload '{}' \
  response.json

echo ""
echo "Response:"
cat response.json | jq '.'

echo ""
echo "Check CloudWatch logs for detailed output:"
echo "aws logs tail /aws/lambda/$FUNCTION_NAME --follow"

