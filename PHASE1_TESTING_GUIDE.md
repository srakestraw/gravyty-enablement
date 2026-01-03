# Phase 1 Testing Guide: useCourseEditorState Hook

## Overview

Phase 1 created the `useCourseEditorState` hook which provides a single source of truth for course state. This guide explains how to test it.

## The Error You're Seeing

The error in your console is **NOT from Phase 1**. It's from the existing `AdminCourseEditorPage.tsx` component which has a conditional hook call (violating React's Rules of Hooks). Phase 1 is a standalone hook that hasn't been integrated yet.

## Testing Methods

### Method 1: Browser Testing (Recommended for Phase 1)

I've created a test component that you can use in the browser:

1. **Navigate to the test page**:
   - For new course: `http://localhost:3000/enablement/admin/learning/test-course-state/new`
   - For existing course: `http://localhost:3000/enablement/admin/learning/test-course-state/{courseId}`

2. **What to test**:
   - ✅ **New course initialization**: Should see empty course object with `course_id: 'new'`
   - ✅ **State updates**: Click "Set Title: Test Title 1" button - title should update
   - ✅ **State persistence**: Update title, refresh page - state resets (expected for new course)
   - ✅ **Multiple field updates**: Update title and short description - both should persist
   - ✅ **Lessons loading**: For existing courses, lessons should load automatically

3. **Validation Checklist** (shown on the test page):
   - Check each item as you verify it works

### Method 2: Unit Tests (When Test Infrastructure is Set Up)

The unit tests are already written in `apps/web/src/hooks/useCourseEditorState.test.ts`. To run them:

```bash
# Once vitest is configured:
npm test -- useCourseEditorState.test.ts
```

### Method 3: Integration Test Component

You can also create a simple integration test by importing the hook in any component:

```typescript
import { useCourseEditorState } from '../../../hooks/useCourseEditorState';

function MyTestComponent() {
  const { course, updateCourse } = useCourseEditorState({
    courseId: 'new',
    isNew: true,
  });
  
  // Test the hook here
}
```

## What Phase 1 Fixes

✅ **Single Source of Truth**: Course state is managed in one place  
✅ **No Local State in Children**: State flows from parent, preventing loss on unmount  
✅ **Prevents Overwrites**: Uses `isUserEditingRef` to prevent API data overwriting user edits  
✅ **Handles New vs Existing**: Different initialization paths for new vs existing courses  

## Phase 1 Validation Checklist

- [ ] Navigate to test page for new course
- [ ] Verify empty course object is created (`course_id: 'new'`)
- [ ] Click "Set Title" button - verify title updates
- [ ] Update multiple fields - verify all persist
- [ ] For existing course: verify course loads from API
- [ ] For existing course: verify lessons load automatically
- [ ] Verify state updates work correctly
- [ ] Check browser console - no errors from Phase 1 hook

## Next Steps After Phase 1 Validation

Once Phase 1 is validated, we can proceed to:
- **Phase 2**: Validation Hook (fixes validation logic)
- **Phase 3**: Controlled Details Editor (fixes values disappearing)
- **Phase 4**: Actions Hook (fixes save draft)
- **Phase 5-8**: Integration phases

## Troubleshooting

**If you see errors**:
- Check browser console for specific error messages
- Verify you're testing the test component, not the old AdminCourseEditorPage
- The old component has known issues (hooks order error) - that's why we're rebuilding it

**If state doesn't update**:
- Check browser console for errors
- Verify the hook is being called correctly
- Check that `updateCourse` is being called with correct parameters


