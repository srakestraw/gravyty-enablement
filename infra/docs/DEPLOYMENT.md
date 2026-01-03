# Deployment Guide

## Quick Start

### First Time Deployment

1. **Install dependencies**:
   ```bash
   cd infra
   npm install
   ```

2. **Bootstrap CDK** (one-time per AWS account/region):
   ```bash
   npx cdk bootstrap
   ```

3. **Build API for Lambda**:
   ```bash
   cd ../apps/api
   npm run build:lambda
   ```

4. **Import existing resources** (if needed):
   ```bash
   cd ../infra
   ./scripts/import-transcripts-table.sh
   ```

5. **Deploy stack**:
   ```bash
   npx cdk deploy --require-approval never
   ```

### Subsequent Deployments

```bash
cd infra
npm run deploy
```

## Importing Existing Resources

If you have DynamoDB tables or other resources that were created outside of CloudFormation, you may need to import them.

### Import lms_transcripts Table

The `lms_transcripts` table may need to be imported if it was created in a previous deployment:

```bash
./scripts/import-transcripts-table.sh
```

Or manually:

```bash
# Create import mapping
cat > /tmp/import-map.json << EOF
{
  "LmsTranscriptsF89DDEE3": {
    "TableName": "lms_transcripts"
  }
}
EOF

# Import
npx cdk import --resource-mapping-file /tmp/import-map.json EnablementPortalStack
```

See [import-lms-transcripts-table.md](./import-lms-transcripts-table.md) for detailed instructions.

## Stack Architecture

The stack uses nested stacks to avoid circular dependencies:

- **Main Stack**: DynamoDB tables, S3 buckets, Transcription Worker Lambda
- **BaseStack** (nested): Cognito resources, API Lambda function
- **ApiStack** (nested): HTTP API Gateway, Lambda integration

See [circular-dependency-fix-summary.md](./circular-dependency-fix-summary.md) for details.

## Troubleshooting

### Circular Dependency Errors

If you see circular dependency errors, ensure you're using the nested stack architecture. The circular dependency was fixed by:
- Separating Cognito/Lambda into BaseStack
- Separating API Gateway into ApiStack
- Creating Lambda permissions in the main stack after nested stacks

### Resource Already Exists

If you see "Resource already exists" errors:
1. Check if the resource is already in CloudFormation
2. Import it if it exists outside CloudFormation
3. Or delete and recreate if data loss is acceptable

### Lambda Code Not Found

If you see warnings about Lambda code not found:
```bash
cd apps/api
npm run build:lambda
```

This creates the `dist-lambda` directory that CDK expects.

## Environment Variables

Set these before deployment if needed:

- `WEB_ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `BRAIN_INGEST_QUEUE_URL`: SQS queue URL for RAG ingestion (optional)
- `CDK_DEFAULT_ACCOUNT`: AWS account ID
- `CDK_DEFAULT_REGION`: AWS region (defaults to us-east-1)

## Verification

After deployment, verify resources:

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name EnablementPortalStack

# Check API Gateway URL
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text

# Test health endpoint
API_URL=$(aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)
curl $API_URL/health
```


