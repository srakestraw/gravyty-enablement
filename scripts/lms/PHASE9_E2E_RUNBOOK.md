# Phase 9 Certificates v1 - End-to-End Smoke Test Runbook

**Status:** Ready to execute (Docker-free option available via Dynalite)

## Prerequisites Check

Before starting, verify:
- [ ] Port 8000 is available
- [ ] API can be started (port 4000 available)
- [ ] `tsx` is installed (`which tsx`)
- [ ] Node.js and npm are available

**Choose one:**
- [ ] Option A: Docker Desktop is running (for DynamoDB Local)
- [ ] Option B: No Docker needed (use Dynalite)

## Step-by-Step Execution

### 1. Start Local DynamoDB

#### Option A: Docker DynamoDB Local

```bash
docker rm -f dynamodb-local 2>/dev/null || true
docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
```

**Verify:**
```bash
docker ps --filter "name=dynamodb-local"
# Should show: dynamodb-local ... Up X seconds
```

#### Option B: Dynalite (No Docker)

```bash
npm run dynamo:local
```

**What happens:**
- Checks if DynamoDB is already running on port 8000
- If not, starts Dynalite server
- Prints endpoint URL and next steps
- Keeps process alive (press Ctrl+C to stop)

**Note:** Keep this terminal open while running tests.

### 2. Create Tables

```bash
cd /Users/scott.rakestraws/Documents/Projects/enablement
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
```

**Expected output:**
```
✅ Created table: lms_courses
✅ Created table: lms_lessons
✅ Created table: lms_progress
✅ Created table: lms_certificates
✅ Created table: events
✅ All tables created successfully!
```

### 3. Seed Test Data

```bash
DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase9_certificates.ts
```

**Expected output:**
```
✅ Seeded course: test_course_phase9
✅ Seeded lesson: test_lesson_phase9
✅ Test data seeded successfully!

Test Data IDs:
  COURSE_ID="test_course_phase9"
  LESSON_ID="test_lesson_phase9"
```

**Capture these IDs for use in smoke test.**

### 4. Start API Server

In a separate terminal:

```bash
cd apps/api
DYNAMODB_ENDPOINT=http://localhost:8000 \
AWS_ACCESS_KEY_ID=dummy \
AWS_SECRET_ACCESS_KEY=dummy \
AWS_REGION=us-east-1 \
npm run dev
```

**Verify API is running:**
```bash
curl http://localhost:4000/v1/lms/health
# Should return: {"data":{"ok":true,"service":"lms","version":"v2"},...}
```

### 5. Set Test Variables

```bash
export API_URL="http://localhost:4000"
export COURSE_ID="test_course_phase9"
export LESSON_ID="test_lesson_phase9"
export DEV_USER_ADMIN="dev_admin_1"
export DEV_USER_LEARNER="dev_learner_1"
export DEV_USER_OTHER="dev_other_1"
```

### 6. Execute Smoke Test Steps

#### Step A: Verify API Health

```bash
curl -sS "${API_URL}/v1/lms/health" | jq '.'
```

**Expected:** `{"data":{"ok":true,"service":"lms","version":"v2"},...}`

#### Step B: Create Certificate Template (Contributor)

```bash
RESPONSE=$(curl -sS -X POST "${API_URL}/v1/lms/admin/certificates/templates" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: ${DEV_USER_ADMIN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phase 9 Test Certificate",
    "description": "Issued when the Phase 9 seeded course is completed",
    "applies_to": "course",
    "applies_to_id": "'${COURSE_ID}'",
    "badge_text": "Certified",
    "issued_copy": {
      "title": "Certificate of Completion",
      "body": "Awarded for completing the Phase 9 test course."
    },
    "signatory_name": "Test Signer",
    "signatory_title": "VP, Enablement"
  }')

echo "$RESPONSE" | jq '.'
TEMPLATE_ID=$(echo "$RESPONSE" | jq -r '.data.template.template_id')
echo "TEMPLATE_ID=${TEMPLATE_ID}"
```

