#!/bin/bash
# Setup script for GCP Vertex AI credentials in AWS SSM Parameter Store
#
# This script helps you set up the GCP service account JSON in SSM Parameter Store
# for Vertex AI Imagen image generation.
#
# Usage:
#   ./infra/scripts/setup-gcp-vertex-ai.sh [--service-account-file PATH] [--region REGION]

set -e

# Default values
SERVICE_ACCOUNT_FILE=""
REGION="${AWS_REGION:-us-east-1}"
PARAM_NAME="/enablement-portal/gcp/service-account-json"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --service-account-file)
      SERVICE_ACCOUNT_FILE="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [--service-account-file PATH] [--region REGION]"
      echo ""
      echo "Options:"
      echo "  --service-account-file PATH  Path to GCP service account JSON file"
      echo "  --region REGION              AWS region (default: us-east-1)"
      echo "  --help                       Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "🔧 Setting up GCP Vertex AI credentials in AWS SSM Parameter Store"
echo ""

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
  echo "❌ Error: AWS CLI is not installed or not in PATH"
  echo "   Please install AWS CLI: https://aws.amazon.com/cli/"
  exit 1
fi

# Check if jq is available (for JSON validation)
if ! command -v jq &> /dev/null; then
  echo "⚠️  Warning: jq is not installed. JSON validation will be skipped."
  echo "   Install jq for better validation: https://stedolan.github.io/jq/"
fi

# Prompt for service account file if not provided
if [ -z "$SERVICE_ACCOUNT_FILE" ]; then
  echo "📁 Enter the path to your GCP service account JSON file:"
  read -r SERVICE_ACCOUNT_FILE
fi

# Validate file exists
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
  echo "❌ Error: File not found: $SERVICE_ACCOUNT_FILE"
  exit 1
fi

# Validate JSON (if jq is available)
if command -v jq &> /dev/null; then
  if ! jq empty "$SERVICE_ACCOUNT_FILE" 2>/dev/null; then
    echo "❌ Error: Invalid JSON file: $SERVICE_ACCOUNT_FILE"
    exit 1
  fi
  
  # Extract project ID from JSON
  PROJECT_ID=$(jq -r '.project_id' "$SERVICE_ACCOUNT_FILE" 2>/dev/null || echo "")
  if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "null" ]; then
    echo "✅ Found GCP project ID: $PROJECT_ID"
  fi
fi

echo ""
echo "📋 Configuration:"
echo "   Parameter Name: $PARAM_NAME"
echo "   AWS Region: $REGION"
echo "   Service Account File: $SERVICE_ACCOUNT_FILE"
echo ""

# Check if parameter already exists
if aws ssm get-parameter --name "$PARAM_NAME" --region "$REGION" &>/dev/null; then
  echo "⚠️  Warning: Parameter already exists: $PARAM_NAME"
  echo ""
  echo "Options:"
  echo "  1. Overwrite existing parameter"
  echo "  2. Cancel"
  echo ""
  read -p "Choose option (1 or 2): " choice
  
  if [ "$choice" != "1" ]; then
    echo "❌ Cancelled. No changes made."
    exit 0
  fi
  
  # Overwrite parameter
  echo ""
  echo "🔄 Overwriting existing parameter..."
  aws ssm put-parameter \
    --name "$PARAM_NAME" \
    --value "file://$SERVICE_ACCOUNT_FILE" \
    --type SecureString \
    --description "GCP Service Account JSON for Vertex AI Imagen image generation" \
    --overwrite \
    --region "$REGION" \
    > /dev/null
  
  echo "✅ Successfully updated parameter: $PARAM_NAME"
else
  # Create new parameter
  echo "📝 Creating new parameter..."
  aws ssm put-parameter \
    --name "$PARAM_NAME" \
    --value "file://$SERVICE_ACCOUNT_FILE" \
    --type SecureString \
    --description "GCP Service Account JSON for Vertex AI Imagen image generation" \
    --region "$REGION" \
    > /dev/null
  
  echo "✅ Successfully created parameter: $PARAM_NAME"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Set environment variables in your Lambda function:"
echo "     - GOOGLE_CLOUD_PROJECT=<your-gcp-project-id>"
echo "     - GOOGLE_CLOUD_REGION=us-central1 (or your preferred region)"
echo ""
echo "  2. Deploy or update your Lambda function to apply changes"
echo ""
echo "  3. Test image generation using:"
echo "     cd apps/api && npm run test:ai"
echo ""
echo "For more information, see: docs/runbooks/vertex-ai-setup.md"


