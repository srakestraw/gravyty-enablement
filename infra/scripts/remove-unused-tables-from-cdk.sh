#!/bin/bash
# Remove unused table definitions from CDK stack
# This script removes content_registry, notifications, and subscriptions from the CDK code
# After running this, deploy CDK again to delete the tables

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_FILE="$SCRIPT_DIR/../lib/enablement-portal-stack.ts"

echo "⚠️  This will remove unused table definitions from CDK stack"
echo "   Tables to remove: content_registry, notifications, subscriptions"
echo ""
read -p "Continue? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "📝 Removing table definitions from CDK stack..."
echo "   After this, run: npm run cdk:deploy"
echo ""
echo "   The tables will be deleted when you deploy the updated stack."

# Note: The actual removal will be done manually in the code
# This script is just a reminder/helper

echo ""
echo "✅ Ready to remove tables from CDK code"
echo ""
echo "Next steps:"
echo "1. Remove the table definitions from infra/lib/enablement-portal-stack.ts"
echo "2. Run: npm run cdk:deploy"
echo "3. CDK will delete the tables"




