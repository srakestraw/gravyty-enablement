/**
 * SSM Parameter Store Client
 * 
 * Creates SSM client using AWS SDK v3
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role, etc.)
 */

import { SSMClient } from '@aws-sdk/client-ssm';

const region = process.env.AWS_REGION || 'us-east-1';

// Create SSM client
export const ssmClient = new SSMClient({
  region,
});


