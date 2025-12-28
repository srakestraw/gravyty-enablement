# Data Model

## Overview

The enablement portal uses DynamoDB for persistence. Tables are designed with access patterns in mind, using partition keys (PK), sort keys (SK), and global secondary indexes (GSIs).

## Tables

### 1. content_registry

**Purpose**: Store enablement content items

**Primary Key**:
- **PK**: `content_id` (String)

**Attributes**:
- `content_id` (String, PK)
- `status` (String): Draft|Approved|Deprecated|Expired
- `title` (String)
- `summary` (String)
- `product_suite` (String, optional)
- `product_concept` (String, optional)
- `audience_role` (String, optional)
- `lifecycle_stage` (String, optional)
- `owner_user_id` (String)
- `tags` (List<String>)
- `version` (String)
- `last_updated` (String, ISO8601)
- `review_due_date` (String, ISO8601, optional)
- `effective_date` (String, ISO8601, optional)
- `expiry_date` (String, ISO8601, optional)
- `expiry_policy` (String, optional): soft_expire|hard_expire
- `s3_uri` (String, optional): S3 URI for content body
- `file_name` (String, optional): Original filename of attached file
- `content_type` (String, optional): MIME type (e.g., `application/pdf`)
- `size_bytes` (Number, optional): File size in bytes
- `s3_bucket` (String, optional): S3 bucket name
- `s3_key` (String, optional): S3 object key (path)
- `uploaded_at` (String, ISO8601, optional): When file was uploaded

**Global Secondary Indexes**:

#### GSI1: by_status_updated
- **GSI1PK**: `status` (String)
- **GSI1SK**: `status#last_updated#content_id` (String)
- **Purpose**: Query content by status, sorted by last_updated descending
- **Access Pattern**: List all Approved content, sorted by most recent

#### GSI2: by_product
- **GSI2PK**: `product_suite#product_concept` (String)
- **GSI2SK**: `last_updated#content_id` (String)
- **Purpose**: Query content by product suite/concept combination
- **Access Pattern**: List content for a specific product suite and concept

**Access Patterns**:
1. Get content by ID: `GetItem` on PK
2. List content by status: Query GSI1 with `status = X`, sorted by last_updated DESC
3. List content by product: Query GSI2 with `product_suite#product_concept = X`, sorted by last_updated DESC
4. Create/Update/Delete: Direct operations on PK

**Notes**:
- GSI keys are stored as attributes in the item for efficient querying
- Pagination uses `LastEvaluatedKey` from DynamoDB responses
- Search/filter by query string is done client-side after fetching (consider OpenSearch in Phase 4)

### 2. notifications

**Purpose**: Store user notifications

**Primary Key**:
- **PK**: `user_id` (String)
- **SK**: `created_at#notification_id` (String)

**Attributes**:
- `user_id` (String, PK)
- `created_at#notification_id` (String, SK): Format: `{ISO8601}#{notification_id}`
- `notification_id` (String)
- `type` (String): info|success|warning|error
- `title` (String)
- `message` (String)
- `read` (Boolean)
- `created_at` (String, ISO8601)
- `content_id` (String, optional)

**Access Patterns**:
1. List notifications for user: Query PK with `user_id = X`, sorted by created_at DESC
2. Get notification: Query PK with `user_id = X` and filter by notification_id
3. Mark as read: Update item with `read = true`
4. Create notification: PutItem with user_id and created_at#notification_id

**Notes**:
- Sort key format allows efficient querying by user with chronological ordering
- To get a specific notification, query user_id and filter by notification_id (or add GSI if needed)

### 3. subscriptions

**Purpose**: Store user content subscriptions/filters

**Primary Key**:
- **PK**: `user_id` (String)
- **SK**: `subscription_id` (String)

**Attributes**:
- `user_id` (String, PK)
- `subscription_id` (String, SK)
- `product_suite` (String, optional)
- `product_concept` (String, optional)
- `tags` (List<String>, optional)
- `created_at` (String, ISO8601)

**Access Patterns**:
1. List subscriptions for user: Query PK with `user_id = X`
2. Get subscription: GetItem with user_id and subscription_id
3. Create subscription: PutItem with user_id and subscription_id
4. Delete subscription: DeleteItem with user_id and subscription_id

**Notes**:
- Simple key structure for user-scoped subscriptions
- Filters stored as attributes for flexible querying

### 4. events

**Purpose**: Store activity events for analytics

**Primary Key**:
- **PK**: `date_bucket` (String): Format: YYYY-MM-DD
- **SK**: `ts#event_id` (String): Format: `{ISO8601}#{event_id}`

**Attributes**:
- `date_bucket` (String, PK)
- `ts#event_id` (String, SK)
- `event_id` (String)
- `event_name` (String)
- `user_id` (String, optional)
- `content_id` (String, optional)
- `metadata` (Map, optional)
- `timestamp` (String, ISO8601)

**Access Patterns**:
1. Store event: PutItem with date_bucket and ts#event_id
2. List events for date: Query PK with `date_bucket = YYYY-MM-DD`, sorted by timestamp DESC
3. Query events by user: Scan with filter (consider GSI if needed)

**Notes**:
- Date bucket pattern allows efficient querying by date
- Events are append-only (no updates/deletes)
- Consider TTL attribute for automatic cleanup of old events
- For production analytics, consider streaming to Firehose + Athena

## Pagination

All list endpoints support pagination using DynamoDB's `LastEvaluatedKey`:
- Request: `cursor` parameter (base64-encoded LastEvaluatedKey)
- Response: `next_cursor` field (base64-encoded LastEvaluatedKey)

## Future Considerations

- **OpenSearch**: For full-text search across content (Phase 4)
- **S3**: Content body storage (Phase 3B)
- **TTL**: Automatic cleanup of expired events
- **GSI for notifications**: Add GSI with notification_id as PK for direct lookups
- **Composite filters**: Consider GSI for complex filter combinations

