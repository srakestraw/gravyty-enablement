# @gravyty/jobs

Shared job logic for Lambda functions (expiry, etc.)

## Overview

This package contains job logic that can be used by both:
- API server (`apps/api`) - for manual/on-demand job execution
- Lambda functions (`infra/lambda`) - for scheduled/event-driven execution

## Structure

- `src/expireContentJob.ts` - Content expiry job logic
- `src/subscriptionMatching.ts` - Subscription matching rules
- `src/notifications.ts` - Notification creation with idempotency
- `src/dynamoClient.ts` - DynamoDB client setup

## Dependencies

- `@gravyty/domain` - Shared domain types
- `@aws-sdk/client-dynamodb` - AWS SDK v3 DynamoDB client
- `@aws-sdk/lib-dynamodb` - AWS SDK v3 DynamoDB Document Client

## Building

```bash
npm run build
```

## Testing

Run unit tests:
```bash
npm test
```

Or manually:
```bash
node src/expireContentJob.test.ts
```

## Usage in Lambda

The Lambda handler imports from this package:

```typescript
import { runExpiryJob } from '@gravyty/jobs';

export async function handler(event: any) {
  const result = await runExpiryJob();
  return { statusCode: 200, body: JSON.stringify({ result }) };
}
```

CDK's `NodejsFunction` automatically bundles this package and its dependencies when deploying.

## Usage in API

The API can also use this package:

```typescript
import { runExpiryJob } from '@gravyty/jobs';

// Run job manually
const result = await runExpiryJob();
```

## Environment Variables

Required environment variables:
- `AWS_REGION` - AWS region (defaults to us-east-1)
- `DDB_TABLE_CONTENT` - Content registry table name
- `DDB_TABLE_NOTIFICATIONS` - Notifications table name
- `DDB_TABLE_SUBSCRIPTIONS` - Subscriptions table name
- `DDB_TABLE_EVENTS` - Events table name

