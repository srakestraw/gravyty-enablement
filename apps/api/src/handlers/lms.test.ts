/**
 * Unit Tests for LMS Handlers - Phase 10 Path Rollups
 * 
 * Tests for computePathRollup() function covering:
 * - Status transitions (not_started -> in_progress -> completed)
 * - Timestamp semantics (started_at, completed_at, last_activity_at)
 * - Idempotency (re-compute with same state yields same result)
 * 
 * Run with: tsx src/handlers/lms.test.ts
 */

import type { LearningPath, PathProgress, CourseProgress } from '@gravyty/domain';
import { computePathRollup, type PathProgressRollup } from '../lms/pathRollup';

// Test helpers
function createPath(courseIds: string[]): LearningPath {
  return {
    path_id: 'test_path_1',
    title: 'Test Path',
    courses: courseIds.map((id, idx) => ({
      course_id: id,
      order: idx + 1,
      required: true,
    })),
    status: 'published',
    version: 1,
    published_version: 1,
    published_at: '2024-01-01T00:00:00Z',
    published_by: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'admin',
    updated_at: '2024-01-01T00:00:00Z',
    updated_by: 'admin',
    topic_tags: [],
    badges: [],
  };
}

function createCourseProgress(courseId: string, completed: boolean): CourseProgress {
  return {
    user_id: 'test_user',
    course_id: courseId,
    enrollment_origin: 'self_enrolled',
    enrolled_at: '2024-01-01T00:00:00Z',
    percent_complete: completed ? 100 : 0,
    completed,
    completed_at: completed ? '2024-01-01T00:00:00Z' : undefined,
    lesson_progress: {},
    last_accessed_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };
}

function createPathProgress(overrides: Partial<PathProgress> = {}): PathProgress {
  const base: PathProgress = {
    user_id: 'test_user',
    path_id: 'test_path_1',
    enrollment_origin: 'self_enrolled',
    enrolled_at: '2024-01-01T00:00:00Z',
    total_courses: 2,
    completed_courses: 0,
    percent_complete: 0,
    status: 'not_started',
    completed: false,
    last_activity_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };
  return { ...base, ...overrides };
}

// Test cases
interface TestCase {
  name: string;
  path: LearningPath;
  courseProgresses: Record<string, CourseProgress | null>;
  existingProgress: PathProgress | null;
  expected: Partial<PathProgressRollup>;
}

