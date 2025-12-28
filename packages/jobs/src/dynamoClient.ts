/**
 * DynamoDB Client for Jobs Package
 * 
 * Creates DynamoDB client using AWS SDK v3
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role, etc.)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';

// Create DynamoDB client
const client = new DynamoDBClient({
  region,
  // Credentials will be resolved from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. IAM role (when running on EC2/Lambda)
});

// Create DynamoDB Document Client (simplified API)
export const dynamoDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export { client as dynamoClient };

