# Vertex AI Setup for Imagen Image Generation

This guide explains how to configure Vertex AI authentication for Gemini/Imagen image generation in the enablement portal.

## Overview

Imagen (Google's image generation model) runs on Vertex AI, which requires:
- Google Cloud Project with billing enabled
- Vertex AI API enabled
- Service account with appropriate permissions
- Service account JSON key stored securely

## Prerequisites

1. **Google Cloud Project**
   - Create or select a GCP project
   - Ensure billing is enabled (required for generative models)

2. **Enable Vertex AI API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to "APIs & Services" > "Library"
   - Search for "Vertex AI API" and enable it

## Step 1: Create Service Account

1. **Navigate to Service Accounts**
   - Go to "IAM & Admin" > "Service Accounts" in Google Cloud Console

2. **Create Service Account**
   - Click "Create Service Account"
   - Provide a name (e.g., `enablement-portal-vertex-ai`)
   - Add description: "Service account for Vertex AI Imagen image generation"

3. **Grant Permissions**
   - Click "Continue"
   - Grant the role: **Vertex AI User** (`roles/aiplatform.user`)
   - Click "Continue" then "Done"

## Step 2: Create and Download JSON Key

1. **Create Key**
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select JSON format
   - Click "Create" (key will be downloaded automatically)

2. **Save the JSON Key Securely**
   - **DO NOT** commit this file to git
   - Store it securely (you'll upload it to AWS SSM Parameter Store)

## Step 3: Store Credentials in AWS SSM Parameter Store

### Using AWS CLI

```bash
# Read the service account JSON file
GCP_SA_JSON=$(cat /path/to/your/service-account-key.json)

# Store in SSM Parameter Store as SecureString
aws ssm put-parameter \
  --name /enablement-portal/gcp/service-account-json \
  --value "$GCP_SA_JSON" \
  --type SecureString \
  --description "GCP Service Account JSON for Vertex AI Imagen" \
  --region us-east-1
```

### Using AWS Console

1. Go to AWS Systems Manager > Parameter Store
2. Click "Create parameter"
3. Fill in:
   - **Name**: `/enablement-portal/gcp/service-account-json`
   - **Type**: SecureString
   - **Value**: Paste the entire contents of your service account JSON file
   - **Description**: "GCP Service Account JSON for Vertex AI Imagen"
4. Click "Create parameter"

## Step 4: Configure Environment Variables

### For Lambda (AWS)

Set these environment variables in your Lambda function (via CDK or AWS Console):

```bash
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_REGION=us-central1  # or your preferred region
GCP_SERVICE_ACCOUNT_PARAM=/enablement-portal/gcp/service-account-json
```

**Note**: The Lambda function will automatically:
1. Retrieve the service account JSON from SSM Parameter Store
2. Write it to `/tmp/gcp-sa.json`
3. Set `GOOGLE_APPLICATION_CREDENTIALS=/tmp/gcp-sa.json`
4. Use Application Default Credentials (ADC) for authentication

### For Local Development

Set these environment variables in your `.env` file or shell:

```bash
# Option 1: Use service account JSON file directly
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_REGION="us-central1"

# Option 2: Use gcloud ADC (Application Default Credentials)
# Run: gcloud auth application-default login
# Then set:
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
```

## Step 5: Verify Setup

### Test Image Generation

You can test the setup using the AI service test script:

```bash
cd apps/api
npm run test:ai
```

This will test both OpenAI and Gemini/Imagen image generation.

### Check Lambda Logs

If running on AWS Lambda, check CloudWatch Logs for:
- `[Gemini] Image generated via Vertex AI Imagen` - Success message
- Any authentication or configuration errors

## Troubleshooting

### Error: "GCP service account credentials not configured"

**Solution**: Ensure the SSM parameter exists and the Lambda has permissions to read it.

```bash
# Verify SSM parameter exists
aws ssm get-parameter \
  --name /enablement-portal/gcp/service-account-json \
  --with-decryption \
  --region us-east-1

# Verify Lambda IAM role has SSM permissions
# Check infra/lib/base-stack.ts includes the parameter ARN
```

### Error: "Failed to obtain access token for Vertex AI"

**Possible causes**:
1. Service account JSON is invalid or corrupted
2. Service account doesn't have `roles/aiplatform.user` role
3. Vertex AI API is not enabled in the GCP project

**Solution**:
1. Verify the JSON is valid: `cat service-account-key.json | jq .`
2. Check service account roles in GCP Console
3. Verify Vertex AI API is enabled

### Error: "GCP project ID not configured"

**Solution**: Set `GOOGLE_CLOUD_PROJECT` or `GCP_PROJECT_ID` environment variable.

### Error: "Vertex AI API error: PERMISSION_DENIED"

**Solution**: Ensure the service account has the `roles/aiplatform.user` role.

## Security Best Practices

1. **Never commit service account keys** to git repositories
2. **Use SSM Parameter Store** with SecureString encryption
3. **Rotate keys periodically** (create new key, update SSM, delete old key)
4. **Limit IAM permissions** - only grant `roles/aiplatform.user` (not admin roles)
5. **Monitor usage** in Google Cloud Console > Vertex AI > Usage

## Cost Considerations

- Vertex AI Imagen charges per image generated
- Check [Vertex AI pricing](https://cloud.google.com/vertex-ai/pricing) for current rates
- Monitor usage in GCP Console to avoid unexpected charges
- Consider setting up billing alerts

## Additional Resources

- [Vertex AI Imagen Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)


