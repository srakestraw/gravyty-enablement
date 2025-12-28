# Enablement Portal Infrastructure (CDK)

This directory contains AWS CDK infrastructure code for the Gravyty Enablement Portal.

## Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

### 1. Install Dependencies

```bash
cd infra
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
cdk bootstrap
```

This creates the CDK bootstrap stack in your AWS account (one-time setup).

### 3. Deploy Stack

```bash
# Synthesize CloudFormation template
cdk synth

# Deploy stack
cdk deploy
```

The stack will create:
- **4 DynamoDB tables**: `content_registry`, `notifications`, `subscriptions`, `events`
- **GSIs on content_registry**: `by_status_updated`, `by_product`
- **S3 bucket** for content storage (with CORS, encryption, versioning)
- **CloudFormation outputs** with all resource names

### 4. Update API Environment

**Option 1: Automatic (Recommended)**

```bash
# Automatically update apps/api/.env with all resource names
./scripts/update-api-env-from-cdk.sh
```

This script fetches all table names and bucket name from CDK outputs and updates the API `.env` file.

**Option 2: Manual**

Copy `apps/api/.env.example` to `apps/api/.env` and update with resource names:

```bash
cp ../../apps/api/.env.example ../../apps/api/.env
# Edit .env and set:
# STORAGE_BACKEND=aws
# AWS_REGION=us-east-1
# DDB_TABLE_CONTENT=content_registry
# DDB_TABLE_NOTIFICATIONS=notifications
# DDB_TABLE_SUBSCRIPTIONS=subscriptions
# DDB_TABLE_EVENTS=events
# ENABLEMENT_CONTENT_BUCKET=<bucket-name-from-output>
```

Get resource names from outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name EnablementPortalStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Stack Components

### DynamoDB Tables

1. **content_registry**
   - **PK**: `content_id`
   - **GSIs**:
     - `by_status_updated`: PK=`status`, SK=`status#last_updated`
     - `by_product`: PK=`product_suite#product_concept`, SK=`last_updated#content_id`
   - **Billing**: PAY_PER_REQUEST
   - **PITR**: Enabled

2. **notifications**
   - **PK**: `user_id`, **SK**: `created_at#notification_id`
   - **Billing**: PAY_PER_REQUEST
   - **PITR**: Enabled

3. **subscriptions**
   - **PK**: `user_id`, **SK**: `subscription_id`
   - **Billing**: PAY_PER_REQUEST
   - **PITR**: Enabled

4. **events**
   - **PK**: `date_bucket`, **SK**: `ts#event_id`
   - **Billing**: PAY_PER_REQUEST
   - **PITR**: Enabled
   - **TTL**: Optional (attribute: `ttl`)

All tables use `RETAIN` removal policy (kept on stack deletion).

### S3 Bucket (`ContentBucket`)

- **Private**: Block public access enabled
- **Encryption**: S3-managed encryption (SSE-S3)
- **Versioning**: Enabled
- **CORS**: Configured for:
  - Origins: `http://localhost:5173`, `http://localhost:3000`
  - Methods: PUT, GET, HEAD
  - Headers: Content-Type, x-amz-*, Authorization, etc.
- **Lifecycle**: Optional rules (disabled by default)
  - Archive old versions after 90 days
  - Transition to Glacier after 1 year

### Outputs

- `ContentBucketName`: S3 bucket name
- `ContentBucketArn`: S3 bucket ARN
- `ContentBucketDomainName`: S3 bucket domain name
- `ContentTableName`: DynamoDB table name for content
- `NotificationsTableName`: DynamoDB table name for notifications
- `SubscriptionsTableName`: DynamoDB table name for subscriptions
- `EventsTableName`: DynamoDB table name for events

## Useful Commands

```bash
# Synthesize CloudFormation template
npm run synth

# Deploy stack
npm run deploy

# View differences
npm run diff

# Destroy stack (careful!)
cdk destroy
```

## Environment Variables

Set these before deploying:

- `CDK_DEFAULT_ACCOUNT`: AWS account ID (auto-detected)
- `CDK_DEFAULT_REGION`: AWS region (defaults to `us-east-1`)

## Updating CORS Origins

To add Amplify domain or other origins, edit `infra/lib/enablement-portal-stack.ts`:

```typescript
allowedOrigins: [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://*.amplifyapp.com', // Add your Amplify domain
],
```

Then redeploy:

```bash
cdk deploy
```

## Troubleshooting

**"CDK bootstrap required"**
```bash
cdk bootstrap
```

**"Bucket name already exists"**
- CDK auto-generates unique bucket names
- If you need a specific name, set it in the stack (must be globally unique)

**"CORS not working"**
- Verify origins match exactly (including protocol and port)
- Check browser console for CORS errors
- Ensure preflight requests include required headers

