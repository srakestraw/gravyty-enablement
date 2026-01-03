#!/bin/bash
# Clean up unused Cognito User Pools
# This script identifies and deletes pools that are not in use

set -e

export AWS_PROFILE=admin
export AWS_REGION=us-east-1

echo "🧹 Cleaning Up Unused Cognito User Pools"
echo "=========================================="
echo ""

# Get the active User Pool ID from CloudFormation stack
echo "📋 Checking CloudFormation stack for active User Pool..."
ACTIVE_POOL=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text 2>/dev/null || echo "")

if [ -z "$ACTIVE_POOL" ]; then
  echo "⚠️  Could not determine active User Pool from CloudFormation stack"
  echo "   Using hardcoded active pool: us-east-1_xBNZh7TaB"
  ACTIVE_POOL="us-east-1_xBNZh7TaB"
else
  echo "✅ Active User Pool ID: $ACTIVE_POOL"
fi

echo ""
echo "📋 Listing all User Pools..."
ALL_POOLS=$(aws cognito-idp list-user-pools \
  --max-results 60 \
  --query 'UserPools[?Name==`enablement-portal-users`].Id' \
  --output text 2>/dev/null || echo "")

if [ -z "$ALL_POOLS" ]; then
  echo "❌ No user pools found with name 'enablement-portal-users'"
  exit 1
fi

# Convert to array
POOL_ARRAY=($ALL_POOLS)

echo "Found ${#POOL_ARRAY[@]} user pool(s) with name 'enablement-portal-users':"
for POOL_ID in "${POOL_ARRAY[@]}"; do
  POOL_INFO=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$POOL_ID" \
    --query '{Id:Id,Name:Name,CreationDate:CreationDate,LastModifiedDate:LastModifiedDate}' \
    --output json 2>/dev/null || echo "{}")
  
  CREATION_DATE=$(echo "$POOL_INFO" | jq -r '.CreationDate // "unknown"')
  LAST_MODIFIED=$(echo "$POOL_INFO" | jq -r '.LastModifiedDate // "unknown"')
  
  if [ "$POOL_ID" == "$ACTIVE_POOL" ]; then
    echo "  ✅ $POOL_ID (ACTIVE - DO NOT DELETE)"
  else
    echo "  ❌ $POOL_ID (UNUSED - can be deleted)"
    echo "     Created: $CREATION_DATE"
    echo "     Modified: $LAST_MODIFIED"
  fi
done

echo ""
echo "⚠️  WARNING: This will delete unused User Pools!"
echo "   Active pool ($ACTIVE_POOL) will NOT be deleted"
echo ""
read -p "Do you want to proceed with deletion? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🗑️  Deleting unused pools..."

DELETED_COUNT=0
FAILED_COUNT=0

for POOL_ID in "${POOL_ARRAY[@]}"; do
  if [ "$POOL_ID" != "$ACTIVE_POOL" ]; then
    echo ""
    echo "Deleting pool: $POOL_ID"
    
    # Check if pool has users
    USER_COUNT=$(aws cognito-idp list-users \
      --user-pool-id "$POOL_ID" \
      --max-results 1 \
      --query 'length(Users)' \
      --output text 2>/dev/null || echo "0")
    
    if [ "$USER_COUNT" != "0" ]; then
      echo "  ⚠️  Pool has users. Listing users..."
      aws cognito-idp list-users \
        --user-pool-id "$POOL_ID" \
        --query 'Users[*].{Username:Username,Email:Attributes[?Name==`email`].Value|[0]}' \
        --output table
      
      read -p "  Pool has users. Delete anyway? (yes/no): " DELETE_ANYWAY
      if [ "$DELETE_ANYWAY" != "yes" ]; then
        echo "  ⏭️  Skipping pool $POOL_ID"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        continue
      fi
    fi
    
    # Delete the pool
    if aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>/dev/null; then
      echo "  ✅ Successfully deleted $POOL_ID"
      DELETED_COUNT=$((DELETED_COUNT + 1))
    else
      echo "  ❌ Failed to delete $POOL_ID"
      FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
  fi
done

echo ""
echo "=========================================="
echo "Cleanup Complete"
echo "=========================================="
echo "Deleted: $DELETED_COUNT pool(s)"
echo "Failed: $FAILED_COUNT pool(s)"
echo "Active pool ($ACTIVE_POOL) preserved"
echo ""

