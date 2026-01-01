# Setup Vertex AI Using CLI

Quick guide to set up Vertex AI for Imagen image generation using command-line tools.

## Prerequisites

- AWS CLI configured (`aws configure`)
- GCP project with Vertex AI API enabled
- Service account JSON key file

## Quick Setup (3 Steps)

### Step 1: Create GCP Service Account (if you don't have one)

**Option A: Using gcloud CLI**

```bash
# Set your project
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# Create service account
gcloud iam service-accounts create enablement-portal-vertex-ai \
    --project="$GCP_PROJECT_ID" \
    --display-name="Enablement Portal Vertex AI"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:enablement-portal-vertex-ai@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create /tmp/gcp-sa-key.json \
    --iam-account="enablement-portal-vertex-ai@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
    --project="$GCP_PROJECT_ID"
```

**Option B: Using GCP Console**

1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select your project
3. Click "Create Service Account"
4. Name: `enablement-portal-vertex-ai`
5. Grant role: **Vertex AI User** (`roles/aiplatform.user`)
6. Create and download JSON key

### Step 2: Store Credentials in AWS SSM

**Using the quick script:**

```bash
./scripts/setup-vertex-ai-quick.sh \
    your-gcp-project-id \
    /path/to/service-account-key.json \
    us-central1
```

**Or manually with AWS CLI:**

```bash
# Set variables
GCP_PROJECT_ID="your-project-id"
SERVICE_ACCOUNT_FILE="/path/to/service-account-key.json"
AWS_REGION="us-east-1"

# Create SSM parameter
aws ssm put-parameter \
    --name /enablement-portal/gcp/service-account-json \
    --value "file://${SERVICE_ACCOUNT_FILE}" \
    --type SecureString \
    --description "GCP Service Account JSON for Vertex AI Imagen" \
    --region "$AWS_REGION"
```

### Step 3: Configure Lambda Environment Variables

**Option A: Update CDK Stack (Recommended)**

Edit `infra/lib/base-stack.ts` and add to Lambda environment:

```typescript
environment: {
  // ... existing vars ...
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || '',
  GOOGLE_CLOUD_REGION: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
},
```

Then deploy:

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
npm run cdk:deploy
```

**Option B: Update via AWS Console**

1. Go to AWS Lambda Console
2. Find your API Lambda function
3. Configuration > Environment variables
4. Add:
   - `GOOGLE_CLOUD_PROJECT` = your-project-id
   - `GOOGLE_CLOUD_REGION` = us-central1
5. Save

**Option C: Update via AWS CLI**

```bash
# Get Lambda function name
FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name EnablementPortalStack \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaFunctionName`].OutputValue' \
    --output text)

# Update environment variables
aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --environment "Variables={GOOGLE_CLOUD_PROJECT=your-project-id,GOOGLE_CLOUD_REGION=us-central1}" \
    --region us-east-1
```

## Verify Setup

Test the configuration:

```bash
# Test from API
cd apps/api
npm run test:ai
```

Or check Lambda logs:

```bash
# Get function name
FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name EnablementPortalStack \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiLambdaFunctionName`].OutputValue' \
    --output text)

# View logs
aws logs tail /aws/lambda/$FUNCTION_NAME --follow
```

## Troubleshooting

### Error: ParameterNotFound
- Run Step 2 again to create the SSM parameter

### Error: AccessDenied
- Check Lambda IAM role has `ssm:GetParameter` permission
- Verify parameter ARN is in `infra/lib/base-stack.ts`

### Error: GCP project ID not configured
- Set `GOOGLE_CLOUD_PROJECT` environment variable in Lambda

## Interactive Setup

For a guided interactive setup:

```bash
./scripts/setup-vertex-ai-cli.sh
```

This will walk you through all steps with prompts.

