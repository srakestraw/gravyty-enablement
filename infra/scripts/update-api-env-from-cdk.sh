#!/bin/bash
# Update apps/api/.env with all resource names from CDK stack outputs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_ENV="$PROJECT_ROOT/apps/api/.env"
STACK_NAME="EnablementPortalStack"

echo "📝 Updating apps/api/.env with CDK stack outputs"
echo "================================================="

# Get outputs from CloudFormation stack
echo "Fetching stack outputs..."
OUTPUTS=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs' \
  --output json 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$OUTPUTS" ]; then
  echo "❌ Failed to get stack outputs. Ensure stack is deployed: npm run cdk:deploy"
  exit 1
fi

# Extract values
BUCKET_NAME=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ContentBucketName") | .OutputValue')
CONTENT_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ContentTableName") | .OutputValue')
NOTIFICATIONS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="NotificationsTableName") | .OutputValue')
SUBSCRIPTIONS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="SubscriptionsTableName") | .OutputValue')
EVENTS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="EventsTableName") | .OutputValue')
# LMS Tables
LMS_COURSES_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsCoursesTableName") | .OutputValue')
LMS_LESSONS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsLessonsTableName") | .OutputValue')
LMS_PATHS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsPathsTableName") | .OutputValue')
LMS_PROGRESS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsProgressTableName") | .OutputValue')
LMS_ASSIGNMENTS_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsAssignmentsTableName") | .OutputValue')
LMS_CERTIFICATES_TABLE=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsCertificatesTableName") | .OutputValue')
LMS_MEDIA_BUCKET=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="LmsMediaBucketName") | .OutputValue')

# Get AWS region from stack
AWS_REGION=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query 'Stacks[0].Outputs[0].OutputValue' \
  --output text 2>/dev/null | xargs -I {} aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Region' \
    --output text 2>/dev/null || echo "us-east-1")

echo "Found resources:"
echo "  Bucket: $BUCKET_NAME"
echo "  Content Table: $CONTENT_TABLE"
echo "  Notifications Table: $NOTIFICATIONS_TABLE"
echo "  Subscriptions Table: $SUBSCRIPTIONS_TABLE"
echo "  Events Table: $EVENTS_TABLE"
echo "  LMS Courses Table: $LMS_COURSES_TABLE"
echo "  LMS Lessons Table: $LMS_LESSONS_TABLE"
echo "  LMS Paths Table: $LMS_PATHS_TABLE"
echo "  LMS Progress Table: $LMS_PROGRESS_TABLE"
echo "  LMS Assignments Table: $LMS_ASSIGNMENTS_TABLE"
echo "  LMS Certificates Table: $LMS_CERTIFICATES_TABLE"
echo "  LMS Media Bucket: $LMS_MEDIA_BUCKET"
echo "  Region: $AWS_REGION"
echo ""

# Create .env file if it doesn't exist
if [ ! -f "$API_ENV" ]; then
  echo "Creating $API_ENV from .env.example..."
  if [ -f "$PROJECT_ROOT/apps/api/.env.example" ]; then
    cp "$PROJECT_ROOT/apps/api/.env.example" "$API_ENV"
  else
    # Create basic .env file
    cat > "$API_ENV" << EOF
STORAGE_BACKEND=aws
AWS_REGION=$AWS_REGION
DDB_TABLE_CONTENT=$CONTENT_TABLE
DDB_TABLE_NOTIFICATIONS=$NOTIFICATIONS_TABLE
DDB_TABLE_SUBSCRIPTIONS=$SUBSCRIPTIONS_TABLE
DDB_TABLE_EVENTS=$EVENTS_TABLE
ENABLEMENT_CONTENT_BUCKET=$BUCKET_NAME
LMS_COURSES_TABLE=$LMS_COURSES_TABLE
LMS_LESSONS_TABLE=$LMS_LESSONS_TABLE
LMS_PATHS_TABLE=$LMS_PATHS_TABLE
LMS_PROGRESS_TABLE=$LMS_PROGRESS_TABLE
LMS_ASSIGNMENTS_TABLE=$LMS_ASSIGNMENTS_TABLE
LMS_CERTIFICATES_TABLE=$LMS_CERTIFICATES_TABLE
LMS_MEDIA_BUCKET=$LMS_MEDIA_BUCKET
PORT=4000
EOF
  fi
fi

# Update values in .env file
update_env_var() {
  local key=$1
  local value=$2
  
  if grep -q "^${key}=" "$API_ENV"; then
    # Update existing line
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$API_ENV"
    else
      # Linux
      sed -i "s|^${key}=.*|${key}=${value}|" "$API_ENV"
    fi
  else
    # Add new line
    echo "${key}=${value}" >> "$API_ENV"
  fi
}

# Update all variables
update_env_var "STORAGE_BACKEND" "aws"
update_env_var "AWS_REGION" "$AWS_REGION"
update_env_var "DDB_TABLE_CONTENT" "$CONTENT_TABLE"
update_env_var "DDB_TABLE_NOTIFICATIONS" "$NOTIFICATIONS_TABLE"
update_env_var "DDB_TABLE_SUBSCRIPTIONS" "$SUBSCRIPTIONS_TABLE"
update_env_var "DDB_TABLE_EVENTS" "$EVENTS_TABLE"
update_env_var "ENABLEMENT_CONTENT_BUCKET" "$BUCKET_NAME"
# LMS variables (only update if values exist)
if [ -n "$LMS_COURSES_TABLE" ] && [ "$LMS_COURSES_TABLE" != "null" ]; then
  update_env_var "LMS_COURSES_TABLE" "$LMS_COURSES_TABLE"
  update_env_var "LMS_LESSONS_TABLE" "$LMS_LESSONS_TABLE"
  update_env_var "LMS_PATHS_TABLE" "$LMS_PATHS_TABLE"
  update_env_var "LMS_PROGRESS_TABLE" "$LMS_PROGRESS_TABLE"
  update_env_var "LMS_ASSIGNMENTS_TABLE" "$LMS_ASSIGNMENTS_TABLE"
  update_env_var "LMS_CERTIFICATES_TABLE" "$LMS_CERTIFICATES_TABLE"
  update_env_var "LMS_MEDIA_BUCKET" "$LMS_MEDIA_BUCKET"
fi

echo "✅ Updated $API_ENV"
echo ""
echo "Current configuration:"
grep -E "^(STORAGE_BACKEND|AWS_REGION|DDB_TABLE_|ENABLEMENT_CONTENT_BUCKET|LMS_)=" "$API_ENV"




