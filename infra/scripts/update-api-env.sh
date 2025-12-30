#!/bin/bash
# Update apps/api/.env with bucket name from CDK stack

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_ENV="$PROJECT_ROOT/apps/api/.env"

# Get bucket name from stack
BUCKET_NAME=$(cd "$SCRIPT_DIR" && ./get-bucket-name.sh)

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Failed to get bucket name"
  exit 1
fi

echo "📝 Updating apps/api/.env with bucket name: $BUCKET_NAME"

# Create .env file if it doesn't exist
if [ ! -f "$API_ENV" ]; then
  echo "Creating $API_ENV from .env.example..."
  if [ -f "$PROJECT_ROOT/apps/api/.env.example" ]; then
    cp "$PROJECT_ROOT/apps/api/.env.example" "$API_ENV"
  else
    # Create basic .env file
    cat > "$API_ENV" << EOF
STORAGE_BACKEND=aws
AWS_REGION=us-east-1
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
ENABLEMENT_CONTENT_BUCKET=
PORT=4000
EOF
  fi
fi

# Update ENABLEMENT_CONTENT_BUCKET in .env file
if grep -q "^ENABLEMENT_CONTENT_BUCKET=" "$API_ENV"; then
  # Update existing line
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|^ENABLEMENT_CONTENT_BUCKET=.*|ENABLEMENT_CONTENT_BUCKET=$BUCKET_NAME|" "$API_ENV"
  else
    # Linux
    sed -i "s|^ENABLEMENT_CONTENT_BUCKET=.*|ENABLEMENT_CONTENT_BUCKET=$BUCKET_NAME|" "$API_ENV"
  fi
else
  # Add new line
  echo "ENABLEMENT_CONTENT_BUCKET=$BUCKET_NAME" >> "$API_ENV"
fi

echo "✅ Updated $API_ENV"
echo ""
echo "Current ENABLEMENT_CONTENT_BUCKET value:"
grep "^ENABLEMENT_CONTENT_BUCKET=" "$API_ENV"





