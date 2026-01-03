# Cognito Pool Cleanup - Implementation Summary

## Changes Made

### 1. Infrastructure Updates (`infra/lib/base-stack.ts`)

#### User Pool Import Support
- Added support for importing existing User Pool via `EXISTING_USER_POOL_ID` environment variable
- When set, CDK will import the existing pool instead of creating a new one
- Prevents duplicate pool creation on each deployment

#### User Pool Client Import Support
- Added support for importing existing User Pool Client via `EXISTING_USER_POOL_CLIENT_ID` environment variable
- When both pool and client IDs are set, CDK will import both instead of creating new ones

#### Lambda Triggers
- Added null check for `cfnUserPool` to handle imported pools gracefully
- Lambda triggers will still be configured/updated even when importing existing pool

#### Groups
- Groups will be created/updated as needed
- CDK handles existing groups gracefully (updates them if they exist)

### 2. Cleanup Script (`scripts/cleanup-unused-cognito-pools.sh`)

Created a comprehensive cleanup script that:
- Identifies the active pool from CloudFormation stack
- Lists all pools with name "enablement-portal-users"
- Shows which pools can be safely deleted
- Asks for confirmation before deleting
- Preserves the active pool
- Checks for users before deletion
- Provides detailed feedback

### 3. Documentation (`COGNITO_CLEANUP_GUIDE.md`)

Created a complete guide covering:
- Current situation (4 pools, 1 active)
- Step-by-step cleanup process
- How to prevent new pool creation
- Deployment instructions
- Verification steps
- Troubleshooting

## How to Use

### Step 1: Clean Up Unused Pools

```bash
# Run the cleanup script
./scripts/cleanup-unused-cognito-pools.sh
```

This will:
- Show all pools
- Ask for confirmation
- Delete unused pools (preserving the active one)

### Step 2: Deploy with Existing Pool

```bash
# Get IDs from CloudFormation
ACTIVE_POOL=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

ACTIVE_CLIENT=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

# Set environment variables
export EXISTING_USER_POOL_ID=$ACTIVE_POOL
export EXISTING_USER_POOL_CLIENT_ID=$ACTIVE_CLIENT

# Deploy
cd infra
npm run cdk:deploy
```

## Benefits

1. **No More Duplicate Pools**: Setting `EXISTING_USER_POOL_ID` prevents CDK from creating new pools
2. **Clean AWS Account**: Unused pools can be safely deleted
3. **Preserved Configuration**: Active pool and all its settings are preserved
4. **Idempotent Deployments**: Deployments won't create new resources unnecessarily

## Important Notes

- **Always set `EXISTING_USER_POOL_ID`** before deploying to prevent new pool creation
- **The cleanup script preserves the active pool** - it will never delete it
- **RETAIN policy** ensures pools survive stack destroy operations
- **Groups and clients** are handled gracefully whether they exist or not

## Current Active Pool

Based on CloudFormation stack:
- **Pool ID**: `us-east-1_xBNZh7TaB`
- **Pool Name**: `enablement-portal-users`
- **Status**: Active (in use by application)

## Next Steps

1. ✅ Infrastructure code updated
2. ✅ Cleanup script created
3. ✅ Documentation created
4. ⏭️ Run cleanup script to delete unused pools
5. ⏭️ Set environment variables and redeploy
6. ⏭️ Verify only one pool exists

