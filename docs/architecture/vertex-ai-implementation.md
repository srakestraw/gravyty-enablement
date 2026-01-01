# Vertex AI Imagen Implementation

## Overview

This document describes the implementation of Vertex AI authentication and Imagen image generation for the Gemini provider in the enablement portal.

## Implementation Details

### Architecture

The implementation follows Option A from the user's requirements:
1. **Credentials Management**: GCP service account JSON stored in AWS SSM Parameter Store
2. **Application Default Credentials (ADC)**: Uses Google's ADC pattern for authentication
3. **Runtime Configuration**: Automatically sets up credentials at runtime for both local and Lambda environments

### Components

#### 1. Vertex AI Credentials Helper (`apps/api/src/ai/providers/vertexAiCredentials.ts`)

- **Purpose**: Manages GCP service account credentials for Vertex AI
- **Features**:
  - Retrieves service account JSON from SSM Parameter Store
  - Writes credentials to temporary file (`/tmp/gcp-sa.json` in Lambda, `os.tmpdir()` locally)
  - Sets `GOOGLE_APPLICATION_CREDENTIALS` environment variable for ADC
  - Caches credentials path to avoid repeated SSM calls
  - Supports both local development and AWS Lambda environments

#### 2. Updated Gemini Provider (`apps/api/src/ai/providers/geminiProvider.ts`)

- **Image Generation**: Implements `generateImage()` method using Vertex AI Imagen API
- **Authentication**: Uses `google-auth-library` with Application Default Credentials
- **API Endpoint**: Uses Vertex AI REST API endpoint for Imagen
- **Error Handling**: Comprehensive error handling for auth, API, and timeout errors

#### 3. Infrastructure Updates (`infra/lib/base-stack.ts`)

- **SSM Permissions**: Added IAM permission for Lambda to read GCP service account JSON parameter
- **Parameter Path**: `/enablement-portal/gcp/service-account-json`

### Dependencies Added

- `@google-cloud/aiplatform`: ^3.9.0 (Vertex AI SDK)
- `google-auth-library`: ^9.0.0 (Google Auth for ADC)

### Environment Variables

#### Required for Lambda:
- `GOOGLE_CLOUD_PROJECT` or `GCP_PROJECT_ID`: GCP project ID
- `GOOGLE_CLOUD_REGION` or `GCP_REGION`: GCP region (default: `us-central1`)
- `GCP_SERVICE_ACCOUNT_PARAM`: SSM parameter path (default: `/enablement-portal/gcp/service-account-json`)

#### For Local Development:
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON file (optional if using SSM)
- `GOOGLE_CLOUD_PROJECT`: GCP project ID
- `GOOGLE_CLOUD_REGION`: GCP region

### API Flow

1. **Request**: User requests image generation via Gemini provider
2. **Credential Setup**: `initializeVertexAiCredentials()` is called
   - Retrieves service account JSON from SSM (if not already set)
   - Writes to temporary file
   - Sets `GOOGLE_APPLICATION_CREDENTIALS` environment variable
3. **Authentication**: Google Auth library uses ADC to obtain access token
4. **API Call**: Makes REST API call to Vertex AI Imagen endpoint
5. **Response**: Returns base64-encoded image as data URL

### Security Considerations

1. **Credentials Storage**: Service account JSON stored in SSM Parameter Store as SecureString
2. **Temporary Files**: Credentials written to `/tmp` in Lambda (ephemeral)
3. **File Permissions**: Credentials file created with mode `0o600` (owner read/write only)
4. **IAM Permissions**: Lambda role has minimal SSM read permissions for specific parameter
5. **No Hardcoded Secrets**: All credentials retrieved at runtime from secure storage

### Error Handling

The implementation includes comprehensive error handling:

- **AIConfigError**: Configuration issues (missing credentials, invalid JSON)
- **AIAuthError**: Authentication failures (invalid credentials, missing permissions)
- **AIProviderError**: API errors (invalid requests, no predictions)
- **AITimeoutError**: Request timeouts

### Testing

Test image generation:

```bash
cd apps/api
npm run test:ai
```

This will test both OpenAI and Gemini/Imagen providers.

### Future Improvements

1. **Image Storage**: Currently returns data URLs. Consider uploading to S3 and returning URLs
2. **Endpoint Verification**: May need to adjust Imagen API endpoint based on actual API response
3. **Caching**: Consider caching generated images to reduce API calls
4. **Rate Limiting**: Add rate limiting for Vertex AI API calls
5. **Cost Monitoring**: Add CloudWatch metrics for Vertex AI usage

### Troubleshooting

See [Vertex AI Setup Guide](../runbooks/vertex-ai-setup.md) for detailed troubleshooting steps.

Common issues:
- Missing SSM parameter
- Invalid service account JSON
- Missing IAM permissions
- Vertex AI API not enabled
- Incorrect project/region configuration

