#!/bin/bash
# AWS Setup Script for Gravyty Enablement Portal
# This script creates DynamoDB tables and S3 bucket

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION=${AWS_REGION:-us-east-1}
CONTENT_TABLE=${DDB_TABLE_CONTENT:-content_registry}
NOTIFICATIONS_TABLE=${DDB_TABLE_NOTIFICATIONS:-notifications}
SUBSCRIPTIONS_TABLE=${DDB_TABLE_SUBSCRIPTIONS:-subscriptions}
EVENTS_TABLE=${DDB_TABLE_EVENTS:-events}
BUCKET_NAME=${ENABLEMENT_CONTENT_BUCKET:-enablement-content}

echo -e "${GREEN}🚀 Setting up AWS resources for Gravyty Enablement Portal${NC}"
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ Connected to AWS Account: ${ACCOUNT_ID}${NC}"
echo ""

# Create DynamoDB tables
echo -e "${YELLOW}Creating DynamoDB tables...${NC}"

# Content Registry Table
echo "Creating ${CONTENT_TABLE}..."
aws dynamodb create-table \
    --table-name ${CONTENT_TABLE} \
    --attribute-definitions \
        AttributeName=content_id,AttributeType=S \
        AttributeName=status,AttributeType=S \
        AttributeName=status#last_updated,AttributeType=S \
        AttributeName=product_suite#product_concept,AttributeType=S \
    --key-schema \
        AttributeName=content_id,KeyType=HASH \
    --global-secondary-indexes \
        "[
            {
                \"IndexName\": \"by_status_updated\",
                \"KeySchema\": [
                    {\"AttributeName\": \"status\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"status#last_updated\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {\"ProjectionType\": \"ALL\"},
                \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
            },
            {
                \"IndexName\": \"by_product\",
                \"KeySchema\": [
                    {\"AttributeName\": \"product_suite#product_concept\", \"KeyType\": \"HASH\"},
                    {\"AttributeName\": \"last_updated#content_id\", \"KeyType\": \"RANGE\"}
                ],
                \"Projection\": {\"ProjectionType\": \"ALL\"},
                \"ProvisionedThroughput\": {\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}
            }
        ]" \
    --billing-mode PAY_PER_REQUEST \
    --region ${REGION} \
    --output text &> /dev/null || echo "  Table already exists or error occurred"

# Notifications Table
echo "Creating ${NOTIFICATIONS_TABLE}..."
aws dynamodb create-table \
    --table-name ${NOTIFICATIONS_TABLE} \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=created_at#notification_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
        AttributeName=created_at#notification_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region ${REGION} \
    --output text &> /dev/null || echo "  Table already exists or error occurred"

# Subscriptions Table
echo "Creating ${SUBSCRIPTIONS_TABLE}..."
aws dynamodb create-table \
    --table-name ${SUBSCRIPTIONS_TABLE} \
    --attribute-definitions \
        AttributeName=user_id,AttributeType=S \
        AttributeName=subscription_id,AttributeType=S \
    --key-schema \
        AttributeName=user_id,KeyType=HASH \
        AttributeName=subscription_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region ${REGION} \
    --output text &> /dev/null || echo "  Table already exists or error occurred"

# Events Table
echo "Creating ${EVENTS_TABLE}..."
aws dynamodb create-table \
    --table-name ${EVENTS_TABLE} \
    --attribute-definitions \
        AttributeName=date_bucket,AttributeType=S \
        AttributeName=ts#event_id,AttributeType=S \
    --key-schema \
        AttributeName=date_bucket,KeyType=HASH \
        AttributeName=ts#event_id,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --region ${REGION} \
    --output text &> /dev/null || echo "  Table already exists or error occurred"

echo -e "${GREEN}✅ DynamoDB tables created${NC}"
echo ""

# Create S3 Bucket
echo -e "${YELLOW}Creating S3 bucket...${NC}"
if aws s3 ls "s3://${BUCKET_NAME}" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "Creating ${BUCKET_NAME}..."
    aws s3 mb s3://${BUCKET_NAME} --region ${REGION}
    echo -e "${GREEN}✅ Bucket created${NC}"
else
    echo -e "${YELLOW}⚠️  Bucket already exists${NC}"
fi

# Enable versioning
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket ${BUCKET_NAME} \
    --versioning-configuration Status=Enabled \
    --region ${REGION}

# Set bucket encryption
echo "Setting bucket encryption..."
aws s3api put-bucket-encryption \
    --bucket ${BUCKET_NAME} \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }]
    }' \
    --region ${REGION} || echo "  Encryption may already be configured"

echo ""
echo -e "${GREEN}✅ AWS setup complete!${NC}"
echo ""
echo "Summary:"
echo "  Region: ${REGION}"
echo "  DynamoDB Tables:"
echo "    - ${CONTENT_TABLE}"
echo "    - ${NOTIFICATIONS_TABLE}"
echo "    - ${SUBSCRIPTIONS_TABLE}"
echo "    - ${EVENTS_TABLE}"
echo "  S3 Bucket: ${BUCKET_NAME}"
echo ""
echo "Next steps:"
echo "  1. Update apps/api/.env with:"
echo "     STORAGE_BACKEND=aws"
echo "     AWS_REGION=${REGION}"
echo "     ENABLEMENT_CONTENT_BUCKET=${BUCKET_NAME}"
echo "  2. Start the API server: npm run dev --workspace=apps/api"





