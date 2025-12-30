#!/usr/bin/env tsx
/**
 * Local DynamoDB Setup Script for Phase 9 Certificates Testing
 * 
 * Creates required DynamoDB tables in local DynamoDB instance.
 * 
 * Prerequisites:
 * - DynamoDB Local running (docker run -p 8000:8000 amazon/dynamodb-local)
 * - Set DYNAMODB_ENDPOINT=http://localhost:8000
 * 
 * Usage:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand } from '@aws-sdk/client-dynamodb';

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const region = process.env.AWS_REGION || 'us-east-1';

const client = new DynamoDBClient({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
  },
});

// Phase 9 required tables (minimal set)
const tables = [
  {
    TableName: process.env.LMS_COURSES_TABLE || 'lms_courses',
    KeySchema: [
      { AttributeName: 'course_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'course_id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'published_at', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PublishedCatalogIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'published_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_LESSONS_TABLE || 'lms_lessons',
    KeySchema: [
      { AttributeName: 'course_id', KeyType: 'HASH' },
      { AttributeName: 'lesson_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'course_id', AttributeType: 'S' },
      { AttributeName: 'lesson_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'LessonByIdIndex',
        KeySchema: [
          { AttributeName: 'lesson_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_PROGRESS_TABLE || 'lms_progress',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'course_id', AttributeType: 'S' },
      { AttributeName: 'last_activity_at', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CourseProgressByCourseIndex',
        KeySchema: [
          { AttributeName: 'course_id', KeyType: 'HASH' },
          { AttributeName: 'last_activity_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_CERTIFICATES_TABLE || 'lms_certificates',
    KeySchema: [
      { AttributeName: 'entity_type', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'entity_type', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'updated_at', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'issued_at', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'TemplatesByUpdatedIndex',
        KeySchema: [
          { AttributeName: 'entity_type', KeyType: 'HASH' },
          { AttributeName: 'updated_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'IssuedCertificatesByUserIndex',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'issued_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
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
  console.log('Setting up local DynamoDB tables for Phase 9...');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Region: ${region}`);
  console.log('');

  for (const tableDef of tables) {
    await createTable(tableDef);
  }

  console.log('');
  console.log('✅ All tables created successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Run seed script: tsx scripts/lms/seed_phase9_certificates.ts');
  console.log('2. Start API: cd apps/api && DYNAMODB_ENDPOINT=http://localhost:8000 npm run dev');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


