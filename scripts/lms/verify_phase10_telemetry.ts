#!/usr/bin/env tsx
/**
 * Verify Phase 10 Telemetry Events
 * 
 * Queries DynamoDB events table for Phase 10 path-related events and displays counts.
 * 
 * Usage:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/verify_phase10_telemetry.ts [user_id] [path_id]
 * 
 * If user_id and path_id are not provided, queries all Phase 10 events for today.
 */

import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({
  endpoint: DYNAMODB_ENDPOINT,
  region: AWS_REGION,
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const PHASE10_EVENTS = [
  'lms_paths_listed',
  'lms_path_viewed',
  'lms_path_started',
  'lms_path_progress_updated',
  'lms_path_completed',
];

async function verifyTelemetry(userId?: string, pathId?: string) {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('🔍 Verifying Phase 10 Telemetry Events\n');
  console.log('='.repeat(60));
  console.log(`Date: ${today}`);
  if (userId) console.log(`User ID: ${userId}`);
  if (pathId) console.log(`Path ID: ${pathId}`);
  console.log('');

  try {
    // Query events table
    const command = new QueryCommand({
      TableName: 'events',
      KeyConditionExpression: 'date_bucket = :date',
      FilterExpression: 'event_name IN (:listed, :viewed, :started, :progress, :completed)',
      ExpressionAttributeValues: {
        ':date': { S: today },
        ':listed': { S: 'lms_paths_listed' },
        ':viewed': { S: 'lms_path_viewed' },
        ':started': { S: 'lms_path_started' },
        ':progress': { S: 'lms_path_progress_updated' },
        ':completed': { S: 'lms_path_completed' },
      },
    });

    const response = await client.send(command);
    const items = response.Items || [];

    // Filter by user_id and path_id if provided
    let filteredItems = items;
    if (userId || pathId) {
      filteredItems = items.filter((item: any) => {
        const metadata = item.metadata?.M || {};
        const itemUserId = item.user_id?.S;
        const itemPathId = metadata.path_id?.S;

        if (userId && itemUserId !== userId) return false;
        if (pathId && itemPathId !== pathId) return false;
        return true;
      });
    }

    // Count events by type
    const counts: Record<string, number> = {};
    PHASE10_EVENTS.forEach(event => {
      counts[event] = 0;
    });

    filteredItems.forEach((item: any) => {
      const eventName = item.event_name?.S;
      if (eventName && PHASE10_EVENTS.includes(eventName)) {
        counts[eventName]++;
      }
    });

    // Display results
    console.log('Event Counts:');
    console.log('-'.repeat(60));
    PHASE10_EVENTS.forEach(event => {
      const count = counts[event];
      const status = count > 0 ? '✅' : '❌';
      console.log(`${status} ${event}: ${count}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`Total Phase 10 events: ${filteredItems.length}`);

    // Expected counts (after full smoke test)
    console.log('\nExpected counts (after full smoke test):');
    console.log('- lms_paths_listed: ≥1');
    console.log('- lms_path_viewed: ≥2');
    console.log('- lms_path_started: 1');
    console.log('- lms_path_progress_updated: ≥1 (only on meaningful changes)');
    console.log('- lms_path_completed: 1 (only on completion transition)');

    // Verify required fields
    if (filteredItems.length > 0) {
      console.log('\nVerifying event structure...');
      const sampleEvent = filteredItems[0];
      const metadata = sampleEvent.metadata?.M || {};
      
      const requiredFields = [
        'source_app',
        'source_api_route',
        'source_route',
        'source_method',
      ];
      
      const source = sampleEvent.source?.M || {};
      let allPresent = true;
      
      requiredFields.forEach(field => {
        const value = source[field]?.S;
        if (value) {
          console.log(`  ✅ source.${field}: ${value}`);
        } else {
          console.log(`  ❌ source.${field}: missing`);
          allPresent = false;
        }
      });

      if (allPresent) {
        console.log('\n✅ All required source fields present');
      } else {
        console.log('\n❌ Some required source fields missing');
      }
    }

    return counts;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.error('❌ Events table not found. Make sure tables are created:');
      console.error('   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts');
      console.error('\nAlso ensure API is started with STORAGE_BACKEND=aws');
    } else {
      console.error('❌ Error querying events:', error.message);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const userId = process.argv[2];
const pathId = process.argv[3];

verifyTelemetry(userId, pathId).catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});

