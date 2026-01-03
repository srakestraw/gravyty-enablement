# Phase 7 Fixes Summary

## Files Modified

### API (Server-side)

**Modified:**
- `apps/api/src/routes/lmsAdmin.ts` - Changed waive route from `/assignments/:assignmentId/waive` to `/assignments/waive` (query params)
- `apps/api/src/handlers/lmsAdmin.ts` - Updated `waiveAssignment` handler to accept `assignee_user_id` and `sk` query params
- `apps/api/src/storage/dynamo/lmsRepo.ts` - Updated:
  - `listAdminAssignments()` - Now returns `_sk` and `_assignee_user_id` fields
  - `waiveAssignment()` - Changed from scan-based to GetCommand using PK+SK

### Web (Client-side)

**Modified:**
- `apps/web/src/api/lmsAdminClient.ts` - Updated `waiveAssignment()` to accept `assigneeUserId` and `sk` params
- `apps/web/src/pages/admin/learning/AdminLearningAssignmentsPage.tsx` - Updated `handleWaive()` to use new signature

### Documentation

**Modified:**
- `PHASE7_SUMMARY.md` - Updated all curl examples with `x-dev-user-id` header, fixed waive endpoint, added smoke test section

## Key Fixes

### 1. Assignment Waive - Efficient PK+SK Lookup

**Before:** Scan-based lookup by `assignmentId` (inefficient)
**After:** Direct GetCommand using `assignee_user_id` (PK) and `sk` (SK)

**Route Change:**
- Old: `POST /v1/lms/admin/assignments/:assignmentId/waive`
- New: `POST /v1/lms/admin/assignments/waive?assignee_user_id=X&sk=Y`

**List Response Enhancement:**
- Now includes `_sk` and `_assignee_user_id` fields for waive operations
- SK format: `ASSIGNMENT#<assigned_at>#<assignment_id>`

### 2. Dev Auth Headers

All curl examples now include:
- `x-dev-role: Contributor|Approver|Admin` (as appropriate)
- `x-dev-user-id: admin_user_123` (or appropriate user ID)

### 3. Paths POST Schema

Verified schema matches handler:
- `title` (required)
- `description` (optional)
- `short_description` (optional)
- `product_suite` (optional)
- `product_concept` (optional)
- `topic_tags` (optional array)
- `badges` (optional array)
- `courses` (optional array with `course_id`, `order`, `required`, `title_override`)

### 4. Certificate Templates

- Documented as 501 (Not Implemented)
- Endpoints pending implementation

### 5. Media List

- Documented as scan-based filtering (MVP)
- Filters (`media_type`, `course_id`, `lesson_id`) applied client-side after scan
- Storage: `lms_certificates` table, PK=`MEDIA`, SK=`media_id`, `entity_type=MEDIA`

## Updated cURL Examples

### Assignment Waive (Fixed)

```bash
# First, list assignments to get the SK
ASSIGNMENTS=$(curl -s -X GET "http://localhost:4000/v1/lms/admin/assignments?assignee_user_id=user_123" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_123")

# Extract SK from response (format: ASSIGNMENT#<assigned_at>#<assignment_id>)
SK=$(echo $ASSIGNMENTS | jq -r '.data.assignments[0]._sk')
ASSIGNEE_USER_ID=$(echo $ASSIGNMENTS | jq -r '.data.assignments[0]._assignee_user_id')

# Waive assignment using PK+SK
curl -X POST "http://localhost:4000/v1/lms/admin/assignments/waive?assignee_user_id=$ASSIGNEE_USER_ID&sk=$(echo $SK | sed 's/#/%23/g')" \
  -H "x-dev-role: Admin" \
  -H "x-dev-user-id: admin_123"
```

### Paths Create (Verified)

```bash
curl -X POST "http://localhost:4000/v1/lms/admin/paths" \
  -H "x-dev-role: Contributor" \
  -H "x-dev-user-id: admin_123" \
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
```

## Quick Smoke Test Checklist

1. ✅ Create course draft → Publish → Verify in learner catalog
2. ✅ Create assignment → Verify in My Learning Required
3. ✅ Waive assignment → Verify status changes and disappears from Required
4. ✅ Presign media upload → Upload file → Verify in media list

## Verification Status

- ✅ Typecheck: Passes for both API and Web
- ✅ Build: Passes for both API and Web
- ✅ Assignment waive: Uses efficient PK+SK lookup
- ✅ All curl examples include `x-dev-user-id`
- ✅ Documentation updated with correct schemas and storage patterns




