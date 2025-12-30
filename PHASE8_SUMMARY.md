# Phase 8.1 - Hardening (Draft Persistence + Server-side Publish Guards + Quick QA)

## Overview

Phase 8.1 hardens Phase 8 to ensure a real admin authoring session cannot lose work and cannot publish broken content. All fixes are minimal and additive, maintaining backward compatibility.

## Changes Made

### 1. Draft Persistence

#### Course Editor Refresh Test
- ✅ Course editor loads draft data from backend for:
  - Course metadata (title, description, badges, cover image, etc.)
  - Sections (structure and ordering)
  - Lessons (all lesson details including transcripts and resources)

#### Save Draft Persistence
- ✅ "Save Draft" now persists BOTH:
  - Course draft metadata via `PUT /v1/lms/admin/courses/:courseId`
  - Outline + lessons via `PUT /v1/lms/admin/courses/:courseId/lessons`
- ✅ After save, both course and lessons are refetched from backend to ensure UI matches what will be published

#### Autosave Safety
- ✅ Debounced autosave (1000ms for course metadata, 750ms for lessons)
- ✅ Autosave does NOT trigger publish
- ✅ Save status indicator shows "Saving..." during save and "Saved [time]" after successful save
- ✅ Prevents concurrent saves with `isSavingRef` guard

#### Refetch After Save
- ✅ After any save operation, course and lessons are refetched from backend
- ✅ Local state is re-hydrated from server data
- ✅ Ensures UI matches what will be published

### 2. Server-side Publish Guards

#### Course Publish Handler
Added validation in `publishCourse` handler before publishing:
- ✅ Title present
- ✅ Short description present
- ✅ Sections length >= 1
- ✅ Lessons length >= 1
- ✅ Every section has >= 1 lesson_id
- ✅ Every lesson referenced exists

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Course validation failed",
    "details": [
      { "field": "title", "message": "Course title is required" },
      { "field": "sections[0].lessons", "message": "Section \"Introduction\" must have at least one lesson" }
    ]
  },
  "request_id": "abc123"
}
```

#### Path Publish Handler
Added validation in `publishPath` handler before publishing:
- ✅ Title present
- ✅ Courses length >= 1
- ✅ Course IDs are unique

**Error Response Format:**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Path validation failed",
    "details": [
      { "field": "title", "message": "Path title is required" },
      { "field": "courses[1].course_id", "message": "Duplicate course ID: course_123" }
    ]
  },
  "request_id": "abc123"
}
```

### 3. Normalized Lesson Loading

- ✅ Editor uses `GET /v1/lms/admin/courses/:courseId/lessons`
- ✅ Endpoint returns lessons array in correct shape
- ✅ Refresh loads both course and lessons correctly
- ✅ Saved outline persists and displays correctly after refresh

### 4. Files Changed

#### New Files
- `apps/api/src/handlers/lmsAdminValidators.ts` - Server-side validation helpers

#### Modified Files
- `apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx`
  - Added debounced autosave for course metadata (1000ms)
  - Added debounced autosave for lessons (750ms)
  - Added save status indicator ("Saving..." / "Saved [time]")
  - Added refetch after saves to ensure UI matches backend
  - Added cleanup for timeouts on unmount
- `apps/api/src/handlers/lmsAdmin.ts`
  - Added validation to `publishCourse` handler
  - Added validation to `publishPath` handler
- `apps/web/src/pages/admin/learning/AdminPathEditorPage.tsx`
  - Added refetch after save to ensure UI matches backend

## 15-Minute Smoke Test Checklist

### Course Authoring Flow
1. **Create Course Draft**
   - Navigate to `/enablement/admin/learning/courses/new`
   - Enter title: "Test Course"
   - Enter short description: "Test description"
   - Click "Save Draft"
   - ✅ Verify course is created and navigates to editor

