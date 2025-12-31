# Circular Dependency Fix Summary

## Problem

The original stack had a circular dependency between:
- HTTP API Gateway (API Gateway v2)
- Lambda Function (API Lambda)
- Cognito User Pool and Groups
- Lambda Permissions

The cycle occurred because:
1. `HttpLambdaIntegration` automatically creates Lambda invoke permissions
2. These permissions reference the API Gateway ARN
3. The Lambda function references Cognito resources via environment variables
4. Cognito resources create dependencies that cycle back

## Solution: Nested Stacks

We broke the circular dependency by splitting the stack into nested stacks:

### BaseStack (`infra/lib/base-stack.ts`)
Contains:
- Cognito User Pool, Groups, and Domain
- Lambda Function (API Lambda)
- Lambda Execution Role with all permissions
- Cognito Lambda triggers (email validator, auto-assign viewer)

### ApiStack (`infra/lib/api-stack.ts`)
Contains:
- HTTP API Gateway (API Gateway v2)
- Lambda Integration (using `CfnIntegration` to avoid automatic permissions)
- API Routes (`/v1/{proxy+}` and `/health`)

### Main Stack (`infra/lib/enablement-portal-stack.ts`)
Contains:
- DynamoDB Tables
- S3 Buckets
- Transcription Worker Lambda
- EventBridge Rules
- Instantiates BaseStack and ApiStack as nested stacks
- Creates Lambda permission AFTER both nested stacks are created

## Key Changes

1. **Moved Lambda permission creation to main stack**: The permission is created after both nested stacks are instantiated, breaking the cycle.

2. **Used `CfnIntegration` instead of `HttpLambdaIntegration`**: This avoids automatic permission creation that was causing the cycle.

3. **Used wildcard ARN for permission**: The Lambda permission uses `arn:aws:execute-api:${region}:${account}:*/*/*` instead of referencing the specific API Gateway ARN.

4. **Separated concerns**: Cognito and Lambda are in BaseStack, API Gateway is in ApiStack, ensuring clean separation.

## Benefits

- ✅ No circular dependencies
- ✅ Cleaner separation of concerns
- ✅ Easier to manage and update individual components
- ✅ Better CloudFormation organization

## Deployment Notes

- Both nested stacks are deployed as part of the main stack
- The Lambda permission is created in the main stack after nested stacks are created
- All resources maintain the same functionality as before

## Files Changed

- `infra/lib/enablement-portal-stack.ts` - Refactored to use nested stacks
- `infra/lib/base-stack.ts` - New file for Cognito + Lambda
- `infra/lib/api-stack.ts` - New file for API Gateway

