#!/bin/bash
# Script to fix Amplify SSM parameter access permissions
# This resolves the "Failed to set up process.env.secrets" warning that can block builds

set -e

echo "🔧 Fixing Amplify SSM Parameter Access"
echo "======================================="
echo ""

# Get Amplify app ID from user or environment
if [ -z "$AMPLIFY_APP_ID" ]; then
  echo "Enter your Amplify App ID (or set AMPLIFY_APP_ID env var):"
  echo "You can find this in Amplify Console → App Settings → General"
  read -r AMPLIFY_APP_ID
fi

if [ -z "$AMPLIFY_APP_ID" ]; then
  echo "❌ Error: Amplify App ID is required"
  exit 1
fi

echo "📱 Amplify App ID: $AMPLIFY_APP_ID"
echo ""

# Get the Amplify service role ARN
echo "🔍 Getting Amplify service role..."
SERVICE_ROLE_ARN=$(aws amplify get-app \
  --app-id "$AMPLIFY_APP_ID" \
  --query 'app.serviceRoleArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$SERVICE_ROLE_ARN" ] || [ "$SERVICE_ROLE_ARN" == "None" ]; then
  echo "⚠️  Warning: No custom service role found for Amplify app"
  echo "   Creating a new service role with SSM permissions..."
  echo ""
  
  # Run the create service role script
  if [ -f "./scripts/create-amplify-service-role.sh" ]; then
    export AMPLIFY_APP_ID="$AMPLIFY_APP_ID"
    ./scripts/create-amplify-service-role.sh
    exit 0
  else
    echo "   Please run: ./scripts/create-amplify-service-role.sh"
    echo "   Or manually create a service role with SSM permissions"
    exit 1
  fi
fi

echo "✅ Found service role: $SERVICE_ROLE_ARN"
echo ""

# Extract role name from ARN
ROLE_NAME=$(echo "$SERVICE_ROLE_ARN" | awk -F'/' '{print $2}')

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo "📋 Configuration:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $REGION"
echo "   Role Name: $ROLE_NAME"
echo ""

# Create inline policy for SSM access
POLICY_NAME="AmplifySSMParameterAccess"
POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSSMParameterAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/amplify/${AMPLIFY_APP_ID}/*"
    }
  ]
}
EOF
)

echo "📝 Creating inline policy: $POLICY_NAME"
echo ""

# Check if policy already exists
EXISTING_POLICY=$(aws iam get-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  2>/dev/null || echo "")

if [ -n "$EXISTING_POLICY" ]; then
  echo "⚠️  Policy already exists. Updating..."
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" > /dev/null
  echo "✅ Policy updated successfully"
else
  echo "➕ Creating new policy..."
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOC" > /dev/null
  echo "✅ Policy created successfully"
fi

echo ""
echo "🎉 SSM permissions have been configured!"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to Amplify Console and trigger a new build"
echo "   2. The 'Failed to set up process.env.secrets' warning should be resolved"
echo "   3. If you're using Amplify Console environment variables (not SSM),"
echo "      the warning will still appear but won't block the build"
echo ""
echo "💡 Note: If you're not using SSM parameters, you can ignore the warning."
echo "   However, having these permissions prevents any potential issues."
echo ""

