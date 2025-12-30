/**
 * DynamoDB Client
 * 
 * Creates DynamoDB client using AWS SDK v3
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role, etc.)
 * Supports local DynamoDB via DYNAMODB_ENDPOINT env var
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.DYNAMODB_ENDPOINT; // e.g., http://localhost:8000 for local DynamoDB

// Build client config
const clientConfig: any = {
  region,
};

// If endpoint is provided (local DynamoDB), use it and dummy credentials
if (endpoint) {
  clientConfig.endpoint = endpoint;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  };
  // Credentials will be resolved from:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. Shared credentials file (~/.aws/credentials)
  // 3. IAM role (when running on EC2/Lambda)
  // Note: For local DynamoDB, dummy credentials are sufficient
}

// Create DynamoDB client
const client = new DynamoDBClient(clientConfig);

// Create DynamoDB Document Client (simplified API)
export const dynamoDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export { client as dynamoClient };




