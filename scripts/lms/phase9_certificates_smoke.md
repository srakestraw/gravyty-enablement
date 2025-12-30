# Phase 9 Certificates v1 Smoke Test

Quick reference for running the Phase 9 Certificates smoke test.

## Local DynamoDB Setup (For Local Testing)

To run the smoke test locally without AWS credentials:

1. **Start DynamoDB Local:**
   ```bash
   docker run -d -p 8000:8000 --name dynamodb-local amazon/dynamodb-local
   ```

2. **Create tables:**
   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/local_dynamo_setup.ts
   ```

3. **Seed test data:**
   ```bash
   DYNAMODB_ENDPOINT=http://localhost:8000 tsx scripts/lms/seed_phase9_certificates.ts
   ```

4. **Start API with local DynamoDB:**
   ```bash
   cd apps/api
   DYNAMODB_ENDPOINT=http://localhost:8000 \
   AWS_ACCESS_KEY_ID=dummy \
   AWS_SECRET_ACCESS_KEY=dummy \
   AWS_REGION=us-east-1 \
   npm run dev
   ```

5. **Set test variables:**
   ```bash
   export API_URL="http://localhost:4000"
   export COURSE_ID="test_course_phase9"
   export LESSON_ID="test_lesson_phase9"
   ```

## Prerequisites

Set these variables for your environment:

```bash
# Local development
API_URL="http://localhost:4000"
WEB_URL="http://localhost:5173"

# Or production/staging
# API_URL="https://api.your-domain.com"
# WEB_URL="https://your-domain.com"

# Auth token (get from browser DevTools → Network → any API request → Headers → Authorization: Bearer <token>
# Copy the token value (without "Bearer " prefix)
AUTH_TOKEN="your_auth_token_here"

# Dev headers for local testing (if using x-dev-role/x-dev-user-id)
DEV_ROLE_CONTRIBUTOR="Contributor"
DEV_ROLE_APPROVER="Approver"
DEV_ROLE_VIEWER="Viewer"
DEV_USER_ID="test_user_123"

# Test course ID (for local testing, use seeded course)
COURSE_ID="test_course_phase9"

# Test lesson ID (for local testing)
LESSON_ID="test_lesson_phase9"

# Test path ID (use an existing published path)
PATH_ID="path_123"
```

## Test Flow

### 1. Admin: Create Certificate Template

```bash
# Create a course completion certificate template
curl -X POST "${API_URL}/v1/lms/admin/certificates/templates" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-dev-role: ${DEV_ROLE_CONTRIBUTOR}" \
  -H "x-dev-user-id: ${DEV_USER_ID}" \
  -d '{
    "name": "Course Completion Certificate",
    "description": "Certificate for completing a course",
    "applies_to": "course",
    "applies_to_id": "'${COURSE_ID}'",
    "badge_text": "Course Completion",
    "signatory_name": "John Doe",
    "signatory_title": "Chief Learning Officer",
    "issued_copy": {
      "title": "Certificate of Completion",
      "body": "has successfully completed this course"
    }
  }'
```

**Expected:** 201 Created with template object

**Save `template_id` from response:**
```bash
TEMPLATE_ID="template_xxx"
```

### 2. Admin: List Templates

```bash
curl -X GET "${API_URL}/v1/lms/admin/certificates/templates" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_CONTRIBUTOR}" \
  -H "x-dev-user-id: ${DEV_USER_ID}"
```

**Expected:** 200 OK with templates array (should include the template you just created)

### 3. Admin: Publish Template (Requires Approver+)

```bash
curl -X POST "${API_URL}/v1/lms/admin/certificates/templates/${TEMPLATE_ID}/publish" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_APPROVER}" \
  -H "x-dev-user-id: ${DEV_USER_ID}"
```

**Expected:** 200 OK with template object (status should be "published")

**Note:** Publish requires Approver+ role. Contributor role will receive 403 Forbidden.

### 4. Learner: Complete Course (Trigger Issuance)

**Via API:**
```bash
# Update progress to complete the lesson (triggers course completion)
curl -X POST "${API_URL}/v1/lms/progress" \
  -H "Content-Type: application/json" \
  -H "x-dev-role: ${DEV_ROLE_VIEWER}" \
  -H "x-dev-user-id: ${DEV_USER_ID}" \
  -d '{
    "course_id": "'${COURSE_ID}'",
    "lesson_id": "'${LESSON_ID}'",
    "percent_complete": 100,
    "completed": true
  }'
```

**Expected:** 200 OK with progress object. Course completion should trigger certificate issuance automatically.

**Note:** For local testing with seeded data, use `COURSE_ID="test_course_phase9"` and `LESSON_ID="test_lesson_phase9"`.

### 5. Learner: List My Certificates

```bash
curl -X GET "${API_URL}/v1/lms/certificates" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_VIEWER}" \
  -H "x-dev-user-id: ${DEV_USER_ID}"
```

**Expected:** 200 OK with certificates array (should include certificate for completed course)

**Save `certificate_id` from response:**
```bash
CERTIFICATE_ID="certificate_xxx"
```

### 6. Learner: Get Certificate Details

```bash
curl -X GET "${API_URL}/v1/lms/certificates/${CERTIFICATE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_VIEWER}" \
  -H "x-dev-user-id: ${DEV_USER_ID}"
