#!/usr/bin/env tsx
/**
 * Seed Phase 10 Learning Paths Test Data
 * 
 * Seeds minimal test data for Phase 10 Learning Paths and Rollups smoke test:
 * - 2 published courses
 * - 2 lessons (one per course)
 * - 1 published path containing both courses
 * 
 * Prerequisites:
 * - Local DynamoDB running (DYNAMODB_ENDPOINT=http://localhost:8000)
 * - Tables created (run local_dynamo_setup.ts first)
 * 
 * Usage:
 *   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase10_paths.ts
 */

import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
const LMS_PATHS_TABLE = process.env.LMS_PATHS_TABLE || 'lms_paths';
const LMS_PROGRESS_TABLE = process.env.LMS_PROGRESS_TABLE || 'lms_progress';

// Deterministic test data IDs
const COURSE_ID_1 = 'test_course_phase10_1';
const COURSE_ID_2 = 'test_course_phase10_2';
const LESSON_ID_1 = 'test_lesson_phase10_1';
const LESSON_ID_2 = 'test_lesson_phase10_2';
const PATH_ID = 'test_path_phase10';
const now = new Date().toISOString();

async function seedCourse(courseId: string, lessonId: string, title: string, order: number) {
  const course = {
    course_id: courseId,
    title,
    short_description: `Test course ${order} for Phase 10 Paths smoke test`,
    description: `This is test course ${order} created for Phase 10 Learning Paths and Rollups end-to-end testing.`,
    product_suite: 'enablement',
    product_concept: 'testing',
    topic_tags: ['testing', 'paths'],
    sections: [
      {
        section_id: `section_${order}`,
        title: 'Introduction',
        order: 0,
        lesson_ids: [lessonId],
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
  console.log(`✅ Seeded course: ${courseId}`);
  return course;
}

async function seedLesson(courseId: string, lessonId: string, title: string, order: number) {
  const lesson = {
    course_id: courseId,
    lesson_id: lessonId,
    section_id: `section_${order}`,
    title,
    type: 'video' as const,
    order: 0,
    required: true,
    estimated_duration_minutes: 5,
    description: `Test lesson ${order} for Phase 10 smoke test`,
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
  console.log(`✅ Seeded lesson: ${lessonId}`);
  return lesson;
}

async function seedPath() {
  const path = {
    path_id: PATH_ID,
    title: 'Phase 10 Test Learning Path',
    short_description: 'Test path for Phase 10 Paths and Rollups smoke test',
    description: 'This is a test learning path created for Phase 10 Learning Paths and Rollups end-to-end testing.',
    product_suite: 'enablement',
    product_concept: 'testing',
    topic_tags: ['testing', 'paths'],
    badges: [],
    courses: [
      {
        course_id: COURSE_ID_1,
        order: 0,
        required: true,
      },
      {
        course_id: COURSE_ID_2,
        order: 1,
        required: true,
      },
    ],
    status: 'published',
    version: 1,
    published_version: 1,
    published_at: now,
    published_by: 'system',
    estimated_duration_minutes: 20,
    created_at: now,
    created_by: 'system',
    updated_at: now,
    updated_by: 'system',
  };

  const command = new PutCommand({
    TableName: LMS_PATHS_TABLE,
    Item: path,
  });

  await docClient.send(command);
  console.log(`✅ Seeded path: ${PATH_ID}`);
  
  // Create reverse index mappings (course_id -> path_id) in lms_progress table
  const LMS_PROGRESS_TABLE = process.env.LMS_PROGRESS_TABLE || 'lms_progress';
  const SYSTEM_USER_ID = '__SYSTEM__';
  
  for (const courseRef of path.courses) {
    const mappingItem = {
      user_id: SYSTEM_USER_ID,
      SK: `COURSEPATH#COURSE#${courseRef.course_id}#PATH#${PATH_ID}`,
      entity_type: 'lms_course_paths',
      course_id: courseRef.course_id, // For GSI partition key
      last_activity_at: now, // For GSI sort key (required)
      path_id: PATH_ID,
      path_status: 'published',
      updated_at: now,
    };
    
    const mappingCommand = new PutCommand({
      TableName: LMS_PROGRESS_TABLE,
      Item: mappingItem,
    });
    
    await docClient.send(mappingCommand);
  }
  console.log(`✅ Seeded reverse index mappings for path: ${PATH_ID}`);
  
  return path;
}

async function main() {
  console.log('Seeding Phase 10 test data...');
  console.log(`Endpoint: ${endpoint}`);
  console.log('');

  try {
    await seedCourse(COURSE_ID_1, LESSON_ID_1, 'Phase 10 Test Course 1', 1);
    await seedLesson(COURSE_ID_1, LESSON_ID_1, 'Test Lesson 1', 1);
    
    await seedCourse(COURSE_ID_2, LESSON_ID_2, 'Phase 10 Test Course 2', 2);
    await seedLesson(COURSE_ID_2, LESSON_ID_2, 'Test Lesson 2', 2);
    
    await seedPath();

    console.log('');
    console.log('✅ Test data seeded successfully!');
    console.log('');
    console.log('Test Data IDs:');
    console.log(`  COURSE_ID_1="${COURSE_ID_1}"`);
    console.log(`  COURSE_ID_2="${COURSE_ID_2}"`);
    console.log(`  LESSON_ID_1="${LESSON_ID_1}"`);
    console.log(`  LESSON_ID_2="${LESSON_ID_2}"`);
    console.log(`  PATH_ID="${PATH_ID}"`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Start API: cd apps/api && DYNAMODB_ENDPOINT=http://localhost:8000 npm run dev');
    console.log('2. Run smoke test: scripts/lms/phase10_paths_rollups_smoke.md');
  } catch (error: any) {
    console.error('❌ Failed to seed data:', error.message);
    if (error.name === 'ResourceNotFoundException') {
      console.error('   Make sure tables are created first (run local_dynamo_setup.ts)');
    }
    process.exit(1);
  }
}

main();

