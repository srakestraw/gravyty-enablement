# Course Authoring Layout Refactor

## Summary

Refactored the Course Authoring page to use a cleaner 3-column layout with inline validation only in the editor, and an optional Properties/Issues panel on the right.

## Files Created

1. **`apps/web/src/components/admin/learning/CourseAuthoringLayout.tsx`**
   - 3-column responsive layout component
   - Outline (left, fixed width 300px)
   - Editor (middle, flex)
   - Context Panel (right, collapsible, 320px when open)
   - Toggle button for panel visibility
   - Responsive: drawer on mobile, persistent panel on desktop

2. **`apps/web/src/components/admin/learning/PropertiesPanel.tsx`**
   - Shows context-specific properties for selected node
   - Course: ID, status, version, created date
   - Section: ID, order, lesson count
   - Lesson: ID, type, order, required, created date
   - Only shows metadata not in main editor form

3. **`apps/web/src/components/admin/learning/IssuesPanel.tsx`**
   - Replaces PublishReadinessPanel
   - Groups validation issues by node (Course/Section/Lesson)
   - Clickable issues that navigate to node and focus field
   - Shows error count badge
   - Groups errors and warnings separately

## Files Modified

1. **`apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx`**
   - Added deep linking support with URL params (`?selected=course:ID` or `section:ID` or `lesson:ID`)
   - Added context panel state management (properties/issues modes)
   - Updated to use CourseAuthoringLayout
   - Simplified top banner to show count + "View issues" button
   - Auto-opens Issues panel when validation errors exist
   - Auto-opens Issues panel on publish failure
   - Added Properties button in header
   - Removed old handlers (handleNavigateToIssue, handleSelectEntity)
   - Updated handlePublish to navigate to first error on failure

2. **`apps/web/src/components/admin/learning/EditorPanel.tsx`**
   - Added `onAddLesson` prop for adding lessons from section editor
   - Shows "Add Lesson" button in section editor
   - Only shows inline errors for selected node
   - Breadcrumb shows current editing context

3. **`apps/web/src/components/admin/learning/TreeOutlinePanel.tsx`**
   - Changed error indicator from Chip to small dot (8x8px circle)
   - Shows error dot on nodes with validation issues
   - Tooltip shows error count on hover

## Key Features

### Layout Structure
- **3-column layout**: Outline (300px) + Editor (flex) + Context Panel (320px, collapsible)
- **Responsive**: Drawer on mobile, persistent panel on desktop
- **Collapsible panel**: Hidden by default, opens when needed
- **Toggle button**: Positioned on panel edge for easy access

### Validation UX
- **Inline errors**: Only shown in editor for selected node
- **Top banner**: Simple count + "View issues" button (no duplicate messages)
- **Issues panel**: Groups by node, clickable to navigate
- **Error indicators**: Small dots on outline nodes (not full messages)

### Deep Linking
- **URL format**: `/courses/:courseId/edit?selected=section:SECTION_ID`
- **Persists selection**: Reload keeps selected node
- **Auto-selects**: Course root if no URL param

### Node Selection
- **Single selection**: One node selected at a time
- **Auto-focus**: Title field focused when node selected
- **Keyboard-friendly**: Focus management via focus registry

### Properties Panel
- **Context-specific**: Shows metadata for selected node
- **Toggleable**: Button in header to show/hide
- **Never duplicates**: Only shows properties not in main form

### Issues Panel
- **Auto-opens**: When validation errors exist
- **Auto-closes**: When all errors fixed
- **Groups by node**: Course / Section / Lesson
- **Clickable**: Navigates to node and focuses field

## Manual Test Checklist

### 1. Layout Structure
- [ ] Open course editor
- [ ] Verify 3-column layout: Outline (left), Editor (middle), Context Panel (right)
- [ ] Verify Context Panel is collapsed by default
- [ ] Click toggle button on panel edge
- [ ] Verify panel expands/collapses smoothly
- [ ] Resize browser window
- [ ] Verify responsive behavior (drawer on mobile)

### 2. Deep Linking
- [ ] Open course editor
- [ ] Select a Section node
- [ ] Verify URL updates: `?selected=section:SECTION_ID`
- [ ] Reload page
- [ ] Verify same Section is selected
- [ ] Select Course root
- [ ] Verify URL updates: `?selected=course:COURSE_ID`
- [ ] Copy URL and open in new tab
- [ ] Verify correct node is selected

