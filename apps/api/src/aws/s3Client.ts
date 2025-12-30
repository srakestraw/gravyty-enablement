/**
 * S3 Client
 * 
 * Creates S3 client using AWS SDK v3
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role, etc.)
 */

import { S3Client } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';

// Create S3 client
export const s3Client = new S3Client({
  region,
  // Credentials will be resolved from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. IAM role (when running on EC2/Lambda)
});





