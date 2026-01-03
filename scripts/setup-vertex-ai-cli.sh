#!/bin/bash
# Setup Vertex AI for Imagen using CLI
# This script guides you through the complete setup process

set -e

echo "🚀 Vertex AI Setup for Imagen Image Generation"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "   Install it from: https://aws.amazon.com/cli/"
    exit 1
fi
echo -e "${GREEN}✅ AWS CLI found${NC}"

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "   Run: aws configure"
    exit 1
fi
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region || echo "us-east-1")
echo -e "${GREEN}✅ AWS credentials configured (Account: ${AWS_ACCOUNT}, Region: ${AWS_REGION})${NC}"

# Check gcloud (optional - can use GCP Console instead)
if command -v gcloud &> /dev/null; then
    echo -e "${GREEN}✅ gcloud CLI found${NC}"
    HAS_GCLOUD=true
else
    echo -e "${YELLOW}⚠️  gcloud CLI not found (optional - you can use GCP Console instead)${NC}"
    HAS_GCLOUD=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: GCP Project Setup
echo "Step 1: GCP Project Setup"
echo "─────────────────────────"
echo ""
echo "You need a Google Cloud Project with:"
echo "  • Vertex AI API enabled"
echo "  • Billing enabled"
echo "  • Service account with Vertex AI User role"
echo ""

read -p "Do you have a GCP project ID? (y/n): " has_project
if [ "$has_project" != "y" ]; then
    echo ""
    echo "📝 Create a GCP project:"
    echo "   1. Go to https://console.cloud.google.com/"
    echo "   2. Create a new project or select existing one"
    echo "   3. Enable billing (required for Vertex AI)"
    echo "   4. Enable Vertex AI API:"
    echo "      - Go to APIs & Services > Library"
    echo "      - Search for 'Vertex AI API'"
    echo "      - Click Enable"
    echo ""
    read -p "Press Enter when you have your project ID..."
fi

read -p "Enter your GCP Project ID: " GCP_PROJECT_ID
if [ -z "$GCP_PROJECT_ID" ]; then
    echo -e "${RED}❌ GCP Project ID is required${NC}"
    exit 1
fi

read -p "Enter your GCP Region [us-central1]: " GCP_REGION
GCP_REGION=${GCP_REGION:-us-central1}

echo ""
echo -e "${GREEN}✅ GCP Project: ${GCP_PROJECT_ID}${NC}"
echo -e "${GREEN}✅ GCP Region: ${GCP_REGION}${NC}"
echo ""

# Step 2: Service Account Setup
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step 2: Service Account Setup"
echo "─────────────────────────────"
echo ""

if [ "$HAS_GCLOUD" = true ]; then
    read -p "Do you want to create the service account using gcloud CLI? (y/n): " use_gcloud
    if [ "$use_gcloud" = "y" ]; then
        echo ""
        echo "Creating service account..."
        
        SA_NAME="enablement-portal-vertex-ai"
        SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
        
        # Create service account
        gcloud iam service-accounts create "$SA_NAME" \
            --project="$GCP_PROJECT_ID" \
            --display-name="Enablement Portal Vertex AI" \
            --description="Service account for Vertex AI Imagen image generation" \
            2>&1 || echo "Service account may already exist, continuing..."
        
        # Grant Vertex AI User role
        gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
            --member="serviceAccount:${SA_EMAIL}" \
            --role="roles/aiplatform.user" \
            --condition=None
        
        echo -e "${GREEN}✅ Service account created: ${SA_EMAIL}${NC}"
        
        # Create and download key
        KEY_FILE="/tmp/gcp-sa-${GCP_PROJECT_ID}.json"
        gcloud iam service-accounts keys create "$KEY_FILE" \
            --iam-account="${SA_EMAIL}" \
            --project="$GCP_PROJECT_ID"
        
        echo -e "${GREEN}✅ Service account key downloaded to: ${KEY_FILE}${NC}"
        SERVICE_ACCOUNT_FILE="$KEY_FILE"
    else
        echo ""
        echo "📝 Create service account manually:"
        echo "   1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts?project=${GCP_PROJECT_ID}"
        echo "   2. Click 'Create Service Account'"
        echo "   3. Name: enablement-portal-vertex-ai"
        echo "   4. Grant role: Vertex AI User (roles/aiplatform.user)"
        echo "   5. Create and download JSON key"
        echo ""
        read -p "Enter path to downloaded service account JSON file: " SERVICE_ACCOUNT_FILE
    fi
else
    echo "📝 Create service account manually:"
    echo "   1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts?project=${GCP_PROJECT_ID}"
    echo "   2. Click 'Create Service Account'"
    echo "   3. Name: enablement-portal-vertex-ai"
    echo "   4. Grant role: Vertex AI User (roles/aiplatform.user)"
    echo "   5. Create and download JSON key"
    echo ""
    read -p "Enter path to downloaded service account JSON file: " SERVICE_ACCOUNT_FILE
