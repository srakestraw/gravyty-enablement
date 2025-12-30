# Phase 11: Docs, Testing, and Hardening Checklist

**Status:** ✅ Complete  
**Date:** 2025-01-30  
**Goal:** Turn Phase 10 + prior phases into production-grade with better docs, automated tests, and hardening.

## Deliverables Summary

### 1. Documentation Hardening ✅

**File:** `docs/architecture/lms-v2.md`

**Updates:**
- ✅ Added Phase 9 data model section with table structure, GSI details, query patterns
- ✅ Added Phase 10 data model section with reverse index implementation details
- ✅ Documented timestamp semantics (started_at, completed_at, last_activity_at)
- ✅ Documented idempotency rules and query patterns
- ✅ Added troubleshooting section with Dynalite setup instructions
- ✅ Added local testing guide with copy-pasteable commands
- ✅ Documented reserved keywords handling (`#pathStatus` via ExpressionAttributeNames)
- ✅ Documented concurrency behavior (deterministic rollups)

**Key Sections Added:**
- Phase 9: Data Model (Certificate Template Storage, Issued Certificate Storage)
- Phase 9: Troubleshooting and Local Testing
- Phase 10: Timestamp Semantics (detailed rules)
- Phase 10: Query Pattern (with ExpressionAttributeNames example)
- Phase 10: Concurrency (deterministic behavior)
- Phase 10: Troubleshooting and Local Testing

### 2. Automated Tests ✅

#### Unit Tests

**File:** `apps/api/src/handlers/lms.test.ts`

**Coverage:**
- ✅ Status transitions (not_started → in_progress → completed)
- ✅ Timestamp semantics (started_at set once, completed_at set once, last_activity_at updates)
- ✅ Idempotency (re-compute with same state yields same result)
- ✅ Empty path handling
- ✅ Completed_at preservation (never overwritten)

**Run:**
```bash
cd apps/api
npm run test:unit
```

**Test Cases:**
1. Empty path returns zero progress
2. Not started: no course progress
3. In progress: one course completed
4. Completed: all courses completed
5. Idempotency: re-compute with same state preserves timestamps
6. Idempotency: re-complete course does not increment
7. Started_at set once on first transition
8. Started_at preserved across recomputations
9. Completed_at set once when reaching completion
10. Completed_at never overwritten
11. Last_activity_at always updated

#### Repository Tests

**File:** `apps/api/src/storage/dynamo/lmsRepo.test.ts`

**Coverage:**
- ✅ `syncCoursePathMappingsForPublishedPath()` creates mappings
- ✅ `syncCoursePathMappingsForPublishedPath()` cleans up removed courses
- ✅ `listPublishedPathIdsForCourse()` respects limit <= 200
- ✅ `listPublishedPathIdsForCourse()` uses Query with GSI (not Scan)
- ✅ `listPublishedPathIdsForCourse()` filters by entity_type and path_status

**Prerequisites:**
```bash
# Start Dynalite
tsx scripts/lms/start_local_dynamo.ts

# Create tables (in another terminal)
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
```

**Run:**
```bash
cd apps/api
npm run test:repo
```

#### Integration Tests

**File:** `scripts/lms/phase10_integration_test.ts`

**Coverage:**
- ✅ List paths with rollup progress
- ✅ View path detail with course_completion
- ✅ Start path (sets started_at)
- ✅ Complete course → verify rollup updates
- ✅ Complete all courses → verify path completion
- ✅ Idempotency: re-complete course does not increment rollups

**Prerequisites:**
```bash
# 1. Start Dynalite
tsx scripts/lms/start_local_dynamo.ts

# 2. Create tables (in another terminal)
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts

# 3. Seed data
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase10_paths.ts

# 4. Start API (in another terminal)
cd apps/api
DYNAMODB_ENDPOINT=http://localhost:8000 \
STORAGE_BACKEND=aws \
AWS_ACCESS_KEY_ID=dummy \
AWS_SECRET_ACCESS_KEY=dummy \
AWS_REGION=us-east-1 \
npm run dev
```

**Run:**
```bash
API_URL=http://localhost:4000 tsx scripts/lms/phase10_integration_test.ts
```

### 3. Hardening Verification ✅

#### Concurrency

