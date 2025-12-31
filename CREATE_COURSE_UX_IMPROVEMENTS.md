# Create Course UX Improvements - Implementation Summary

## Plan Overview

### Files Modified
1. **New File**: `apps/web/src/utils/focusRegistry.ts` - Focus registry utility for cross-pane navigation
2. **Modified**: `apps/web/src/validations/lmsValidations.ts` - Enhanced validation model with entityType, entityId, fieldKey
3. **Modified**: `apps/web/src/components/admin/learning/PublishReadinessPanel.tsx` - Clickable items with structured navigation
4. **Modified**: `apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx` - Removed redundant banner, enhanced Add Section flow
5. **Modified**: `apps/web/src/components/admin/learning/OutlinePanel.tsx` - Added selectedSectionId, inline hints, auto-focus
6. **Modified**: `apps/web/src/components/admin/learning/EditorPanel.tsx` - Replaced tabs with breadcrumb, registered fields
7. **Modified**: `apps/web/src/components/admin/learning/LessonEditor.tsx` - Registered fields with focus registry

### Components Added/Changed

#### Focus Registry (`focusRegistry.ts`)
- Singleton utility for registering and focusing fields across panes
- Methods: `register()`, `focus()`, `getFieldsForEntity()`, `clear()`
- Supports entityType ('course' | 'section' | 'lesson'), entityId, and fieldKey

#### Enhanced Validation Model
- `ValidationIssue` now includes:
  - `entityType?: 'course' | 'section' | 'lesson'`
  - `entityId?: string`
  - `fieldKey?: string`
- All validation errors/warnings now include structured entity information

#### PublishReadinessPanel Updates
- Groups issues by entity (Course, Section, Lesson)
- Clickable items that:
  1. Select the entity (via `onSelectEntity` callback)
  2. Focus the exact field (via focus registry)
- Removed redundant "View in Editor" button

#### AdminCourseEditorPage Updates
- Minimized top validation banner (info-level, not warning)
- Enhanced `handleAddSection()`:
  - Creates section with empty title
  - Auto-selects section
  - Clears lesson selection
  - Auto-focuses section title input
- Added `handleSelectEntity()` for navigation
- Passes `validationIssues` and `onSelectEntity` to PublishReadinessPanel

#### OutlinePanel Updates
- Added `selectedSectionId` prop and `onSelectSection` callback
- Visual highlight for selected section (border + background)
- Auto-start editing when section is selected and has no title
- Inline hint for empty sections: "Add a lesson to publish" with "+ Lesson" button
- Section title placeholder: "Untitled section"
- Registers section title fields with focus registry

#### EditorPanel Updates
- Replaced tabs with breadcrumb-style context indicator:
  - "Editing: Course"
  - "Editing: Course > Section: {name}"
  - "Editing: Course > Section: {name} > Lesson: {name}"
- Course fields always visible (not conditionally rendered)
- Section editor shows when section selected (no lesson)
- Lesson editor shows when lesson selected
- Registered course fields (title, short_description, description, cover_image) with focus registry
- Inline field-level error states for required fields

#### LessonEditor Updates
- Registered lesson fields (title, video_media, transcript.full_text) with focus registry
- Inline error states for required fields
- Error message for video lessons without video_media

## Implementation Details

### Focus Registry Pattern
```typescript
// Register a field
const unregister = focusRegistry.register({
  entityType: 'course',
  entityId: course.course_id,
  fieldKey: 'title',
  ref: titleRef,
});

// Focus a field
focusRegistry.focus('course', courseId, 'title');
```

### Validation Structure
Validation issues now include:
- `entityType`: Identifies the entity (course/section/lesson)
- `entityId`: Unique identifier for the entity
- `fieldKey`: The specific field to focus

### Navigation Flow
1. User clicks issue in Publish Readiness panel
2. `handleSelectEntity()` selects the entity (sets selectedSectionId/selectedLessonId)
3. Focus registry focuses the exact field
4. UI updates to show the correct editor context

## Manual Test Checklist

