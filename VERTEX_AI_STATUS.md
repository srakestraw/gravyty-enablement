# Vertex AI Setup Status

## ✅ Completed

1. **GCP Service Account Created**
   - Service account: `enablement-portal-vertex-ai@gravyty-enablement.iam.gserviceaccount.com`
   - Role: `roles/aiplatform.user` (Vertex AI User)
   - JSON key downloaded to `/tmp/gcp-sa-key.json`

2. **AWS SSM Parameter Created**
   - Parameter: `/enablement-portal/gcp/service-account-json`
   - Type: SecureString
   - Status: ✅ Verified and accessible

3. **Lambda Environment Variables Set**
   - `GOOGLE_CLOUD_PROJECT=gravyty-enablement`
   - `GOOGLE_CLOUD_REGION=us-central1`
   - Status: ✅ Configured

4. **Vertex AI API Enabled**
   - API: `aiplatform.googleapis.com`
   - Status: ✅ Enabled

## ⚠️ Current Issue

**Authentication Error**: The API endpoint is rejecting the OAuth token with "invalid authentication credentials" error.

**Possible Causes**:
1. Incorrect API endpoint format for Imagen
2. Wrong model identifier (`imagen-3` vs `imagen-3@001` vs `imagegeneration-006`)
3. Incorrect request body format
4. Service account needs additional permissions

## 🔍 Next Steps to Debug

1. **Verify Model Name**: Check the correct Imagen model identifier
   ```bash
   gcloud ai models list --region=us-central1 --project=gravyty-enablement
   ```

2. **Test with gcloud CLI**: Verify the endpoint works with gcloud
   ```bash
   gcloud ai models predict imagen-3@001 \
     --region=us-central1 \
     --project=gravyty-enablement \
     --instances='{"prompt":"test"}'
   ```

3. **Check API Documentation**: Verify the correct REST API endpoint format for Imagen 3

4. **Alternative**: Use Vertex AI SDK instead of REST API
   - The `@google-cloud/aiplatform` package is already installed
   - Consider using `PredictionServiceClient` from the SDK

## 📝 Current Implementation

- **Endpoint**: `https://us-central1-aiplatform.googleapis.com/v1/projects/gravyty-enablement/locations/us-central1/publishers/google/models/imagen-3@001:predict`
- **Method**: POST
- **Auth**: OAuth Bearer token via GoogleAuth library
- **Request Format**: `{ instances: [{ prompt: string }], parameters: { sampleCount: 1 } }`

## ✅ What's Working

- ✅ Credentials retrieval from SSM
- ✅ Access token generation
- ✅ Environment variable configuration
- ✅ Error handling and logging

## 🔧 Temporary Workaround

Until the Imagen API endpoint is fixed, users can:
- Use OpenAI (DALL-E 3) for image generation
- Select "OpenAI (DALL-E 3)" as the provider in the UI

## 📚 References

- Setup Guide: `docs/runbooks/vertex-ai-setup.md`
- Troubleshooting: `docs/runbooks/troubleshooting-vertex-ai.md`
- Implementation: `docs/architecture/vertex-ai-implementation.md`


