#!/bin/bash
# Delete unused DynamoDB tables
# WARNING: This permanently deletes tables and all their data!

set -e

REGION=${AWS_REGION:-us-east-1}

echo "⚠️  WARNING: This will permanently delete DynamoDB tables!"
echo ""
echo "Tables that will be deleted:"
echo "  - content_registry"
echo "  - notifications"
echo "  - subscriptions"
echo ""
echo "Tables that will be KEPT:"
echo "  - events (actively used)"
echo "  - lms_* tables (LMS tables)"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Deleting tables..."

# Delete content_registry
if aws dynamodb describe-table --table-name content_registry --region "$REGION" >/dev/null 2>&1; then
  echo "Deleting content_registry..."
  aws dynamodb delete-table --table-name content_registry --region "$REGION" >/dev/null 2>&1
  echo "✅ Deleted content_registry (waiting for deletion to complete...)"
  aws dynamodb wait table-not-exists --table-name content_registry --region "$REGION"
else
  echo "⏭️  content_registry does not exist"
fi

# Delete notifications
if aws dynamodb describe-table --table-name notifications --region "$REGION" >/dev/null 2>&1; then
  echo "Deleting notifications..."
  aws dynamodb delete-table --table-name notifications --region "$REGION" >/dev/null 2>&1
  echo "✅ Deleted notifications (waiting for deletion to complete...)"
  aws dynamodb wait table-not-exists --table-name notifications --region "$REGION"
else
  echo "⏭️  notifications does not exist"
fi

# Delete subscriptions
if aws dynamodb describe-table --table-name subscriptions --region "$REGION" >/dev/null 2>&1; then
  echo "Deleting subscriptions..."
  aws dynamodb delete-table --table-name subscriptions --region "$REGION" >/dev/null 2>&1
  echo "✅ Deleted subscriptions (waiting for deletion to complete...)"
  aws dynamodb wait table-not-exists --table-name subscriptions --region "$REGION"
else
  echo "⏭️  subscriptions does not exist"
fi

echo ""
echo "✅ All unused tables deleted!"
echo ""
echo "Remaining tables:"
aws dynamodb list-tables --region "$REGION" --output table




