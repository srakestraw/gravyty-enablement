# Master-Detail Tree Editor Implementation

## Summary

Implemented a unified master-detail tree editor for Courses where Course, Section, and Lesson appear as nodes in a single tree structure. The Course is the root node, with Sections as children and Lessons nested under Sections.

## Files Created/Modified

### New Files
1. **`apps/web/src/types/courseTree.ts`**
   - Unified node model: `CourseTreeNode` type
   - `buildCourseTree()` - Converts Course/Sections/Lessons to tree structure
   - `findNodeById()` - Finds node in tree by ID
   - `flattenTree()` - Flattens tree for iteration
   - Computes `issuesCount` per node from validation issues

2. **`apps/web/src/components/admin/learning/TreeOutlinePanel.tsx`**
   - New tree outline component showing Course as root
   - Nested rendering of Sections and Lessons
   - Inline rename for all node types
   - Expand/collapse for sections
   - Visual indicators for selected node and issue counts
   - Context actions: Add Section, Add Lesson, Rename, Delete

### Modified Files
1. **`apps/web/src/pages/admin/learning/AdminCourseEditorPage.tsx`**
   - Replaced separate `selectedSectionId`/`selectedLessonId` with unified `selectedNodeId`
   - Builds `courseTree` from course data with validation issues
   - Updated handlers to work with node-based selection:
     - `handleAddSection()` - Creates section, auto-selects, focuses title
     - `handleAddLesson()` - Creates lesson, auto-selects, focuses title
     - `handleRenameNode()` - Unified rename handler for all node types
     - `handleDeleteNode()` - Unified delete handler
   - Auto-selects course root on initial load
   - Auto-saves on node change (debounced 500ms)
   - Updated validation to show inline errors only for selected node
   - Updated top banner to show "X issues to fix before publish - View issues"

2. **`apps/web/src/components/admin/learning/EditorPanel.tsx`**
   - Refactored to accept `selectedNode` instead of separate section/lesson props
   - Shows node-specific editor based on `selectedNode.type`:
     - Course editor: title, short description, description, tags, cover, badges, related courses
     - Section editor: name (+ optional description)
     - Lesson editor: uses existing `LessonEditor` component
   - Breadcrumb shows current editing context

3. **`apps/web/src/components/admin/learning/PublishReadinessPanel.tsx`**
   - Groups validation issues by node (Course / Section / Lesson)
   - Shows node titles in grouped headers
   - Deep-links to nodes and fields when clicking issues
   - Accepts `courseTree` prop for node lookup

4. **`apps/web/src/components/admin/learning/LessonEditor.tsx`**
   - Updated to use `NodeType` instead of hardcoded type

## Key Features

### Tree Structure
- **Course** is the root node (always visible)
- **Sections** are children of Course
- **Lessons** are children of Sections (nested)
- Expand/collapse sections to show/hide lessons
- Visual indicators:
  - Selected node: highlighted with border
  - Issue count badges on nodes with validation errors
  - Icons for each node type (Course/Section/Lesson)

### Node Selection
- Single `selectedNodeId` state replaces separate section/lesson selection
- Selecting a node updates editor panel to show that node's fields
- Auto-selects course root on initial load
- Auto-saves when node changes (debounced)

### Add Section Flow
1. Click "Add Section" button
2. Section created with empty title
3. Section auto-selected in tree
4. Section title field auto-focused
5. Enters rename mode immediately

### Add Lesson Flow
1. Select a Section node
2. Click "+" button on section
3. Lesson created with empty title
4. Lesson auto-selected in tree
5. Lesson title field auto-focused in editor

### Validation UX
- **Inline errors**: Only shown for the selected node
- **Top banner**: Single summary "X issues to fix before publish - View issues"
- **Publish Readiness panel**: Groups issues by node, deep-links to fields
- **Issue counts**: Displayed as badges on tree nodes

### Auto-Save
- Debounced auto-save on:
  - Field blur (existing behavior)
  - Node change (new - 500ms debounce)
- Preserves draft state
- No backend API changes

## Node Model

```typescript
interface CourseTreeNode {
  type: 'course' | 'section' | 'lesson';
  id: string;
  parentId: string | null; // null for course root
  title: string;
  orderIndex: number;
  status?: 'draft' | 'published' | 'archived';
  issuesCount?: number; // Computed from validation
  
  // Type-specific data
  courseData?: Course;
  sectionData?: CourseSection;
  lessonData?: Lesson;
  
  // Tree structure
  children?: CourseTreeNode[];
}
```

