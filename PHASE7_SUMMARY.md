# Phase 7 - Learning Admin MVP Implementation Summary

## Phase 7 Fixes Summary

### Issues Fixed

1. **Assignment Waive**: Changed from scan-based lookup to efficient PK+SK lookup
   - Route changed: `POST /v1/lms/admin/assignments/:assignmentId/waive` → `POST /v1/lms/admin/assignments/waive?assignee_user_id=X&sk=Y`
   - List endpoint now returns `_sk` and `_assignee_user_id` fields for waive operations
   - Repository method updated to use GetCommand instead of ScanCommand

2. **Dev Auth Headers**: Added `x-dev-user-id` to all curl examples for local dev

3. **Paths POST**: Verified schema matches handler (fields: title, description, short_description, courses array with course_id, order, required, title_override)

4. **Certificate Templates**: Documented as 501 (Not Implemented) - endpoints pending

5. **Media List**: Documented as scan-based filtering (MVP) with client-side filter application

## Files Created/Modified

### API (Server-side)

**Created:**
- `apps/api/src/routes/lmsAdmin.ts` - Admin API router with RBAC protection
- `apps/api/src/handlers/lmsAdmin.ts` - Admin API handlers (courses, paths, assignments, certificates, media)

**Modified:**
- `apps/api/src/server.ts` - Added admin routes registration
- `apps/api/src/storage/dynamo/lmsRepo.ts` - Added admin repository methods:
  - `createCourseDraft()`
  - `updateCourseDraft()`
  - `updateCourseLessons()`
  - `publishCourse()`
  - `createPathDraft()`
  - `updatePathDraft()`
  - `publishPath()`
  - `createAssignment()`
  - `listAdminAssignments()`
  - `waiveAssignment()`

### Web (Client-side)

**Created:**
- `apps/web/src/api/lmsAdminClient.ts` - Admin API client
- `apps/web/src/hooks/useAdminCourses.ts` - Admin courses hook
- `apps/web/src/hooks/useAdminCourse.ts` - Single admin course hook
- `apps/web/src/hooks/useAdminPaths.ts` - Admin paths hook
- `apps/web/src/hooks/useAdminPath.ts` - Single admin path hook
- `apps/web/src/hooks/useAdminAssignments.ts` - Admin assignments hook
- `apps/web/src/hooks/useAdminCertificateTemplates.ts` - Certificate templates hook
- `apps/web/src/hooks/useAdminMedia.ts` - Media library hook
- `apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx` - Course editor page

**Modified:**
- `apps/web/src/pages/admin/learning/AdminLearningCoursesPage.tsx` - Courses list page
- `apps/web/src/pages/admin/learning/AdminLearningPathsPage.tsx` - Paths list page
- `apps/web/src/pages/admin/learning/AdminLearningAssignmentsPage.tsx` - Assignments page
- `apps/web/src/pages/admin/learning/AdminLearningCertificatesPage.tsx` - Certificate templates page
- `apps/web/src/pages/admin/learning/AdminLearningMediaPage.tsx` - Media library page
- `apps/web/src/App.tsx` - Added course editor route

## Admin API Endpoints

### Courses Admin

**GET /v1/lms/admin/courses**
- List all courses (draft + published)
- Query params: `status`, `product_suite`, `q`
- RBAC: Contributor+

**POST /v1/lms/admin/courses**
- Create new course draft
- RBAC: Contributor+

**GET /v1/lms/admin/courses/:courseId**
- Get course for editing (draft or published)
- RBAC: Contributor+

**PUT /v1/lms/admin/courses/:courseId**
- Update course draft
- RBAC: Contributor+

**PUT /v1/lms/admin/courses/:courseId/lessons**
- Bulk update lessons and sections
- RBAC: Contributor+

**POST /v1/lms/admin/courses/:courseId/publish**
- Publish course draft (creates immutable published snapshot)
- RBAC: Approver+

### Paths Admin

**GET /v1/lms/admin/paths**
- List all paths (draft + published)
- Query params: `status`
- RBAC: Contributor+

**POST /v1/lms/admin/paths**
- Create new path draft
- RBAC: Contributor+

**GET /v1/lms/admin/paths/:pathId**
- Get path for editing (draft or published, with hydrated courses)
- RBAC: Contributor+

