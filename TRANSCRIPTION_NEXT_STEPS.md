# AWS Transcribe Integration - Next Steps

## Prerequisites Check

1. **Verify Dependencies**
   ```bash
   # Check if @aws-sdk/client-transcribe is installed in API
   cd apps/api
   npm list @aws-sdk/client-transcribe
   
   # If not installed, add it:
   npm install @aws-sdk/client-transcribe
   ```

2. **Build Domain Package**
   ```bash
   cd packages/domain
   npm run build
   ```

3. **Build API for Lambda**
   ```bash
   cd apps/api
   npm run build:lambda
   ```

## Infrastructure Deployment

### 1. Find or Create SQS Queue for Brain Ingestion

The transcription worker needs the `BRAIN_INGEST_QUEUE_URL` environment variable. Check if this queue already exists:

```bash
# List SQS queues
aws sqs list-queues --query 'QueueUrls[?contains(@, `brain-ingest`)]'

# If it exists, get the URL:
aws sqs get-queue-url --queue-name brain-ingest --query 'QueueUrl' --output text
```

**If the queue doesn't exist**, you have two options:

**Option A: Create it manually** (if brain-ingest-worker is deployed separately)
```bash
aws sqs create-queue --queue-name brain-ingest
```

**Option B: Update CDK stack** to create the queue (recommended if managing everything via CDK)

### 2. Deploy CDK Stack

```bash
cd infra

# Set the SQS queue URL if it exists (optional - can be set later)
export BRAIN_INGEST_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/brain-ingest"

# Synthesize to check for errors
npm run synth

# Deploy
npm run deploy
```

**Note**: If `BRAIN_INGEST_QUEUE_URL` is not set, transcription will still work but transcripts won't be automatically ingested into OpenSearch. You can manually trigger ingestion later.

### 3. Update API Lambda Environment Variables

After deployment, ensure the API Lambda has the new table name:

```bash
# The LMS_TRANSCRIPTS_TABLE should be automatically set, but verify:
aws lambda get-function-configuration \
  --function-name EnablementPortalStack-ApiLambda-XXXXX \
  --query 'Environment.Variables.LMS_TRANSCRIPTS_TABLE'
```

## Testing

### 1. Test Transcription Endpoint

```bash
# Upload a video first (use existing presign endpoint)
# Then start transcription:
curl -X POST https://YOUR_API_URL/v1/lms/admin/media/MEDIA_ID/transcribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Monitor Transcription Job

```bash
# Check CloudWatch logs for transcription worker
aws logs tail /aws/lambda/EnablementPortalStack-TranscriptionWorker-XXXXX --follow

# Check EventBridge rule
aws events list-rules --name-prefix TranscribeJobCompletion
```

### 3. Verify Transcript Storage

```bash
# Check DynamoDB for transcript record
aws dynamodb get-item \
  --table-name lms_transcripts \
  --key '{"transcript_id": {"S": "transcript_XXXXX"}}'

# Check lesson was updated
aws dynamodb get-item \
  --table-name lms_lessons \
  --key '{"lesson_id": {"S": "LESSON_ID"}}' \
  --query 'Item.content.M.transcript.S'
```

### 4. Verify RAG Ingestion (if queue is configured)

```bash
# Check SQS queue for messages
aws sqs receive-message \
  --queue-url $BRAIN_INGEST_QUEUE_URL \
  --max-number-of-messages 10

# Check brain-ingest-worker logs
aws logs tail /aws/lambda/brain-ingest-worker --follow
```

## Troubleshooting

### Transcription Job Not Starting

1. **Check IAM Permissions**
   ```bash
   # Verify API Lambda role has Transcribe permissions
   aws iam get-role-policy \
     --role-name EnablementPortalStack-LambdaExecutionRole-XXXXX \
     --policy-name InlinePolicy
   ```

2. **Check Media Record**
   ```bash
   # Verify media has s3_bucket and s3_key
   aws dynamodb get-item \
     --table-name lms_certificates \
     --key '{"PK": {"S": "MEDIA"}, "SK": {"S": "MEDIA_ID"}}'
   ```

### EventBridge Not Triggering

1. **Verify EventBridge Rule**
   ```bash
   aws events describe-rule --name EnablementPortalStack-TranscribeJobCompletionRule-XXXXX
   ```

2. **Check Rule Targets**
   ```bash
   aws events list-targets-by-rule \
     --rule EnablementPortalStack-TranscribeJobCompletionRule-XXXXX
   ```

### Transcript Not Appearing in Lesson

1. **Check Transcription Worker Logs**
   - Look for errors in CloudWatch
   - Verify lesson_id exists in media record

2. **Manual Update**
   ```bash
   # If needed, manually update lesson transcript
   aws dynamodb update-item \
     --table-name lms_lessons \
     --key '{"lesson_id": {"S": "LESSON_ID"}}' \
     --update-expression "SET content.transcript = :t" \
     --expression-attribute-values '{":t": {"S": "Transcript text here"}}'
   ```

## Configuration

### Optional: Auto-Start Transcription After Upload

To automatically start transcription when a video is uploaded, modify the client-side upload flow to call the transcription endpoint after successful upload:

```typescript
// In your media upload component
async function handleVideoUploadComplete(mediaId: string) {
  // After video upload completes
  await fetch(`/v1/lms/admin/media/${mediaId}/transcribe`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  });
}
```

## Cost Considerations

- **Transcribe**: ~$0.024 per minute of video
- **Storage**: Transcript JSON files stored in S3 (minimal cost)
- **OpenSearch**: Embedding generation and indexing (if RAG is enabled)

Monitor costs via AWS Cost Explorer with filters for:
- `AWS Transcribe`
- `Lambda` (transcription worker)
- `DynamoDB` (transcripts table)

## Next Enhancements (Optional)

1. **Add UI Status Display**
   - Show transcription status badge in media library
   - Display transcript preview when available
   - Add retry button for failed transcriptions

2. **Add Transcript Editing**
   - Allow admins to edit transcripts after generation
   - Store edited versions separately

3. **Add Caption Generation**
   - Generate VTT/SRT files from transcripts
   - Store alongside video files

4. **Add Language Detection**
   - Auto-detect language instead of fixed en-US
   - Support multiple languages