2. **Add Outline**
   - Click "Add Section" → Name it "Introduction"
   - Click "Add Lesson" in Introduction section → Name it "Lesson 1"
   - ✅ Verify section and lesson appear in outline
   - ✅ Verify "Saving..." indicator appears briefly
   - ✅ Verify "Saved [time]" indicator appears after save

3. **Refresh Test**
   - Refresh the page (F5)
   - ✅ Verify course title and description persist
   - ✅ Verify section "Introduction" persists
   - ✅ Verify lesson "Lesson 1" persists in outline
   - ✅ Verify no data loss

4. **Attach Media**
   - Click "Attach Cover" → Upload or select cover image
   - ✅ Verify cover image attaches
   - ✅ Verify "Saving..." indicator appears
   - Refresh page
   - ✅ Verify cover image persists after refresh

5. **Edit Lesson**
   - Select "Lesson 1" from outline
   - Edit title to "Updated Lesson 1"
   - Add transcript text
   - ✅ Verify autosave triggers after ~750ms
   - ✅ Verify "Saved [time]" indicator appears
   - Refresh page
   - ✅ Verify lesson changes persist

6. **Publish Validation Test**
   - Try to publish course without title → ✅ Should be blocked by client validation
   - Remove all sections → Try to publish → ✅ Should be blocked
   - Add section back → Try to publish → ✅ Should succeed
   - ✅ Verify published course appears in courses list

7. **Server-side Validation Test**
   - Use API directly to attempt publish with missing title:
     ```bash
     curl -X POST /v1/lms/admin/courses/{courseId}/publish \
       -H "Authorization: Bearer {token}" \
       -H "x-dev-user-id: {userId}"
     ```
   - ✅ Should return 400 with validation error
   - ✅ Error should include details array with field and message

### Path Authoring Flow
1. **Create Path Draft**
   - Navigate to `/enablement/admin/learning/paths/new`
   - Enter title: "Test Path"
   - Click "Save Draft"
   - ✅ Verify path is created

2. **Add Courses**
   - Click "Add Course" → Select a published course
   - ✅ Verify course appears in list
   - ✅ Verify can reorder with Up/Down buttons
   - ✅ Verify can mark as required/optional

3. **Refresh Test**
   - Refresh the page
   - ✅ Verify path title persists
   - ✅ Verify courses list persists
   - ✅ Verify no data loss

4. **Publish Validation Test**
   - Try to publish path without title → ✅ Should be blocked
   - Remove all courses → Try to publish → ✅ Should be blocked
   - Add course back → Try to publish → ✅ Should succeed

### Learner View Test
1. **Published Course Appears**
   - Navigate to learner catalog
   - ✅ Verify published course appears
   - ✅ Verify course can be opened
   - ✅ Verify course player renders without errors
   - ✅ Verify sections and lessons display correctly

## Error Response Examples

### Course Publish Validation Error
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Course validation failed",
    "details": [
      {
        "field": "short_description",
        "message": "Short description is required"
      },
      {
        "field": "sections[0].lessons",
        "message": "Section \"Introduction\" must have at least one lesson"
      }
    ]
  },
  "request_id": "req_abc123"
}
```

### Path Publish Validation Error
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Path validation failed",
    "details": [
      {
        "field": "courses",
        "message": "Path must have at least one course"
      }
    ]
  },
  "request_id": "req_xyz789"
}
```

## Technical Notes

- Autosave debounce delays: 1000ms for course metadata, 750ms for lessons
- Save status indicator shows "Saving..." during active save, "Saved [time]" after successful save
- All saves trigger refetch to ensure UI matches backend state
- Server-side validation runs before publish, even if client validation is bypassed
- Validation errors return 400 status with structured error details

## Phase 8.2 - Authoring UX Polish (Preview, Publish Readiness, Refresh/Discard)

### Overview
Phase 8.2 adds final UX pieces to make the admin authoring experience feel safe and efficient: preview deep-linking, publish readiness panel, and discard/refresh functionality.

### Changes Made