**PUT /v1/lms/admin/paths/:pathId**
- Update path draft
- RBAC: Contributor+

**POST /v1/lms/admin/paths/:pathId/publish**
- Publish path draft (creates immutable published snapshot)
- RBAC: Approver+

### Assignments Admin

**GET /v1/lms/admin/assignments**
- List assignments
- Query params: `assignee_user_id`, `status`
- RBAC: Admin+

**POST /v1/lms/admin/assignments**
- Create assignment
- RBAC: Admin+

**POST /v1/lms/admin/assignments/:assignmentId/waive**
- Waive assignment
- RBAC: Admin+

### Certificate Templates Admin

**GET /v1/lms/admin/certificates/templates**
- List certificate templates
- RBAC: Contributor+

**POST /v1/lms/admin/certificates/templates**
- Create certificate template
- RBAC: Contributor+

**GET /v1/lms/admin/certificates/templates/:templateId**
- Get certificate template
- RBAC: Contributor+

**PUT /v1/lms/admin/certificates/templates/:templateId**
- Update certificate template
- RBAC: Contributor+

### Media Library Admin

**GET /v1/lms/admin/media**
- List media metadata
- Query params: `media_type`, `course_id`, `lesson_id`
- RBAC: Admin+

**POST /v1/lms/admin/media/presign**
- Generate pre-signed upload URL
- RBAC: Admin+

## cURL Examples

### Courses Admin

```bash
# List all courses
curl -X GET "http://localhost:4000/v1/lms/admin/courses" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123"

# Create course draft
curl -X POST "http://localhost:4000/v1/lms/admin/courses" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Sales",
    "description": "Learn the fundamentals of sales",
    "short_description": "Sales basics",
    "product_suite": "sales",
    "topic_tags": ["sales", "fundamentals"]
  }'

# Get course for editing
curl -X GET "http://localhost:4000/v1/lms/admin/courses/course_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123"

# Update course draft
curl -X PUT "http://localhost:4000/v1/lms/admin/courses/course_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "description": "Updated description"
  }'

# Update course lessons
curl -X PUT "http://localhost:4000/v1/lms/admin/courses/course_123/lessons" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "sections": [
      {
        "section_id": "section_1",
        "title": "Section 1",
        "order": 0,
        "lesson_ids": ["lesson_1"]
      }
    ],
    "lessons": [
      {
        "lesson_id": "lesson_1",
        "section_id": "section_1",
        "title": "Lesson 1",
        "type": "video",
        "order": 0
      }
    ]
  }'

# Publish course
curl -X POST "http://localhost:4000/v1/lms/admin/courses/course_123/publish" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Approver" \
  -H "x-dev-user-id: admin_user_123"
```

### Paths Admin

```bash
# List all paths
curl -X GET "http://localhost:4000/v1/lms/admin/paths" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123"

# Create path draft
curl -X POST "http://localhost:4000/v1/lms/admin/paths" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sales Mastery Path",
    "description": "Complete sales training path",
    "short_description": "Sales training path",
    "courses": [
      {
        "course_id": "course_123",
        "order": 0,
        "required": true
      }
    ]
  }'

# Get path for editing
curl -X GET "http://localhost:4000/v1/lms/admin/paths/path_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123"

# Update path draft
curl -X PUT "http://localhost:4000/v1/lms/admin/paths/path_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Path Title",
    "courses": [
      {
        "course_id": "course_123",
        "order": 0,
        "required": true
      },
      {
        "course_id": "course_456",
        "order": 1,
        "required": true
      }
    ]
  }'

# Publish path
curl -X POST "http://localhost:4000/v1/lms/admin/paths/path_123/publish" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Approver" \
  -H "x-dev-user-id: admin_user_123"
```

### Assignments Admin

```bash
# List assignments (returns assignments with _sk and _assignee_user_id fields for waive operations)
curl -X GET "http://localhost:4000/v1/lms/admin/assignments?assignee_user_id=user_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user_123"

# List all assignments (scan-based for MVP)
curl -X GET "http://localhost:4000/v1/lms/admin/assignments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user_123"

# Create assignment
curl -X POST "http://localhost:4000/v1/lms/admin/assignments" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_user_id": "user_123",
    "target_type": "course",
    "target_id": "course_123",
    "due_at": "2024-12-31T23:59:59Z",
    "assignment_reason": "required"
  }'

# Waive assignment (requires assignee_user_id and sk from list response)
# Note: The SK format is: ASSIGNMENT#<assigned_at>#<assignment_id>
curl -X POST "http://localhost:4000/v1/lms/admin/assignments/waive?assignee_user_id=user_123&sk=ASSIGNMENT%232024-01-15T10%3A30%3A00.000Z%23assignment_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user_123"
```

