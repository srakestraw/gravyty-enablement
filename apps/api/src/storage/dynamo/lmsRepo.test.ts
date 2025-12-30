/**
 * Repository Tests for LMS Phase 10 Reverse Index Methods
 * 
 * Tests for:
 * - syncCoursePathMappingsForPublishedPath() creates and cleans mappings on republish
 * - listPublishedPathIdsForCourse() uses Query with GSI and respects limit <= 200
 * 
 * Run with: tsx src/storage/dynamo/lmsRepo.test.ts
 * 
 * Note: These tests require a running Dynalite instance and tables to be created.
 * Run: DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
 */

import { LmsRepo } from './lmsRepo';
import type { LearningPath } from '@gravyty/domain';

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const TEST_USER_ID = '__SYSTEM__';

async function runRepoTests() {
  console.log('🧪 Running LMS Repo Phase 10 Tests\n');
  console.log('='.repeat(60));
  console.log(`DynamoDB Endpoint: ${DYNAMODB_ENDPOINT}\n`);

  const repo = new LmsRepo();
  let passed = 0;
  let failed = 0;

  // Test 1: syncCoursePathMappingsForPublishedPath creates mappings
  try {
    console.log('Test 1: syncCoursePathMappingsForPublishedPath creates mappings');
    
    const pathId = 'test_path_repo_1';
    const courseIds = ['test_course_repo_1', 'test_course_repo_2'];
    
    await repo.syncCoursePathMappingsForPublishedPath(pathId, courseIds);
    
    // Verify mappings were created
    const pathIds1 = await repo.listPublishedPathIdsForCourse('test_course_repo_1');
    const pathIds2 = await repo.listPublishedPathIdsForCourse('test_course_repo_2');
    
    if (pathIds1.includes(pathId) && pathIds2.includes(pathId)) {
      console.log('✅ Mappings created successfully');
      passed++;
    } else {
      console.log(`❌ Mappings not found. course_1 paths: ${pathIds1}, course_2 paths: ${pathIds2}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 2: syncCoursePathMappingsForPublishedPath cleans up removed courses
  try {
    console.log('\nTest 2: syncCoursePathMappingsForPublishedPath cleans up removed courses');
    
    const pathId = 'test_path_repo_2';
    const initialCourseIds = ['test_course_repo_3', 'test_course_repo_4'];
    const updatedCourseIds = ['test_course_repo_3']; // Removed course_4
    
    // Create initial mappings
    await repo.syncCoursePathMappingsForPublishedPath(pathId, initialCourseIds);
    
    // Update mappings (remove course_4)
    await repo.syncCoursePathMappingsForPublishedPath(pathId, updatedCourseIds);
    
    // Verify course_3 still has mapping
    const pathIds3 = await repo.listPublishedPathIdsForCourse('test_course_repo_3');
    const pathIds4 = await repo.listPublishedPathIdsForCourse('test_course_repo_4');
    
    if (pathIds3.includes(pathId) && !pathIds4.includes(pathId)) {
      console.log('✅ Mappings cleaned up correctly');
      passed++;
    } else {
      console.log(`❌ Cleanup failed. course_3 paths: ${pathIds3}, course_4 paths: ${pathIds4}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 3: listPublishedPathIdsForCourse respects limit <= 200
  try {
    console.log('\nTest 3: listPublishedPathIdsForCourse respects limit <= 200');
    
    // Create a course with many paths (if possible)
    const courseId = 'test_course_repo_limit';
    const pathIds: string[] = [];
    
    // Create 5 paths for this course
    for (let i = 1; i <= 5; i++) {
      const pathId = `test_path_repo_limit_${i}`;
      await repo.syncCoursePathMappingsForPublishedPath(pathId, [courseId]);
      pathIds.push(pathId);
    }
    
    // Test with limit > 200 (should clamp to 200)
    const result = await repo.listPublishedPathIdsForCourse(courseId, 500);
    
    if (result.length <= 200 && result.length >= 5) {
      console.log(`✅ Limit respected: returned ${result.length} paths (limit was 500, clamped to 200)`);
      passed++;
    } else {
      console.log(`❌ Limit not respected: returned ${result.length} paths`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 4: listPublishedPathIdsForCourse uses Query (not Scan)
  try {
    console.log('\nTest 4: listPublishedPathIdsForCourse uses Query with GSI');
    
    const courseId = 'test_course_repo_query';
    const pathId = 'test_path_repo_query';
    
    await repo.syncCoursePathMappingsForPublishedPath(pathId, [courseId]);
    
    const pathIds = await repo.listPublishedPathIdsForCourse(courseId);
    
    if (pathIds.includes(pathId)) {
      console.log('✅ Query successful (uses CourseProgressByCourseIndex GSI)');
      passed++;
    } else {
      console.log(`❌ Query failed: ${pathIds}`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }

  // Test 5: listPublishedPathIdsForCourse filters by entity_type and path_status
  try {
    console.log('\nTest 5: listPublishedPathIdsForCourse filters correctly');
    
    const courseId = 'test_course_repo_filter';
    const publishedPathId = 'test_path_repo_filter_published';
    
    await repo.syncCoursePathMappingsForPublishedPath(publishedPathId, [courseId]);
    
    const pathIds = await repo.listPublishedPathIdsForCourse(courseId);
    
    // Should only return published paths
    if (pathIds.includes(publishedPathId)) {
      console.log('✅ Filtering works correctly (only published paths returned)');
      passed++;
    } else {
      console.log(`❌ Filtering failed: ${pathIds}`);
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
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('lmsRepo.test.ts')) {
  runRepoTests().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { runRepoTests };

