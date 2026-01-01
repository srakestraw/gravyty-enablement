#!/bin/bash
# Quick setup script for Vertex AI - non-interactive version
# Usage: ./scripts/setup-vertex-ai-quick.sh <gcp-project-id> <service-account-json-file> [gcp-region]

set -e

GCP_PROJECT_ID="$1"
SERVICE_ACCOUNT_FILE="$2"
GCP_REGION="${3:-us-central1}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PARAM_NAME="/enablement-portal/gcp/service-account-json"

if [ -z "$GCP_PROJECT_ID" ] || [ -z "$SERVICE_ACCOUNT_FILE" ]; then
    echo "Usage: $0 <gcp-project-id> <service-account-json-file> [gcp-region]"
    echo ""
    echo "Example:"
    echo "  $0 my-gcp-project /path/to/service-account-key.json us-central1"
    exit 1
fi

if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo "❌ Error: Service account file not found: $SERVICE_ACCOUNT_FILE"
    exit 1
fi

echo "🚀 Setting up Vertex AI..."
echo "  GCP Project: $GCP_PROJECT_ID"
echo "  GCP Region: $GCP_REGION"
echo "  Service Account File: $SERVICE_ACCOUNT_FILE"
echo ""

# Create/update SSM parameter
echo "📝 Creating SSM parameter..."
if aws ssm get-parameter --name "$PARAM_NAME" --region "$AWS_REGION" &>/dev/null; then
    echo "  Parameter exists, updating..."
    aws ssm put-parameter \
        --name "$PARAM_NAME" \
        --value "file://${SERVICE_ACCOUNT_FILE}" \
        --type SecureString \
        --description "GCP Service Account JSON for Vertex AI Imagen" \
        --overwrite \
        --region "$AWS_REGION" \
        > /dev/null
    echo "  ✅ Parameter updated"
else
    echo "  Creating new parameter..."
    aws ssm put-parameter \
        --name "$PARAM_NAME" \
        --value "file://${SERVICE_ACCOUNT_FILE}" \
        --type SecureString \
        --description "GCP Service Account JSON for Vertex AI Imagen" \
        --region "$AWS_REGION" \
        > /dev/null
    echo "  ✅ Parameter created"
fi

# Verify
if aws ssm get-parameter --name "$PARAM_NAME" --with-decryption --region "$AWS_REGION" &>/dev/null; then
    echo "  ✅ Parameter verified"
else
    echo "  ❌ Failed to verify parameter"
    exit 1
fi

echo ""
echo "✅ SSM Parameter Setup Complete!"
echo ""
echo "Next: Set Lambda environment variables:"
echo "  GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID"
echo "  GOOGLE_CLOUD_REGION=$GCP_REGION"
echo ""
echo "You can set these via:"
echo "  1. AWS Console > Lambda > Configuration > Environment variables"
echo "  2. Or update infra/lib/base-stack.ts and redeploy"