### Certificate Templates Admin

**Note:** Certificate template endpoints currently return 501 (Not Implemented). Implementation pending.

```bash
# List templates (returns 501)
curl -X GET "http://localhost:4000/v1/lms/admin/certificates/templates" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123"

# Create template (returns 501)
curl -X POST "http://localhost:4000/v1/lms/admin/certificates/templates" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Completion Certificate",
    "description": "Certificate for completing sales courses",
    "status": "draft"
  }'
```

**When implemented, certificate templates will be stored in `lms_certificates` table with:**
- PK: `TEMPLATE`
- SK: `template_id`
- `entity_type`: `TEMPLATE`

### Media Library Admin

**Note:** Media list uses scan-based filtering (MVP). Filters are applied client-side after scan.

```bash
# List media (scan-based, filters applied client-side)
curl -X GET "http://localhost:4000/v1/lms/admin/media?media_type=cover&course_id=course_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user_123"

# Get presigned upload URL
curl -X POST "http://localhost:4000/v1/lms/admin/media/presign" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_user_123" \
  -H "Content-Type: application/json" \
  -d '{
    "media_type": "cover",
    "course_id": "course_123",
    "filename": "cover.jpg",
    "content_type": "image/jpeg"
  }'

# Upload file using presigned URL (from response)
# Response includes: { upload_url, bucket, key, media_ref }
curl -X PUT "PRESIGNED_URL_FROM_RESPONSE" \
  -H "Content-Type: image/jpeg" \
  --data-binary @cover.jpg
```

**Media metadata storage:**
- Table: `lms_certificates` (reused with entity_type pattern)
- PK: `MEDIA`
- SK: `media_id`
- `entity_type`: `MEDIA`
- Required attributes: `media_id`, `type`, `url`, `course_id` (if applicable), `lesson_id` (if applicable), `filename`, `created_at`

## Quick Smoke Test (Local Dev)

Run these commands in order to verify end-to-end functionality:

