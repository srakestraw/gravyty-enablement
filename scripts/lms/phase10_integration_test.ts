#!/usr/bin/env tsx
/**
 * Integration Tests for Phase 10 Learning Paths and Rollups
 * 
 * Tests Phase 10 endpoints end-to-end using Dynalite:
 * - List paths, view path, start path, progress completion, verify rollups
 * - Verify idempotency: re-complete course does not increment rollups again
 * 
 * Prerequisites:
 * 1. Start Dynalite: tsx scripts/lms/start_local_dynamo.ts
 * 2. Create tables: DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
 * 3. Seed data: DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase10_paths.ts
 * 4. Start API: cd apps/api && DYNAMODB_ENDPOINT=http://localhost:8000 STORAGE_BACKEND=aws npm run dev
 * 
 * Usage:
 *   API_URL=http://localhost:4000 tsx scripts/lms/phase10_integration_test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:4000';
const DEV_USER_ID = process.env.DEV_USER_ID || 'test_user_phase10';
const DEV_ROLE = process.env.DEV_ROLE || 'Viewer';
const PATH_ID = process.env.PATH_ID || 'test_path_phase10';
const COURSE_ID_1 = process.env.COURSE_ID_1 || 'test_course_phase10_1';
const COURSE_ID_2 = process.env.COURSE_ID_2 || 'test_course_phase10_2';
const LESSON_ID_1 = process.env.LESSON_ID_1 || 'test_lesson_phase10_1';
const LESSON_ID_2 = process.env.LESSON_ID_2 || 'test_lesson_phase10_2';

async function makeRequest(method: string, path: string, body?: any) {
  const url = `${API_URL}${path}`;
  const headers: Record<string, string> = {
    'x-dev-role': DEV_ROLE,
    'x-dev-user-id': DEV_USER_ID,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function runIntegrationTests() {
  console.log('🧪 Running Phase 10 Integration Tests\n');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`User ID: ${DEV_USER_ID}`);
  console.log(`Path ID: ${PATH_ID}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: List paths (initial state)
  try {
    console.log('Test 1: List paths (initial state)');
    const { status, data } = await makeRequest('GET', '/v1/lms/paths');
    
    if (status === 200 && data.data?.paths) {
      const path = data.data.paths.find((p: any) => p.path_id === PATH_ID);
      if (path?.progress) {
        console.log(`✅ Path found with progress: ${JSON.stringify(path.progress)}`);
        passed++;
      } else {
        console.log('❌ Path not found or missing progress');
        failed++;
      }
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 2: View path detail
  try {
    console.log('\nTest 2: View path detail');
    const { status, data } = await makeRequest('GET', `/v1/lms/paths/${PATH_ID}`);
    
    if (status === 200 && data.data?.path?.progress && data.data?.path?.course_completion) {
      console.log('✅ Path detail retrieved with progress and course_completion');
      passed++;
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 3: Start path
  try {
    console.log('\nTest 3: Start path');
    const { status, data } = await makeRequest('POST', `/v1/lms/paths/${PATH_ID}/start`, {});
    
    if (status === 201 && data.data?.progress?.started_at) {
      console.log(`✅ Path started: started_at = ${data.data.progress.started_at}`);
      passed++;
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 4: Complete first course
  try {
    console.log('\nTest 4: Complete first course');
    const { status } = await makeRequest('POST', '/v1/lms/progress', {
      course_id: COURSE_ID_1,
      lesson_id: LESSON_ID_1,
      completed: true,
      percent_complete: 100,
    });
    
    if (status === 200) {
      console.log('✅ Course 1 completed');
      passed++;
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 5: Verify rollup updated (50%)
  try {
    console.log('\nTest 5: Verify rollup updated (50%)');
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for rollup
    
    const { status, data } = await makeRequest('GET', `/v1/lms/paths/${PATH_ID}`);
    
    if (status === 200) {
      const progress = data.data?.path?.progress;
      if (progress?.completed_courses === 1 && progress?.percent_complete === 50) {
        console.log('✅ Rollup updated correctly: 50% complete');
        passed++;
      } else {
        console.log(`❌ Rollup incorrect: ${JSON.stringify(progress)}`);
        failed++;
      }
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 6: Complete second course
  try {
    console.log('\nTest 6: Complete second course');
    const { status } = await makeRequest('POST', '/v1/lms/progress', {
      course_id: COURSE_ID_2,
      lesson_id: LESSON_ID_2,
      completed: true,
      percent_complete: 100,
    });
    
    if (status === 200) {
      console.log('✅ Course 2 completed');
      passed++;
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 7: Verify path completed (100%)
  try {
    console.log('\nTest 7: Verify path completed (100%)');
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for rollup
    
    const { status, data } = await makeRequest('GET', `/v1/lms/paths/${PATH_ID}`);
    
    if (status === 200) {
      const progress = data.data?.path?.progress;
      if (progress?.completed_courses === 2 && 
          progress?.percent_complete === 100 && 
          progress?.status === 'completed' &&
          progress?.completed_at) {
        console.log('✅ Path completed: 100% complete, completed_at set');
        passed++;
      } else {
        console.log(`❌ Path not completed: ${JSON.stringify(progress)}`);
        failed++;
      }
    } else {
      console.log(`❌ Request failed: ${status}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 8: Idempotency - re-complete course
  try {
    console.log('\nTest 8: Idempotency - re-complete course');
    const beforeRollup = await makeRequest('GET', `/v1/lms/paths/${PATH_ID}`);
    const beforeCompletedCourses = beforeRollup.data?.data?.path?.progress?.completed_courses;
    
    // Re-complete course 1
    await makeRequest('POST', '/v1/lms/progress', {
      course_id: COURSE_ID_1,
      lesson_id: LESSON_ID_1,
      completed: true,
      percent_complete: 100,
    });
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for rollup
    
    const afterRollup = await makeRequest('GET', `/v1/lms/paths/${PATH_ID}`);
    const afterCompletedCourses = afterRollup.data?.data?.path?.progress?.completed_courses;
    
    if (beforeCompletedCourses === afterCompletedCourses && afterCompletedCourses === 2) {
      console.log('✅ Idempotency verified: completed_courses unchanged');
      passed++;
    } else {
      console.log(`❌ Idempotency failed: before=${beforeCompletedCourses}, after=${afterCompletedCourses}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('phase10_integration_test.ts')) {
  runIntegrationTests().catch((error) => {
    console.error('Integration test execution failed:', error);
    process.exit(1);
  });
}

export { runIntegrationTests };