```

**Expected:** 200 OK with certificate object including:
- `template_name`
- `recipient_name`
- `course_title` or `path_title`
- `badge_text`
- `issued_at`
- `completion_date`

### 7. Learner: Download Certificate PDF

```bash
curl -X GET "${API_URL}/v1/lms/certificates/${CERTIFICATE_ID}/download" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_VIEWER}" \
  -H "x-dev-user-id: ${DEV_USER_ID}" \
  --output certificate.pdf
```

**Expected:** 200 OK with PDF file (Content-Type: application/pdf)

**Verify PDF:**
- Open `certificate.pdf`
- Should contain: certificate title, learner name, course title, completion date, badge text, signatory info

### 8. UI Verification

**Admin UI:**
1. Navigate to `${WEB_URL}/enablement/admin/learning/certificates`
2. Should see template list with your created template
3. Click "Edit" to verify template details
4. Verify "Publish" and "Archive" buttons work

**Learner UI:**
1. Navigate to `${WEB_URL}/enablement/learn/certificates`
2. Should see "My Certificates" page
3. Should see certificate card with:
   - Template name
   - Badge text chip
   - Course/path title
   - Issued date
   - "Download PDF" button
4. Click "Download PDF" - should download PDF file

### 9. Idempotency Test

**Verify no duplicate certificates:**
1. Complete the same course again (or trigger completion event)
2. List certificates again
3. Should still have only one certificate for that course+template combination

### 10. Path Certificate Test (Optional)

```bash
# Create path certificate template
curl -X POST "${API_URL}/v1/lms/admin/certificates/templates" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-dev-role: ${DEV_ROLE_CONTRIBUTOR}" \
  -H "x-dev-user-id: ${DEV_USER_ID}" \
  -d '{
    "name": "Learning Path Completion Certificate",
    "description": "Certificate for completing a learning path",
    "applies_to": "path",
    "applies_to_id": "'${PATH_ID}'",
    "badge_text": "Path Completion",
    "signatory_name": "Jane Smith",
    "signatory_title": "VP of Enablement",
    "issued_copy": {
      "title": "Learning Path Certificate",
      "body": "has successfully completed this learning path"
    }
  }'

# Publish it, complete the path, verify certificate issuance
```

## Expected Results Summary

✅ **Admin can:**
- Create certificate templates
- List templates
- Edit templates
- Publish templates (Approver+)
- Archive templates

✅ **System automatically:**
- Issues certificates when courses are completed
- Issues certificates when paths are completed
- Prevents duplicate certificates (idempotent)

✅ **Learner can:**
- View their certificates in "My Certificates"
- See certificate details (name, badge, course/path, date)
- Download certificate as PDF

✅ **Telemetry:**
- Events emitted for template actions
- Events emitted for certificate issuance
- Events emitted for certificate downloads

## Troubleshooting

**Certificate not issued after completion:**
- Verify template is `published` (not `draft`)
- Verify `applies_to_id` matches the completed course/path ID
- Check API logs for issuance errors (should not fail completion)

**PDF download fails:**
- Verify certificate exists for the user
- Check API logs for PDF generation errors
- Verify `pdfkit` is installed in API dependencies

**Template not showing in admin UI:**
- Verify RBAC role (Contributor+)
- Check API response for templates
- Verify template was created successfully

## Follow-up Improvements (Phase 9.1 Ideas)

- Path completion detection and certificate issuance
- Certificate template design editor (visual builder)
- Batch certificate issuance for existing completions
- Certificate verification endpoint (public URL with certificate ID)
- Email notifications when certificates are issued
- Certificate expiration/revocation support
- Multiple signatories per certificate
- Custom certificate designs (background images, fonts, layouts)

---

## Phase 9 QA Summary

### What Was Fixed

1. **RBAC Consistency**: Archive endpoint changed from Contributor+ to Approver+ for consistency with publish
2. **Idempotent Issuance**: Implemented deterministic certificate_id using SHA-256 hash (`cert_{hash(user_id|template_id|completion_type|target_id)}`)
3. **Telemetry**: Certificate issuance telemetry only emitted for new certificates (not duplicates)
4. **Telemetry Completeness**: Added `applies_to` and `applies_to_id` to update/publish/archive events
5. **PDF Download**: Added Cache-Control header, verified IDOR protection, safe handling of optional fields
6. **Web Download UX**: Implemented blob flow with error handling (Snackbar notifications)
7. **Data Model**: Added pagination guards (limit 200) to template and certificate list queries
8. **Documentation**: Updated RBAC matrix, idempotency details, path completion scope clarification

### What Remains Intentionally Out of Scope

- **Path Completion Detection**: Explicitly out of scope for Phase 9. Infrastructure supports paths, but automatic issuance on path completion deferred to Phase 9.1
- **Certificate Design Editor**: MVP uses simple PDF generation. Visual design editor planned for Phase 9.1
- **Batch Issuance**: Manual issuance for existing completions not implemented (can be added in Phase 9.1)

### Build Status

- ✅ Domain package builds successfully
- ✅ API typecheck passes
- ✅ API build passes
- ✅ Web build passes
- ⚠️ Web typecheck has unrelated errors in `AdminCourseEditorPage.tsx`, `AdminPathEditorPage.tsx`, `EditorPanel.tsx`, `LessonEditor.tsx` (not Phase 9 related)

