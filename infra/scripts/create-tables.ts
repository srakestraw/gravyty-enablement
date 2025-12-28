/**
 * Create DynamoDB Tables Script
 * 
 * Creates the four DynamoDB tables required for the enablement portal.
 * Run with: tsx infra/scripts/create-tables.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand } from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new DynamoDBClient({ region });

const tables = [
  {
    TableName: process.env.DDB_TABLE_CONTENT || 'content_registry',
    KeySchema: [
      { AttributeName: 'content_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'content_id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'status#last_updated', AttributeType: 'S' },
      { AttributeName: 'product_suite#product_concept', AttributeType: 'S' },
      { AttributeName: 'last_updated#content_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'by_status_updated',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'status#last_updated', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        // No ProvisionedThroughput when using PAY_PER_REQUEST
      },
      {
        IndexName: 'by_product',
        KeySchema: [
          { AttributeName: 'product_suite#product_concept', KeyType: 'HASH' },
          { AttributeName: 'last_updated#content_id', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        // No ProvisionedThroughput when using PAY_PER_REQUEST
      },
    ],
    BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
  },
  {
    TableName: process.env.DDB_TABLE_NOTIFICATIONS || 'notifications',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'created_at#notification_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'created_at#notification_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.DDB_TABLE_SUBSCRIPTIONS || 'subscriptions',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'subscription_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'subscription_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.DDB_TABLE_EVENTS || 'events',
    KeySchema: [
      { AttributeName: 'date_bucket', KeyType: 'HASH' },
      { AttributeName: 'ts#event_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'date_bucket', AttributeType: 'S' },
      { AttributeName: 'ts#event_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function createTable(tableDef: any) {
  try {
    const command = new CreateTableCommand(tableDef);
    await client.send(command);
    console.log(`✅ Created table: ${tableDef.TableName}`);
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⏭️  Table already exists: ${tableDef.TableName}`);
    } else {
      console.error(`❌ Failed to create table ${tableDef.TableName}:`, error.message);
      throw error;
    }
  }
}

async function main() {
  console.log('Creating DynamoDB tables...');
  console.log(`Region: ${region}`);
  console.log('');

  for (const tableDef of tables) {
    await createTable(tableDef);
  }

  console.log('');
  console.log('✅ All tables created successfully!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