```bash
# Set base URL and common headers
BASE_URL="http://localhost:4000"
ADMIN_HEADERS="-H 'x-dev-role: Contributor' -H 'x-dev-user-id: admin_123'"
APPROVER_HEADERS="-H 'x-dev-role: Approver' -H 'x-dev-user-id: admin_123'"
ADMIN_ONLY_HEADERS="-H 'x-dev-role: Admin' -H 'x-dev-user-id: admin_123'"
LEARNER_HEADERS="-H 'x-dev-role: Viewer' -H 'x-dev-user-id: learner_123'"

# 1. Create course draft
COURSE_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/lms/admin/courses" \
  $ADMIN_HEADERS \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "description": "Test course for smoke test",
    "short_description": "Test course"
  }')

COURSE_ID=$(echo $COURSE_RESPONSE | jq -r '.data.course.course_id')
echo "Created course: $COURSE_ID"

# 2. Publish course
curl -X POST "$BASE_URL/v1/lms/admin/courses/$COURSE_ID/publish" \
  $APPROVER_HEADERS

# 3. Verify course appears in learner catalog
curl -s -X GET "$BASE_URL/v1/lms/courses" \
  $LEARNER_HEADERS | jq '.data.courses[] | select(.course_id == "'$COURSE_ID'")'

# 4. Create assignment
ASSIGNMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/lms/admin/assignments" \
  $ADMIN_ONLY_HEADERS \
  -H "Content-Type: application/json" \
  -d '{
    "assignee_user_id": "learner_123",
    "target_type": "course",
    "target_id": "'$COURSE_ID'",
    "assignment_reason": "required"
  }')

ASSIGNMENT_ID=$(echo $ASSIGNMENT_RESPONSE | jq -r '.data.assignment.assignment_id')
ASSIGNEE_USER_ID=$(echo $ASSIGNMENT_RESPONSE | jq -r '.data.assignment.user_id')
ASSIGNED_AT=$(echo $ASSIGNMENT_RESPONSE | jq -r '.data.assignment.assigned_at')
SK="ASSIGNMENT#$ASSIGNED_AT#$ASSIGNMENT_ID"
echo "Created assignment: $ASSIGNMENT_ID"

# 5. Verify assignment appears in learner My Learning
curl -s -X GET "$BASE_URL/v1/lms/me" \
  $LEARNER_HEADERS | jq '.data.required[] | select(.course_id == "'$COURSE_ID'")'

# 6. Waive assignment (URL encode the SK)
SK_ENCODED=$(echo "$SK" | sed 's/#/%23/g')
curl -X POST "$BASE_URL/v1/lms/admin/assignments/waive?assignee_user_id=$ASSIGNEE_USER_ID&sk=$SK_ENCODED" \
  $ADMIN_ONLY_HEADERS

# 7. Verify assignment status changed
curl -s -X GET "$BASE_URL/v1/lms/admin/assignments?assignee_user_id=$ASSIGNEE_USER_ID" \
  $ADMIN_ONLY_HEADERS | jq '.data.assignments[] | select(.assignment_id == "'$ASSIGNMENT_ID'") | .status'

# 8. Presign media upload
PRESIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/lms/admin/media/presign" \
  $ADMIN_ONLY_HEADERS \
  -H "Content-Type: application/json" \
  -d '{
    "media_type": "cover",
    "course_id": "'$COURSE_ID'",
    "filename": "test.jpg",
    "content_type": "image/jpeg"
  }')

UPLOAD_URL=$(echo $PRESIGN_RESPONSE | jq -r '.data.upload_url')
MEDIA_ID=$(echo $PRESIGN_RESPONSE | jq -r '.data.media_ref.media_id')
echo "Got presigned URL for media: $MEDIA_ID"

# 9. Upload file (if you have a test image)
# curl -X PUT "$UPLOAD_URL" \
#   -H "Content-Type: image/jpeg" \
#   --data-binary @test.jpg

# 10. Verify media appears in list
curl -s -X GET "$BASE_URL/v1/lms/admin/media?course_id=$COURSE_ID" \
  $ADMIN_ONLY_HEADERS | jq '.data.media[] | select(.media_id == "'$MEDIA_ID'")'
```

## Manual Verification Checklist

### Admin → Learner Flow

**1. Create Course → Publish → Appears in Learner Catalog**

- [ ] Login as Admin/Contributor
- [ ] Navigate to `/enablement/admin/learning/courses`
- [ ] Click "New Course"
- [ ] Fill in course metadata (title, description, etc.)
- [ ] Click "Save Draft"
- [ ] Verify course appears in admin list with status "draft"
- [ ] Click "Edit" on the course
- [ ] Click "Publish" (requires Approver+ role)
- [ ] Verify course status changes to "published"
- [ ] Login as Viewer (learner)
- [ ] Navigate to `/enablement/learn/courses`
- [ ] Verify published course appears in learner catalog
- [ ] Click on course to view detail page
- [ ] Verify course detail loads correctly

**2. Create Assignment → Appears in My Learning Required → Waive**

- [ ] Login as Admin
- [ ] Navigate to `/enablement/admin/learning/assignments`
- [ ] Click "Create Assignment"
- [ ] Fill in:
  - Assignee User ID (target learner)
  - Target Type: "course"
  - Target ID: (published course ID)
  - Due Date: (optional)
- [ ] Click "Create"
- [ ] Verify assignment appears in admin list (note the `_sk` and `_assignee_user_id` fields in response)
- [ ] Login as the assigned learner (Viewer role)
- [ ] Navigate to `/enablement/learn/my`
- [ ] Verify assignment appears in "Required" section
- [ ] Verify assignment shows correct course and due date
- [ ] Click on assignment to navigate to course detail
- [ ] Login as Admin again
- [ ] Navigate to assignments page
- [ ] Click "Waive" on the assignment
- [ ] Verify assignment status changes to "waived"
- [ ] Verify assignment no longer appears in learner's "Required" section

**3. Create Path → Publish → Appears in Learner Catalog**

- [ ] Login as Admin/Contributor
- [ ] Navigate to `/enablement/admin/learning/paths`
- [ ] Click "New Path"
- [ ] Fill in path metadata
- [ ] Add courses to path (select from published courses)
- [ ] Click "Save Draft"
- [ ] Click "Publish" (requires Approver+ role)
- [ ] Login as Viewer
- [ ] Navigate to `/enablement/learn/paths`
- [ ] Verify published path appears in catalog
- [ ] Click on path to view detail
- [ ] Verify path shows ordered courses

