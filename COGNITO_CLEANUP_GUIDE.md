# Cognito User Pool Cleanup Guide

## Overview

This guide helps you:
1. Clean up unused Cognito User Pools
2. Prevent new pools from being created on deployment
3. Use the existing active pool going forward

## Current Situation

You have 4 User Pools:
- ✅ **us-east-1_xBNZh7TaB** - ACTIVE (currently in use)
- ❌ **us-east-1_PsvXOkNff** - UNUSED (can be deleted)
- ❌ **us-east-1_hOml8KLtW** - UNUSED (can be deleted)
- ❌ **us-east-1_s4q1vjkgD** - UNUSED (old deployment)

## Step 1: Verify Active Pool

First, confirm which pool is active:

```bash
# Check CloudFormation stack
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text
```

This should return: `us-east-1_xBNZh7TaB`

## Step 2: Clean Up Unused Pools

You have **two options** to delete unused pools:

### Option A: Quick Deletion Script (Recommended)

```bash
./scripts/delete-unused-pools-quick.sh
```

This script will:
- Delete the 3 known unused pools
- Preserve the active pool (`us-east-1_xBNZh7TaB`)
- Ask for confirmation once

### Option B: Interactive Cleanup Script

```bash
./scripts/cleanup-unused-cognito-pools.sh
```

This script will:
- Identify the active pool from CloudFormation
- List all pools with name "enablement-portal-users"
- Show which pools can be safely deleted
- Ask for confirmation before deleting
- Handle pools with users interactively
- Preserve the active pool

### Option C: Manual Deletion

If scripts don't work, delete manually:

```bash
export AWS_PROFILE=admin
aws cognito-idp delete-user-pool --user-pool-id us-east-1_PsvXOkNff
aws cognito-idp delete-user-pool --user-pool-id us-east-1_hOml8KLtW
aws cognito-idp delete-user-pool --user-pool-id us-east-1_s4q1vjkgD
```

**⚠️ WARNING:** Pool deletion is permanent. Make sure you're deleting the right pools.

## Step 3: Prevent New Pool Creation

### Option A: Use Existing Pool (Recommended)

Set environment variable to use existing pool:

```bash
export EXISTING_USER_POOL_ID=us-east-1_xBNZh7TaB
cd infra
npm run cdk:deploy
```

This tells CDK to import the existing pool instead of creating a new one.

### Option B: Keep RETAIN Policy (Already Configured)

The infrastructure already has `removalPolicy: cdk.RemovalPolicy.RETAIN` set, which:
- ✅ Prevents pool deletion when stack is destroyed
- ✅ Preserves pool across deployments
- ⚠️ But CDK will still create a NEW pool if it doesn't find the existing one

**To prevent new pool creation, use Option A (EXISTING_USER_POOL_ID).**

## Step 4: Update Infrastructure Code

The infrastructure code has been updated to:
1. ✅ Check for `EXISTING_USER_POOL_ID` environment variable
2. ✅ Import existing pool if variable is set
3. ✅ Create new pool only if variable is not set
4. ✅ Use RETAIN policy to prevent accidental deletion

## Step 5: Deploy with Existing Pool

```bash
# Get IDs from CloudFormation stack
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

# Deploy infrastructure
cd infra
npm run cdk:deploy
```

This ensures CDK uses the existing pool and client instead of creating new ones.

## Verification

After cleanup and deployment:

1. **Check pools in AWS Console:**
   - Should only see 1 pool: `us-east-1_xBNZh7TaB`

2. **Verify CloudFormation output:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name EnablementPortalStack \
     --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
     --output text
   ```
   Should return: `us-east-1_xBNZh7TaB`

3. **Test your app:**
   - Sign in should work
   - Admin endpoints should work
   - No new pools should be created

## Important Notes

- **Always backup** before deleting pools (if they have important users)
- **The active pool** (`us-east-1_xBNZh7TaB`) will NOT be deleted
- **Set EXISTING_USER_POOL_ID** before deploying to prevent new pool creation
- **RETAIN policy** ensures pool survives stack destroy operations

## Troubleshooting

### If cleanup script fails:
- Check AWS credentials: `aws sts get-caller-identity`
- Verify you have permissions: `aws cognito-idp list-user-pools`

### If new pool is created after deployment:
- Make sure `EXISTING_USER_POOL_ID` is set before deploying
- Check CDK logs for pool creation messages

### If you accidentally delete the wrong pool:
- User Pool deletion is permanent
- You'll need to recreate users and groups
- Consider using CloudFormation stack rollback if done recently

