#!/usr/bin/env tsx
/**
 * Query Local Telemetry Events (Dynalite)
 * 
 * Queries the local DynamoDB events table to verify Phase 9 certificate telemetry events.
 * Auto-discovers table name and schema.
 * 
 * Usage:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/query_local_telemetry.ts
 * 
 * Or with custom table name:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 DDB_TABLE_EVENTS=events tsx scripts/lms/query_local_telemetry.ts
 */

import { DynamoDBClient, ListTablesCommand, DescribeTableCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const region = process.env.AWS_REGION || 'us-east-1';
const eventsTableName = process.env.DDB_TABLE_EVENTS || 'events';
const dateBucket = process.env.DATE_BUCKET || new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

interface EventCount {
  eventName: string;
  count: number;
  items: any[];
}

async function discoverEventsTable(): Promise<string> {
  try {
    const listCommand = new ListTablesCommand({});
    const response = await client.send(listCommand);
    
    const tables = response.TableNames || [];
    
    // Prefer env var, then find table with "event" in name, then fallback to default
    if (process.env.DDB_TABLE_EVENTS && tables.includes(process.env.DDB_TABLE_EVENTS)) {
      console.log(`✅ Using configured events table: ${process.env.DDB_TABLE_EVENTS}`);
      return process.env.DDB_TABLE_EVENTS;
    }
    
    const eventsTable = tables.find(name => name.toLowerCase().includes('event'));
    
    if (eventsTable) {
      console.log(`✅ Found events table: ${eventsTable}`);
      return eventsTable;
    }
    
    if (tables.includes(eventsTableName)) {
      console.log(`✅ Using default events table: ${eventsTableName}`);
      return eventsTableName;
    }
    
    throw new Error(`Events table not found. Available tables: ${tables.join(', ')}`);
  } catch (error: any) {
    console.error('❌ Failed to discover events table:', error.message);
    throw error;
  }
}

async function describeTableSchema(tableName: string): Promise<{ hasDateBucket: boolean; partitionKey: string }> {
  try {
    const describeCommand = new DescribeTableCommand({ TableName: tableName });
    const response = await client.send(describeCommand);
    
    const keySchema = response.Table?.KeySchema || [];
    console.log(`\n📋 Table Schema:`);
    keySchema.forEach(key => {
      console.log(`   ${key.AttributeName} (${key.KeyType})`);
    });
    
    const partitionKey = keySchema.find(k => k.KeyType === 'HASH')?.AttributeName || '';
    const hasDateBucket = partitionKey === 'date_bucket';
    
    if (!hasDateBucket) {
      console.warn(`⚠️  Warning: Partition key is "${partitionKey}", not "date_bucket". Will use scan fallback.`);
    }
    
    return { hasDateBucket, partitionKey };
  } catch (error: any) {
    console.error('❌ Failed to describe table:', error.message);
    throw error;
  }
}

async function queryEventCount(
  tableName: string,
  eventName: string,
  userId: string | undefined,
  hasDateBucket: boolean
): Promise<EventCount> {
  const filterExpressions: string[] = ['event_name = :event'];
  const expressionAttributeValues: Record<string, any> = {
    ':event': { S: eventName },
  };
  
  if (userId) {
    filterExpressions.push('user_id = :userId');
    expressionAttributeValues[':userId'] = { S: userId };
  }
  
  if (hasDateBucket) {
    // Use efficient query with date_bucket partition key
    expressionAttributeValues[':date'] = { S: dateBucket };
    const queryCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'date_bucket = :date',
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeValues: expressionAttributeValues,
    });
    
    const response = await client.send(queryCommand);
    return {
      eventName,
      count: response.Count || 0,
      items: response.Items || [],
    };
  } else {
    // Fallback to scan (local testing only)
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: 500, // Conservative limit for local testing (500-1000 range acceptable)
    });
    
    const response = await client.send(scanCommand);
    return {
      eventName,
      count: response.Count || 0,
      items: response.Items || [],
    };
  }
}

