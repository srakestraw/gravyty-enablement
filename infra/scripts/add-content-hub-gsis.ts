/**
 * Add Content Hub GSIs to content_registry table
 * 
 * Run with: tsx infra/scripts/add-content-hub-gsis.ts
 * 
 * This script adds the required GSIs for Content Hub functionality.
 * Note: Adding GSIs to an existing table can take time and may cause throttling.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { UpdateTableCommand } from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new DynamoDBClient({ region });
const tableName = process.env.DDB_TABLE_CONTENT || 'content_registry';

const gsis = [
  {
    IndexName: 'ByMetadataStatusUpdated',
    KeySchema: [
      { AttributeName: 'metadata_node_id#status', KeyType: 'HASH' },
      { AttributeName: 'updated_at#asset_id', KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  },
  {
    IndexName: 'ByPinnedUpdated',
    KeySchema: [
      { AttributeName: 'pinned', KeyType: 'HASH' },
      { AttributeName: 'updated_at#asset_id', KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  },
  {
    IndexName: 'ByOwnerUpdated',
    KeySchema: [
      { AttributeName: 'owner_id', KeyType: 'HASH' },
      { AttributeName: 'updated_at#asset_id', KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  },
  {
    IndexName: 'ByShareToken',
    KeySchema: [
      { AttributeName: 'share_token', KeyType: 'HASH' },
    ],
    Projection: { ProjectionType: 'ALL' },
  },
  {
    IndexName: 'ByAssetVersions',
    KeySchema: [
      { AttributeName: 'asset_id', KeyType: 'HASH' },
      { AttributeName: 'version_number', KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  },
  {
    IndexName: 'BySubscriptionTarget',
    KeySchema: [
      { AttributeName: 'target_type#target_id', KeyType: 'HASH' },
      { AttributeName: 'user_id#subscription_id', KeyType: 'RANGE' },
    ],
    Projection: { ProjectionType: 'ALL' },
  },
];

async function addGSIs() {
  console.log(`Adding GSIs to table: ${tableName}`);
  
  for (const gsi of gsis) {
    try {
      console.log(`Adding GSI: ${gsi.IndexName}...`);
      
      const command = new UpdateTableCommand({
        TableName: tableName,
        AttributeDefinitions: [
          // Add attribute definitions for the GSI keys
          ...(gsi.KeySchema.some(ks => ks.AttributeName.includes('metadata_node_id#status')) 
            ? [{ AttributeName: 'metadata_node_id#status', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName.includes('updated_at#asset_id'))
            ? [{ AttributeName: 'updated_at#asset_id', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName === 'pinned')
            ? [{ AttributeName: 'pinned', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName === 'owner_id')
            ? [{ AttributeName: 'owner_id', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName === 'share_token')
            ? [{ AttributeName: 'share_token', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName === 'asset_id')
            ? [{ AttributeName: 'asset_id', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName === 'version_number')
            ? [{ AttributeName: 'version_number', AttributeType: 'N' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName.includes('target_type#target_id'))
            ? [{ AttributeName: 'target_type#target_id', AttributeType: 'S' }] : []),
          ...(gsi.KeySchema.some(ks => ks.AttributeName.includes('user_id#subscription_id'))
            ? [{ AttributeName: 'user_id#subscription_id', AttributeType: 'S' }] : []),
        ],
        GlobalSecondaryIndexUpdates: [
          {
            Create: {
              IndexName: gsi.IndexName,
              KeySchema: gsi.KeySchema,
              Projection: gsi.Projection,
            },
          },
        ],
      });
      
      await client.send(command);
      console.log(`✓ Added GSI: ${gsi.IndexName}`);
    } catch (error: any) {
      if (error.name === 'ResourceInUseException') {
        console.log(`⚠ GSI ${gsi.IndexName} already exists or table is being modified`);
      } else if (error.name === 'ValidationException' && error.message.includes('already exists')) {
        console.log(`⚠ GSI ${gsi.IndexName} already exists`);
      } else {
        console.error(`✗ Failed to add GSI ${gsi.IndexName}:`, error.message);
      }
    }
  }
  
  console.log('Done!');
}

addGSIs().catch(console.error);

