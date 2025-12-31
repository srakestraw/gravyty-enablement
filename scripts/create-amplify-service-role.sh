#!/bin/bash
# Script to create and configure Amplify service role with SSM permissions

set -e

AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-d1cf513hn1tkd1}"

echo "🔧 Creating Amplify Service Role with SSM Permissions"
echo "====================================================="
echo ""

# Get AWS account ID and region
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region || echo "us-east-1")

echo "📋 Configuration:"
echo "   Amplify App ID: $AMPLIFY_APP_ID"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $REGION"
echo ""

# Role name
ROLE_NAME="amplify-${AMPLIFY_APP_ID}-service-role"

# Check if role already exists
EXISTING_ROLE=$(aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null || echo "")

if [ -n "$EXISTING_ROLE" ]; then
  echo "✅ Role already exists: $ROLE_NAME"
else
  echo "➕ Creating IAM role: $ROLE_NAME"
  
  # Trust policy for Amplify
  TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

  # Create the role
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "Service role for Amplify app $AMPLIFY_APP_ID" \
    > /dev/null

  echo "✅ Role created successfully"
fi

echo ""

# Attach Amplify managed policy (if it exists, or create minimal permissions)
echo "📝 Attaching Amplify managed policies..."

# Try to attach AWS managed policy for Amplify (if available)
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess" \
  2>/dev/null && echo "✅ Attached AmplifyBackendDeployFullAccess" || echo "⚠️  AmplifyBackendDeployFullAccess not available, skipping"

# Add SSM permissions as inline policy
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
    },
    {
      "Sid": "AllowAmplifyBuildPermissions",
      "Effect": "Allow",
      "Action": [
        "codebuild:StartBuild",
        "codebuild:BatchGetBuilds",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "*"
    }
  ]
}
EOF
)

echo "📝 Adding SSM permissions..."
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name "$POLICY_NAME" \
  --policy-document "$POLICY_DOC" > /dev/null

echo "✅ SSM permissions added"
echo ""

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

echo "🔗 Role ARN: $ROLE_ARN"
echo ""

# Update Amplify app to use this role
echo "🔧 Updating Amplify app to use custom service role..."
aws amplify update-app \
  --app-id "$AMPLIFY_APP_ID" \
  --iam-service-role-arn "$ROLE_ARN" \
  > /dev/null

echo "✅ Amplify app updated successfully!"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Go to Amplify Console and trigger a new build"
echo "   2. The 'Failed to set up process.env.secrets' warning should be resolved"
echo "   3. Build should proceed successfully"
echo ""

