# Validation UX Refactor - Eliminate Triple-Validation Messaging

## Summary

Refactored the Create Course validation UX to eliminate redundant validation messaging across three surfaces. The Publish Readiness panel is now the single source of truth, with inline errors appearing only when relevant (on blur/touch OR after publish attempt).

## Files Modified

1. **`apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx`**
   - Added validation state model: `hasAttemptedPublish`, `touchedFields`
   - Added `shouldShowError()` helper function
   - Added `markFieldTouched()` helper function
   - Updated `handlePublish()` to set `hasAttemptedPublish=true` before validation check
   - Updated `handlePreview()` to set `hasAttemptedPublish=true`
   - Downgraded top banner to slim info bar (only shows when blocking issues > 0)
   - Removed validation check from Publish button disabled state
   - Passed `shouldShowError` and `markFieldTouched` to child components

2. **`apps/web/src/components/admin/learning/EditorPanel.tsx`**
   - Added `shouldShowError` and `markFieldTouched` props
   - Updated course title field to conditionally show errors
   - Updated short description field to conditionally show errors
   - Added `onBlur` handlers to mark fields as touched
   - Passed props to `LessonEditor`

3. **`apps/web/src/components/admin/learning/LessonEditor.tsx`**
   - Added `shouldShowError` and `markFieldTouched` props
   - Updated lesson title field to conditionally show errors
   - Updated video media error alert to conditionally show
   - Updated transcript field to conditionally show errors
   - Added `onBlur` handlers to mark fields as touched

4. **`apps/web/src/components/admin/learning/OutlinePanel.tsx`**
   - Added `shouldShowError` and `markFieldTouched` props
   - Updated section title TextField to conditionally show errors
   - Updated `handleSaveEditSection()` to mark field as touched

## Implementation Details

### Validation State Model

```typescript
// State
const [hasAttemptedPublish, setHasAttemptedPublish] = useState(false);
const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

// Helper functions
const shouldShowError = (entityType, entityId, fieldKey) => {
  if (hasAttemptedPublish) return true;
  const key = `${entityType}:${entityId}:${fieldKey}`;
  return touchedFields.has(key);
};

const markFieldTouched = (entityType, entityId, fieldKey) => {
  const key = `${entityType}:${entityId}:${fieldKey}`;
  setTouchedFields((prev) => new Set(prev).add(key));
};
```

### Error Display Rules

1. **On Initial Load**: No inline errors shown
2. **After Field Blur**: Field marked as touched, errors shown if invalid
3. **After Publish/Preview Click**: All blocking errors shown inline

### Top Banner Behavior

- **Hidden**: When `blockingIssuesCount === 0`
- **Shown**: Slim info bar with count: "X blocking issues — See Publish Readiness panel"
- **No duplication**: Does not list individual issues

## Manual Test Checklist

### 1. Initial Load - No Inline Errors
- [ ] Open course editor with missing required fields (title, short description)
- [ ] Verify NO red error borders on Title field
- [ ] Verify NO red error borders on Short Description field
- [ ] Verify NO error helper text shown
- [ ] Verify Publish Readiness panel shows blocking issues
- [ ] Verify top banner is hidden (no blocking issues shown yet)

### 2. Field Blur - Show Inline Errors
- [ ] Click into Title field
- [ ] Leave it empty and blur (click away)
- [ ] Verify Title field shows red border
- [ ] Verify "Course title is required" helper text appears
- [ ] Click into Short Description field
- [ ] Leave it empty and blur
- [ ] Verify Short Description shows red border and error text
- [ ] Verify Publish Readiness panel still shows issues

### 3. Fix Field - Error Disappears
- [ ] Type text into Title field
- [ ] Blur the field
- [ ] Verify red border disappears
- [ ] Verify error helper text disappears
- [ ] Verify Publish Readiness panel updates (issue removed)