## Manual Test Checklist

### 1. Tree Structure
- [ ] Open course editor
- [ ] Verify Course appears as root node in tree
- [ ] Verify Sections appear as children of Course
- [ ] Verify Lessons appear nested under Sections
- [ ] Verify sections can be expanded/collapsed
- [ ] Verify issue count badges appear on nodes with errors

### 2. Node Selection
- [ ] Click Course node → Editor shows course fields
- [ ] Click Section node → Editor shows section name field
- [ ] Click Lesson node → Editor shows lesson editor
- [ ] Verify only one node is selected at a time
- [ ] Verify selected node is highlighted

### 3. Add Section
- [ ] Click "Add Section" button
- [ ] Verify new section created and auto-selected
- [ ] Verify section title field is focused
- [ ] Verify rename mode is active
- [ ] Type section name and blur
- [ ] Verify section name is saved

### 4. Add Lesson
- [ ] Select a Section node
- [ ] Click "+" button on section
- [ ] Verify lesson created and auto-selected
- [ ] Verify lesson title field is focused in editor
- [ ] Type lesson name and blur
- [ ] Verify lesson name is saved

### 5. Inline Rename
- [ ] Click edit icon on any node
- [ ] Verify inline text field appears
- [ ] Type new name and press Enter
- [ ] Verify name is updated
- [ ] Press Escape to cancel
- [ ] Verify changes are discarded

### 6. Delete Node
- [ ] Select a Section node
- [ ] Click delete icon
- [ ] Verify section and its lessons are deleted
- [ ] Verify selection moves to Course root
- [ ] Select a Lesson node
- [ ] Click delete icon
- [ ] Verify lesson is deleted
- [ ] Verify selection moves to parent Section

### 7. Validation - Inline Errors
- [ ] Select Course node
- [ ] Leave title empty and blur
- [ ] Verify error appears on Course title field
- [ ] Select Section node
- [ ] Verify Course title error is hidden
- [ ] Leave section name empty and blur
- [ ] Verify error appears on Section name field
- [ ] Select Lesson node
- [ ] Verify Section name error is hidden

### 8. Validation - Top Banner
- [ ] Create course with multiple validation errors
- [ ] Verify top banner shows: "X issues to fix before publish - View issues"
- [ ] Click banner
- [ ] Verify readiness panel scrolls into view
- [ ] Fix all errors
- [ ] Verify banner disappears

### 9. Validation - Publish Readiness Panel
- [ ] Create course with errors in Course, Section, and Lesson
- [ ] Verify readiness panel groups issues by node
- [ ] Verify node titles appear in group headers
- [ ] Click a Course issue
- [ ] Verify Course node is selected
- [ ] Verify field is focused
- [ ] Click a Section issue
- [ ] Verify Section node is selected and expanded
- [ ] Verify field is focused
- [ ] Click a Lesson issue
- [ ] Verify Lesson node is selected
- [ ] Verify field is focused

### 10. Auto-Save
- [ ] Select Course node
- [ ] Change course title
- [ ] Switch to Section node
- [ ] Wait 500ms
- [ ] Verify save indicator appears
- [ ] Verify changes are persisted

### 11. Breadcrumb Context
- [ ] Select Course → Verify "Editing: Course"
- [ ] Select Section → Verify "Editing: Course > Section: {name}"
- [ ] Select Lesson → Verify "Editing: Course > Section: {name} > Lesson: {name}"

### 12. Issue Count Badges
- [ ] Create section with validation errors
- [ ] Verify badge appears on section node showing error count
- [ ] Fix errors
- [ ] Verify badge disappears

## Acceptance Criteria

✅ **Unified tree structure**: Course/Section/Lesson all appear as nodes
✅ **Node selection**: Selecting node updates editor panel
✅ **Add Section**: Auto-creates, selects, focuses title field
✅ **Add Lesson**: Available when Section selected, auto-creates and selects
✅ **Inline validation**: Only for selected node
✅ **Top banner**: Single summary with link to issues
✅ **Publish Readiness**: Groups by node, deep-links correctly
✅ **Auto-save**: On blur and node change
✅ **No API changes**: All changes are client-side composition

## Notes

- Tree structure is built client-side from Course/Sections/Lessons data
- Validation issues are computed per node and displayed as badges
- Focus registry enables deep-linking from readiness panel to fields
- Auto-save debounce: 500ms for node changes, existing delays for field changes
- Section expansion state is managed locally in TreeOutlinePanel
- Node deletion handles cleanup (lessons deleted with section, selection moves to parent)