#### 1. Preview as Learner Deep-Link
- ✅ Preview button added to course editor header
- ✅ Behavior:
  - If course has at least 1 lesson: Opens first lesson player (`/enablement/learn/courses/:courseId/lessons/:lessonId`)
  - If no lessons: Opens course detail page (`/enablement/learn/courses/:courseId`)
  - First lesson determined by: section order ASC, lesson order ASC
- ✅ Disabled when course is not published with tooltip: "Course must be published to preview. Publish to see the learner experience."

#### 2. Publish Readiness Panel
- ✅ New component: `apps/web/src/components/admin/learning/PublishReadinessPanel.tsx`
- ✅ Shows:
  - Green "Ready to Publish" chip when no errors
  - Red error count chip when errors exist
  - List of blocking issues (errors) with "Go to" navigation
  - List of recommendations (warnings) for optional improvements
- ✅ Placement:
  - Course Editor: Right sidebar (300px width)
  - Path Editor: Right column in grid layout
- ✅ Navigation:
  - Clicking error items navigates to relevant editor area
  - Lesson errors → Select lesson and open Lesson tab
  - Section errors → Focus outline panel
  - Metadata errors → Scroll to top (Course tab)

#### 3. Discard/Refresh Local Changes
- ✅ "Discard Changes" button added to both course and path editors
- ✅ Behavior:
  - Shows confirmation dialog: "Discard unsaved changes and reload from server?"
  - Cancels any pending autosave timers
  - Refetches course/path + lessons from server
  - Replaces local state with server state
  - Resets save status indicator
- ✅ Disabled during active save operations

#### 4. Validation Improvements
- ✅ Added `ValidationIssue` type with `severity: "error" | "warning"`
- ✅ New functions:
  - `validateCourseDraft()` → Returns `{ errors: ValidationIssue[], warnings: ValidationIssue[] }`
  - `validatePathDraft()` → Returns `{ errors: ValidationIssue[], warnings: ValidationIssue[] }`
- ✅ Backward compatibility maintained:
  - `validateCoursePublish()` and `validatePathPublish()` still return `ValidationResult`
  - `issueToError()` helper converts `ValidationIssue` to `ValidationError`

### Files Changed

**New Files:**
- `apps/web/src/components/admin/learning/PublishReadinessPanel.tsx` - Publish readiness panel component

**Modified Files:**
- `apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx`
  - Updated preview to deep-link to first lesson
  - Added discard changes functionality
  - Added publish readiness panel (right sidebar)
  - Updated validation to use draft validation with warnings
- `apps/web/src/pages/admin/learning/AdminPathEditorPage.tsx`
  - Added discard changes functionality
  - Added publish readiness panel (right column)
  - Updated validation to use draft validation with warnings
- `apps/web/src/validations/lmsValidations.ts`
  - Added `ValidationIssue` type
  - Added `validateCourseDraft()` and `validatePathDraft()` functions
  - Added `issueToError()` helper for backward compatibility

### Preview Behavior Rules

1. **Published Course with Lessons:**
   - Opens first lesson player: `/enablement/learn/courses/:courseId/lessons/:lessonId`
   - First lesson = first lesson in first section (by order)

2. **Published Course without Lessons:**
   - Opens course detail: `/enablement/learn/courses/:courseId`

3. **Draft Course:**
   - Preview button disabled
   - Tooltip: "Course must be published to preview. Publish to see the learner experience."

### Publish Readiness Panel Behavior

- **Ready State:** Green chip "Ready to Publish" + message "All validation checks passed"
- **Error State:** Red chip with error count + list of blocking issues
- **Warning State:** Yellow warnings shown below errors (if any)
- **Navigation:** Clicking error items navigates to relevant editor area
- **View in Editor:** Button scrolls to top if navigation not available

### Discard Changes Behavior

1. Click "Discard Changes" button
2. Confirmation dialog appears
3. On confirm:
   - Cancel pending autosave timers
   - Refetch entity from server (course + lessons OR path)
   - Replace local state with server state
   - Reset save status indicator