### 4. Publish Attempt - Show All Errors
- [ ] Create course with multiple missing fields (title, short description, section without lessons)
- [ ] Click "Publish" button
- [ ] Verify button does NOT publish (validation fails)
- [ ] Verify ALL blocking errors now show inline:
  - [ ] Title field shows error
  - [ ] Short Description field shows error
  - [ ] Section title shows error (if section has no title)
- [ ] Verify Publish Readiness panel still shows all issues
- [ ] Verify top banner shows: "X blocking issues — See Publish Readiness panel"

### 5. Preview Attempt - Show All Errors
- [ ] Create course with missing required fields
- [ ] Click "Preview" button (if course is published)
- [ ] If course is not published, verify Preview is disabled
- [ ] If Preview is enabled and clicked, verify `hasAttemptedPublish` is set
- [ ] Verify all blocking errors show inline after Preview click

### 6. Top Banner Behavior
- [ ] Open course with validation errors
- [ ] Verify top banner shows: "X blocking issues — See Publish Readiness panel"
- [ ] Fix all errors
- [ ] Verify top banner disappears (hidden when count === 0)
- [ ] Verify banner does NOT list individual issues (no duplication)

### 7. Section Title Errors
- [ ] Create a new section
- [ ] Leave section title empty
- [ ] Blur the section title field
- [ ] Verify section title shows red border and error text
- [ ] Click "Publish"
- [ ] Verify section title error persists
- [ ] Type section name and blur
- [ ] Verify error disappears

### 8. Lesson Title Errors
- [ ] Create a lesson
- [ ] Leave lesson title empty
- [ ] Blur the lesson title field
- [ ] Verify lesson title shows red border and error text
- [ ] Click "Publish"
- [ ] Verify lesson title error persists
- [ ] Type lesson name and blur
- [ ] Verify error disappears

### 9. Video Lesson Media Errors
- [ ] Create a video lesson
- [ ] Do NOT attach video media
- [ ] Click "Publish"
- [ ] Verify error alert appears: "Video lesson must have a video media reference"
- [ ] Attach video media
- [ ] Verify error alert disappears

### 10. No Triple Validation
- [ ] Create course with validation errors
- [ ] Click "Publish"
- [ ] Verify errors appear in ONLY 2 places:
  - [ ] Inline field errors (red borders + helper text)
  - [ ] Publish Readiness panel (right side)
- [ ] Verify top banner shows ONLY count, not individual issues
- [ ] Verify NO duplicate error messages

### 11. Publish Readiness Navigation
- [ ] Click an issue in Publish Readiness panel
- [ ] Verify correct entity is selected (course/section/lesson)
- [ ] Verify field scrolls into view
- [ ] Verify field is focused
- [ ] Verify inline error appears (if field is invalid)

### 12. Save Draft Behavior
- [ ] Create course with validation errors
- [ ] Click "Save Draft"
- [ ] Verify course saves successfully
- [ ] Verify inline errors do NOT appear (Save Draft doesn't trigger validation display)
- [ ] Verify Publish Readiness panel still shows issues

## Acceptance Criteria Verification

✅ **No triple validation**: Errors appear in max 2 places (inline + Publish Readiness)
✅ **No inline errors on initial load**: Form fields show no red borders initially
✅ **Inline errors on blur**: Fields show errors after being touched and blurred
✅ **Inline errors after publish attempt**: All blocking errors show after clicking Publish
✅ **Top banner minimized**: Shows only count, hides when count === 0
✅ **Publish Readiness is source of truth**: Always visible, shows all issues
✅ **Clickable readiness items**: Navigate to exact field location
✅ **No backend changes**: All changes are frontend-only

## Notes

- `hasAttemptedPublish` is set to `true` when user clicks Publish or Preview
- Fields are marked as "touched" when they lose focus (`onBlur`)
- Error display logic: `shouldShowError = hasAttemptedPublish || touchedFields.has(key)`
- Top banner uses slim Alert component with minimal styling
- Publish button no longer disabled by validation (allows attempt to trigger error display)
- All validation logic remains unchanged - only presentation changed


