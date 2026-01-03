#!/bin/bash
# Delete Cognito User Pools and their custom domains
# This script handles the requirement to delete domains before pools

set -e

export AWS_PROFILE=admin
export AWS_REGION=us-east-1

ACTIVE_POOL="us-east-1_xBNZh7TaB"
UNUSED_POOLS=(
  "us-east-1_PsvXOkNff"
  "us-east-1_hOml8KLtW"
  "us-east-1_s4q1vjkgD"
)

echo "🧹 Deleting Cognito Pools and Domains"
echo "======================================"
echo ""
echo "Active pool (will be preserved): $ACTIVE_POOL"
echo "Pools to delete:"
for POOL in "${UNUSED_POOLS[@]}"; do
  echo "  - $POOL"
done
echo ""
echo "⚠️  WARNING: This will permanently delete these pools and their domains!"
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Step 1: Checking and deleting custom domains..."

for POOL_ID in "${UNUSED_POOLS[@]}"; do
  echo ""
  echo "Processing pool: $POOL_ID"
  
  # List domains for this pool
  DOMAINS=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$POOL_ID" \
    --query 'UserPool.Domain' \
    --output text 2>/dev/null || echo "")
  
  # Also check for custom domains
  CUSTOM_DOMAINS=$(aws cognito-idp describe-user-pool-domain \
    --domain "enable.gravytylabs.com" \
    --query 'DomainDescription.UserPoolId' \
    --output text 2>/dev/null || echo "")
  
  # Check if this pool has the custom domain
  if [ "$CUSTOM_DOMAINS" == "$POOL_ID" ]; then
    echo "  Found custom domain: enable.gravytylabs.com"
    echo "  Deleting custom domain..."
    
    if aws cognito-idp delete-user-pool-domain \
      --domain "enable.gravytylabs.com" 2>&1; then
      echo "  ✅ Successfully deleted custom domain"
      # Wait a moment for the deletion to propagate
      sleep 2
    else
      echo "  ⚠️  Failed to delete custom domain (may not exist or already deleted)"
    fi
  fi
  
  # Check for other custom domains
  # List all domains and check which ones belong to this pool
  ALL_DOMAINS=$(aws cognito-idp list-user-pool-domains \
    --query 'Domains[*].Domain' \
    --output text 2>/dev/null || echo "")
  
  for DOMAIN in $ALL_DOMAINS; do
    DOMAIN_POOL=$(aws cognito-idp describe-user-pool-domain \
      --domain "$DOMAIN" \
      --query 'DomainDescription.UserPoolId' \
      --output text 2>/dev/null || echo "")
    
    if [ "$DOMAIN_POOL" == "$POOL_ID" ]; then
      echo "  Found domain: $DOMAIN"
      echo "  Deleting domain..."
      if aws cognito-idp delete-user-pool-domain \
        --domain "$DOMAIN" 2>&1; then
        echo "  ✅ Successfully deleted domain: $DOMAIN"
        sleep 2
      fi
    fi
  done
done

echo ""
echo "Step 2: Deleting user pools..."

DELETED=0
FAILED=0

for POOL_ID in "${UNUSED_POOLS[@]}"; do
  echo ""
  echo "Deleting pool: $POOL_ID"
  
  # Check if pool still exists
  POOL_EXISTS=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$POOL_ID" \
    --query 'UserPool.Id' \
    --output text 2>/dev/null || echo "")
  
  if [ -z "$POOL_EXISTS" ]; then
    echo "  ⏭️  Pool doesn't exist (may have been deleted already)"
    continue
  fi
  
  # Try to delete the pool
  if aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>&1; then
    echo "  ✅ Successfully deleted $POOL_ID"
    DELETED=$((DELETED + 1))
  else
    ERROR_OUTPUT=$(aws cognito-idp delete-user-pool --user-pool-id "$POOL_ID" 2>&1 || true)
    echo "  ❌ Failed to delete $POOL_ID"
    echo "     Error: $ERROR_OUTPUT"
    
    # Check if it's a domain issue
    if echo "$ERROR_OUTPUT" | grep -q "domain"; then
      echo "     ⚠️  Domain still attached. Trying to find and delete it..."
      
      # Try to find the domain
      DOMAIN_CHECK=$(aws cognito-idp describe-user-pool-domain \
        --domain "enable.gravytylabs.com" \
        --query 'DomainDescription.UserPoolId' \
        --output text 2>/dev/null || echo "")
      
      if [ "$DOMAIN_CHECK" == "$POOL_ID" ]; then
        echo "     Deleting domain: enable.gravytylabs.com"
        aws cognito-idp delete-user-pool-domain --domain "enable.gravytylabs.com" || true
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
  echo "   Check AWS Console for remaining dependencies."
fi

