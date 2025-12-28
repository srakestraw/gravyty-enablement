/**
 * DynamoDB Client for Jobs Package
 *
 * Creates DynamoDB client using AWS SDK v3
 * Uses default credential chain (env vars, ~/.aws/credentials, IAM role, etc.)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
declare const client: DynamoDBClient;
export declare const dynamoDocClient: DynamoDBDocumentClient;
export { client as dynamoClient };
//# sourceMappingURL=dynamoClient.d.ts.map