**4. Media Upload → Verify List**

- [ ] Login as Admin
- [ ] Navigate to `/enablement/admin/learning/media`
- [ ] Click "Upload Media"
- [ ] Select media type: "cover"
- [ ] Enter course ID (required for cover type)
- [ ] Select file (e.g., test.jpg)
- [ ] Click "Upload"
- [ ] Verify presigned URL is returned
- [ ] Upload file using presigned URL (PUT request)
- [ ] Verify media appears in media list (scan-based, may take a moment)
- [ ] Filter by course_id and verify media appears

**5. Certificate Template Creation**

- [ ] Login as Admin/Contributor
- [ ] Navigate to `/enablement/admin/learning/certificates`
- [ ] Click "Create Template"
- [ ] Fill in template name and description
- [ ] Click "Create"
- [ ] Verify template appears in list

### RBAC Verification

- [ ] Viewer cannot access admin routes (redirected or 403)
- [ ] Contributor can create/edit drafts but cannot publish
- [ ] Approver can publish drafts
- [ ] Admin can manage assignments and media

### Telemetry Verification

- [ ] Check events table for admin telemetry events:
  - `lms_admin_course_created`
  - `lms_admin_course_updated`
  - `lms_admin_course_published`
  - `lms_admin_path_created`
  - `lms_admin_path_published`
  - `lms_admin_assignment_created`
  - `lms_admin_assignment_waived`
  - `lms_admin_certificate_template_created`
  - `lms_admin_media_presigned`

## Implementation Notes

### Publishing Model
- Drafts can be edited freely
- Publishing creates an immutable snapshot (version increment)
- Published courses/paths cannot be edited in place
- After publishing, draft remains editable for next version
- Learner endpoints only return published items

### Assignment Model
- Assignments stored with PK = `assignee_user_id`, SK = `ASSIGNMENT#<assigned_at>#<assignment_id>`
- Status: `assigned` → `started` → `completed` (or `waived`)
- Overdue computed: `due_at < now && status not in [completed, waived]`
- **Waive operation**: Requires both `assignee_user_id` (PK) and `sk` (SK) for efficient lookup
- List endpoint returns `_sk` and `_assignee_user_id` fields for waive operations

### Media Storage
- Media metadata stored in `lms_certificates` table with `entity_type = 'MEDIA'`
- PK: `MEDIA`, SK: `media_id`
- S3 key convention:
  - `covers/{course_id}/{filename}` (requires `course_id`)
  - `videos/{course_id}/{lesson_id}/{filename}` (requires both `course_id` and `lesson_id`)
  - `posters/{course_id}/{lesson_id}/{filename}` (requires both `course_id` and `lesson_id`)
  - `attachments/{course_id}/{lesson_id}/{filename}` (requires both `course_id` and `lesson_id`)
- **List operation**: Uses scan-based filtering (MVP). Filters (`media_type`, `course_id`, `lesson_id`) are applied client-side after scan.

### Certificate Templates
- **Status**: Endpoints currently return 501 (Not Implemented)
- **Planned storage**: `lms_certificates` table with `entity_type = 'TEMPLATE'`
- **Planned keys**: PK = `TEMPLATE`, SK = `template_id`
- No issuance in Phase 7 (learner certificates list remains empty)

## Phase 8 - Admin Authoring UX (Course Editor, Path Editor, Validation, Media Attach)

### Overview
Phase 8 transforms the Phase 7 Learning Admin MVP into a usable authoring experience (LinkedIn Learning-style modeling) without changing the core architecture. Focus is on UX, correctness, and guardrails.

### Key Improvements

#### 1. Course Editor v2
- **Structured UI**: Replaced JSON-based editing with a visual outline builder
- **Layout**: Left panel (outline) + Right panel (editor tabs: Course/Section/Lesson)
- **Capabilities**:
  - Course metadata editing (title, descriptions, badges, topic tags, cover image, related courses)
  - Outline builder: Add/rename/reorder sections and lessons
  - Lesson editor: Title, description, duration, video media, transcript, resources
  - Auto-save on field changes
  - Preview as learner (opens published course in new tab)

