/**
 * Editor Panel Component
 * 
 * Right panel with tabs for Course/Section/Lesson editing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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
  Tabs,
  Tab,
  Grid,
  Menu,
  MenuItem,
  Divider,
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
  MoreVert as MoreVertIcon,
  Archive as ArchiveIcon,
  Unarchive as RestoreIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { LessonEditor } from './LessonEditor';
import { DetailsTabContent } from './DetailsTabContent';
import { CourseDetailsEditor } from './CourseDetailsEditor';
import { TreeOutlinePanel } from './TreeOutlinePanel';
import { AssessmentTabContent } from './AssessmentTabContent';
import { RichTextEditor } from '../../common/RichTextEditor';
import { CreateAssignmentModal } from './CreateAssignmentModal';
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
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  archiving?: boolean;
  restoring?: boolean;
  deleting?: boolean;
  issuesCount?: number | (() => number);
  validation?: { errorsCount: number }; // Alternative: pass validation object directly
  onOpenInspector?: () => void;
  inspectorOpen?: boolean;
  canSave?: boolean; // Phase 4: From useCourseEditorActions
  canPublish?: boolean; // Phase 4: From useCourseEditorActions
  // Editor tab state (for Inspector to know which tab is active)
  editorTab?: 'details' | 'outline';
  onEditorTabChange?: (tab: 'details' | 'outline') => void;
  // Outline panel props (for Course Outline tab)
  courseTree?: CourseTreeNode | null;
  onSelectNode?: (nodeId: string | null) => void;
  onAddSection?: () => void;
  onRenameNode?: (nodeId: string, newTitle: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onReorderNode?: (nodeId: string, direction: 'up' | 'down') => void;
  onTemporaryMediaCreated?: (mediaId: string) => void; // Callback when temporary media is uploaded
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
  onArchive,
  onRestore,
  onDelete,
  onCancel,
  archiving = false,
  restoring = false,
  deleting = false,
  issuesCount = 0,
  validation,
  onOpenInspector,
  inspectorOpen = false,
  canSave,
  canPublish,
  editorTab: controlledEditorTab,
  onEditorTabChange,
  courseTree = null,
  onSelectNode,
  onAddSection,
  onRenameNode,
  onDeleteNode,
  onReorderNode,
  onTemporaryMediaCreated,
}: EditorPanelProps) {
  // Tab state for course details editing
  const [internalEditorTab, setInternalEditorTab] = useState<'details' | 'outline'>(() => {
    const stored = localStorage.getItem('lms.courseEditor.editorTab');
    return (stored === 'details' || stored === 'outline') ? stored : 'details';
  });
  
  // Use controlled tab if provided, otherwise use internal state
  const editorTab = controlledEditorTab ?? internalEditorTab;
  
  const handleEditorTabChange = (newTab: 'details' | 'outline') => {
    if (onEditorTabChange) {
      onEditorTabChange(newTab);
    } else {
      setInternalEditorTab(newTab);
    }
    if (selection?.kind === 'course_details') {
      localStorage.setItem('lms.courseEditor.editorTab', newTab);
    }
  };
  
  // Persist tab selection
  useEffect(() => {
    if (selection?.kind === 'course_details' && editorTab) {
      localStorage.setItem('lms.courseEditor.editorTab', editorTab);
    }
  }, [editorTab, selection?.kind]);
  
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

  // Note: Course metadata state (title, description, etc.) is now managed in DetailsTabContent

  // Handle inline title edit
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (course) {
      setEditingTitle(course.title || '');
    }
  }, [course?.title]);

  // Menu state for more actions (Discard/Delete)
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(null);
  const isMoreMenuOpen = Boolean(moreMenuAnchor);
  
  // Assignment modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  const handleMoreMenuClose = () => {
    setMoreMenuAnchor(null);
  };

  const handleDiscardClick = () => {
    handleMoreMenuClose();
    if (onDiscardChanges) {
      onDiscardChanges();
    }
  };

  const handleArchiveClick = () => {
    handleMoreMenuClose();
    if (onArchive) {
      onArchive();
    }
  };

  const handleRestoreClick = () => {
    handleMoreMenuClose();
    if (onRestore) {
      onRestore();
    }
  };

  const handleDeleteClick = () => {
    handleMoreMenuClose();
    if (onDelete) {
      onDelete();
    }
  };

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

  const handleCourseFieldChange = useCallback((fieldOrUpdates: string | Partial<Course>, value?: any) => {
    // Support both signatures:
    // 1. handleCourseFieldChange('title', 'My Title') - old signature
    // 2. handleCourseFieldChange({ title: 'My Title' }) - new signature from CourseDetailsEditor
    if (typeof fieldOrUpdates === 'string') {
      // Old signature: (field: string, value: any)
      onUpdateCourse({ [fieldOrUpdates]: value } as Partial<Course>);
    } else {
      // New signature: (updates: Partial<Course>)
      onUpdateCourse(fieldOrUpdates);
    }
  }, [onUpdateCourse]);

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


              {/* Issues Chip - always visible */}
              {onOpenInspector && (() => {
                // Use validation.errorsCount if available (always fresh), otherwise fall back to issuesCount prop
                const currentIssuesCount = validation?.errorsCount ?? (typeof issuesCount === 'function' ? issuesCount() : (issuesCount || 0));
                return (
                  <Tooltip title={currentIssuesCount > 0 ? `${currentIssuesCount} error${currentIssuesCount !== 1 ? 's' : ''} - Click to view` : 'View issues'}>
                    <Chip
                      icon={<ErrorIcon />}
                      label={currentIssuesCount > 0 ? `Issues (${currentIssuesCount})` : 'Issues'}
                      size="small"
                      color={currentIssuesCount > 0 ? 'error' : 'default'}
                      variant={inspectorOpen ? 'filled' : 'outlined'}
                      onClick={() => onOpenInspector()}
                      sx={{ cursor: 'pointer', flexShrink: 0, minWidth: 'fit-content' }}
                    />
                  </Tooltip>
                );
              })()}

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
              {course.status === 'published' && (
                <Tooltip title="Assign this course to learners">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AssignmentIcon />}
                    onClick={() => setAssignModalOpen(true)}
                  >
                    Assign
                  </Button>
                </Tooltip>
              )}
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
              {onSave && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={onSave}
                  disabled={saving || (canSave !== undefined ? !canSave : !course?.title?.trim())}
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
                  disabled={publishing || (canPublish !== undefined ? !canPublish : (validation?.errorsCount ?? (typeof issuesCount === 'function' ? issuesCount() : (issuesCount || 0))) > 0)}
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}
              {/* More actions menu (Discard/Archive/Restore/Delete) - positioned before Cancel */}
              {(!isNew && (onDiscardChanges || onArchive || onRestore || onDelete)) && (
                <>
                  <Tooltip title="More actions">
                    <IconButton
                      size="small"
                      onClick={handleMoreMenuOpen}
                      disabled={saving || archiving || restoring || deleting}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={moreMenuAnchor}
                    open={isMoreMenuOpen}
                    onClose={handleMoreMenuClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                  >
                    {!isNew && onDiscardChanges && (
                      <MenuItem
                        onClick={handleDiscardClick}
                        disabled={saving}
                        sx={{ color: 'error.main' }}
                      >
                        <RefreshIcon sx={{ mr: 1, fontSize: 20 }} />
                        Discard changes
                      </MenuItem>
                    )}
                    {!isNew && onDiscardChanges && (onArchive || onRestore || onDelete) && <Divider />}
                    {onArchive && !isNew && course.status !== 'archived' && (
                      <MenuItem
                        onClick={handleArchiveClick}
                        disabled={archiving}
                      >
                        <ArchiveIcon sx={{ mr: 1, fontSize: 20 }} />
                        {archiving ? 'Archiving...' : 'Archive course'}
                      </MenuItem>
                    )}
                    {onRestore && !isNew && course.status === 'archived' && (
                      <MenuItem
                        onClick={handleRestoreClick}
                        disabled={restoring}
                      >
                        <RestoreIcon sx={{ mr: 1, fontSize: 20 }} />
                        {restoring ? 'Restoring...' : 'Restore course'}
                      </MenuItem>
                    )}
                    {(onArchive || onRestore) && onDelete && !isNew && <Divider />}
                    {onDelete && !isNew && (
                      <MenuItem
                        onClick={handleDeleteClick}
                        disabled={deleting}
                        sx={{ color: 'error.main' }}
                      >
                        <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
                        {deleting ? 'Deleting...' : 'Delete course'}
                      </MenuItem>
                    )}
                  </Menu>
                </>
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

      {/* Tabs - show for course details OR when in Course Outline tab (to allow navigation back) */}
      {(selection?.kind === 'course_details' || editorTab === 'outline') && course && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
          <Tabs
            value={editorTab}
            onChange={(_, v) => {
              handleEditorTabChange(v);
              // If switching back to Details tab and we're on a section/lesson, reset to course_details
              if (v === 'details' && selection?.kind !== 'course_details') {
                // This will be handled by the parent component via onEditorTabChange callback
              }
            }}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              width: '100%',
              '& .MuiTab-root': {
                minHeight: 48,
                padding: '12px 24px',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'none',
              },
            }}
          >
            <Tab value="details" label="Details" />
            <Tab value="outline" label="Course Outline" />
            <Tab value="assessment" label="Assessment" />
          </Tabs>
        </Box>
      )}

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {!selection && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Select course details or a section/lesson to edit
            </Typography>
          </Box>
        )}

        {/* Course Details Editor with Tabs */}
        {/* Phase 3: Always mount CourseDetailsEditor (controlled component) to prevent values disappearing on tab switch */}
        {/* Use display: none instead of conditional rendering */}
        {course && (
          <Box sx={{ display: editorTab === 'details' && selection?.kind === 'course_details' ? 'block' : 'none' }}>
            <CourseDetailsEditor
              course={course}
              onUpdateCourse={handleCourseFieldChange}
              shouldShowError={shouldShowError}
              markFieldTouched={markFieldTouched}
              titleRef={titleRef}
              shortDescriptionRef={shortDescriptionRef}
              descriptionRef={descriptionRef}
              onTemporaryMediaCreated={onTemporaryMediaCreated}
            />
          </Box>
        )}
        
        {/* Show Assessment tab content when on Assessment tab */}
        {editorTab === 'assessment' && course && (
          <Box sx={{ display: 'block' }}>
            <AssessmentTabContent course={course} />
          </Box>
        )}

        {/* Show Course Outline tab content when on Outline tab (regardless of selection kind) */}
        {editorTab === 'outline' && courseTree && onSelectNode && onAddSection && onRenameNode && onDeleteNode && onReorderNode && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <TreeOutlinePanel
              tree={courseTree}
              selectedNodeId={selection?.kind === 'section' || selection?.kind === 'lesson' ? selection.id || null : null}
              onSelectNode={onSelectNode}
              onAddSection={onAddSection}
              onAddLesson={onAddLesson}
              onRenameNode={onRenameNode}
              onDeleteNode={onDeleteNode}
              onReorderNode={onReorderNode}
              shouldShowError={shouldShowError}
              markFieldTouched={markFieldTouched}
            />
          </Box>
        )}

        {/* Section Editor - only show when NOT in Course Outline tab (to avoid conflicts) */}
        {editorTab !== 'outline' && ((selectedNode && selectedNode.type === 'section' && selectedNode.sectionData) ||
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

        {/* Lesson Editor - only show when NOT in Course Outline tab (to avoid conflicts) */}
        {editorTab !== 'outline' && selectedNode && selectedNode.type === 'lesson' && selectedNode.lessonData && course && (
          <LessonEditor 
            lesson={selectedNode.lessonData} 
            onUpdate={onUpdateLesson} 
            courseId={course.course_id}
            shouldShowError={shouldShowError}
            markFieldTouched={markFieldTouched}
          />
        )}
      </Box>
      
      {/* Assignment Modal */}
      {course && course.status === 'published' && (
        <CreateAssignmentModal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          contextualTarget={{
            type: 'course',
            id: course.course_id,
            title: course.title,
          }}
        />
      )}
    </Box>
  );
}