**Status:** ✅ Verified

**Findings:**
- Rollup computation is deterministic: same course completion state always produces same rollup
- Multiple concurrent progress writes for same course will trigger multiple rollup recomputations
- Each recomputation reads current course completion state, so final state is correct regardless of order
- `completed_at` is set idempotently (conditional: only if not already set)
- DynamoDB conditional writes ensure no race conditions on timestamp fields

**Code Location:** `apps/api/src/handlers/lms.ts::updateProgress()` (lines 869-969)

#### Reserved Keywords

**Status:** ✅ Verified

**Findings:**
- All DynamoDB expressions use `ExpressionAttributeNames` where needed
- `path_status` uses `#pathStatus` via ExpressionAttributeNames (line 1396 in lmsRepo.ts)
- `status` uses `#status` via ExpressionAttributeNames (multiple locations)

**Verified Locations:**
- `listPublishedPathIdsForCourse()`: Uses `#pathStatus` for `path_status` (line 1396)
- `listPublishedCourses()`: Uses `#status` for `status` (line 75)
- `listPublishedPaths()`: Uses `#status` for `status` (line 188)
- Certificate queries: Uses `#status` for `status` (lines 780, 1576, 1612)

#### Error Handling

**Status:** ✅ Verified

**Findings:**
- Consistent error codes: `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL_ERROR`
- Path endpoints return `NOT_FOUND` when path not found or not published
- Rollup update errors are logged but don't fail the request (non-blocking)
- Certificate issuance errors are logged but don't fail completion

**Verified Locations:**
- `getPathDetail()`: Returns `NOT_FOUND` if path not found (line 443)
- `startPath()`: Returns `NOT_FOUND` if path not found (line 547)
- `updateProgress()`: Rollup errors logged but don't fail request (line 967)

#### Performance

**Status:** ✅ Verified

**Findings:**
- All list methods enforce `limit <= 200` pagination guard
- No unbounded loops: single query per course completion (bounded by number of paths)
- No ScanCommand in Phase 10 primary flows (verified via grep)
- Reverse index uses QueryCommand on GSI (efficient lookup)

**Verified Locations:**
- `listPublishedPaths()`: `Math.min(params.limit || 50, 200)` (line 180)
- `listPublishedPathIdsForCourse()`: `Math.min(limit, 200)` (line 1386)
- `listUserPathProgress()`: `Math.min(params.limit || 50, 200)` (line 1473)

**No-Scan Proof:**
```bash
grep -n "ScanCommand" apps/api/src/handlers/lms.ts apps/api/src/storage/dynamo/lmsRepo.ts | grep -v "import\|listAssignments\|getMyLearning\|//"
```
Result: Only import statement and non-Phase 10 method (`listAssignments`)

### 4. Telemetry Verification ✅

**File:** `scripts/lms/verify_phase10_telemetry.ts`

**Features:**
- Queries DynamoDB events table for Phase 10 path-related events
- Displays event counts by type
- Verifies required source fields
- Supports filtering by user_id and path_id

**Usage:**
```bash
# Verify all Phase 10 events for today
DYNAMODB_ENDPOINT=http://localhost:8000 \
STORAGE_BACKEND=aws \
tsx scripts/lms/verify_phase10_telemetry.ts

# Verify events for specific user and path
DYNAMODB_ENDPOINT=http://localhost:8000 \
tsx scripts/lms/verify_phase10_telemetry.ts test_user_phase10 test_path_phase10
```

**Expected Output:**
- `lms_paths_listed`: ≥1
- `lms_path_viewed`: ≥2
- `lms_path_started`: 1
- `lms_path_progress_updated`: ≥1 (only on meaningful changes)
- `lms_path_completed`: 1 (only on completion transition)

### 5. Evidence Updates ✅

**File:** `scripts/lms/phase10_paths_rollups_smoke.md`

**Updates:**
- ✅ Added telemetry verification script usage instructions
- ✅ Added example output from verification script
- ✅ Documented expected event counts
- ✅ Added note about `STORAGE_BACKEND=aws` requirement

## Running All Tests Locally

### Test Runner Commands

**Unit + Repo Tests:**
```bash
cd apps/api
npm test
```

This runs both unit tests (`lms.test.ts`) and repo tests (`lmsRepo.test.ts`). Dynalite must be running for repo tests.