4. Any unsaved local edits are lost

### Manual Verification Checklist

**Preview Deep-Link:**
1. Create and publish a course with sections and lessons
2. Click "Preview" button → ✅ Opens first lesson player in new tab
3. Create course without lessons → Publish → Click Preview → ✅ Opens course detail

**Publish Readiness Panel:**
1. Open course editor with validation errors → ✅ Panel shows error count and list
2. Click error item → ✅ Navigates to relevant editor area
3. Fix all errors → ✅ Panel shows "Ready to Publish"
4. Add optional fields → ✅ Warnings appear in panel

**Discard Changes:**
1. Make edits to course (change title, add section)
2. Click "Discard Changes" → ✅ Confirmation dialog appears
3. Confirm → ✅ Course reloads from server, local changes lost
4. Verify unsaved changes are discarded

## Phase 8.3 - In-Editor Media + Resources Workflow (No Page Hops)

### Overview
Phase 8.3 makes course authoring fast by allowing admins to attach cover, lesson video, posters, and resources directly from the Course Editor and Lesson Editor without leaving the page. Media Library remains available, but the primary workflow is now in-editor.

### Changes Made

#### 1. Improved MediaSelectModal
- ✅ Enhanced to accept `courseId` and `lessonId` props
- ✅ Supports "poster" media type (in addition to cover/video/attachment)
- ✅ Passes courseId/lessonId to presign endpoint for proper S3 key structure
- ✅ Upload flow: presign → PUT to S3 → auto-selects newly uploaded media
- ✅ Select flow: filters by media type and optionally by courseId/lessonId

#### 2. Cover Attachment from Course Tab
- ✅ "Attach Cover" button in EditorPanel Course tab
- ✅ Opens MediaSelectModal with `mediaType="cover"` and `courseId`
- ✅ On select: Updates `course.cover_image` and triggers autosave
- ✅ Shows cover filename and URL when attached
- ✅ No navigation to Media Library required

#### 3. Lesson Video Attachment from Lesson Tab
- ✅ "Attach Video" button in LessonEditor
- ✅ Opens MediaSelectModal with `mediaType="video"`, `courseId`, and `lessonId`
- ✅ On select: Updates `lesson.video_media` and triggers autosave
- ✅ Shows video filename and URL when attached
- ✅ Validation: Video lessons require video_media for publish (already enforced)

#### 4. Lesson Resources Attachments
- ✅ "Add Resource" button in LessonEditor resources section
- ✅ Opens MediaSelectModal with `mediaType="attachment"`, `courseId`, and `lessonId`
- ✅ On select: Appends media_id to `lesson.resource_refs` array
- ✅ Improved display: Shows filename and upload date instead of just media_id
- ✅ Remove resource functionality
- ✅ Fetches media details to display friendly names

#### 5. Poster Attachment (Optional Support)
- ✅ MediaSelectModal supports `mediaType="poster"`
- ✅ Can be added to LessonEditor if needed (not currently wired)

### Files Changed

**Modified Files:**
- `apps/web/src/components/admin/learning/MediaSelectModal.tsx`
  - Added `courseId` and `lessonId` props
  - Added support for "poster" media type
  - Passes courseId/lessonId to presign endpoint
- `apps/web/src/components/admin/learning/EditorPanel.tsx`
  - Updated cover attachment to pass `courseId` to modal
  - Improved cover display (shows filename and URL)
- `apps/web/src/components/admin/learning/LessonEditor.tsx`
  - Added `courseId` prop
  - Updated video attachment to pass `courseId` and `lessonId` to modal
  - Improved video display (shows filename and URL)
  - Improved resources display (shows filename and date)
  - Fetches media details for resource_refs to display friendly names
- `apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx`
  - Passes `courseId` to EditorPanel (already done)

### In-Editor Media Workflow

