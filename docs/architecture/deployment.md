# Deployment Architecture

## Overview

The enablement portal is deployed to AWS using:
- **API**: AWS Lambda + API Gateway HTTP API
- **Web App**: AWS Amplify (future)
- **Storage**: DynamoDB + S3
- **Authentication**: Cognito User Pool

## API Deployment

### Architecture

```
Internet → API Gateway HTTP API → Lambda Function → DynamoDB/S3
```

### Components

1. **API Gateway HTTP API (v2)**
   - Routes: `/v1/*` → Lambda
   - CORS configured via `WEB_ALLOWED_ORIGINS` environment variable
   - Defaults to localhost origins for development
   - No authentication at gateway level (handled in Lambda)

2. **Lambda Function**
   - Runtime: Node.js 20.x
   - Handler: `lambda.handler`
   - Timeout: 30 seconds
   - Memory: 512 MB
   - Code: Bundled from `apps/api/dist-lambda`

3. **IAM Role**
   - DynamoDB: Read/write on all tables (except Scan on content_registry)
   - S3: Read/write on `content/*` prefix only
   - CloudWatch Logs: Write permissions

### Build Process

1. **Build API for Lambda**:
   ```bash
   ./infra/scripts/build-api-for-lambda.sh
   ```

   This script:
   - Builds domain package
   - Compiles TypeScript
   - Bundles code and dependencies to `apps/api/dist-lambda`

2. **Deploy Stack**:
   ```bash
   npm run cdk:deploy
   ```

   CDK will:
   - Package Lambda code from `dist-lambda`
   - Create/update Lambda function
   - Create/update API Gateway
   - Set environment variables
   - Grant IAM permissions

### Environment Variables

Lambda function receives these environment variables:

```bash
AWS_REGION=us-east-1
STORAGE_BACKEND=aws
DDB_TABLE_CONTENT=content_registry
DDB_TABLE_NOTIFICATIONS=notifications
DDB_TABLE_SUBSCRIPTIONS=subscriptions
DDB_TABLE_EVENTS=events
ENABLEMENT_CONTENT_BUCKET=<bucket-name>
PRESIGNED_UPLOAD_EXPIRY_SECONDS=300
PRESIGNED_DOWNLOAD_EXPIRY_SECONDS=3600
COGNITO_USER_POOL_ID=<user-pool-id>
COGNITO_USER_POOL_CLIENT_ID=<client-id>
```

### IAM Permissions

Lambda execution role has:

**DynamoDB**:
- `dynamodb:PutItem`, `GetItem`, `UpdateItem`, `DeleteItem`, `Query`, `BatchGetItem`, `BatchWriteItem`
- On tables: `content_registry`, `notifications`, `subscriptions`, `events`
- Explicitly denied: `dynamodb:Scan` on `content_registry`

**S3**:
- `s3:GetObject`, `s3:PutObject` on `content/*` prefix only
- Scoped to prevent access to other prefixes

**CloudWatch Logs**:
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`

## Deployment Steps

### 1. Build API

```bash
./infra/scripts/build-api-for-lambda.sh
```

### 2. Deploy Infrastructure

```bash
# Optional: Configure CORS allowed origins for production
# Set WEB_ALLOWED_ORIGINS as comma-separated list of origins
# Example: export WEB_ALLOWED_ORIGINS="https://main.xxxxx.amplifyapp.com,https://enable.gravytylabs.com"
# If not set, defaults to localhost origins for development
npm run cdk:deploy
```

**CORS Configuration:**
- Set `WEB_ALLOWED_ORIGINS` environment variable before deploying
- Format: comma-separated list (e.g., `"https://app1.com,https://app2.com"`)
- Updates both API Gateway and S3 bucket CORS settings
- Automatically adds origins to Cognito callback URLs
- Defaults to `http://localhost:5173,http://localhost:3000` if not set

### 3. Get API URL

```bash
./infra/scripts/get-api-url.sh
```

Or from CDK outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### 4. Update Web App Configuration

Set `VITE_API_BASE_URL` in `apps/web/.env.local`:

```bash
VITE_API_BASE_URL=https://<api-gateway-url>
```

Or for Amplify deployment, set as environment variable in Amplify console.

## Testing Deployed API

### Health Check

```bash
API_URL=$(./infra/scripts/get-api-url.sh)
curl $API_URL/health
```

### List Content

```bash
curl $API_URL/v1/content \
  -H "x-dev-role: Viewer"
```

### Create Content

```bash
curl -X POST $API_URL/v1/content \
  -H "Content-Type: application/json" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: test-user" \
  -d '{
    "title": "Test Document",
    "summary": "Test",
    "status": "Draft",
    "owner_user_id": "test-user"
  }'
```

### Presigned Upload

```bash
# Get presigned URL
curl -X POST $API_URL/v1/uploads/presign \
  -H "Content-Type: application/json" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: test-user" \
  -d '{
    "content_id": "<content-id>",
    "filename": "test.pdf",
    "content_type": "application/pdf"
  }'
```

### Download

```bash
curl $API_URL/v1/content/<id>/download \
  -H "x-dev-role: Viewer"
```

## Monitoring

### CloudWatch Logs

Lambda logs are automatically sent to CloudWatch:

```bash
# View logs
aws logs tail /aws/lambda/<function-name> --follow
```

### API Gateway Metrics

View API Gateway metrics in CloudWatch:
- Request count
- Latency
- Error rate
- 4xx/5xx errors

## Cost Considerations

### Lambda

- **Free Tier**: 1M requests/month, 400K GB-seconds/month
- **Pricing**: $0.20 per 1M requests + $0.0000166667 per GB-second

### API Gateway

- **Free Tier**: 1M requests/month
- **Pricing**: $1.00 per 1M requests

### Estimated Monthly Cost (Low Traffic)

- 10K requests/month: ~$0.01
- 100K requests/month: ~$0.10
- 1M requests/month: ~$1.20

## Scaling

- **Lambda**: Auto-scales based on concurrent requests (up to account limit)
- **API Gateway**: Handles millions of requests
- **DynamoDB**: PAY_PER_REQUEST scales automatically
- **S3**: Unlimited scale

## Security

1. **IAM Role**: Lambda uses execution role (no access keys)
2. **VPC**: Lambda runs in default VPC (can be configured for VPC)
3. **CORS**: Configured at API Gateway level
4. **Rate Limiting**: Handled in Lambda (express-rate-limit)
5. **JWT Verification**: Handled in Lambda middleware

## Troubleshooting

### Lambda Timeout

- Increase timeout in CDK stack
- Check CloudWatch logs for slow operations
- Optimize DynamoDB queries

### CORS Errors

- Verify CORS origins in API Gateway (check `WEB_ALLOWED_ORIGINS` was set during deploy)
- Ensure Amplify domain is included in `WEB_ALLOWED_ORIGINS` before deploying
- Check preflight request headers
- Ensure `Access-Control-Allow-Origin` header is present
- Verify S3 bucket CORS config includes the same origins

### Permission Errors

- Verify Lambda execution role has correct permissions
- Check CloudWatch logs for specific error messages
- Verify table/bucket names match environment variables

### Cold Start

- First request may take 1-3 seconds
- Subsequent requests are faster (<100ms)
- Consider provisioned concurrency for production

## Related Documentation

- [Local Development Runbook](../runbooks/local-dev.md)
- [Authentication Architecture](./auth.md)
- [Data Model](./data-model.md)
- [API Contract](./api-contract.md)



