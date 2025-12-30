# Phase 8.3 Smoke Test Helper

Quick reference for running the Phase 8.3 in-editor media workflow smoke test.

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
DEV_ROLE_ADMIN="Admin"
DEV_ROLE_APPROVER="Approver"
DEV_USER_ID="test_user_123"

# Test course ID (see "Getting IDs" section below)
COURSE_ID="course_123"

# Test lesson ID (see "Getting IDs" section below)
LESSON_ID="lesson_123"
```

## Getting IDs

### COURSE_ID

**Option 1: From Admin Courses List**
1. Navigate to `/enablement/admin/learning/courses`
2. Find your test course in the list
3. Click the "Edit" button (pencil icon)
4. Copy the `courseId` from the URL: `/enablement/admin/learning/courses/{COURSE_ID}`

**Option 2: From Browser DevTools**
1. Open Admin Courses list page
2. Open DevTools → Network tab
3. Click "Edit" on any course
4. Find the API request to `GET /v1/lms/admin/courses/:courseId`
5. Copy the `courseId` from the request URL or response body

### LESSON_ID

**Known-good method (recommended):**
1. Publish the course (or use an already published course)
2. Navigate to learner course detail: `/enablement/learn/courses/${COURSE_ID}`
3. Click "Start Course" (or click on the first lesson)
4. The lesson player opens with URL: `/enablement/learn/courses/${COURSE_ID}/lessons/{LESSON_ID}`
5. Copy the `lessonId` from the URL

**Alternative: From Course Editor**
1. Open course editor: `/enablement/admin/learning/courses/${COURSE_ID}`
2. Click on a lesson in the left outline panel
3. Open browser DevTools → Network tab
4. Look for API requests containing `lesson_id` in the URL or response
5. Copy the `lesson_id` from the response

## Health Checks (Optional)

Verify API is accessible:

**Note:** If you see `403 Forbidden`, switch the `x-dev-role` header to the required role for that endpoint.

```bash
# Check API health (no auth required)
curl -X GET "${API_URL}/health"

# List courses (verify auth works)
# Required role: Contributor+
curl -X GET "${API_URL}/v1/lms/admin/courses" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_CONTRIBUTOR}" \
  -H "x-dev-user-id: ${DEV_USER_ID}"

# List media (verify media endpoint works)
# Required role: Admin+
curl -X GET "${API_URL}/v1/lms/admin/media?media_type=cover" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "x-dev-role: ${DEV_ROLE_ADMIN}" \
  -H "x-dev-user-id: ${DEV_USER_ID}"
```

## Quick Test Steps

1. **Open Course Editor**
   ```bash
   # Navigate to (matches the route used by the "Edit" button):
   ${WEB_URL}/enablement/admin/learning/courses/${COURSE_ID}
   ```
   **Note:** If your route differs, copy it from the Courses admin list "Edit" button URL.

2. **Test Cover Attachment**
   - Course tab → "Attach Cover" → Upload new
   - **Assert:** Upload completes, modal closes, cover chip appears with filename
   - Refresh page → **Assert:** Cover persists (chip still visible)
   - **Modal Discoverability:** Click "Attach Cover" again → "Select Existing" tab → **Assert:** Uploaded cover appears in list and is selectable

3. **Test Video Attachment**
   - Select lesson → Lesson tab → "Attach Video" → Upload new
   - **Assert:** Upload completes, modal closes, video chip appears with filename
   - Refresh page → **Assert:** Video persists (chip still visible)
   - **Modal Discoverability:** Click "Attach Video" again → "Select Existing" tab → **Assert:** Uploaded video appears in list and is selectable

4. **Test Resources**
   - Lesson tab → Resources → "Add Resource" → Upload new
   - **Assert:** Resource appears in list with filename (not just media_id)
   - Refresh page → **Assert:** Resource persists with filename
   - Add another resource → **Assert:** Both appear in list
   - Remove one resource → **Assert:** Removed from list
   - Refresh → **Assert:** Remaining resource persists, removed one doesn't reappear
   - **Modal Discoverability:** Click "Add Resource" again → "Select Existing" tab → **Assert:** Both uploaded resources appear in list and are selectable

5. **Publish & Verify**
   - Publish course (requires Approver+ role)
   - Navigate to learner view:
     ```bash
     ${WEB_URL}/enablement/learn/courses/${COURSE_ID}
     ```
   - **Assert:** Cover displays (if attached)
   - Open lesson player:
     ```bash
     ${WEB_URL}/enablement/learn/courses/${COURSE_ID}/lessons/${LESSON_ID}
     ```
   - **Note:** Get LESSON_ID from the learner course detail page after clicking "Start Course" (see "Getting IDs" section)
   - **Assert:** Video player displays video (if attached) OR shows "Video not available" placeholder (if not attached)
   - **Assert:** Resources section shows resources with filenames (if attached) OR shows "No resources available" (if none)

## Common Issues

**Upload fails:**
- Check S3 bucket permissions
- Verify presign endpoint: `POST ${API_URL}/v1/lms/admin/media/presign` (requires Admin+ role)
- Check browser console for upload errors

**Media doesn't persist:**
- Check browser console for API errors
- Verify save endpoints return 200:
  - `PUT ${API_URL}/v1/lms/admin/courses/${COURSE_ID}` (requires Contributor+ role)
  - `PUT ${API_URL}/v1/lms/admin/courses/${COURSE_ID}/lessons` (requires Contributor+ role)
- Check Network tab for failed requests

**Media doesn't appear in modal:**
- Check media list endpoint: `GET ${API_URL}/v1/lms/admin/media?media_type=cover|video|attachment` (requires Admin+ role)
- Verify media metadata was written to DynamoDB
- Check browser console for API errors when opening modal

**403 Forbidden errors:**
- Verify your role meets requirements:
  - Contributor+ for course admin operations
  - Admin+ for media operations
  - Approver+ for publishing
- Check `x-dev-role` header matches required role for endpoint

**Can't find COURSE_ID or LESSON_ID:**
- See "Getting IDs" section above
- For LESSON_ID, use the known-good method: publish course → learner view → Start Course → copy from URL
- Use browser DevTools → Network tab to inspect API requests
- Check URL parameters after navigating to editor/player pages

## Full Test

See `PHASE8_SUMMARY.md` → "Phase 8.3 Smoke Test" section for complete step-by-step instructions.
