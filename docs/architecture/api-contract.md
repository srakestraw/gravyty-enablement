# API Contract

## Base URL

- **Local Development**: `http://localhost:4000`
- **Production**: TBD (API Gateway endpoint)

## API Versioning

All endpoints are versioned under `/v1`.

## Request/Response Format

### Success Response

```json
{
  "data": <response_data>,
  "request_id": "req_1234567890_abc123"
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  },
  "request_id": "req_1234567890_abc123"
}
```

### Request Headers

- `Content-Type: application/json` (for POST/PUT requests)
- `x-request-id`: Optional request ID (auto-generated if not provided)
- `x-dev-role`: Development role header (Viewer|Contributor|Approver|Admin)
  - **TODO**: Replace with Cognito JWT `Authorization: Bearer <token>` in production
- `x-dev-user-id`: Development user ID header
  - **TODO**: Extract from Cognito JWT in production

## Endpoints

### Content

#### GET /v1/content

List content items with optional filters.

**Query Parameters**:
- `query` (string, optional): Search query
- `product_suite` (string, optional): Filter by product suite
- `product_concept` (string, optional): Filter by product concept
- `status` (string, optional): Filter by status (Draft|Approved|Deprecated|Expired)
- `limit` (number, optional): Page size (default: 50)
- `cursor` (string, optional): Pagination cursor

**Response**:
```json
{
  "data": {
    "items": [ContentItem],
    "next_cursor": "string" // Optional, present if more results
  },
  "request_id": "req_..."
}
```

#### GET /v1/content/:id

Get single content item by ID.

**Response**:
```json
{
  "data": ContentItem,
  "request_id": "req_..."
}
```

#### POST /v1/content

Create new content item.

**Requires**: Contributor+ role

**Request Body**: ContentItem (without id, last_updated, owner - auto-generated)

**Response**: Created ContentItem

#### PUT /v1/content/:id

Update content item.

**Requires**: Contributor+ role

**Request Body**: Partial ContentItem (id cannot be changed)

**Response**: Updated ContentItem

### Lifecycle

#### POST /v1/content/:id/approve

Approve content item (changes status to Approved).

**Requires**: Approver+ role

**Response**: Updated ContentItem

#### POST /v1/content/:id/deprecate

Deprecate content item (changes status to Deprecated).

**Requires**: Approver+ role

**Response**: Updated ContentItem

#### POST /v1/content/:id/expire

Expire content item (changes status to Expired).

**Requires**: Approver+ role

**Response**: Updated ContentItem

### Assistant

#### POST /v1/assistant/query

Query the AI assistant.

**Request Body**:
```json
{
  "query": "string",
  "context": {} // Optional
}
```

**Response**:
```json
{
  "data": {
    "refused": true, // Currently always true (stub)
    "answer": "Assistant not enabled yet",
    "citations": []
  },
  "request_id": "req_..."
}
```

#### POST /v1/assistant/feedback

Submit feedback for assistant response.

**Request Body**:
```json
{
  "query_id": "string",
  "helpful": boolean,
  "feedback_text": "string" // Optional
}
```

**Response**:
```json
{
  "data": {
    "received": true
  },
  "request_id": "req_..."
}
```

### Notifications

#### GET /v1/notifications

List notifications for current user.

**Response**:
```json
{
  "data": {
    "items": [Notification]
  },
  "request_id": "req_..."
}
```

#### POST /v1/notifications/:id/read

Mark notification as read.

**Response**: Updated Notification

### Subscriptions

#### POST /v1/subscriptions

Create subscription.

**Request Body**:
```json
{
  "product_suite": "string", // Optional
  "product_concept": "string", // Optional
  "tags": ["string"] // Optional
}
```

**Response**: Created Subscription

#### DELETE /v1/subscriptions/:id

Delete subscription.

**Response**:
```json
{
  "data": {
    "deleted": true
  },
  "request_id": "req_..."
}
```

### Events

#### POST /v1/events

Track activity event (non-blocking).

**Request Body**:
```json
{
  "event_name": "string",
  "user_id": "string", // Optional
  "content_id": "string", // Optional
  "metadata": {}, // Optional
  "timestamp": "ISO8601" // Optional, auto-generated if not provided
}
```

**Response**:
```json
{
  "data": {
    "received": true
  },
  "request_id": "req_..."
}
```

### File Uploads

#### POST /v1/uploads/presign

Generate presigned URL for file upload to S3.

**Requires**: Contributor+ role

**Request Body**:
```json
{
  "content_id": "string",
  "filename": "string",
  "content_type": "string" // MIME type, e.g., "application/pdf"
}
```

**Response**:
```json
{
  "data": {
    "upload_url": "https://...", // Presigned PUT URL
    "s3_bucket": "enablement-content",
    "s3_key": "content/{content_id}/source/{filename}",
    "expires_in_seconds": 3600
  },
  "request_id": "req_..."
}
```

**Usage**:
1. Client calls this endpoint to get presigned URL
2. Client uploads file directly to S3 using PUT request to `upload_url`
3. Client calls `/v1/content/:id/attach` with file metadata

### Content Files

#### POST /v1/content/:id/attach

Attach file metadata to content item after upload.

**Requires**: Contributor+ role

**Rules**:
- Content must exist
- Content must be Draft (unless Admin)
- File must already be uploaded to S3

**Request Body**:
```json
{
  "s3_bucket": "string",
  "s3_key": "string",
  "filename": "string",
  "content_type": "string",
  "size_bytes": number
}
```

**Response**: Updated ContentItem with file metadata

#### GET /v1/content/:id/download

Generate presigned download URL for content file.

**Rules**:
- **Approved content**: Viewer+ can download
- **Draft content**: Only owner or Admin can download
- **Deprecated/Expired**: Only Admin can download

**Response**:
```json
{
  "data": {
    "download_url": "https://...", // Presigned GET URL
    "expires_in_seconds": 3600
  },
  "request_id": "req_..."
}
```

**Error Codes**:
- `NOT_FOUND`: Content not found or no file attached
- `FORBIDDEN`: Insufficient permissions to download

## RBAC (Role-Based Access Control)

### Current Implementation (Stub)

- Reads role from `x-dev-role` header
- Defaults to `Viewer` if header missing
- Role hierarchy: Viewer < Contributor < Approver < Admin

### Role Permissions

- **Viewer**: Read-only access
- **Contributor**: Read + Create + Update content
- **Approver**: All Contributor permissions + Approve/Deprecate/Expire content
- **Admin**: All permissions + Delete + Admin actions

### TODO: Cognito JWT Integration

- Replace `x-dev-role` header with Cognito JWT token
- Validate JWT signature and expiration
- Extract role from JWT claims
- Extract user_id from JWT `sub` claim

## Error Codes

- `VALIDATION_ERROR`: Request validation failed (400)
- `NOT_FOUND`: Resource not found (404)
- `FORBIDDEN`: Insufficient permissions (403)
- `NETWORK_ERROR`: Network/connection error
- `INTERNAL_ERROR`: Server error (500)

## Rate Limiting

**TODO**: Implement rate limiting in Phase 3 (API Gateway)

## CORS

CORS is enabled for local development. Production CORS will be configured in API Gateway.