**Cover Attachment:**
1. Course Editor → Course tab → "Attach Cover"
2. Modal opens → Upload new or select existing
3. On select → Cover attached → Autosave triggers
4. Cover persists after refresh

**Lesson Video Attachment:**
1. Course Editor → Select lesson → Lesson tab → "Attach Video"
2. Modal opens → Upload new or select existing
3. On select → Video attached → Autosave triggers
4. Video persists after refresh

**Lesson Resources:**
1. Course Editor → Select lesson → Lesson tab → Resources section → "Add Resource"
2. Modal opens → Upload new or select existing
3. On select → Resource added to list → Autosave triggers
4. Resources persist after refresh

### Learner Rendering Safeguards

- ✅ LessonPlayerPage already handles missing video media with placeholder: "Video not available"
- ✅ LessonPlayerPage displays resources list if available
- ✅ Resources show filename and content_type
- ✅ No signed download logic added (uses existing URL if available)

### Manual Verification Checklist

**Cover Attachment:**
1. Open course editor → Course tab → Click "Attach Cover"
2. Upload new cover image → ✅ Auto-selects and attaches
3. Refresh page → ✅ Cover persists
4. Change cover → Select existing → ✅ Updates correctly

**Lesson Video Attachment:**
1. Select lesson → Lesson tab → Click "Attach Video"
2. Upload new video → ✅ Auto-selects and attaches
3. Refresh page → ✅ Video persists
4. Change video → Select existing → ✅ Updates correctly

**Lesson Resources:**
1. Select lesson → Lesson tab → Resources → Click "Add Resource"
2. Upload new attachment → ✅ Adds to list with filename
3. Add another resource → ✅ Both appear in list
4. Remove resource → ✅ Removes from list
5. Refresh page → ✅ Resources persist

**Persistence Test:**
1. Attach cover, video, and resources
2. Refresh page → ✅ All attachments persist
3. Publish course → ✅ Attachments appear in learner view

## Phase 8.3 Smoke Test (10-15 min)

### Preconditions

**Required Roles:**
- Contributor+ role for creating/editing drafts
- Approver+ role for publishing courses
- Admin+ role for media upload endpoints (if enforced)

**Test Setup:**
1. Ensure you have a test course draft (or create one)
2. Ensure the course has at least one section with one lesson
3. Have test media files ready:
   - Cover image (JPG/PNG, < 5MB recommended)
   - Video file (MP4, < 50MB recommended)
   - Resource file (PDF/DOCX, < 10MB recommended)

**URLs:**
- Admin Course Editor: `/enablement/admin/learning/courses/:courseId`
- Admin Courses List: `/enablement/admin/learning/courses`
- Learner Course Detail: `/enablement/learn/courses/:courseId`
- Learner Lesson Player: `/enablement/learn/courses/:courseId/lessons/:lessonId`

### Test Flow

#### Part 1: Cover Attachment (2-3 min)

1. **Navigate to Course Editor**
   - Go to `/enablement/admin/learning/courses`
   - Click on a draft course (or create new: `/enablement/admin/learning/courses/new`)
   - Verify course editor loads with Course/Section/Lesson tabs

2. **Attach Cover Image**
   - Click "Course" tab (if not already selected)
   - Scroll to "Cover Image" section
   - Click "Attach Cover" button
   - **Verify:** MediaSelectModal opens with "Select Existing" and "Upload New" tabs

3. **Upload New Cover**
   - Click "Upload New" tab
   - Click "Select File" and choose a cover image
   - Verify file name and size display
   - Click "Upload & Select"
   - **Verify:** 
     - Upload completes (no errors)
     - Modal closes automatically
     - Cover chip appears with filename
     - Cover URL displays below chip
     - "Saving..." indicator appears briefly, then "Saved [time]"

4. **Refresh Checkpoint**
   - Refresh the page (F5 or Cmd+R)
   - **Verify:** Cover image persists after refresh
   - **Verify:** Cover filename and URL still display correctly

