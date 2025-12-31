#!/usr/bin/env tsx
/**
 * Taxonomy Setup Verification Script
 * 
 * Verifies that the taxonomy system is properly set up:
 * 1. Checks if taxonomy table exists
 * 2. Verifies table structure (GSI exists)
 * 3. Tests basic repository operations
 * 
 * Usage:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/taxonomy/verify-setup.ts
 */

import 'dotenv/config';
import { DynamoDBClient, DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { taxonomyRepo } from '../../apps/api/src/storage/dynamo/taxonomyRepo.js';

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.TAXONOMY_TABLE || 'taxonomy';

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

async function verifyTableExists(): Promise<boolean> {
  try {
    const command = new ListTablesCommand({});
    const response = await client.send(command);
    return response.TableNames?.includes(tableName) || false;
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    return false;
  }
}

async function verifyTableStructure(): Promise<boolean> {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    const response = await client.send(command);
    
    const table = response.Table;
    if (!table) {
      console.error('❌ Table not found');
      return false;
    }

    // Check primary key
    const hasOptionIdKey = table.KeySchema?.some(
      (key) => key.AttributeName === 'option_id' && key.KeyType === 'HASH'
    );

    if (!hasOptionIdKey) {
      console.error('❌ Table missing option_id primary key');
      return false;
    }

    // Check GSI
    const hasGroupKeyIndex = table.GlobalSecondaryIndexes?.some(
      (gsi) => gsi.IndexName === 'GroupKeyIndex'
    );

    if (!hasGroupKeyIndex) {
      console.error('❌ Table missing GroupKeyIndex GSI');
      return false;
    }

    console.log('✅ Table structure verified');
    console.log(`   Primary Key: option_id (HASH)`);
    console.log(`   GSI: GroupKeyIndex`);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.error(`❌ Table "${tableName}" does not exist`);
      console.error(`   Run: DYNAMODB_ENDPOINT=${endpoint} tsx scripts/lms/local_dynamo_setup.ts`);
    } else {
      console.error('❌ Error verifying table structure:', error.message);
    }
    return false;
  }
}

async function testRepository(): Promise<boolean> {
  try {
    console.log('\n🧪 Testing repository operations...');
    
    // Test list options (should work even with empty table)
    const result = await taxonomyRepo.listOptions({
      group_key: 'product_suite',
      limit: 10,
    });
    
    console.log(`✅ Repository test passed`);
    console.log(`   Found ${result.items.length} options`);
    return true;
  } catch (error: any) {
    console.error('❌ Repository test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Verifying taxonomy setup...\n');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Region: ${region}`);
  console.log(`   Table: ${tableName}\n`);

  // Step 1: Check if table exists
  console.log('Step 1: Checking if table exists...');
  const tableExists = await verifyTableExists();
  
  if (!tableExists) {
    console.error(`❌ Table "${tableName}" not found`);
    console.error(`\n   To create the table, run:`);
    console.error(`   DYNAMODB_ENDPOINT=${endpoint} tsx scripts/lms/local_dynamo_setup.ts\n`);
    process.exit(1);
  }
  console.log(`✅ Table "${tableName}" exists\n`);

  // Step 2: Verify table structure
  console.log('Step 2: Verifying table structure...');
  const structureValid = await verifyTableStructure();
  
  if (!structureValid) {
    console.error('\n❌ Table structure is invalid');
    process.exit(1);
  }

  // Step 3: Test repository
  const repoWorks = await testRepository();
  
  if (!repoWorks) {
    console.error('\n❌ Repository operations failed');
    process.exit(1);
  }

  console.log('\n✅ All checks passed! Taxonomy system is ready to use.');
  console.log('\nNext steps:');
  console.log('  1. Run migration (if needed): tsx scripts/taxonomy/migrate-taxonomy.ts');
  console.log('  2. Start API: DYNAMODB_ENDPOINT=' + endpoint + ' npm run dev --workspace=apps/api');
  console.log('  3. Test UI: Navigate to course editor and use taxonomy components\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

