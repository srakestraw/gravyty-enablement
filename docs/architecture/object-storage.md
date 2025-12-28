# Object Storage Architecture

## Overview

The enablement portal uses AWS S3 for storing content files (PDFs, documents, etc.). Files are stored privately and accessed via presigned URLs.

## S3 Bucket Configuration

- **Bucket Name**: Managed by CDK stack (auto-generated, unique)
- **Access**: Private (block public access enabled)
- **Encryption**: S3-managed encryption (SSE-S3)
- **Versioning**: Enabled
- **CORS**: Configured for local development origins

## Key Structure

Files are organized using the following key pattern:

```
content/{content_id}/source/{sanitized_filename}
```

### Examples

- Content ID: `abc123`
- Filename: `user-guide.pdf`
- S3 Key: `content/abc123/source/user-guide.pdf`

- Content ID: `xyz789`
- Filename: `My Document (v2).pdf`
- Sanitized: `My_Document__v2_.pdf`
- S3 Key: `content/xyz789/source/My_Document__v2_.pdf`

### Filename Sanitization

Filenames are sanitized to ensure safe S3 keys:
- Special characters replaced with underscores
- Multiple underscores collapsed to single
- Leading/trailing underscores removed
- Preserves alphanumeric, dots, hyphens, underscores

## File Metadata

File metadata is stored in the `content_registry` DynamoDB table:

- `file_name`: Original filename
- `content_type`: MIME type (e.g., `application/pdf`)
- `size_bytes`: File size in bytes
- `s3_bucket`: S3 bucket name
- `s3_key`: S3 object key
- `s3_uri`: Full S3 URI (`s3://bucket/key`)
- `uploaded_at`: ISO8601 timestamp

## Access Patterns

### Upload Flow

1. **Presign Request** (`POST /v1/uploads/presign`)
   - Requires: Contributor+ role
   - Content must exist and be Draft (unless Admin)
   - Returns presigned PUT URL (expires in 5 minutes)

2. **Upload File** (Direct to S3)
   - Client PUTs file to presigned URL
   - Must include correct `Content-Type` header

3. **Attach Metadata** (`POST /v1/content/:id/attach`)
   - Requires: Contributor+ role
   - Content must exist
   - Only owner or Admin can attach
   - Updates DynamoDB with file metadata

### Download Flow

1. **Request Download URL** (`GET /v1/content/:id/download`)
   - Returns presigned GET URL (expires in 1 hour)

2. **Download File** (Direct from S3)
   - Client opens presigned URL
   - Browser downloads file

## Access Rules

### Upload Permissions

- **Contributor+** can upload files
- Content must be **Draft** status (unless Admin)
- Only **owner** or **Admin** can attach files

### Download Permissions

- **Approved** content: **Viewer+** can download
- **Draft** content: Only **owner** can download
- **Deprecated/Expired**: Only **Admin** can download

## Presigned URLs

### Upload URLs

- **Expiry**: 5 minutes (300 seconds)
- **Method**: PUT
- **Configurable**: `PRESIGNED_UPLOAD_EXPIRY_SECONDS` env var

### Download URLs

- **Expiry**: 1 hour (3600 seconds)
- **Method**: GET
- **Configurable**: `PRESIGNED_DOWNLOAD_EXPIRY_SECONDS` env var

## CORS Configuration

S3 bucket CORS allows:

- **Origins**: 
  - `http://localhost:5173` (Vite dev server)
  - `http://localhost:3000` (Alternative dev port)
  - TODO: Add Amplify domain when deployed

- **Methods**: PUT, GET, HEAD

- **Headers**: 
  - `Content-Type`
  - `x-amz-*` (wildcard for AWS headers)
  - `Authorization`
  - `x-request-id`
  - `x-dev-role`
  - `x-dev-user-id`

- **Exposed Headers**: ETag, x-amz-request-id, x-amz-version-id

## Security Considerations

1. **Private Bucket**: All access via presigned URLs only
2. **Short Upload Expiry**: 5 minutes reduces risk of URL reuse
3. **Owner Validation**: Only content owner can attach files
4. **Status Checks**: Draft content restrictions enforced
5. **HTTPS Required**: Bucket policy enforces secure transport

## Future Enhancements

- **Multipart Uploads**: For files > 5GB
- **Resumable Uploads**: Track upload progress
- **File Validation**: Virus scanning, file type validation
- **Thumbnail Generation**: For images/PDFs
- **CDN Integration**: CloudFront for faster downloads
- **Lifecycle Policies**: Archive old versions to Glacier

## Related Documentation

- [Data Model](./data-model.md) - DynamoDB schema
- [API Contract](./api-contract.md) - API endpoints
- [Local Development Runbook](../runbooks/local-dev.md) - Testing guide