async function main() {
  console.log('🔍 Querying Local Telemetry Events (Dynalite)');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Region: ${region}`);
  console.log(`   Date Bucket: ${dateBucket}`);
  console.log('');
  
  try {
    // Discover events table
    const tableName = await discoverEventsTable();
    
    // Describe table schema
    const schema = await describeTableSchema(tableName);
    
    // Query certificate-related events
    if (schema.hasDateBucket) {
      console.log(`\n📊 Querying Events for ${dateBucket}...\n`);
    } else {
      console.log(`\n📊 Scanning Events (fallback - local testing only)...\n`);
      console.warn('⚠️  Using scan operation. This is acceptable for local Dynalite testing only.');
    }
    
    const eventsToCheck = [
      { name: 'lms_admin_certificate_template_created', userId: undefined },
      { name: 'lms_admin_certificate_template_published', userId: undefined },
      { name: 'lms_certificate_issued', userId: process.env.DEV_USER_LEARNER },
      { name: 'lms_certificate_downloaded', userId: process.env.DEV_USER_LEARNER },
      { name: 'lms_admin_certificate_template_archived', userId: undefined },
    ];
    
    const results: EventCount[] = [];
    
    for (const event of eventsToCheck) {
      const result = await queryEventCount(tableName, event.name, event.userId, schema.hasDateBucket);
      results.push(result);
      
      const status = result.count > 0 ? '✅' : '❌';
      const userIdNote = event.userId ? ` (user: ${event.userId})` : '';
      console.log(`${status} ${event.name}: ${result.count}${userIdNote}`);
    }
    
    // Detailed verification
    console.log('\n📋 Detailed Verification:\n');
    
    // Template created
    const templateCreated = results.find(r => r.eventName === 'lms_admin_certificate_template_created');
    if (templateCreated && templateCreated.count > 0) {
      const item = templateCreated.items[0];
      const metadata = item.metadata?.M || {};
      const source = metadata.source?.M || metadata.source || {};
      console.log('Template Created Event:');
      console.log(`  ✅ Count: ${templateCreated.count}`);
      console.log(`  ✅ template_id: ${metadata.template_id?.S || 'MISSING'}`);
      console.log(`  ✅ applies_to: ${metadata.applies_to?.S || 'MISSING'}`);
      console.log(`  ✅ applies_to_id: ${metadata.applies_to_id?.S || 'MISSING'}`);
      console.log(`  ✅ source_app: ${source.source_app?.S || source.source_app || 'MISSING'}`);
      console.log(`  ✅ source_api_route: ${metadata.source_api_route?.S || source.source_api_route?.S || 'MISSING'}`);
      console.log(`  ✅ source_route: ${metadata.source_route?.S || source.source_route?.S || 'MISSING'}`);
    } else {
      console.log('Template Created Event: ❌ NOT FOUND');
    }
    
    // Certificate issued (idempotency check)
    const certIssued = results.find(r => r.eventName === 'lms_certificate_issued');
    if (certIssued) {
      console.log('\nCertificate Issued Event:');
      console.log(`  Count: ${certIssued.count}`);
      if (certIssued.count === 1) {
        console.log('  ✅ PASS: Issued exactly once (idempotent)');
        const item = certIssued.items[0];
        const metadata = item.metadata?.M || {};
        const source = metadata.source?.M || metadata.source || {};
        console.log(`  ✅ certificate_id: ${metadata.certificate_id?.S || 'MISSING'}`);
        console.log(`  ✅ template_id: ${metadata.template_id?.S || 'MISSING'}`);
        console.log(`  ✅ completion_type: ${metadata.completion_type?.S || 'MISSING'}`);
        console.log(`  ✅ source_app: ${source.source_app?.S || source.source_app || 'MISSING'}`);
        console.log(`  ✅ source_api_route: ${metadata.source_api_route?.S || source.source_api_route?.S || 'MISSING'}`);
        console.log(`  ✅ source_route: ${metadata.source_route?.S || source.source_route?.S || 'MISSING'}`);
        console.log(`  ✅ source_method: ${metadata.source_method?.S || source.source_method?.S || 'MISSING'}`);
      } else {
        console.log(`  ❌ FAIL: Expected 1, found ${certIssued.count}`);
      }
    } else {
      console.log('\nCertificate Issued Event: ❌ NOT FOUND');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    const passed = results.filter(r => r.count > 0).length;
    const total = results.length;
    console.log(`   ${passed}/${total} event types found`);
    
    if (passed === total) {
      console.log('   ✅ All telemetry events verified!');
    } else {
      console.log('   ⚠️  Some events missing. Check API logs for telemetry errors.');
    }
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

