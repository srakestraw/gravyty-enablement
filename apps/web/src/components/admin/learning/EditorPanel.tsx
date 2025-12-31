/**
 * Editor Panel Component
 * 
 * Right panel with tabs for Course/Section/Lesson editing
 */

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Chip,
  Button,
  Paper,
  Autocomplete,
  Typography,
  IconButton,
  Tooltip,
  InputBase,
  CircularProgress,
} from '@mui/material';
import {
  Image as ImageIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  InfoOutlined as InfoIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  Visibility as PreviewIcon,
  CheckCircle as SavedIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { LessonEditor } from './LessonEditor';
import { DetailsDrawer } from './DetailsDrawer';
import { RichTextEditor } from '../../common/RichTextEditor';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Course, CourseSection, Lesson } from '@gravyty/domain';
import type { CourseTreeNode, NodeType } from '../../../types/courseTree';

export interface EditorPanelProps {
  course: Course | null;
  selection: { kind: 'course_details' | 'section' | 'lesson'; id?: string } | null;
  selectedNode: CourseTreeNode | null; // For sections/lessons only
  publishedCourses: Array<{ course_id: string; title: string }>;
  onUpdateCourse: (updates: Partial<Course>) => void;
  onUpdateSection: (sectionId: string, updates: Partial<CourseSection>) => void;
  onUpdateLesson: (updates: Partial<Lesson>) => void;
  onAddLesson: (sectionId: string) => void;
  shouldShowError?: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: NodeType, entityId: string, fieldKey: string) => void;
  // Header props
  isNew?: boolean;
  saving?: boolean;
  lastSaved?: Date | null;
  publishing?: boolean;
  onSave?: () => void;
  onPublish?: () => void;
  onPreview?: () => void;
  onDiscardChanges?: () => void;
  onCancel?: () => void;
  issuesCount?: number;
  onOpenInspector?: () => void;
}