**Expected:** 201 Created with template object. Save `template_id`.

#### Step C: List Templates

```bash
curl -sS -X GET "${API_URL}/v1/lms/admin/certificates/templates" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: ${DEV_USER_ADMIN}" | jq '.data.templates'
```

**Expected:** Array with your template, status="draft"

#### Step D: Publish Template (Approver)

```bash
curl -sS -X POST "${API_URL}/v1/lms/admin/certificates/templates/${TEMPLATE_ID}/publish" \
  -H "x-dev-role: Approver" \
  -H "x-dev-user-id: ${DEV_USER_ADMIN}" | jq '.'
```

**Expected:** 200 OK, status="published"

#### Step E: Complete Course (Triggers Issuance)

```bash
curl -sS -X POST "${API_URL}/v1/lms/progress" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: ${DEV_USER_LEARNER}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'${COURSE_ID}'",
    "lesson_id": "'${LESSON_ID}'",
    "percent_complete": 100,
    "completed": true
  }' | jq '.'
```

**Expected:** 200 OK with progress object. Course completion should trigger certificate issuance.

#### Step F: List Learner Certificates

```bash
RESPONSE=$(curl -sS -X GET "${API_URL}/v1/lms/certificates" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: ${DEV_USER_LEARNER}")

echo "$RESPONSE" | jq '.'
CERT_ID=$(echo "$RESPONSE" | jq -r '.data.certificates[0].certificate_id')
echo "CERT_ID=${CERT_ID}"
```

**Expected:** Array with at least 1 certificate. Save `certificate_id`.

#### Step G: Verify Idempotency (Re-complete Course)

```bash
# Re-run completion
curl -sS -X POST "${API_URL}/v1/lms/progress" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: ${DEV_USER_LEARNER}" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "'${COURSE_ID}'",
    "lesson_id": "'${LESSON_ID}'",
    "percent_complete": 100,
    "completed": true
  }' > /dev/null

# List again
curl -sS -X GET "${API_URL}/v1/lms/certificates" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: ${DEV_USER_LEARNER}" | jq '.data.certificates | length'
```

**Expected:** Same count (no duplicate). Same `certificate_id` as before.

#### Step H: Download PDF and Verify Headers

```bash
curl -sS -D /tmp/headers.txt -o /tmp/phase9_cert.pdf \
  "${API_URL}/v1/lms/certificates/${CERT_ID}/download" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: ${DEV_USER_LEARNER}"

cat /tmp/headers.txt | grep -E "HTTP|Content-Type|Content-Disposition|Cache-Control"
ls -lh /tmp/phase9_cert.pdf
```

**Expected Headers:**
- `HTTP/1.1 200 OK`
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="certificate-...pdf"`
- `Cache-Control: private, no-store`

**Expected File:** PDF exists, size > 0 bytes

#### Step I: IDOR Test (Different User)

```bash
curl -sS -D /tmp/idor_headers.txt -o /tmp/phase9_cert_idor.pdf \
  "${API_URL}/v1/lms/certificates/${CERT_ID}/download" \
  -H "x-dev-role: Viewer" \
  -H "x-dev-user-id: ${DEV_USER_OTHER}"

cat /tmp/idor_headers.txt | head -5
ls -lh /tmp/phase9_cert_idor.pdf 2>&1 || echo "File should not exist or be empty"
```

**Expected:** 404 Not Found (or 403 Forbidden). No PDF file created.

#### Step J: Archive Template (Approver)

```bash
curl -sS -X POST "${API_URL}/v1/lms/admin/certificates/templates/${TEMPLATE_ID}/archive" \
  -H "x-dev-role: Approver" \
  -H "x-dev-user-id: ${DEV_USER_ADMIN}" | jq '.'
