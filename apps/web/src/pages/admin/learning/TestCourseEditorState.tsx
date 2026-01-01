/**
 * Test Component for Phase 1, 2 & 3: useCourseEditorState, useCourseValidation, and CourseDetailsEditor
 * 
 * This component allows you to test all phases in the browser.
 * Navigate to: /enablement/admin/learning/test-course-state/new (for new course)
 * or /enablement/admin/learning/test-course-state/{courseId} (for existing course)
 */

import { useState, useRef } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert, Chip, Tabs, Tab } from '@mui/material';
import { useCourseEditorState } from '../../../hooks/useCourseEditorState';
import { useCourseValidation } from '../../../hooks/useCourseValidation';
import { CourseDetailsEditor } from '../../../components/admin/learning/CourseDetailsEditor';
import { useParams } from 'react-router-dom';

export function TestCourseEditorState() {
  const { courseId } = useParams<{ courseId: string }>();
  const isNew = courseId === 'new' || !courseId;
  
  const { course, lessons, loading, error, updateCourse, updateLessons } = useCourseEditorState({
    courseId: courseId || 'new',
    isNew,
  });

  // Phase 2: Validation hook
  const validation = useCourseValidation({
    course,
    lessons,
  });

  // Phase 3: Tab state for testing tab switching
  const [editorTab, setEditorTab] = useState<'details' | 'outline'>('details');
  
  // Refs for CourseDetailsEditor
  const titleRef = useRef<HTMLInputElement>(null);
  const shortDescriptionRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);


  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Phase 1, 2 & 3 Test: State Management, Validation & Controlled Details Editor
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This test component verifies Phase 1 (state management), Phase 2 (validation), and Phase 3 (controlled details editor).
        Use URL: /enablement/admin/learning/test-course-state/new (for new course)
        or /enablement/admin/learning/test-course-state/{'{courseId}'} (for existing course)
      </Alert>

      {/* Loading State */}
      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Loading...
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error.message}
        </Alert>
      )}

      {/* Phase 2: Validation Display */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Phase 2: Validation Hook
        </Typography>
        
        {/* Save Draft Button Test */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Test Save Draft Button (Phase 4)
          </Typography>
          <Button
            variant="contained"
            size="small"
            disabled={!validation.canSave()}
            onClick={() => alert('Save Draft clicked! (This is just a test - no actual save)')}
            sx={{ mr: 2 }}
          >
            Save Draft
          </Button>
          <Typography variant="caption" color="text.secondary">
            Button is {validation.canSave() ? '✅ ENABLED' : '❌ DISABLED'} 
            {!validation.canSave() && ' - Enter a title to enable'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={`Can Save: ${validation.canSave() ? '✅ Yes' : '❌ No'}`}
            color={validation.canSave() ? 'success' : 'error'}
            size="small"
          />
          <Chip
            label={`Can Publish: ${validation.canPublish() ? '✅ Yes' : '❌ No'}`}
            color={validation.canPublish() ? 'success' : 'error'}
            size="small"
          />
          <Chip
            label={`Errors: ${validation.errorsCount}`}
            color={validation.errorsCount > 0 ? 'error' : 'default'}
            size="small"
          />
          <Chip
            label={`Warnings: ${validation.warningsCount}`}
            color={validation.warningsCount > 0 ? 'warning' : 'default'}
            size="small"
          />
        </Box>
        
        {/* Save Validation Errors */}
        {validation.getSaveValidationErrors().length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Save Validation Errors (Title Only):
            </Typography>
            {validation.getSaveValidationErrors().map((error, idx) => (
              <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                {error.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Publish Validation Errors */}
        {validation.getPublishValidationErrors().length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Publish Validation Errors (Full):
            </Typography>
            {validation.getPublishValidationErrors().map((error, idx) => (
              <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                {error.message} ({error.entityType}:{error.entityId}:{error.fieldKey})
              </Alert>
            ))}
          </Box>
        )}

        {/* Publish Validation Warnings */}
        {validation.getPublishValidationWarnings().length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Publish Validation Warnings:
            </Typography>
            {validation.getPublishValidationWarnings().map((warning, idx) => (
              <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                {warning.message}
              </Alert>
            ))}
          </Box>
        )}

        {/* Test hasAttemptedPublish */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => validation.setHasAttemptedPublish(true)}
          >
            Simulate Publish Attempt
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => validation.setHasAttemptedPublish(false)}
          >
            Reset Publish Attempt
          </Button>
          <Typography variant="body2" sx={{ alignSelf: 'center', ml: 2 }}>
            hasAttemptedPublish: {validation.hasAttemptedPublish ? 'true' : 'false'}
          </Typography>
        </Box>

        {/* Test markFieldTouched */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Test markFieldTouched:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => validation.markFieldTouched('course', course?.course_id || 'new', 'title')}
            >
              Mark Title Touched
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => validation.markFieldTouched('course', course?.course_id || 'new', 'short_description')}
            >
              Mark Short Desc Touched
            </Button>
            <Typography variant="body2" sx={{ alignSelf: 'center', ml: 2 }}>
              Touched Fields: {validation.touchedFields.size}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Course State Display */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Phase 1: Course State (Single Source of Truth)
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(course, null, 2)}
          </Typography>
        </Box>

        {/* Test Update Functionality - Direct Updates (Like Real Component) */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Test Direct Updates (Like Real Component):
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Title (updates immediately)"
              value={course?.title || ''}
              onChange={(e) => updateCourse({ title: e.target.value })}
              size="small"
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="Short Description (updates immediately)"
              value={course?.short_description || ''}
              onChange={(e) => updateCourse({ short_description: e.target.value })}
              size="small"
              sx={{ minWidth: 200 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            These fields update the course state directly on change, just like the real component will.
            Watch the validation update in real-time as you type!
          </Typography>
        </Box>

        {/* Quick Test Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => updateCourse({ title: 'Test Title 1' })}
          >
            Set Title: "Test Title 1"
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => updateCourse({ short_description: 'Test Description' })}
          >
            Set Short Description
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => updateCourse({ title: '', short_description: '' })}
          >
            Clear All
          </Button>
        </Box>
      </Paper>

      {/* Lessons State Display */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Lessons State
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          Count: {lessons.length}
        </Typography>
        {lessons.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(lessons, null, 2)}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Phase 3: Course Details Editor with Tabs */}
      {course && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Phase 3: Controlled Details Editor (Tab Switching Test)
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Test Phase 3:</strong> Enter a title in the Details tab, then switch to Outline tab and back.
            The title should persist because CourseDetailsEditor is a controlled component (no local state).
          </Alert>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={editorTab}
              onChange={(_, v) => setEditorTab(v)}
              variant="fullWidth"
            >
              <Tab value="details" label="Details" />
              <Tab value="outline" label="Course Outline" />
            </Tabs>
          </Box>

          {/* Details Tab Content */}
          <Box sx={{ display: editorTab === 'details' ? 'block' : 'none' }}>
            <CourseDetailsEditor
              course={course}
              onUpdateCourse={updateCourse}
              shouldShowError={validation.shouldShowError}
              markFieldTouched={validation.markFieldTouched}
              titleRef={titleRef}
              shortDescriptionRef={shortDescriptionRef}
              descriptionRef={descriptionRef}
            />
          </Box>

          {/* Outline Tab Content */}
          <Box sx={{ display: editorTab === 'outline' ? 'block' : 'none' }}>
            <Alert severity="info">
              Course Outline tab - This is a placeholder for testing tab switching.
              Switch back to Details tab to verify that your entered values persist.
            </Alert>
            <Typography variant="body2" sx={{ mt: 2, fontFamily: 'monospace' }}>
              Current course title: <strong>{course.title || '(empty)'}</strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
              Current short description: <strong>{course.short_description || '(empty)'}</strong>
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Validation Checklist */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
        <Typography variant="h6" gutterBottom>
          Phase 1, 2 & 3 Validation Checklist
        </Typography>
        
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Phase 1: State Management
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <strong>New course initializes:</strong>{' '}
            {isNew && course?.course_id === 'new' ? '✅' : '❌'}
            {isNew && course?.course_id === 'new' && ' Empty course object created'}
          </li>
          <li>
            <strong>State updates work:</strong>{' '}
            {course ? '✅' : '❌'} Try clicking the update buttons above
          </li>
          <li>
            <strong>State persists:</strong>{' '}
            Update title, then refresh page - state should reset (expected for new course)
          </li>
          <li>
            <strong>No local state in child:</strong>{' '}
            ✅ State is managed here, not in child components
          </li>
        </Box>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Phase 2: Validation Logic
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <strong>Save validation (title only):</strong>{' '}
            {validation.canSave() ? '✅ Can save' : '❌ Cannot save'}
            {!validation.canSave() && ' - Enter title to enable save'}
          </li>
          <li>
            <strong>Publish validation (full):</strong>{' '}
            {validation.canPublish() ? '✅ Can publish' : '❌ Cannot publish'}
            {!validation.canPublish() && ` - ${validation.errorsCount} errors to fix`}
          </li>
          <li>
            <strong>hasAttemptedPublish state:</strong>{' '}
            {validation.hasAttemptedPublish ? '✅ Set to true' : '❌ Set to false'}
            {' - Click "Simulate Publish Attempt" to test'}
          </li>
          <li>
            <strong>touchedFields tracking:</strong>{' '}
            ✅ {validation.touchedFields.size} field(s) touched
            {' - Click "Mark Title Touched" to test'}
          </li>
          <li>
            <strong>Validation issues update:</strong>{' '}
            ✅ {validation.totalIssuesCount} total issues
            {' - Update course fields and watch issues change'}
          </li>
        </Box>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Phase 3: Controlled Details Editor
        </Typography>
        <Box component="ul" sx={{ pl: 3 }}>
          <li>
            <strong>Values persist on tab switch:</strong>{' '}
            Enter a title in Details tab, switch to Outline, switch back - title should still be there ✅
          </li>
          <li>
            <strong>Component is always mounted:</strong>{' '}
            CourseDetailsEditor uses display: none instead of conditional rendering ✅
          </li>
          <li>
            <strong>No local state in form fields:</strong>{' '}
            All values come from course prop, updates go through updateCourse callback ✅
          </li>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <strong>Test Scenario:</strong> Enter a title and watch:
          <ul>
            <li>Save validation error disappears</li>
            <li>Can Save changes to ✅</li>
            <li>Errors count decreases</li>
            <li>Publish validation still shows other errors (short_description, sections)</li>
            <li><strong>Phase 3:</strong> Switch tabs - title persists! ✅</li>
          </ul>
        </Alert>
      </Paper>
    </Box>
  );
}

