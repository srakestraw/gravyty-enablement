/**
 * Create DynamoDB Tables Script
 * 
 * Creates DynamoDB tables required for the enablement portal (content, notifications, subscriptions, events, and LMS tables).
 * Run with: tsx infra/scripts/create-tables.ts
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand } from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const client = new DynamoDBClient({ region });

const tables = [
  {
    TableName: process.env.DDB_TABLE_CONTENT || 'content_registry',
    KeySchema: [
      { AttributeName: 'content_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'content_id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'status#last_updated', AttributeType: 'S' },
      { AttributeName: 'product_suite#product_concept', AttributeType: 'S' },
      { AttributeName: 'last_updated#content_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'by_status_updated',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'status#last_updated', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        // No ProvisionedThroughput when using PAY_PER_REQUEST
      },
      {
        IndexName: 'by_product',
        KeySchema: [
          { AttributeName: 'product_suite#product_concept', KeyType: 'HASH' },
          { AttributeName: 'last_updated#content_id', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
        // No ProvisionedThroughput when using PAY_PER_REQUEST
      },
    ],
    BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
  },
  {
    TableName: process.env.DDB_TABLE_NOTIFICATIONS || 'notifications',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'created_at#notification_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'created_at#notification_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.DDB_TABLE_SUBSCRIPTIONS || 'subscriptions',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'subscription_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'subscription_id', AttributeType: 'S' },
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
  // LMS Tables
  {
    TableName: process.env.LMS_COURSES_TABLE || 'lms_courses',
    KeySchema: [
      { AttributeName: 'course_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'course_id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'published_at', AttributeType: 'S' },
      { AttributeName: 'product_suite', AttributeType: 'S' },
      { AttributeName: 'updated_at', AttributeType: 'S' },
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
      {
        IndexName: 'ProductIndex',
        KeySchema: [
          { AttributeName: 'product_suite', KeyType: 'HASH' },
          { AttributeName: 'updated_at', KeyType: 'RANGE' },
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
    TableName: process.env.LMS_PATHS_TABLE || 'lms_paths',
    KeySchema: [
      { AttributeName: 'path_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'path_id', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
      { AttributeName: 'published_at', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'PublishedPathsIndex',
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
    TableName: process.env.LMS_PROGRESS_TABLE || 'lms_progress',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }, // COURSE#course_id or PATH#path_id
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
    TableName: process.env.LMS_ASSIGNMENTS_TABLE || 'lms_assignments',
    KeySchema: [
      { AttributeName: 'assignee_user_id', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }, // ASSIGNMENT#assigned_at#assignment_id
    ],
    AttributeDefinitions: [
      { AttributeName: 'assignee_user_id', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'target_key', AttributeType: 'S' }, // TARGET#target_type#target_id
      { AttributeName: 'due_at', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'AssignmentsByTargetIndex',
        KeySchema: [
          { AttributeName: 'target_key', KeyType: 'HASH' },
          { AttributeName: 'due_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'AssignmentsByStatusIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
          { AttributeName: 'due_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_CERTIFICATES_TABLE || 'lms_certificates',
    KeySchema: [
      { AttributeName: 'entity_type', KeyType: 'HASH' }, // TEMPLATE or ISSUED#user_id
      { AttributeName: 'SK', KeyType: 'RANGE' }, // template_id or issued_at#certificate_id
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
  // Assessment Tables
  {
    TableName: process.env.LMS_ASSESSMENT_CONFIGS_TABLE || 'lms_assessment_configs',
    KeySchema: [
      { AttributeName: 'assessment_config_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'assessment_config_id', AttributeType: 'S' },
      { AttributeName: 'course_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CourseAssessmentIndex',
        KeySchema: [
          { AttributeName: 'course_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_ASSESSMENT_QUESTIONS_TABLE || 'lms_assessment_questions',
    KeySchema: [
      { AttributeName: 'question_id', KeyType: 'HASH' },
      { AttributeName: 'assessment_config_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'question_id', AttributeType: 'S' },
      { AttributeName: 'assessment_config_id', AttributeType: 'S' },
      { AttributeName: 'order_index', AttributeType: 'N' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'QuestionsByConfigIndex',
        KeySchema: [
          { AttributeName: 'assessment_config_id', KeyType: 'HASH' },
          { AttributeName: 'order_index', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_ASSESSMENT_OPTIONS_TABLE || 'lms_assessment_options',
    KeySchema: [
      { AttributeName: 'option_id', KeyType: 'HASH' },
      { AttributeName: 'question_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'option_id', AttributeType: 'S' },
      { AttributeName: 'question_id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_ASSESSMENT_ATTEMPTS_TABLE || 'lms_assessment_attempts',
    KeySchema: [
      { AttributeName: 'attempt_id', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }, // course_id#learner_id
    ],
    AttributeDefinitions: [
      { AttributeName: 'attempt_id', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'course_id', AttributeType: 'S' },
      { AttributeName: 'learner_id', AttributeType: 'S' },
      { AttributeName: 'attempt_number', AttributeType: 'N' },
      { AttributeName: 'submitted_at', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'LearnerAttemptsIndex',
        KeySchema: [
          { AttributeName: 'SK', KeyType: 'HASH' }, // course_id#learner_id
          { AttributeName: 'attempt_number', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'CourseAttemptsIndex',
        KeySchema: [
          { AttributeName: 'course_id', KeyType: 'HASH' },
          { AttributeName: 'submitted_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'AttemptByIdIndex',
        KeySchema: [
          { AttributeName: 'attempt_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  {
    TableName: process.env.LMS_ASSESSMENT_ANSWERS_TABLE || 'lms_assessment_answers',
    KeySchema: [
      { AttributeName: 'answer_id', KeyType: 'HASH' },
      { AttributeName: 'attempt_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'answer_id', AttributeType: 'S' },
      { AttributeName: 'attempt_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'AttemptAnswersIndex',
        KeySchema: [
          { AttributeName: 'attempt_id', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  // User Badges Table
  {
    TableName: process.env.USER_BADGES_TABLE || 'user_badges',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' }, // badge_id#course_id or badge_id
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'badge_id', AttributeType: 'S' },
      { AttributeName: 'awarded_at', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'BadgesByUserIndex',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'awarded_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'BadgesByIdIndex',
        KeySchema: [
          { AttributeName: 'badge_id', KeyType: 'HASH' },
          { AttributeName: 'awarded_at', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  // Metadata Table
  {
    TableName: process.env.METADATA_TABLE || 'metadata',
    KeySchema: [
      { AttributeName: 'option_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'option_id', AttributeType: 'S' },
      { AttributeName: 'group_key', AttributeType: 'S' },
      { AttributeName: 'sort_order_label', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GroupKeyIndex',
        KeySchema: [
          { AttributeName: 'group_key', KeyType: 'HASH' },
          { AttributeName: 'sort_order_label', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
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
  console.log('Creating DynamoDB tables...');
  console.log(`Region: ${region}`);
  console.log('');

  for (const tableDef of tables) {
    await createTable(tableDef);
  }

  console.log('');
  console.log('✅ All tables created successfully!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