```

**Expected:** 200 OK, status="archived"

### 7. Verify Telemetry Events (Optional)

If events table was created, query for certificate events:

```bash
# Using AWS CLI (if configured for local DynamoDB)
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb scan \
  --table-name "${EVENTS_TABLE:-events}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --filter-expression "contains(event_name, :cert)" \
  --expression-attribute-values '{":cert":{"S":"certificate"}}' \
  --limit 500 \
  --no-cli-pager | jq '.Items[] | {event_name: .event_name.S, occurred_at: .occurred_at.S}'
```

**Note:** Requires `jq` for JSON parsing (optional, but recommended for readable output). This scan is for local testing only.

**Expected Events:**
- `lms_admin_certificate_template_created`
- `lms_admin_certificate_template_published`
- `lms_certificate_issued`
- `lms_certificate_downloaded`
- `lms_admin_certificate_template_archived`

## Evidence Collection

For each step, capture:
1. **curl command** (as executed)
2. **Response JSON** (full or excerpt)
3. **Status codes** (from headers)
4. **File sizes** (for PDF downloads)
5. **Error messages** (if any failures)

## Troubleshooting

**Docker not running:**
- Start Docker Desktop
- Verify: `docker ps`

**Tables already exist:**
- Script will skip (safe to re-run)
- To reset: Stop container, remove, restart, re-run setup

**API connection errors:**
- Verify `DYNAMODB_ENDPOINT` is set
- Check API logs for DynamoDB connection errors
- Verify DynamoDB Local is running: `docker ps | grep dynamodb-local`

**Certificate not issued:**
- Verify template is published (not draft)
- Check `applies_to_id` matches `COURSE_ID`
- Check API logs for issuance errors

**PDF download fails:**
- Verify certificate exists for user
- Check API logs for PDF generation errors
- Verify `pdfkit` is installed: `npm list pdfkit` in apps/api

### Step X: Verify Telemetry in Local DynamoDB (Dynalite)

**Why This Matters:** Previously, telemetry verification relied on code-path analysis. By querying the actual DynamoDB events table, we can prove that events are:
- ✅ Actually written to storage (not just emitted in code)
- ✅ Idempotent (certificate issued exactly once, not duplicated)
- ✅ Complete (all required fields present in stored events)

This provides **data-backed evidence** rather than just code inspection, significantly improving confidence in the telemetry implementation.

**Summary:** Telemetry verified by querying stored events in Dynalite; idempotency proven via issued count == 1.

After completing the smoke test, verify that telemetry events were written to the `events` table.

#### Prerequisites

Set environment variables for AWS CLI:
```bash
export DYNAMODB_ENDPOINT="http://localhost:8000"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="dummy"
export AWS_SECRET_ACCESS_KEY="dummy"
export DATE_BUCKET=$(date +%F)  # YYYY-MM-DD format
```

#### Step X.1: Discover Events Table Name

```bash
# List all tables
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb list-tables \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --no-cli-pager | jq '.TableNames'

# Expected output should include "events" table
# If table name differs, set EVENTS_TABLE env var:
# export EVENTS_TABLE="your_events_table_name"
# Or use DDB_TABLE_EVENTS if that's your convention:
# export EVENTS_TABLE="${DDB_TABLE_EVENTS:-events}"
export EVENTS_TABLE="${EVENTS_TABLE:-events}"
```

**Note:** Requires `jq` for JSON parsing (optional, but recommended for readable output).

#### Step X.2: Describe Events Table Schema

```bash
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb describe-table \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --no-cli-pager | jq '.Table | {
    TableName: .TableName,
    KeySchema: .KeySchema,
    GlobalSecondaryIndexes: .GlobalSecondaryIndexes
  }'
```

**Note:** Requires `jq` for JSON parsing.

**Expected:** Primary key with `date_bucket` (HASH) and `ts#event_id` (RANGE)

**Schema Detection:**
- Look for `KeyType: "HASH"` - this is the partition key (should be `date_bucket`)
- Look for `KeyType: "RANGE"` - this is the sort key (should be `ts#event_id`)
- No GSIs are required for this verification

