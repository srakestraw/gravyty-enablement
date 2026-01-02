/**
 * Fix Metadata Group Keys Script
 * 
 * Fixes already-migrated metadata items that have incorrect group_key values.
 * This script should be run if the migration was run before the group_key transformation was added.
 * 
 * Usage:
 *   METADATA_TABLE=metadata ts-node fix-metadata-group-keys.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const metadataTableName = process.env.METADATA_TABLE || 'metadata';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function fixGroupKeys() {
  console.log(`Starting group_key fix for ${metadataTableName}...`);
  
  let lastEvaluatedKey;
  let totalItems = 0;
  let fixedItems = 0;
  let errors = 0;

  do {
    try {
      // Scan metadata table
      const scanCommand = new ScanCommand({
        TableName: metadataTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await docClient.send(scanCommand);
      const items = result.Items || [];

      console.log(`Scanned ${items.length} items...`);

      // Fix each item with incorrect group_key
      for (const item of items) {
        try {
          let needsUpdate = false;
          let newGroupKey = item.group_key;

          // Fix old taxonomy group keys that weren't transformed during migration
          if (item.group_key === 'product_suite') {
            // This should be 'product' (old taxonomy product_suite -> new metadata product)
            newGroupKey = 'product';
            needsUpdate = true;
            console.log(`Fixing group_key: ${item.group_key} -> ${newGroupKey} for option ${item.option_id} (${item.label})`);
          } else if (item.group_key === 'product_concept') {
            // This should be 'product_suite' (old taxonomy product_concept -> new metadata product_suite)
            newGroupKey = 'product_suite';
            needsUpdate = true;
            console.log(`Fixing group_key: ${item.group_key} -> ${newGroupKey} for option ${item.option_id} (${item.label})`);
          }

          if (needsUpdate) {
            // Also need to update sort_order_label for GSI if it exists
            const updateExpressions: string[] = ['#group_key = :new_group_key'];
            const expressionAttributeNames: Record<string, string> = {
              '#group_key': 'group_key',
            };
            const expressionAttributeValues: Record<string, any> = {
              ':new_group_key': newGroupKey,
            };

            // If sort_order_label exists, we need to rebuild it with the new group_key
            // The GSI key format is: group_key (PK) and sort_order_label (SK)
            // sort_order_label format: {zero-padded sort_order}#{label}
            if (item.sort_order_label) {
              // Rebuild sort_order_label - it should be the same format
              // but we're updating it to ensure GSI consistency
              const sortOrder = item.sort_order || 0;
              const label = item.label || '';
              const paddedSortOrder = String(sortOrder).padStart(10, '0');
              const newSortOrderLabel = `${paddedSortOrder}#${label}`;
              
              updateExpressions.push('#sort_order_label = :new_sort_order_label');
              expressionAttributeNames['#sort_order_label'] = 'sort_order_label';
              expressionAttributeValues[':new_sort_order_label'] = newSortOrderLabel;
            }

            const updateCommand = new UpdateCommand({
              TableName: metadataTableName,
              Key: {
                option_id: item.option_id,
              },
              UpdateExpression: `SET ${updateExpressions.join(', ')}`,
              ExpressionAttributeNames: expressionAttributeNames,
              ExpressionAttributeValues: expressionAttributeValues,
            });

            await docClient.send(updateCommand);
            fixedItems++;
          }
        } catch (error) {
          console.error(`Error fixing item ${item.option_id}:`, error);
          errors++;
        }
      }

      totalItems += items.length;
      lastEvaluatedKey = result.LastEvaluatedKey;

      if (lastEvaluatedKey) {
        console.log(`Processed ${totalItems} items so far...`);
      }
    } catch (error) {
      console.error('Error scanning metadata table:', error);
      throw error;
    }
  } while (lastEvaluatedKey);

  console.log('\nFix complete!');
  console.log(`Total items scanned: ${totalItems}`);
  console.log(`Items fixed: ${fixedItems}`);
  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    console.warn('\n⚠️  Some items failed to fix. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ All items fixed successfully!');
  }
}

// Run fix
fixGroupKeys().catch((error) => {
  console.error('Fix failed:', error);
  process.exit(1);
});