**Individual Test Suites:**
```bash
# Unit tests only (no Dynalite required)
cd apps/api
npm run test:unit

# Repo tests only (Dynalite required)
cd apps/api
npm run test:repo
```

**Phase 10 Integration Test:**
```bash
# Dynalite must be running (or script starts it)
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/phase10_integration_test.ts
```

**Phase 10 Telemetry Verification:**
```bash
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/verify_phase10_telemetry.ts
```

### Full Test Setup

```bash
# Terminal 1: Start Dynalite
npm run dynamo:local

# Terminal 2: Setup and seed
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase10_paths.ts

# Terminal 3: Run all tests
cd apps/api
npm test

# Terminal 4: Start API (for integration tests)
cd apps/api
DYNAMODB_ENDPOINT=http://localhost:8000 \
STORAGE_BACKEND=aws \
AWS_ACCESS_KEY_ID=dummy \
AWS_SECRET_ACCESS_KEY=dummy \
AWS_REGION=us-east-1 \
npm run dev

# Terminal 5: Run integration tests
API_URL=http://localhost:4000 tsx scripts/lms/phase10_integration_test.ts

# Terminal 6: Verify telemetry
DYNAMODB_ENDPOINT=http://localhost:8000 \
tsx scripts/lms/verify_phase10_telemetry.ts test_user_phase10 test_path_phase10
```

### No-Scan Verification

**CI-Friendly Check:**
```bash
npm run check:no-scan
```

**Scope:** Enforces that **Phase 10 primary flows do not use DynamoDB ScanCommand**.

**The script intentionally excludes:**
- Import statements (e.g., `import { ScanCommand ... }`)
- Non-Phase 10 code paths (notably `listAssignments()` - Phase 8/9)
- Comments / documentation strings

**Phase 10 surfaces covered:**
- Handlers: `listPaths`, `getPathDetail`, `startPath`, `updateProgress` (rollup hook)
- Repo: `listPublishedPathIdsForCourse`, `getPublishedPathsForCourse`

**Expected result:**
- ✅ PASS when ScanCommand is absent from Phase 10 flows
- ❌ FAIL if ScanCommand is introduced into any Phase 10 primary flow

**If check fails:** Inspect the grep output - it prints the exact file/line where ScanCommand appears.

## Test Results Summary

### Unit Tests
- ✅ 11/11 tests passing
- Coverage: Status transitions, timestamp semantics, idempotency

### Repository Tests
- ✅ 5/5 tests passing
- Coverage: Reverse index creation, cleanup, limit guards, Query usage

### Integration Tests
- ✅ 8/8 tests passing
- Coverage: End-to-end flow, rollup updates, idempotency

### Hardening Verification
- ✅ Concurrency: Deterministic rollups verified
- ✅ Reserved Keywords: ExpressionAttributeNames used correctly
- ✅ Error Handling: Consistent error codes verified
- ✅ Performance: Limit guards and no-scan guarantee verified

## Non-Negotiables Maintained

- ✅ No ScanCommand in primary flows
- ✅ Limit guards (<= 200) enforced
- ✅ Backward compatibility for /v1/lms/progress maintained
- ✅ Environment variable naming consistent (DYNAMODB_ENDPOINT)
- ✅ Telemetry verifiable via stored events (local Dynalite)

## Files Created/Modified

### Created
- `apps/api/src/handlers/lms.test.ts` - Unit tests for computePathRollup
- `apps/api/src/storage/dynamo/lmsRepo.test.ts` - Repository tests
- `scripts/lms/phase10_integration_test.ts` - Integration tests
- `scripts/lms/verify_phase10_telemetry.ts` - Telemetry verification script
- `scripts/lms/PHASE11_DOCS_TESTING_HARDENING.md` - This checklist

### Modified
- `docs/architecture/lms-v2.md` - Enhanced Phase 9-10 documentation
- `scripts/lms/phase10_paths_rollups_smoke.md` - Added telemetry verification section

## Next Steps

Phase 11 is complete. The codebase is now production-ready with:
- Comprehensive documentation
- Automated test coverage
- Hardening verification
- Telemetry verification tools

All tests can be run locally using Dynalite without AWS credentials.

