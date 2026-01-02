/**
 * Migration Script: Taxonomy to Metadata
 * 
 * Copies all data from the taxonomy DynamoDB table to the metadata table.
 * 
 * Usage:
 *   TAXONOMY_TABLE=taxonomy METADATA_TABLE=metadata ts-node migrate-taxonomy-to-metadata.ts
 * 
 * Note: This script assumes both tables exist. The metadata table should be created
 * via CDK deployment before running this migration.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const taxonomyTableName = process.env.TAXONOMY_TABLE || 'taxonomy';
const metadataTableName = process.env.METADATA_TABLE || 'metadata';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function migrateTable() {
  console.log(`Starting migration from ${taxonomyTableName} to ${metadataTableName}...`);
  
  let lastEvaluatedKey;
  let totalItems = 0;
  let migratedItems = 0;
  let errors = 0;

  do {
    try {
      // Scan taxonomy table
      const scanCommand = new ScanCommand({
        TableName: taxonomyTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(scanCommand);
      const items = result.Items || [];

      console.log(`Scanned ${items.length} items...`);

      // Copy each item to metadata table with group_key transformation
      for (const item of items) {
        try {
          // Transform group_key from old taxonomy naming to new metadata naming
          // Old "product_suite" -> New "product"
          // Old "product_concept" -> New "product_suite"
          // "topic_tag" and "badge" remain unchanged
          let transformedGroupKey = item.group_key;
          
          // Map old taxonomy group keys to new metadata group keys
          if (item.group_key === 'product_suite') {
            // Old taxonomy "product_suite" becomes new metadata "product"
            transformedGroupKey = 'product';
            console.log(`Transforming group_key: ${item.group_key} -> ${transformedGroupKey} for option ${item.option_id} (${item.label})`);
          } else if (item.group_key === 'product_concept') {
            // Old taxonomy "product_concept" becomes new metadata "product_suite"
            transformedGroupKey = 'product_suite';
            console.log(`Transforming group_key: ${item.group_key} -> ${transformedGroupKey} for option ${item.option_id} (${item.label})`);
          }
          // topic_tag and badge remain unchanged

          const migratedItem = {
            ...item,
            group_key: transformedGroupKey,
          };

          const putCommand = new PutCommand({
            TableName: metadataTableName,
            Item: migratedItem,
          });

          await docClient.send(putCommand);
          migratedItems++;
        } catch (error) {
          console.error(`Error migrating item ${item.option_id}:`, error);
          errors++;
        }
      }

      totalItems += items.length;
      lastEvaluatedKey = result.LastEvaluatedKey;

      if (lastEvaluatedKey) {
        console.log(`Processed ${totalItems} items so far...`);
      }
    } catch (error) {
      console.error('Error scanning taxonomy table:', error);
      throw error;
    }
  } while (lastEvaluatedKey);

  console.log('\nMigration complete!');
  console.log(`Total items scanned: ${totalItems}`);
  console.log(`Items migrated: ${migratedItems}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    console.warn('\n⚠️  Some items failed to migrate. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All items migrated successfully!');
  }
}

// Run migration
migrateTable().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