5. **Change Cover (Select Existing)**
   - Click "Attach Cover" again
   - Click "Select Existing" tab
   - **Verify:** Previously uploaded cover appears in list
   - Select a different cover from the list
   - Click "Select"
   - **Verify:** Cover updates, autosave triggers

6. **Refresh Checkpoint**
   - Refresh the page
   - **Verify:** New cover persists

**Pass Criteria:** Cover attaches, persists after refresh, and appears in modal list.

**Common Failures:**
- Cover doesn't persist → Check browser console for API errors, verify `PUT /v1/lms/admin/courses/:courseId` succeeds
- Cover doesn't appear in modal → Check `GET /v1/lms/admin/media?media_type=cover` response
- Upload fails → Check S3 bucket permissions, verify presign endpoint returns valid URL

---

#### Part 2: Lesson Video Attachment (3-4 min)

1. **Select Lesson**
   - In Course Editor, click on a lesson in the left outline panel
   - **Verify:** Lesson tab becomes enabled and selected
   - **Verify:** Lesson editor shows lesson details

2. **Attach Video**
   - Scroll to "Video Media" section
   - Click "Attach Video" button
   - **Verify:** MediaSelectModal opens with `mediaType="video"`

3. **Upload New Video**
   - Click "Upload New" tab
   - Select a video file
   - Click "Upload & Select"
   - **Verify:**
     - Upload completes (may take longer for large files)
     - Modal closes automatically
     - Video chip appears with filename
     - Video URL displays below chip
     - Autosave triggers

4. **Refresh Checkpoint**
   - Refresh the page
   - **Verify:** Video persists after refresh
   - **Verify:** Video filename and URL still display

5. **Change Video (Select Existing)**
   - Click "Attach Video" again
   - Click "Select Existing" tab
   - **Verify:** Previously uploaded video appears in list
   - Select a different video
   - Click "Select"
   - **Verify:** Video updates, autosave triggers

6. **Refresh Checkpoint**
   - Refresh the page
   - **Verify:** New video persists

**Pass Criteria:** Video attaches, persists after refresh, and appears in modal list.

**Common Failures:**
- Video doesn't persist → Check `PUT /v1/lms/admin/courses/:courseId/lessons` response
- Video doesn't appear in modal → Check `GET /v1/lms/admin/media?media_type=video` response
- Upload timeout → Check file size, verify S3 upload completes before modal closes

---

#### Part 3: Lesson Resources Attachment (3-4 min)

1. **Add First Resource**
   - In Lesson Editor, scroll to "Resources" section
   - Click "Add Resource" button
   - **Verify:** MediaSelectModal opens with `mediaType="attachment"`

2. **Upload New Resource**
   - Click "Upload New" tab
   - Select a resource file (PDF/DOCX)
   - Click "Upload & Select"
   - **Verify:**
     - Upload completes
     - Modal closes automatically
     - Resource appears in list with filename and upload date
     - Attachment icon displays
     - Autosave triggers

3. **Refresh Checkpoint**
   - Refresh the page
   - **Verify:** Resource persists after refresh
   - **Verify:** Resource displays with filename (not just media_id)

4. **Add Second Resource**
   - Click "Add Resource" again
   - Click "Select Existing" tab
   - **Verify:** Previously uploaded resource appears in list
   - Select a different resource
   - Click "Select"
   - **Verify:** Both resources appear in list

5. **Remove Resource**
   - Click delete icon (trash) next to one resource
   - **Verify:** Resource removes from list
   - **Verify:** Autosave triggers

6. **Refresh Checkpoint**
   - Refresh the page
   - **Verify:** Remaining resource persists
   - **Verify:** Removed resource does not reappear

**Pass Criteria:** Resources attach, persist after refresh, display with filenames, and can be removed.

**Common Failures:**
- Resources don't persist → Check `PUT /v1/lms/admin/courses/:courseId/lessons` includes `resource_refs` array
- Resources show media_id instead of filename → Check `useAdminMedia` hook fetches media details, verify media lookup works
- Remove doesn't work → Check `onUpdate` callback removes media_id from array correctly