export function EditorPanel({
  course,
  selection,
  selectedNode,
  publishedCourses,
  onUpdateCourse,
  onUpdateSection,
  onUpdateLesson,
  onAddLesson,
  shouldShowError,
  markFieldTouched,
  isNew = false,
  saving = false,
  lastSaved = null,
  publishing = false,
  onSave,
  onPublish,
  onPreview,
  onDiscardChanges,
  onCancel,
  issuesCount = 0,
  onOpenInspector,
}: EditorPanelProps) {
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  
  // Refs for focus registry
  const titleRef = useRef<HTMLInputElement>(null);
  const shortDescriptionRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);

  // Register course fields with focus registry
  useEffect(() => {
    if (!course) return;

    const unregisters: Array<() => void> = [];

    if (titleRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'title',
        ref: titleRef,
      }));
    }

    if (shortDescriptionRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'short_description',
        ref: shortDescriptionRef,
      }));
    }

    if (descriptionRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'description',
        ref: descriptionRef,
      }));
    }

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [course?.course_id]);

  // Course metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [relatedCourseIds, setRelatedCourseIds] = useState<string[]>([]);

  // Track the last synced course ID to avoid overwriting user input
  const lastSyncedCourseIdRef = useRef<string | null>(null);
  
  // Sync state with course (only when course ID changes, indicating a new course was loaded)
  useEffect(() => {
    if (course && course.course_id !== lastSyncedCourseIdRef.current) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setShortDescription(course.short_description || '');
      setRelatedCourseIds(course.related_course_ids || []);
      lastSyncedCourseIdRef.current = course.course_id;
    }
  }, [course?.course_id]);

  // Handle inline title edit
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (course) {
      setEditingTitle(course.title || '');
    }
  }, [course?.title]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (course && editingTitle !== course.title) {
      handleCourseFieldChange('title', editingTitle);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingTitle(course?.title || '');
      setIsEditingTitle(false);
    }
  };

  const handleCourseFieldChange = (field: string, value: any) => {
    if (!course) return;
    onUpdateCourse({ [field]: value });
  };

  if (!course) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Course data not available
        </Typography>
      </Box>
    );
  }

  const status = course?.status || 'draft';
  const statusColor = status === 'published' ? 'success' : 'default';
  const statusLabel = status === 'published' ? 'Published' : 'Draft';

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          p: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Title + Chips (can wrap) */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: 1,
              minWidth: 240, // Minimum width for title
              flexWrap: 'wrap',
            }}
          >
            {/* Title */}
            {selection?.kind === 'course_details' && course ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto', minWidth: 200 }}>
                {isEditingTitle ? (
                  <InputBase
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    sx={{
                      fontSize: '1.5rem',
                      fontWeight: 500,
                      flex: 1,
                      minWidth: 0,
                      '& input': { p: 0 },
                    }}
                    autoFocus
                  />
                ) : (
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 500,
                      cursor: 'text',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setIsEditingTitle(true)}
                    title={course.title || 'Untitled Course'}
                  >
                    {course.title || 'Untitled Course'}
                  </Typography>
                )}
              </Box>
            ) : selectedNode ? (
              <Typography variant="h6" sx={{ fontWeight: 500, flex: '0 0 auto' }}>
                {selectedNode.title || 'Untitled'}
              </Typography>
            ) : (
              <Typography variant="h6" color="text.secondary" sx={{ flex: '0 0 auto' }}>
                Select a node to edit
              </Typography>
            )}

            {/* Chips group - can wrap */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
                flex: '0 0 auto',
              }}
            >
              {/* Status Chip */}
              {course && (
                <Chip
                  label={statusLabel}
                  size="small"
                  color={statusColor}
                  variant={status === 'published' ? 'filled' : 'outlined'}
                  sx={{ flexShrink: 0 }}
                />
              )}

              {/* Details Chip - only show for course details */}
              {selection?.kind === 'course_details' && course && (
                <Chip
                  label="Details"
                  size="small"
                  variant={detailsDrawerOpen ? 'filled' : 'outlined'}
                  onClick={() => setDetailsDrawerOpen(!detailsDrawerOpen)}
                  sx={{ cursor: 'pointer', flexShrink: 0 }}
                />
              )}

              {/* Issues Chip */}
              {issuesCount > 0 && onOpenInspector && (
                <Tooltip title={`${issuesCount} issue${issuesCount !== 1 ? 's' : ''} - Click to view`}>
                  <Chip
                    icon={<ErrorIcon />}
                    label={`Issues (${issuesCount})`}
                    size="small"
                    color="error"
                    onClick={() => onOpenInspector()}
                    sx={{ cursor: 'pointer', flexShrink: 0, minWidth: 'fit-content' }}
                  />
                </Tooltip>
              )}

              {/* Save Status */}
              {saving && (
                <Chip
                  icon={<CircularProgress size={16} />}
                  label="Saving..."
                  size="small"
                  color="primary"
                  sx={{ flexShrink: 0 }}
                />
              )}
              {!saving && lastSaved && (
                <Chip
                  icon={<SavedIcon />}
                  label={`Saved ${lastSaved.toLocaleTimeString()}`}
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ flexShrink: 0 }}
                />
              )}
            </Box>
          </Box>

          {/* Right: Actions (no wrap, always visible) */}
          {selection?.kind === 'course_details' && course && (
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0, flexWrap: 'nowrap' }}>
              {course.status === 'published' ? (
                <Tooltip title="Preview course as a learner">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PreviewIcon />}
                    onClick={onPreview}
                  >
                    Preview
                  </Button>
                </Tooltip>
              ) : (
                <Tooltip title="Course must be published to preview">
                  <span>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PreviewIcon />}
                      disabled
                    >
                      Preview
                    </Button>
                  </span>
                </Tooltip>
              )}
              {!isNew && onDiscardChanges && (
                <Tooltip title="Discard unsaved changes">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={onDiscardChanges}
                    disabled={saving}
                  >
                    Discard
                  </Button>
                </Tooltip>
              )}
              {onSave && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={onSave}
                  disabled={saving || !course?.title}
                >
                  Save Draft
                </Button>
              )}
              {!isNew && course.status === 'draft' && onPublish && (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={<PublishIcon />}
                  onClick={onPublish}
                  disabled={publishing || issuesCount > 0}
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}
              {onCancel && (
                <Button size="small" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Details Drawer - only show for course details */}
      {selection?.kind === 'course_details' && course && (
        <DetailsDrawer
          course={course}
          open={detailsDrawerOpen}
          onToggle={() => setDetailsDrawerOpen(!detailsDrawerOpen)}
          onUpdateCourse={handleCourseFieldChange}
          shouldShowError={shouldShowError}
          markFieldTouched={markFieldTouched}
        />
      )}

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {!selection && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Select course details or a section/lesson to edit
            </Typography>
          </Box>
        )}

        {/* Course Details Editor */}
        {selection?.kind === 'course_details' && course && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              inputRef={titleRef}
              label="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleCourseFieldChange('title', e.target.value);
              }}
              onBlur={() => {
                if (markFieldTouched && course) {
                  markFieldTouched('course', course.course_id, 'title');
                }
              }}
              required
              fullWidth
              error={course && shouldShowError && (!title || title.trim() === '') && shouldShowError('course', course.course_id, 'title')}
              helperText={course && shouldShowError && (!title || title.trim() === '') && shouldShowError('course', course.course_id, 'title') ? 'Course title is required' : ''}
            />

            <TextField
              inputRef={shortDescriptionRef}
              label="Short Description"
              value={shortDescription}
              onChange={(e) => {
                setShortDescription(e.target.value);
                handleCourseFieldChange('short_description', e.target.value);
              }}
              onBlur={() => {
                if (markFieldTouched && course) {
                  markFieldTouched('course', course.course_id, 'short_description');
                }
              }}
              required
              multiline
              rows={2}
              fullWidth
              error={course && shouldShowError && (!shortDescription || shortDescription.trim() === '') && shouldShowError('course', course.course_id, 'short_description')}
              helperText={course && shouldShowError && (!shortDescription || shortDescription.trim() === '') && shouldShowError('course', course.course_id, 'short_description') ? 'Short description is required' : 'Required: Brief description for course cards'}
            />

            <RichTextEditor
              inputRef={descriptionRef}
              label="Description"
              value={description}
              onChange={(value) => {
                setDescription(value);
                handleCourseFieldChange('description', value);
              }}
              rows={4}
              fullWidth
              helperText="Optional: Full course description"
            />

            <Autocomplete
              multiple
              options={publishedCourses}
              getOptionLabel={(option) => (typeof option === 'string' ? option : option.title)}
              value={relatedCourseIds.map((id) => publishedCourses.find((c) => c.course_id === id) || id)}
              onChange={(_, newValue) => {
                const ids = newValue.map((v) => (typeof v === 'string' ? v : v.course_id));
                setRelatedCourseIds(ids);
                handleCourseFieldChange('related_course_ids', ids);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Related Courses" placeholder="Select courses" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const course = typeof option === 'string' ? null : option;
                  return (
                    <Chip
                      label={course ? course.title : option}
                      {...getTagProps({ index })}
                      key={course ? course.course_id : option}
                    />
                  );
                })
              }
            />
          </Box>
        )}

        {/* Section Editor */}
        {((selectedNode && selectedNode.type === 'section' && selectedNode.sectionData) ||
          (selection?.kind === 'section' && selection.id && course)) && (() => {
          // Get section data from selectedNode if available, otherwise from course.sections
          const sectionId = selectedNode?.id || selection?.id;
          const sectionData = selectedNode?.sectionData || 
            (course && sectionId ? course.sections.find(s => s.section_id === sectionId) : null);
          const sectionTitle = selectedNode?.title || sectionData?.title || '';
          
          if (!sectionId || !sectionData) return null;
          
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="h6" gutterBottom>
                Section: {sectionTitle || 'Untitled section'}
              </Typography>
              <TextField
                label="Section Name"
                value={sectionData.title || ''}
                onChange={(e) => {
                  onUpdateSection(sectionId, { title: e.target.value });
                }}
                onBlur={() => {
                  if (markFieldTouched) {
                    markFieldTouched('section', sectionId, 'title');
                  }
                }}
                required
                fullWidth
                error={shouldShowError && (!sectionData.title || sectionData.title.trim() === '') && shouldShowError('section', sectionId, 'title')}
                helperText={shouldShowError && (!sectionData.title || sectionData.title.trim() === '') && shouldShowError('section', sectionId, 'title') ? 'Section name is required' : ''}
              />
              {sectionData.description !== undefined && (
                <TextField
                  label="Description"
                  value={sectionData.description || ''}
                  onChange={(e) => {
                    onUpdateSection(sectionId, { description: e.target.value || undefined });
                  }}
                  multiline
                  rows={3}
                  fullWidth
                  helperText="Optional: Section description"
                />
              )}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2">
                    Lessons in this section
                  </Typography>
                  {onAddLesson && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        onAddLesson(sectionId);
                      }}
                    >
                      Add Lesson
                    </Button>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Use the outline or the button above to add lessons to this section.
                </Typography>
              </Box>
            </Box>
          );
        })()}

        {/* Lesson Editor */}
        {selectedNode && selectedNode.type === 'lesson' && selectedNode.lessonData && course && (
          <LessonEditor 
            lesson={selectedNode.lessonData} 
            onUpdate={onUpdateLesson} 
            courseId={course.course_id}
            shouldShowError={shouldShowError}
            markFieldTouched={markFieldTouched}
          />
        )}
      </Box>
    </Box>
  );
}