const tests: TestCase[] = [
  {
    name: 'Empty path returns zero progress',
    path: createPath([]),
    courseProgresses: {},
    existingProgress: null,
    expected: {
      total_courses: 0,
      completed_courses: 0,
      percent_complete: 0,
      status: 'not_started',
    },
  },
  {
    name: 'Not started: no course progress',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: null,
      course_2: null,
    },
    existingProgress: null,
    expected: {
      total_courses: 2,
      completed_courses: 0,
      percent_complete: 0,
      status: 'not_started',
      next_course_id: 'course_1',
      started_at: undefined,
      completed_at: undefined,
    },
  },
  {
    name: 'In progress: one course completed',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: null,
    },
    existingProgress: null,
    expected: {
      total_courses: 2,
      completed_courses: 1,
      percent_complete: 50,
      status: 'in_progress',
      next_course_id: 'course_2',
      started_at: 'ANY_STRING', // Set on first transition
      completed_at: undefined,
    },
  },
  {
    name: 'Completed: all courses completed',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: createCourseProgress('course_2', true),
    },
    existingProgress: null,
    expected: {
      total_courses: 2,
      completed_courses: 2,
      percent_complete: 100,
      status: 'completed',
      next_course_id: undefined,
      started_at: 'ANY_STRING',
      completed_at: 'ANY_STRING', // Set on completion
    },
  },
  {
    name: 'Idempotency: re-compute with same state preserves timestamps',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: createCourseProgress('course_2', true),
    },
    existingProgress: createPathProgress({
      started_at: '2024-01-01T10:00:00Z',
      completed_at: '2024-01-01T11:00:00Z',
      completed_courses: 2,
      percent_complete: 100,
      status: 'completed',
    }),
    expected: {
      total_courses: 2,
      completed_courses: 2,
      percent_complete: 100,
      status: 'completed',
      started_at: '2024-01-01T10:00:00Z', // Preserved
      completed_at: '2024-01-01T11:00:00Z', // Preserved
      last_activity_at: 'ANY_STRING', // Updated
    },
  },
  {
    name: 'Idempotency: re-complete course does not increment',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: createCourseProgress('course_2', true),
    },
    existingProgress: createPathProgress({
      completed_courses: 2,
      percent_complete: 100,
      status: 'completed',
      completed_at: '2024-01-01T11:00:00Z',
    }),
    expected: {
      completed_courses: 2, // Not incremented
      percent_complete: 100, // Not changed
      status: 'completed',
      completed_at: '2024-01-01T11:00:00Z', // Preserved
    },
  },
  {
    name: 'Started_at set once on first transition',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', false), // In progress but not completed
      course_2: null,
    },
    existingProgress: null,
    expected: {
      status: 'in_progress',
      started_at: 'ANY_STRING', // Set on first transition
    },
  },
  {
    name: 'Started_at preserved across recomputations',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: null,
    },
    existingProgress: createPathProgress({
      started_at: '2024-01-01T10:00:00Z',
    }),
    expected: {
      started_at: '2024-01-01T10:00:00Z', // Preserved
    },
  },
  {
    name: 'Completed_at set once when reaching completion',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: createCourseProgress('course_2', true),
    },
    existingProgress: createPathProgress({
      completed_courses: 1,
      percent_complete: 50,
      status: 'in_progress',
    }),
    expected: {
      completed_courses: 2,
      percent_complete: 100,
      status: 'completed',
      completed_at: 'ANY_STRING', // Set on completion
    },
  },
  {
    name: 'Completed_at never overwritten',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: createCourseProgress('course_2', true),
    },
    existingProgress: createPathProgress({
      completed_courses: 2,
      percent_complete: 100,
      status: 'completed',
      completed_at: '2024-01-01T11:00:00Z',
    }),
    expected: {
      completed_at: '2024-01-01T11:00:00Z', // Preserved, not overwritten
    },
  },
  {
    name: 'Last_activity_at always updated',
    path: createPath(['course_1', 'course_2']),
    courseProgresses: {
      course_1: createCourseProgress('course_1', true),
      course_2: null,
    },
    existingProgress: createPathProgress({
      // Note: PathProgress uses last_accessed_at, but rollup returns last_activity_at
    }),
    expected: {
      last_activity_at: 'ANY_STRING', // Always updated
    },
  },
];

// Helper to check if value matches expectation
function matches(expected: any, actual: any): boolean {
  if (expected === 'ANY_STRING') {
    return typeof actual === 'string';
  }
  return expected === actual;
}

// Run tests
async function runTests() {
  console.log('🧪 Running computePathRollup Unit Tests\n');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const getProgressFn = async (userId: string, courseId: string) => {
        return test.courseProgresses[courseId] || null;
      };

      const result = await computePathRollup(
        'test_user',
        test.path,
        test.existingProgress,
        getProgressFn // Pass as optional 4th parameter for testability
      );

      // Check expected fields
      let success = true;
      const errors: string[] = [];

      for (const [key, expectedValue] of Object.entries(test.expected)) {
        const actualValue = (result as Record<string, any>)[key];
        
        if (expectedValue === 'ANY_STRING') {
          // Just check it's a string
          if (typeof actualValue !== 'string') {
            success = false;
            errors.push(`${key}: expected string, got ${typeof actualValue}`);
          }
        } else if (expectedValue !== undefined && expectedValue !== null && !matches(expectedValue, actualValue)) {
          success = false;
          errors.push(`${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
        }
      }

      if (success) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name}`);
        errors.forEach(err => console.log(`   ${err}`));
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('lms.test.ts')) {
  runTests();
}

export { runTests };