### 3. Inline Validation
- [ ] Select Course node
- [ ] Leave title empty and blur
- [ ] Verify error appears on Course title field
- [ ] Select Section node
- [ ] Verify Course title error is hidden
- [ ] Leave section name empty and blur
- [ ] Verify error appears on Section name field
- [ ] Verify only selected node shows inline errors

### 4. Top Banner
- [ ] Create course with validation errors
- [ ] Verify top banner shows: "X issues to fix before publish" + "View issues" button
- [ ] Click "View issues" button
- [ ] Verify Issues panel opens
- [ ] Fix all errors
- [ ] Verify banner disappears

### 5. Issues Panel
- [ ] Create course with errors in Course, Section, and Lesson
- [ ] Verify Issues panel auto-opens
- [ ] Verify issues grouped by node
- [ ] Verify node titles in group headers
- [ ] Click a Course issue
- [ ] Verify Course node is selected
- [ ] Verify field is focused
- [ ] Click a Section issue
- [ ] Verify Section node is selected and expanded
- [ ] Verify field is focused
- [ ] Fix all errors
- [ ] Verify Issues panel auto-closes

### 6. Properties Panel
- [ ] Select Course node
- [ ] Click "Properties" button in header
- [ ] Verify Properties panel opens
- [ ] Verify Course metadata shown (ID, status, version, created)
- [ ] Select Section node
- [ ] Verify Properties panel updates to show Section metadata
- [ ] Click "Hide Properties"
- [ ] Verify panel closes
- [ ] Verify Properties and Issues never show simultaneously

### 7. Error Indicators in Outline
- [ ] Create section with validation errors
- [ ] Verify small red dot appears on section node
- [ ] Hover over dot
- [ ] Verify tooltip shows error count
- [ ] Fix errors
- [ ] Verify dot disappears
- [ ] Verify no full error messages in outline

### 8. Add Lesson Flow
- [ ] Select a Section node
- [ ] Verify "Add Lesson" button appears in editor
- [ ] Click "Add Lesson" button
- [ ] Verify lesson created and auto-selected
- [ ] Verify lesson title field is focused
- [ ] Verify lesson appears in outline under section

### 9. Publish with Errors
- [ ] Create course with validation errors
- [ ] Click "Publish" button
- [ ] Verify publish does not proceed
- [ ] Verify Issues panel opens
- [ ] Verify first error node is selected
- [ ] Verify first error field is focused
- [ ] Fix errors and publish again
- [ ] Verify publish succeeds

### 10. Keyboard Focus
- [ ] Select Course node
- [ ] Verify Course title field is focused
- [ ] Select Section node
- [ ] Verify Section name field is focused
- [ ] Select Lesson node
- [ ] Verify Lesson title field is focused

### 11. Auto-Save
- [ ] Select Course node
- [ ] Change course title
- [ ] Switch to Section node
- [ ] Wait 500ms
- [ ] Verify save indicator appears
- [ ] Verify changes are persisted

### 12. No Triple Validation
- [ ] Create course with validation errors
- [ ] Verify errors appear in ONLY 2 places:
  - [ ] Inline field errors (editor)
  - [ ] Issues panel (right)
- [ ] Verify top banner shows ONLY count, not individual issues
- [ ] Verify outline shows ONLY dots, not full messages

## Acceptance Criteria

✅ **No triple validation**: Issues appear in max 2 places (inline + Issues panel)
✅ **Inline errors only**: Editor shows errors only for selected node
✅ **Top banner simplified**: Count + "View issues" button only
✅ **Issues panel**: Groups by node, clickable, auto-opens/closes
✅ **Properties panel**: Context-specific, toggleable, never duplicates form fields
✅ **Deep linking**: URL reflects selection, persists on reload
✅ **Keyboard focus**: Title field focused when node selected
✅ **No regressions**: Existing create/update flows work
✅ **TypeScript builds**: No type errors

## Notes

- Context panel is collapsed by default
- Issues panel auto-opens when errors exist, auto-closes when fixed
- Properties panel must be manually opened via button
- Only one panel mode active at a time (properties OR issues)
- Error indicators in outline are small dots (not chips) to reduce visual noise
- Deep linking format: `?selected={type}:{id}` (e.g., `?selected=section:abc123`)
- Focus registry enables keyboard-friendly navigation from Issues panel to fields
- Auto-save debounce: 500ms for node changes, existing delays for field changes