### 1. Validation Banner Reduction
- [ ] Open course editor with validation errors
- [ ] Verify top banner shows info-level message (not warning) with count
- [ ] Verify Publish Readiness panel shows detailed list
- [ ] Verify no duplicate loud error messages

### 2. Publish Readiness Click-to-Navigate
- [ ] Create course with missing title
- [ ] Click "Course title is required" in Publish Readiness panel
- [ ] Verify Title field is focused in center pane
- [ ] Create section without lessons
- [ ] Click section error in Publish Readiness panel
- [ ] Verify section is selected in outline and section title is focused
- [ ] Create lesson without title
- [ ] Click lesson error in Publish Readiness panel
- [ ] Verify lesson is selected and title field is focused

### 3. Add Section Guided Flow
- [ ] Click "Add Section" button
- [ ] Verify new section is created and auto-selected in outline
- [ ] Verify section title input is focused
- [ ] Verify placeholder shows "Untitled section"
- [ ] Type section name and blur
- [ ] Verify section name is saved
- [ ] Verify inline hint appears: "Add a lesson to publish" with "+ Lesson" button

### 4. Empty Section Guidance
- [ ] Create a section with no lessons
- [ ] Verify inline Alert appears under section in outline
- [ ] Verify Alert shows "Add a lesson to publish" message
- [ ] Verify Alert has "Add Lesson" button
- [ ] Click "Add Lesson" button
- [ ] Verify lesson is created and selected

### 5. Context Indicator (Breadcrumb)
- [ ] Open course editor (no section/lesson selected)
- [ ] Verify breadcrumb shows "Editing: Course"
- [ ] Select a section
- [ ] Verify breadcrumb shows "Editing: Course > Section: {name}"
- [ ] Select a lesson
- [ ] Verify breadcrumb shows "Editing: Course > Section: {name} > Lesson: {name}"

### 6. Field Registration and Focus
- [ ] Click course title error in Publish Readiness
- [ ] Verify Title field scrolls into view and is focused
- [ ] Click short description error
- [ ] Verify Short Description field is focused
- [ ] Click section title error
- [ ] Verify section title input in outline is focused
- [ ] Click lesson title error
- [ ] Verify lesson title field in editor is focused

### 7. Inline Field Errors
- [ ] Leave course title empty
- [ ] Verify Title field shows error state with helper text
- [ ] Leave short description empty
- [ ] Verify Short Description shows error state
- [ ] Create video lesson without video
- [ ] Verify Video Media section shows error alert

### 8. Add Lesson Flow
- [ ] Select a section
- [ ] Click "Add Lesson" in outline
- [ ] Verify lesson is created and selected
- [ ] Verify lesson editor appears in center pane
- [ ] Verify breadcrumb updates to show lesson

### 9. Validation Updates Live
- [ ] Fix a validation error (e.g., add course title)
- [ ] Verify error disappears from Publish Readiness panel immediately
- [ ] Verify error count updates
- [ ] Add a new error (e.g., remove title)
- [ ] Verify error appears in panel immediately

### 10. No Dead-End States
- [ ] Create new course
- [ ] Add a section
- [ ] Verify clear next step is shown (Add Lesson CTA)
- [ ] Add a lesson
- [ ] Verify lesson editor appears
- [ ] Verify all required fields are accessible

## Acceptance Criteria Verification

✅ **Single source of truth for validation**: Top banner minimized, Publish Readiness is primary
✅ **Clickable readiness items**: All items navigate to exact field location
✅ **Add Section guided**: Auto-select, auto-focus, clear next steps
✅ **Context clarity**: Breadcrumb shows current editing context
✅ **No backend changes**: All changes are frontend-only
✅ **No dead-end states**: Inline hints guide users to next steps

## Notes

- Focus registry uses a singleton pattern for simplicity
- Ref registration happens when components mount and fields are available
- Validation issues are grouped by entity in Publish Readiness panel
- Section titles use placeholder "Untitled section" until saved
- Course fields remain visible regardless of section/lesson selection
- All navigation preserves existing keyboard navigation support

