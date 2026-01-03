#!/bin/bash
# Delete Cognito custom domain and then unused pools
# This handles the AWS requirement: domains must be deleted before pools

set -e

export AWS_PROFILE=admin
export AWS_REGION=us-east-1

ACTIVE_POOL="us-east-1_xBNZh7TaB"
UNUSED_POOLS=(
  "us-east-1_PsvXOkNff"
  "us-east-1_hOml8KLtW"
  "us-east-1_s4q1vjkgD"
)
DOMAIN="enable.gravytylabs.com"

echo "🧹 Deleting Cognito Domain and Pools"
echo "====================================="
echo ""
echo "Domain to delete: $DOMAIN"
echo "Active pool (will be preserved): $ACTIVE_POOL"
echo "Pools to delete:"
for POOL in "${UNUSED_POOLS[@]}"; do
  echo "  - $POOL"
done
echo ""
echo "⚠️  WARNING: This will permanently delete the domain and pools!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Step 1: Checking which pool has the custom domain..."

# Check which pool has the domain
DOMAIN_POOL=$(aws cognito-idp describe-user-pool-domain \
  --domain "$DOMAIN" \
  --query 'DomainDescription.UserPoolId' \
  --output text 2>/dev/null || echo "")

if [ -n "$DOMAIN_POOL" ] && [ "$DOMAIN_POOL" != "None" ]; then
  echo "✅ Found domain attached to pool: $DOMAIN_POOL"
  
  if [ "$DOMAIN_POOL" == "$ACTIVE_POOL" ]; then
    echo "⚠️  WARNING: Domain is attached to the ACTIVE pool!"
    echo "   This will break authentication. Are you sure?"
    read -p "   Delete domain anyway? (yes/no): " DELETE_ACTIVE_DOMAIN
    
    if [ "$DELETE_ACTIVE_DOMAIN" != "yes" ]; then
      echo "Cancelled. Domain deletion skipped."
      exit 0
    fi
  fi
  
  echo ""
  echo "Step 2: Deleting custom domain..."
  if aws cognito-idp delete-user-pool-domain --domain "$DOMAIN" 2>&1; then
    echo "✅ Successfully deleted domain: $DOMAIN"
    echo "   Waiting 5 seconds for deletion to propagate..."
    sleep 5
  else
    echo "❌ Failed to delete domain"
    echo "   Continuing anyway..."
  fi
else
  echo "ℹ️  Domain not found or already deleted"
fi

echo ""
echo "Step 3: Deleting unused pools..."

DELETED=0
FAILED=0

for POOL_ID in "${UNUSED_POOLS[@]}"; do
  echo ""
  echo "Deleting pool: $POOL_ID"
  
  # Check if pool exists
  POOL_EXISTS=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$POOL_ID" \
    --query 'UserPool.Id' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$POOL_EXISTS" ]; then
    echo "  ⏭️  Pool doesn't exist (already deleted)"
    continue
  fi
  
  # Try to delete
  if aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>&1; then
    echo "  ✅ Successfully deleted $POOL_ID"
    DELETED=$((DELETED + 1))
  else
    ERROR=$(aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>&1 || true)
    echo "  ❌ Failed to delete $POOL_ID"
    
    # Check for domain error
    if echo "$ERROR" | grep -qi "domain"; then
      echo "     ⚠️  Domain still attached. Checking for other domains..."
      
      # Try to find and delete any remaining domains
      POOL_DOMAIN=$(aws cognito-idp describe-user-pool \
        --user-pool-id "$POOL_ID" \
        --query 'UserPool.Domain' \
        --output text 2>/dev/null || echo "")
      
      if [ -n "$POOL_DOMAIN" ] && [ "$POOL_DOMAIN" != "None" ]; then
        echo "     Found domain: $POOL_DOMAIN"
        echo "     Deleting domain..."
        aws cognito-idp delete-user-pool-domain --domain "$POOL_DOMAIN" 2>&1 || true
        sleep 3
        echo "     Retrying pool deletion..."
        if aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>&1; then
          echo "     ✅ Successfully deleted after domain removal"
          DELETED=$((DELETED + 1))
        else
          FAILED=$((FAILED + 1))
        fi
      else
        FAILED=$((FAILED + 1))
      fi
    else
      FAILED=$((FAILED + 1))
    fi
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
  echo "⚠️  Some pools failed to delete."
  echo "   They may have other dependencies (users, identity providers, etc.)"
  echo "   Check AWS Console for details."
fi

