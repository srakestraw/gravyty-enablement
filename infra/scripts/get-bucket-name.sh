#!/bin/bash
# Get S3 bucket name from CDK stack outputs

STACK_NAME="EnablementPortalStack"

BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[?OutputKey==`ContentBucketName`].OutputValue' \
  --output text 2>/dev/null)

if [ -z "$BUCKET_NAME" ] || [ "$BUCKET_NAME" == "None" ]; then
  echo "❌ Stack not found or bucket name not available"
  echo "Make sure the stack is deployed: cdk deploy"
  exit 1
fi

echo "$BUCKET_NAME"







