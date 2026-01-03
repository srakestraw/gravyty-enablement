#!/bin/bash
# Quick script to delete the 3 unused Cognito User Pools
# Active pool (us-east-1_xBNZh7TaB) will NOT be deleted

set -e

export AWS_PROFILE=admin
export AWS_REGION=us-east-1

ACTIVE_POOL="us-east-1_xBNZh7TaB"
UNUSED_POOLS=(
  "us-east-1_PsvXOkNff"
  "us-east-1_hOml8KLtW"
  "us-east-1_s4q1vjkgD"
)

echo "🗑️  Quick Pool Deletion Script"
echo "================================"
echo ""
echo "Active pool (will be preserved): $ACTIVE_POOL"
echo "Pools to delete:"
for POOL in "${UNUSED_POOLS[@]}"; do
  echo "  - $POOL"
done
echo ""
echo "⚠️  WARNING: This will permanently delete these pools!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Deleting pools..."

DELETED=0
FAILED=0

for POOL_ID in "${UNUSED_POOLS[@]}"; do
  echo ""
  echo "Deleting: $POOL_ID"
  
  if aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>&1; then
    echo "  ✅ Successfully deleted $POOL_ID"
    DELETED=$((DELETED + 1))
  else
    echo "  ❌ Failed to delete $POOL_ID"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "=========================================="
echo "Deletion Complete"
echo "=========================================="
echo "Deleted: $DELETED pool(s)"
echo "Failed: $FAILED pool(s)"
echo "Active pool ($ACTIVE_POOL) preserved"
echo ""

if [ $FAILED -gt 0 ]; then
  echo "⚠️  Some pools failed to delete. They may have users or dependencies."
  echo "   Check AWS Console or run the interactive cleanup script for details."
fi

