# S3 File Storage - Future Enhancements

## Multipart Uploads

For large files (>100MB), consider implementing multipart upload presigning:

**Current Implementation**: Single PUT request (works for files up to ~5GB)

**Future Enhancement**:
- Detect file size before presigning
- If >100MB, use multipart upload flow:
  1. `POST /v1/uploads/presign-multipart` - Initialize multipart upload, returns `upload_id`
  2. `POST /v1/uploads/presign-part` - Get presigned URL for each part (5MB chunks)
  3. Client uploads parts sequentially or in parallel
  4. `POST /v1/uploads/complete-multipart` - Complete multipart upload
  5. `POST /v1/content/:id/attach` - Attach file metadata

**Benefits**:
- Better for large files
- Can resume interrupted uploads
- Better error handling

## Additional TODOs

- **Virus Scanning**: Add S3 event trigger (Lambda) to scan uploaded files
- **CDN**: Consider CloudFront distribution for Approved content (public access)
- **Versioning**: S3 versioning enabled, but UI doesn't show file versions yet
- **Lifecycle Policies**: Archive old/expired content to Glacier
- **Thumbnails/Previews**: Generate thumbnails for PDFs/images, store in `/derived/` prefix
- **File Validation**: Add server-side validation (file type, size limits)
- **Progress Tracking**: WebSocket or polling for upload progress (currently client-side only)






