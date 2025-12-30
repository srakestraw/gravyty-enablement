#!/usr/bin/env tsx
/**
 * Seed Phase 9 Certificates Test Data
 * 
 * Seeds minimal test data for Phase 9 Certificates smoke test:
 * - 1 published course
 * - 1 lesson attached to that course
 * 
 * Prerequisites:
 * - Local DynamoDB running (DYNAMODB_ENDPOINT=http://localhost:8000)
 * - Tables created (run local_dynamo_setup.ts first)
 * 
 * Usage:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase9_certificates.ts
 */

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

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

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const LMS_COURSES_TABLE = process.env.LMS_COURSES_TABLE || 'lms_courses';
const LMS_LESSONS_TABLE = process.env.LMS_LESSONS_TABLE || 'lms_lessons';

// Deterministic test data IDs
const COURSE_ID = 'test_course_phase9';
const LESSON_ID = 'test_lesson_phase9';
const now = new Date().toISOString();

async function seedCourse() {
  const course = {
    course_id: COURSE_ID,
    title: 'Phase 9 Test Course',
    short_description: 'Test course for Phase 9 Certificates smoke test',
    description: 'This is a test course created for Phase 9 Certificates end-to-end testing.',
    product_suite: 'enablement',
    product_concept: 'testing',
    topic_tags: ['testing', 'certificates'],
    sections: [
      {
        section_id: 'section_1',
        title: 'Introduction',
        order: 0,
        lesson_ids: [LESSON_ID],
      },
    ],
    badges: [],
    status: 'published',
    version: 1,
    published_version: 1,
    published_at: now,
    published_by: 'system',
    estimated_duration_minutes: 10,
    difficulty_level: 'beginner' as const,
    created_at: now,
    created_by: 'system',
    updated_at: now,
    updated_by: 'system',
  };

  const command = new PutCommand({
    TableName: LMS_COURSES_TABLE,
    Item: course,
  });

  await docClient.send(command);
  console.log(`✅ Seeded course: ${COURSE_ID}`);
  return course;
}

async function seedLesson() {
  const lesson = {
    course_id: COURSE_ID,
    lesson_id: LESSON_ID,
    section_id: 'section_1',
    title: 'Test Lesson',
    type: 'video' as const,
    order: 0,
    required: true,
    estimated_duration_minutes: 5,
    description: 'Test lesson for Phase 9 smoke test',
    created_at: now,
    created_by: 'system',
    updated_at: now,
    updated_by: 'system',
  };

  const command = new PutCommand({
    TableName: LMS_LESSONS_TABLE,
    Item: lesson,
  });

  await docClient.send(command);
  console.log(`✅ Seeded lesson: ${LESSON_ID}`);
  return lesson;
}

async function main() {
  console.log('Seeding Phase 9 test data...');
  console.log(`Endpoint: ${endpoint}`);
  console.log('');

  try {
    await seedCourse();
    await seedLesson();

    console.log('');
    console.log('✅ Test data seeded successfully!');
    console.log('');
    console.log('Test Data IDs:');
    console.log(`  COURSE_ID="${COURSE_ID}"`);
    console.log(`  LESSON_ID="${LESSON_ID}"`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Start API: cd apps/api && DYNAMODB_ENDPOINT=http://localhost:8000 npm run dev');
    console.log('2. Run smoke test: scripts/lms/phase9_certificates_smoke.md');
  } catch (error: any) {
    console.error('❌ Failed to seed data:', error.message);
    if (error.name === 'ResourceNotFoundException') {
      console.error('   Make sure tables are created first (run local_dynamo_setup.ts)');
    }
    process.exit(1);
  }
}

main();