#### 2. Lesson Editor v2
- Transcript editor with autosave (debounced)
- Resources list UI: Add/remove resources, edit display names
- Video media attachment via MediaSelectModal

#### 3. Path Editor v2
- Course list builder with reordering (Up/Down buttons)
- Add/remove courses from published courses list
- Mark courses as required/optional
- Path metadata editing (title, description, topic tags)

#### 4. Validation + Publish Gating
- **Client-side validation** (`apps/web/src/validations/lmsValidations.ts`):
  - Course validation: title, short_description, sections, lessons, ordering, media requirements
  - Path validation: title, courses, uniqueness, ordering
- **Publish button disabled** until validations pass
- **Validation errors displayed** inline and in "Publish readiness" panel

#### 5. Media Attach UX Improvements
- Media Library: Filter by type (cover/video/attachment), copy MediaRef JSON
- MediaSelectModal component: Upload new or select existing media
- Course editor: "Attach Cover" modal filters cover images
- Lesson editor: Video and resource attachment modals filter by type

### Files Created/Modified

#### New Files
- `apps/web/src/validations/lmsValidations.ts` - Validation helpers
- `apps/web/src/components/admin/learning/MediaSelectModal.tsx` - Media selection modal
- `apps/web/src/components/admin/learning/OutlinePanel.tsx` - Course outline builder
- `apps/web/src/components/admin/learning/EditorPanel.tsx` - Editor panel with tabs
- `apps/web/src/components/admin/learning/LessonEditor.tsx` - Lesson editor component
- `apps/web/src/pages/admin/learning/AdminPathEditorPage.tsx` - Path editor page

#### Modified Files
- `apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx` - Complete refactor with new UI
- `apps/web/src/pages/admin/learning/AdminLearningMediaPage.tsx` - Improved UX with filtering
- `apps/web/src/api/lmsAdminClient.ts` - Added `getCourseLessons()` method
- `apps/web/src/App.tsx` - Added path editor route
- `apps/api/src/handlers/lmsAdmin.ts` - Added `getAdminCourseLessons()` handler
- `apps/api/src/routes/lmsAdmin.ts` - Added GET `/courses/:courseId/lessons` route

### Validation Rules

#### Course Publish Validation
- Title and short_description required
- At least 1 section
- Each section has title and at least 1 lesson
- Each lesson has title
- Video lessons must have media_ref set
- Transcript full_text must be non-empty if provided
- No duplicate lesson_ids within a course
- Ordering is contiguous (0..n-1) for sections and lessons

#### Path Publish Validation
- Title required
- At least 1 course in path
- Course IDs are unique
- Ordering is contiguous (0..n-1)

### Authoring Workflow

1. **Create Course Draft**
   - Navigate to Courses → New Course
   - Enter title and short description (required)
   - Add sections and lessons via outline builder
   - Edit lesson details (title, video, transcript, resources)
   - Attach cover image and media

2. **Save Draft**
   - Auto-saves on field changes
   - Manual "Save Draft" button for explicit saves
   - Available to Contributor+ role

3. **Publish Course**
   - Validations must pass
   - Publish button disabled until valid
   - Available to Approver+ role
   - Creates immutable published snapshot

4. **Create Path**
   - Navigate to Learning Paths → New Path
   - Enter title (required)
   - Add courses from published courses list
   - Reorder courses and mark required/optional
   - Save draft and publish

### Media Attachment Flow

1. **Upload Media**
   - Media Library → Upload Media
   - Select type (cover/video/attachment)
   - Upload file (auto-uploads to S3)
   - Copy MediaRef JSON if needed

2. **Attach to Course**
   - Course Editor → Course tab → "Attach Cover"
   - MediaSelectModal opens with cover images filtered
   - Select existing or upload new

3. **Attach to Lesson**
   - Lesson Editor → "Attach Video" or "Add Resource"
   - MediaSelectModal opens with appropriate type filter
   - Select or upload, auto-attaches to lesson

### API Changes

**New Endpoint:**
- `GET /v1/lms/admin/courses/:courseId/lessons` - Get all lessons for a course

### Next Steps (Future Phases)

- Assignment bulk operations
- Certificate template design editor
- Admin analytics dashboard
- Drag-and-drop reordering (optional enhancement)
- Transcript segments editor UI (currently supports full_text only)

