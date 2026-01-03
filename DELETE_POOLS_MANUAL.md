# Manual Pool Deletion Guide

## Why You Still See 4 Pools

The infrastructure changes I made **prevent new pools from being created**, but they **don't delete existing pools**. You need to manually delete the unused pools.

## Quick Deletion Steps

### Step 1: Identify Active Pool

The active pool is: **`us-east-1_xBNZh7TaB`**

### Step 2: Delete Unused Pools

Run these commands to delete the 3 unused pools:

```bash
# Set AWS profile
export AWS_PROFILE=admin

# Delete unused pools (one at a time)
aws cognito-idp delete-user-pool --user-pool-id us-east-1_PsvXOkNff
aws cognito-idp delete-user-pool --user-pool-id us-east-1_hOml8KLtW
aws cognito-idp delete-user-pool --user-pool-id us-east-1_s4q1vjkgD
```

### Step 3: Verify Deletion

```bash
# List remaining pools
aws cognito-idp list-user-pools \
  --max-results 60 \
  --query 'UserPools[?Name==`enablement-portal-users`].Id' \
  --output table
```

You should only see: **`us-east-1_xBNZh7TaB`**

## Alternative: Use the Cleanup Script

If you prefer an interactive script:

```bash
./scripts/cleanup-unused-cognito-pools.sh
```

The script will:
- Show all pools
- Ask for confirmation
- Delete unused pools automatically
- Preserve the active pool

## Important Notes

- **Pool deletion is permanent** - make sure you're deleting the right ones
- **The active pool (`us-east-1_xBNZh7TaB`) will NOT be deleted** by the script
- **If a pool has users**, you may need to delete users first or confirm deletion

## Troubleshooting

### If deletion fails with "pool has users":

You can either:
1. Delete users first (if they're test users)
2. Use the cleanup script which handles this interactively
3. Force delete anyway (users will be lost)

### If deletion fails with permission error:

```bash
# Check your AWS credentials
aws sts get-caller-identity

# Make sure you're using the right profile
export AWS_PROFILE=admin
```