fi

# Validate file exists
if [ ! -f "$SERVICE_ACCOUNT_FILE" ]; then
    echo -e "${RED}❌ File not found: ${SERVICE_ACCOUNT_FILE}${NC}"
    exit 1
fi

# Validate JSON
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq not found - skipping JSON validation${NC}"
else
    if ! jq empty "$SERVICE_ACCOUNT_FILE" 2>/dev/null; then
        echo -e "${RED}❌ Invalid JSON file${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ JSON file is valid${NC}"
fi

echo ""

# Step 3: Store in AWS SSM
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step 3: Store Credentials in AWS SSM Parameter Store"
echo "─────────────────────────────────────────────────────"
echo ""

PARAM_NAME="/enablement-portal/gcp/service-account-json"

# Check if parameter already exists
if aws ssm get-parameter --name "$PARAM_NAME" --region "$AWS_REGION" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Parameter already exists: ${PARAM_NAME}${NC}"
    read -p "Overwrite existing parameter? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Skipping SSM parameter creation"
    else
        echo ""
        echo "Updating parameter..."
        aws ssm put-parameter \
            --name "$PARAM_NAME" \
            --value "file://${SERVICE_ACCOUNT_FILE}" \
            --type SecureString \
            --description "GCP Service Account JSON for Vertex AI Imagen image generation" \
            --overwrite \
            --region "$AWS_REGION" \
            > /dev/null
        echo -e "${GREEN}✅ Parameter updated${NC}"
    fi
else
    echo "Creating SSM parameter..."
    aws ssm put-parameter \
        --name "$PARAM_NAME" \
        --value "file://${SERVICE_ACCOUNT_FILE}" \
        --type SecureString \
        --description "GCP Service Account JSON for Vertex AI Imagen image generation" \
        --region "$AWS_REGION" \
        > /dev/null
    echo -e "${GREEN}✅ Parameter created: ${PARAM_NAME}${NC}"
fi

# Verify parameter
echo ""
echo "Verifying parameter..."
if aws ssm get-parameter --name "$PARAM_NAME" --with-decryption --region "$AWS_REGION" &>/dev/null; then
    echo -e "${GREEN}✅ Parameter verified${NC}"
else
    echo -e "${RED}❌ Failed to verify parameter${NC}"
    exit 1
fi

echo ""

# Step 4: Lambda Environment Variables
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step 4: Configure Lambda Environment Variables"
echo "───────────────────────────────────────────────"
echo ""

STACK_NAME="EnablementPortalStack"

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" &>/dev/null; then
    echo -e "${YELLOW}⚠️  CloudFormation stack not found: ${STACK_NAME}${NC}"
    echo "   You'll need to set environment variables manually after deploying"
    echo ""
    echo "   Set these in Lambda function configuration:"
    echo "   • GOOGLE_CLOUD_PROJECT=${GCP_PROJECT_ID}"
    echo "   • GOOGLE_CLOUD_REGION=${GCP_REGION}"
    echo ""
    read -p "Press Enter to continue..."
else
    echo "Found CloudFormation stack: ${STACK_NAME}"
    echo ""
    echo "To set Lambda environment variables, you have two options:"
    echo ""
    echo "Option A: Update via CDK (recommended)"
    echo "  1. Edit infra/lib/base-stack.ts"
    echo "  2. Add to Lambda environment section:"
    echo "     GOOGLE_CLOUD_PROJECT: '${GCP_PROJECT_ID}',"
    echo "     GOOGLE_CLOUD_REGION: '${GCP_REGION}',"
    echo "  3. Run: npm run cdk:deploy"
    echo ""
    echo "Option B: Update via AWS Console"
    echo "  1. Go to Lambda Console"
    echo "  2. Find your API Lambda function"
    echo "  3. Configuration > Environment variables"
    echo "  4. Add:"
    echo "     • GOOGLE_CLOUD_PROJECT = ${GCP_PROJECT_ID}"
    echo "     • GOOGLE_CLOUD_REGION = ${GCP_REGION}"
    echo ""
    read -p "Press Enter to continue..."
fi

echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo ""
echo "Summary:"
echo "  • SSM Parameter: ${PARAM_NAME}"
echo "  • GCP Project: ${GCP_PROJECT_ID}"
echo "  • GCP Region: ${GCP_REGION}"
echo ""
echo "Next Steps:"
echo "  1. Set Lambda environment variables (see above)"
echo "  2. Deploy/update Lambda function"
echo "  3. Test image generation:"
echo "     cd apps/api && npm run test:ai"
echo ""
echo "For more information, see: docs/runbooks/vertex-ai-setup.md"
echo ""