---

#### Part 4: Publish + Learner View Verification (2-3 min)

1. **Verify Publish Readiness**
   - Check Publish Readiness panel (right sidebar)
   - **Verify:** Shows "Ready to Publish" (green) or lists blocking issues
   - Fix any blocking issues if present

2. **Publish Course**
   - Click "Publish" button (requires Approver+ role)
   - **Verify:** Publish succeeds (no 400 validation errors)
   - **Verify:** Redirects to courses list or shows success message

3. **Verify Learner Course Detail**
   - Navigate to `/enablement/learn/courses/:courseId`
   - **Verify:** Course detail page loads
   - **Verify:** Cover image displays (if attached)
   - **Verify:** Course metadata displays correctly

4. **Verify Learner Lesson Player**
   - Click on the first lesson (or navigate directly)
   - Navigate to `/enablement/learn/courses/:courseId/lessons/:lessonId`
   - **Verify:** Lesson player loads
   - **Verify:** Video player displays video (if attached) OR shows "Video not available" placeholder (if not attached)
   - **Verify:** Resources section shows resources (if attached) OR shows "No resources available" (if none)

5. **Verify Resources Display**
   - If resources were attached, check "Overview" tab
   - **Verify:** Resources list shows filenames
   - **Verify:** Resources are clickable/downloadable (if URLs are accessible)

**Pass Criteria:** Course publishes successfully, learner view renders correctly, media displays or shows appropriate placeholders.

**Common Failures:**
- Publish fails with 400 → Check validation errors in response, verify all required fields present
- Cover doesn't display in learner view → Check `course.cover_image.url` is accessible, verify S3 bucket permissions
- Video doesn't play → Check `lesson.video_media.url` is accessible, verify CORS settings
- Resources don't appear → Check `lesson.resource_refs` array is populated, verify lesson detail endpoint hydrates resources

---

### Pass/Fail Criteria

**Overall Pass:** All parts complete successfully with no blocking issues.

**Part 1 Pass:** Cover attaches, persists after refresh, appears in modal list.
**Part 2 Pass:** Video attaches, persists after refresh, appears in modal list.
**Part 3 Pass:** Resources attach, persist after refresh, display with filenames, can be removed.
**Part 4 Pass:** Course publishes, learner view renders correctly, media displays or shows placeholders.

**Overall Fail:** Any part fails or blocking issues prevent completion.

---

### Troubleshooting

**Where to Look:**

**API Endpoints:**
- `POST /v1/lms/admin/media/presign` - Media upload presign
- `PUT /v1/lms/admin/courses/:courseId` - Course metadata save
- `PUT /v1/lms/admin/courses/:courseId/lessons` - Lessons structure save
- `GET /v1/lms/admin/media?media_type=cover|video|attachment` - Media list
- `POST /v1/lms/admin/courses/:courseId/publish` - Course publish

**Files to Check:**
- `apps/web/src/components/admin/learning/MediaSelectModal.tsx` - Modal behavior
- `apps/web/src/components/admin/learning/EditorPanel.tsx` - Cover attachment
- `apps/web/src/components/admin/learning/LessonEditor.tsx` - Video/resources attachment
- `apps/api/src/handlers/lmsAdmin.ts` - Presign and save handlers
- `apps/api/src/storage/dynamo/lmsRepo.ts` - Data persistence

**Browser Console:**
- Check for JavaScript errors during upload/attach
- Check network tab for failed API requests
- Verify autosave requests complete successfully

**Server Logs:**
- Check for S3 upload errors
- Check for DynamoDB write errors
- Verify presign URL generation succeeds

---

## Next Steps

- Consider adding optimistic updates for better UX
- Consider adding conflict detection if multiple admins edit simultaneously
- Consider adding draft auto-save to localStorage as backup

