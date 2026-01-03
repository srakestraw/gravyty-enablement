#!/usr/bin/env tsx
/**
 * Delete All Products and Product Suites Script
 * 
 * This script deletes ALL products and product suites from the metadata table.
 * This is a destructive operation - use with caution!
 * 
 * Usage:
 *   tsx scripts/metadata/delete-all-products-suites.ts --dry-run
 *   tsx scripts/metadata/delete-all-products-suites.ts --confirm
 * 
 * Flags:
 *   --dry-run    Preview what would be deleted without actually deleting
 *   --confirm    Actually delete the items (required for deletion)
 * 
 * Note: This uses hard delete (permanent removal). Products must be deleted
 * before Product Suites since products reference Product Suites via parent_id.
 */

import 'dotenv/config';
import { metadataRepo, METADATA_TABLE } from '../../apps/api/src/storage/dynamo/metadataRepo.js';
import { dynamoDocClient } from '../../apps/api/src/aws/dynamoClient.js';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { MetadataOption } from '@gravyty/domain';

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || 'delete_script';
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');

interface DeleteStats {
  products: { found: number; deleted: number; errors: number };
  productSuites: { found: number; deleted: number; errors: number };
}

async function getAllMetadataOptions(groupKey: 'product' | 'product_suite'): Promise<MetadataOption[]> {
  const allOptions: MetadataOption[] = [];
  let lastEvaluatedKey: Record<string, any> | undefined;
  
  // Use ScanCommand to get ALL items including deleted/archived ones
  do {
    const command = new ScanCommand({
      TableName: METADATA_TABLE,
      FilterExpression: '#group_key = :group_key',
      ExpressionAttributeNames: {
        '#group_key': 'group_key',
      },
      ExpressionAttributeValues: {
        ':group_key': groupKey,
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });
    
    const response = await dynamoDocClient.send(command);
    if (response.Items) {
      allOptions.push(...(response.Items as MetadataOption[]));
    }
    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  return allOptions;
}

async function deleteAllProductsAndSuites(): Promise<void> {
  if (!CONFIRM && !DRY_RUN) {
    console.error('❌ Error: Must specify either --dry-run or --confirm');
    console.error('   Usage: tsx scripts/metadata/delete-all-products-suites.ts --dry-run');
    console.error('   Usage: tsx scripts/metadata/delete-all-products-suites.ts --confirm');
    process.exit(1);
  }

  const stats: DeleteStats = {
    products: { found: 0, deleted: 0, errors: 0 },
    productSuites: { found: 0, deleted: 0, errors: 0 },
  };

  console.log(DRY_RUN ? '🔍 DRY RUN MODE - No changes will be made\n' : '⚠️  DELETION MODE - Items will be permanently deleted\n');

  try {
    // Step 1: Get all products (must delete these first since they reference Product Suites)
    console.log('📦 Fetching all products...');
    const products = await getAllMetadataOptions('product');
    stats.products.found = products.length;
    console.log(`   Found ${products.length} product(s)`);
    
    if (products.length > 0) {
      console.log('\n   Products to delete:');
      products.forEach((p) => {
        const status = p.archived_at ? ' (archived)' : p.deleted_at ? ' (deleted)' : '';
        const parent = p.parent_id ? ` [parent: ${p.parent_id}]` : '';
        console.log(`   - ${p.label} (${p.option_id})${status}${parent}`);
      });
    }

    // Step 2: Get all product suites
    console.log('\n📚 Fetching all product suites...');
    const productSuites = await getAllMetadataOptions('product_suite');
    stats.productSuites.found = productSuites.length;
    console.log(`   Found ${productSuites.length} product suite(s)`);
    
    if (productSuites.length > 0) {
      console.log('\n   Product Suites to delete:');
      productSuites.forEach((ps) => {
        const status = ps.archived_at ? ' (archived)' : ps.deleted_at ? ' (deleted)' : '';
        console.log(`   - ${ps.label} (${ps.option_id})${status}`);
      });
    }

    if (DRY_RUN) {
      console.log('\n✅ DRY RUN COMPLETE');
      console.log(`   Would delete ${stats.products.found} product(s) and ${stats.productSuites.found} product suite(s)`);
      console.log('   Run with --confirm to actually delete');
      return;
    }

    // Step 3: Delete all products first (they reference Product Suites)
    if (products.length > 0) {
      console.log('\n🗑️  Deleting products...');
      for (const product of products) {
        try {
          // Use hard delete for permanent removal
          await metadataRepo.hardDeleteOption(product.option_id);
          stats.products.deleted++;
          console.log(`   ✅ Deleted product: ${product.label} (${product.option_id})`);
        } catch (error) {
          stats.products.errors++;
          console.error(`   ❌ Error deleting product ${product.label} (${product.option_id}):`, error instanceof Error ? error.message : error);
        }
      }
    }

    // Step 4: Delete all product suites
    if (productSuites.length > 0) {
      console.log('\n🗑️  Deleting product suites...');
      for (const suite of productSuites) {
        try {
          // Use hard delete for permanent removal
          await metadataRepo.hardDeleteOption(suite.option_id);
          stats.productSuites.deleted++;
          console.log(`   ✅ Deleted product suite: ${suite.label} (${suite.option_id})`);
        } catch (error) {
          stats.productSuites.errors++;
          console.error(`   ❌ Error deleting product suite ${suite.label} (${suite.option_id}):`, error instanceof Error ? error.message : error);
        }
      }
    }

    // Summary
    console.log('\n📊 DELETION SUMMARY');
    console.log(`   Products: ${stats.products.deleted}/${stats.products.found} deleted, ${stats.products.errors} errors`);
    console.log(`   Product Suites: ${stats.productSuites.deleted}/${stats.productSuites.found} deleted, ${stats.productSuites.errors} errors`);
    
    if (stats.products.errors === 0 && stats.productSuites.errors === 0) {
      console.log('\n✅ All products and product suites deleted successfully!');
    } else {
      console.log('\n⚠️  Some deletions failed. Check errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
deleteAllProductsAndSuites()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

