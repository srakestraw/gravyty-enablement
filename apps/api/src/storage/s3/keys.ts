/**
 * S3 Key Helpers
 * 
 * Utilities for generating and sanitizing S3 keys
 */

/**
 * Sanitize filename for S3 key
 * Removes special characters, ensures safe path
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  // Keep alphanumeric, dots, hyphens, underscores
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generate S3 key for content file
 * Format: content/{content_id}/source/{filename}
 */
export function generateContentKey(contentId: string, filename: string): string {
  const sanitized = sanitizeFilename(filename);
  return `content/${contentId}/source/${sanitized}`;
}

/**
 * Generate S3 URI
 */
export function generateS3Uri(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}






