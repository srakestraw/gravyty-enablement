# Phase 9 Certificates v1 - Local DynamoDB Setup Guide

This guide enables running Phase 9 Certificates smoke tests locally without AWS credentials using DynamoDB Local.

## What Was Changed

### 1. DynamoDB Client Support for Local Endpoint
**File:** `apps/api/src/aws/dynamoClient.ts`
- Added support for `DYNAMODB_ENDPOINT` environment variable
- When set, configures client to use local DynamoDB endpoint
- Uses dummy credentials when endpoint is provided (sufficient for local DynamoDB)

### 2. Local Table Setup Script
**File:** `scripts/lms/local_dynamo_setup.ts`
- Creates required tables for Phase 9 testing:
  - `lms_courses` (with PublishedCatalogIndex GSI)
  - `lms_lessons` (with LessonByIdIndex GSI)
  - `lms_progress` (with CourseProgressByCourseIndex GSI)
  - `lms_certificates` (with TemplatesByUpdatedIndex and IssuedCertificatesByUserIndex GSIs)
  - `events` (for telemetry)
- Idempotent: skips tables that already exist

### 3. Test Data Seed Script
**File:** `scripts/lms/seed_phase9_certificates.ts`
- Seeds deterministic test data:
  - Course: `test_course_phase9` (published)
  - Lesson: `test_lesson_phase9` (video type)
- Prints IDs for use in smoke test

### 4. Updated Smoke Test Documentation
**File:** `scripts/lms/phase9_certificates_smoke.md`
- Added "Local DynamoDB Setup" section at top
- Updated course completion step with API example
- Added note about seeded test data IDs

## Quick Start

### Step 1: Start DynamoDB Local
```bash
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
```

### Step 2: Create Tables
```bash
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
```

### Step 3: Seed Test Data
```bash
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase9_certificates.ts
```

Output will show:
```
✅ Test data seeded successfully!

Test Data IDs:
  COURSE_ID="test_course_phase9"
  LESSON_ID="test_lesson_phase9"
```

### Step 4: Start API with Local DynamoDB
```bash
cd apps/api
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=dummy \
AWS_SECRET_ACCESS_KEY=dummy \
AWS_REGION=us-east-1 \
npm run dev
```

### Step 5: Set Test Variables
```bash
export API_URL="http://localhost:4000"
export COURSE_ID="test_course_phase9"
export LESSON_ID="test_lesson_phase9"
export DEV_ROLE_CONTRIBUTOR="Contributor"
export DEV_ROLE_APPROVER="Approver"
export DEV_ROLE_VIEWER="Viewer"
export DEV_USER_ID="test_user_123"
```

### Step 6: Run Smoke Test
Follow `scripts/lms/phase9_certificates_smoke.md` starting from step 1.

## Verification Checklist

After setup, verify:
- [ ] API health check: `curl http://localhost:4000/v1/lms/health`
- [ ] Course appears in catalog: `curl "http://localhost:4000/v1/lms/courses" -H "x-dev-role: Viewer"`
- [ ] Course detail accessible: `curl "http://localhost:4000/v1/lms/courses/test_course_phase9" -H "x-dev-role: Viewer"`

## Troubleshooting

**Docker not running:**
- Start Docker Desktop or use alternative DynamoDB Local setup

**Tables already exist:**
- Script will skip existing tables (safe to re-run)

**API can't connect to DynamoDB:**
- Verify `DYNAMODB_ENDPOINT` is set correctly
- Check DynamoDB Local is running: `docker ps | grep dynamodb-local`
- Test connection: `aws dynamodb list-tables --endpoint-url http://localhost:8000` (if AWS CLI installed)

**Seed script fails:**
- Ensure tables are created first (run `local_dynamo_setup.ts`)
- Check table names match env vars (defaults: `lms_courses`, `lms_lessons`)

## Cleanup

To reset test data:
```bash
# Stop and remove DynamoDB Local container
docker stop dynamodb-local
docker rm dynamodb-local

# Restart and recreate
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase9_certificates.ts
```

## Next Steps

Once local setup is complete:
1. Execute full smoke test from `scripts/lms/phase9_certificates_smoke.md`
2. Capture evidence (curl responses, headers, event payloads)
3. Update `scripts/lms/phase9_certificates_qa_report.md` with E2E results

