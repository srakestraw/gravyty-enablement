# Vertex AI Setup - Next Steps

## ✅ Completed

1. **Dependencies Installed**
   - `@google-cloud/aiplatform`: ^3.9.0
   - `google-auth-library`: ^9.0.0
   - Run: `cd apps/api && npm install` ✅

2. **Code Implementation**
   - ✅ Vertex AI credentials helper (`apps/api/src/ai/providers/vertexAiCredentials.ts`)
   - ✅ Updated Gemini provider with Imagen support (`apps/api/src/ai/providers/geminiProvider.ts`)
   - ✅ Infrastructure updated with SSM permissions (`infra/lib/base-stack.ts`)

3. **Documentation**
   - ✅ Setup guide: `docs/runbooks/vertex-ai-setup.md`
   - ✅ Implementation details: `docs/architecture/vertex-ai-implementation.md`
   - ✅ Setup script: `infra/scripts/setup-gcp-vertex-ai.sh`

## 🔧 Next Steps

### Step 1: Set Up GCP Service Account

1. **Create GCP Project** (if you don't have one)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable billing (required for Vertex AI)

2. **Enable Vertex AI API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Vertex AI API" and enable it

3. **Create Service Account**
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `enablement-portal-vertex-ai`
   - Grant role: **Vertex AI User** (`roles/aiplatform.user`)

4. **Create and Download JSON Key**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key" > JSON
   - Save the downloaded JSON file securely

### Step 2: Store Credentials in AWS SSM

**Option A: Use the Setup Script** (Recommended)

```bash
cd /Users/scott.rakestraws/Documents/Projects/enablement
./infra/scripts/setup-gcp-vertex-ai.sh --service-account-file /path/to/your/service-account-key.json
```

**Option B: Manual AWS CLI**

```bash
# Read the service account JSON
GCP_SA_JSON=$(cat /path/to/your/service-account-key.json)

# Store in SSM Parameter Store
aws ssm put-parameter \
  --name /enablement-portal/gcp/service-account-json \
  --value "$GCP_SA_JSON" \
  --type SecureString \
  --description "GCP Service Account JSON for Vertex AI Imagen" \
  --region us-east-1
```

### Step 3: Configure Lambda Environment Variables

GCP environment variables need to be set in your Lambda function. You have two options:

**Option A: Set via AWS Console** (After deployment)

1. Go to AWS Lambda Console
2. Find your API Lambda function
3. Go to Configuration > Environment variables
4. Add:
   - `GOOGLE_CLOUD_PROJECT`: Your GCP project ID
   - `GOOGLE_CLOUD_REGION`: `us-central1` (or your preferred region)

**Option B: Set via CDK** (Before deployment)

Add these to `infra/lib/base-stack.ts` in the Lambda environment section:

```typescript
environment: {
  // ... existing vars ...
  GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || '',
  GOOGLE_CLOUD_REGION: process.env.GOOGLE_CLOUD_REGION || 'us-central1',
},
```

Then set before deploying:
```bash
export GOOGLE_CLOUD_PROJECT="your-gcp-project-id"
export GOOGLE_CLOUD_REGION="us-central1"
npm run cdk:deploy
```

### Step 4: Build and Deploy

```bash
# Build API for Lambda
./infra/scripts/build-api-for-lambda.sh

# Deploy infrastructure
npm run cdk:deploy
```

### Step 5: Test

```bash
# Test image generation
cd apps/api
npm run test:ai
```

Or test via API endpoint:
```bash
API_URL=$(./infra/scripts/get-api-url.sh)
curl -X POST $API_URL/v1/lms/admin/ai/generate-image \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "A serene sunset over mountains", "provider": "gemini"}'
```

## 📋 Configuration Checklist

- [ ] GCP project created with billing enabled
- [ ] Vertex AI API enabled
- [ ] Service account created with `roles/aiplatform.user` role
- [ ] Service account JSON key downloaded
- [ ] JSON key stored in SSM Parameter Store (`/enablement-portal/gcp/service-account-json`)
- [ ] Lambda environment variables set:
  - [ ] `GOOGLE_CLOUD_PROJECT`
  - [ ] `GOOGLE_CLOUD_REGION`
- [ ] API built and deployed
- [ ] Image generation tested

## 🔍 Troubleshooting

### Error: "GCP service account credentials not configured"
- Verify SSM parameter exists: `aws ssm get-parameter --name /enablement-portal/gcp/service-account-json --with-decryption`
- Check Lambda IAM role has SSM permissions

### Error: "Failed to obtain access token"
- Verify service account JSON is valid
- Check service account has `roles/aiplatform.user` role
- Verify Vertex AI API is enabled

### Error: "GCP project ID not configured"
- Set `GOOGLE_CLOUD_PROJECT` environment variable in Lambda

## 📚 Documentation

- **Setup Guide**: `docs/runbooks/vertex-ai-setup.md`
- **Implementation Details**: `docs/architecture/vertex-ai-implementation.md`
- **AI Service Architecture**: `docs/architecture/ai-service.md`

## 🎯 Quick Reference

**SSM Parameter**: `/enablement-portal/gcp/service-account-json`

**Environment Variables**:
- `GOOGLE_CLOUD_PROJECT`: GCP project ID (required)
- `GOOGLE_CLOUD_REGION`: GCP region (default: `us-central1`)
- `GCP_SERVICE_ACCOUNT_PARAM`: SSM parameter path (default: `/enablement-portal/gcp/service-account-json`)

**Setup Script**: `./infra/scripts/setup-gcp-vertex-ai.sh`