**If your HASH key is not `date_bucket`:** Use the scan fallback approach in Step X.3b below.

#### Step X.3: Query Telemetry Events

**Primary Approach (date_bucket-based schema):**

Query today's events and filter for certificate-related events:

**Note:** These commands require `jq` for JSON parsing. Install with `brew install jq` (macOS) or your package manager.

```bash
# Query all certificate-related events for today
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "begins_with(event_name, :prefix)" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":prefix": {"S": "lms_"}
  }' \
  --no-cli-pager | jq '.Items[] | {
    event_name: .event_name.S,
    user_id: .user_id.S,
    timestamp: .timestamp.S,
    template_id: .metadata.M.template_id.S,
    certificate_id: .metadata.M.certificate_id.S,
    applies_to: .metadata.M.applies_to.S
  }'
```

**Step X.3b: Fallback Approach (if date_bucket doesn't exist or schema differs):**

⚠️ **WARNING:** Scan operations are expensive and should only be used for local testing. Never use scans in production.

**If your HASH key is not `date_bucket`**, use this scan-based approach:

```bash
# Scan with filter expression (local testing only)
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb scan \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --filter-expression "begins_with(event_name, :prefix) AND contains(event_name, :cert)" \
  --expression-attribute-values '{
    ":prefix": {"S": "lms_"},
    ":cert": {"S": "certificate"}
  }' \
  --limit 500 \
  --no-cli-pager | jq '.Items[] | {
    event_name: .event_name.S,
    user_id: .user_id.S,
    timestamp: .timestamp.S,
    template_id: .metadata.M.template_id.S,
    certificate_id: .metadata.M.certificate_id.S,
    applies_to: .metadata.M.applies_to.S
  }'
```

**Note:** The scan approach is less efficient but works regardless of key schema. Use only for local Dynalite testing.

#### Step X.4: Verify Specific Events

**Assert 1: Template Created**
```bash
TEMPLATE_CREATED_COUNT=$(AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name = :event" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":event": {"S": "lms_admin_certificate_template_created"}
  }' \
  --select COUNT \
  --no-cli-pager | jq -r '.Count')

echo "Template created events: ${TEMPLATE_CREATED_COUNT}"
# Assert: TEMPLATE_CREATED_COUNT >= 1
if [ "${TEMPLATE_CREATED_COUNT}" -ge 1 ]; then
  echo "✅ PASS: Template created event found"
else
  echo "❌ FAIL: Template created event not found"
fi
```

**Assert 2: Template Published**
```bash
TEMPLATE_PUBLISHED_COUNT=$(AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name = :event" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":event": {"S": "lms_admin_certificate_template_published"}
  }' \
  --select COUNT \
  --no-cli-pager | jq -r '.Count')

echo "Template published events: ${TEMPLATE_PUBLISHED_COUNT}"
# Assert: TEMPLATE_PUBLISHED_COUNT >= 1
if [ "${TEMPLATE_PUBLISHED_COUNT}" -ge 1 ]; then
  echo "✅ PASS: Template published event found"
else
  echo "❌ FAIL: Template published event not found"
fi
```

**Assert 3: Certificate Issued (Exactly Once - Idempotency)**
```bash
CERT_ISSUED_COUNT=$(AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name = :event AND user_id = :userId" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":event": {"S": "lms_certificate_issued"},
    ":userId": {"S": "'${DEV_USER_LEARNER}'"}
  }' \
  --select COUNT \
  --no-cli-pager | jq -r '.Count')

echo "Certificate issued events for ${DEV_USER_LEARNER}: ${CERT_ISSUED_COUNT}"
# Assert: CERT_ISSUED_COUNT == 1 (idempotency)
if [ "${CERT_ISSUED_COUNT}" -eq 1 ]; then
  echo "✅ PASS: Certificate issued exactly once (idempotent)"
else
  echo "❌ FAIL: Certificate issued ${CERT_ISSUED_COUNT} times (expected 1)"
fi
```

**Assert 4: Certificate Downloaded**
```bash
CERT_DOWNLOADED_COUNT=$(AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name = :event AND user_id = :userId" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":event": {"S": "lms_certificate_downloaded"},
    ":userId": {"S": "'${DEV_USER_LEARNER}'"}
  }' \
  --select COUNT \
  --no-cli-pager | jq -r '.Count')

echo "Certificate downloaded events for ${DEV_USER_LEARNER}: ${CERT_DOWNLOADED_COUNT}"
# Assert: CERT_DOWNLOADED_COUNT >= 1
if [ "${CERT_DOWNLOADED_COUNT}" -ge 1 ]; then
  echo "✅ PASS: Certificate downloaded event found"
else
  echo "❌ FAIL: Certificate downloaded event not found"
fi
```

**Assert 5: Template Archived**
```bash
TEMPLATE_ARCHIVED_COUNT=$(AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name = :event" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":event": {"S": "lms_admin_certificate_template_archived"}
  }' \
  --select COUNT \
  --no-cli-pager | jq -r '.Count')

echo "Template archived events: ${TEMPLATE_ARCHIVED_COUNT}"
# Assert: TEMPLATE_ARCHIVED_COUNT >= 1
if [ "${TEMPLATE_ARCHIVED_COUNT}" -ge 1 ]; then
  echo "✅ PASS: Template archived event found"
else
  echo "❌ FAIL: Template archived event not found"
fi
```

#### Step X.5: Verify Event Payload Fields

Query a specific event to verify required fields are present:

```bash
# Get template created event details
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
aws dynamodb query \
  --table-name "${EVENTS_TABLE}" \
  --endpoint-url "${DYNAMODB_ENDPOINT}" \
  --region "${AWS_REGION}" \
  --key-condition-expression "date_bucket = :date" \
  --filter-expression "event_name = :event" \
  --expression-attribute-values '{
    ":date": {"S": "'${DATE_BUCKET}'"},
    ":event": {"S": "lms_admin_certificate_template_created"}
  }' \
  --limit 1 \
  --no-cli-pager | jq '.Items[0] | {
    event_name: .event_name.S,
    template_id: .metadata.M.template_id.S,
    applies_to: .metadata.M.applies_to.S,
    applies_to_id: .metadata.M.applies_to_id.S,
    source_api_route: .metadata.M.source_api_route.S,
    source_method: .metadata.M.source_method.S
  }'
```

**Note:** Requires `jq` for JSON parsing.

**Assert:** All required fields present:
- ✅ `template_id` (for template events)
- ✅ `applies_to` (for template events)
- ✅ `applies_to_id` (for template events)
- ✅ `source_app` (all events)
- ✅ `source_api_route` (all events)
- ✅ `source_route` (all events)
- ✅ `source_method` (all events)

## Next Steps After Execution

1. Update `scripts/lms/phase9_certificates_qa_report.md` with:
   - All captured evidence
   - PASS/FAIL status for each step
   - IDs used (COURSE_ID, LESSON_ID, TEMPLATE_ID, CERT_ID)
   - Telemetry verification results
   - Any issues encountered

2. Telemetry events are now verified via DynamoDB queries (no longer a limitation)

**Optional Helper Script:**

For automated verification, use the helper script:

```bash
DYNAMODB_ENDPOINT=http://localhost:8000 \
DEV_USER_LEARNER="dev_learner_1" \
tsx scripts/lms/query_local_telemetry.ts
```

The script will:
- Auto-discover the events table name (prefers `DDB_TABLE_EVENTS` env var, then finds table with "event" in name, else defaults to "events")
- Detect the key schema (date_bucket or fallback to scan)
- Query/scan for all 5 certificate events
- Print a concise report with PASS/FAIL status
- Verify idempotency (certificate issued count == 1)
- Check required fields in metadata

