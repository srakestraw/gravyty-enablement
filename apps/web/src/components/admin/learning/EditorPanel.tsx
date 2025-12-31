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
import { MediaSelectModal } from './MediaSelectModal';
import { TaxonomySelect, TaxonomyMultiSelect } from '../../taxonomy';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Course, CourseSection, Lesson, MediaRef, CourseBadge } from '@gravyty/domain';
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
  onOpenInspector?: (tab: 'issues' | 'properties') => void;
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
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  
  // Refs for focus registry
  const titleRef = useRef<HTMLInputElement>(null);
  const shortDescriptionRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);

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

    if (coverImageRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'cover_image',
        ref: coverImageRef,
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
  const [productId, setProductId] = useState<string | undefined>(undefined); // Was product_suite_id
  const [productSuiteId, setProductSuiteId] = useState<string | undefined>(undefined); // Was product_concept_id
  const [topicTagIds, setTopicTagIds] = useState<string[]>([]);
  const [relatedCourseIds, setRelatedCourseIds] = useState<string[]>([]);
  const [badges, setBadges] = useState<CourseBadge[]>([]);

  // Track the last synced course ID to avoid overwriting user input
  const lastSyncedCourseIdRef = useRef<string | null>(null);
  
  // Sync state with course (only when course ID changes, indicating a new course was loaded)
  useEffect(() => {
    if (course && course.course_id !== lastSyncedCourseIdRef.current) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setShortDescription(course.short_description || '');
      // Prefer taxonomy IDs, fall back to legacy strings (for backward compatibility)
      // Normalize: course.product_id (new) or course.product_suite_id (legacy) -> productId
      setProductId(course.product_id || course.product_suite_id || undefined);
      // Normalize: course.product_suite_id (new) or course.product_concept_id (legacy) -> productSuiteId
      setProductSuiteId(course.product_suite_id || course.product_concept_id || undefined);
      setTopicTagIds(course.topic_tag_ids && course.topic_tag_ids.length > 0 ? course.topic_tag_ids : []);
      setRelatedCourseIds(course.related_course_ids || []);
      setBadges(course.badges || []);
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

  const handleCoverSelect = (mediaRef: MediaRef) => {
    handleCourseFieldChange('cover_image', mediaRef);
  };

  const handleAddBadge = () => {
    const badgeId = prompt('Enter badge ID:');
    const badgeName = prompt('Enter badge name:');
    if (badgeId && badgeName) {
      const newBadges = [...badges, { badge_id: badgeId, name: badgeName }];
      setBadges(newBadges);
      handleCourseFieldChange('badges', newBadges);
    }
  };

  const handleRemoveBadge = (badgeId: string) => {
    const newBadges = badges.filter((b) => b.badge_id !== badgeId);
    setBadges(newBadges);
    handleCourseFieldChange('badges', newBadges);
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          {/* Left: Title + Status + Issues */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
            {selection?.kind === 'course_details' && course ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
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
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {selectedNode.title || 'Untitled'}
              </Typography>
            ) : (
              <Typography variant="h6" color="text.secondary">
                Select a node to edit
              </Typography>
            )}

            {/* Status Chip */}
            {course && (
              <Chip
                label={statusLabel}
                size="small"
                color={statusColor}
                variant={status === 'published' ? 'filled' : 'outlined'}
              />
            )}

            {/* Issues Badge */}
            {issuesCount > 0 && onOpenInspector && (
              <Tooltip title={`${issuesCount} issue${issuesCount !== 1 ? 's' : ''} - Click to view`}>
                <Chip
                  icon={<ErrorIcon />}
                  label={issuesCount}
                  size="small"
                  color="error"
                  onClick={() => onOpenInspector('issues')}
                  sx={{ cursor: 'pointer' }}
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
              />
            )}
            {!saving && lastSaved && (
              <Chip
                icon={<SavedIcon />}
                label={`Saved ${lastSaved.toLocaleTimeString()}`}
                size="small"
                color="success"
                variant="outlined"
              />
            )}
          </Box>

          {/* Right: Actions */}
          {selection?.kind === 'course_details' && course && (
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
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

            <TextField
              inputRef={descriptionRef}
              label="Description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleCourseFieldChange('description', e.target.value);
              }}
              multiline
              rows={4}
              fullWidth
              helperText="Optional: Full course description"
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TaxonomySelect
                groupKey="product"
                value={productId}
                onChange={(optionId) => {
                  setProductId(optionId);
                  handleCourseFieldChange('product_id', optionId);
                }}
                label="Product"
                placeholder="Select product"
                fullWidth
              />
              <TaxonomySelect
                groupKey="product_suite"
                value={productSuiteId}
                parentId={productId}
                onChange={(optionId) => {
                  setProductSuiteId(optionId);
                  handleCourseFieldChange('product_suite_id', optionId);
                }}
                label="Product Suite"
                placeholder="Select product suite"
                fullWidth
              />
            </Box>

            <TaxonomyMultiSelect
              groupKey="topic_tag"
              values={topicTagIds}
              onChange={(optionIds) => {
                setTopicTagIds(optionIds);
                handleCourseFieldChange('topic_tag_ids', optionIds);
              }}
              label="Topic Tags"
              placeholder="Add topic tags"
              fullWidth
            />

            <Paper ref={coverImageRef} sx={{ p: 2 }}>
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="subtitle2">Cover Image</Typography>
                  <Tooltip
                    title={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          Used for course cards and may be cropped in some views.
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          Recommended: 16:9 aspect ratio (1600 x 900px). JPG or PNG format.
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 0.5 }}>
                          Keep the subject centered and avoid text near the edges.
                        </Typography>
                        <Typography variant="body2">
                          If your image is larger, we'll downscale. If it's a different ratio, we'll center-crop.
                        </Typography>
                      </Box>
                    }
                    arrow
                    placement="top"
                  >
                    <InfoIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                  </Tooltip>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Used for course cards and may be cropped in some views. Recommended 16:9 (1600 x 900). JPG or PNG. Keep the subject centered and avoid text near the edges.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Best results: high-contrast image, no embedded titles. We'll crop to fit cards.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: course.cover_image ? 1 : 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ImageIcon />}
                  onClick={() => setCoverModalOpen(true)}
                >
                  {course.cover_image ? 'Change Cover' : 'Attach Cover'}
                </Button>
              </Box>
              {course.cover_image ? (
                <Box>
                  <Chip
                    label={course.cover_image.filename || course.cover_image.media_id}
                    onDelete={() => handleCourseFieldChange('cover_image', undefined)}
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                  {course.cover_image.url && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {course.cover_image.url}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No cover image attached
                </Typography>
              )}
            </Paper>

            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Badges</Typography>
                <Button size="small" variant="outlined" onClick={handleAddBadge}>
                  Add Badge
                </Button>
              </Box>
              {badges.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {badges.map((badge) => (
                    <Chip
                      key={badge.badge_id}
                      label={badge.name}
                      onDelete={() => handleRemoveBadge(badge.badge_id)}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No badges added
                </Typography>
              )}
            </Paper>

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
        {selectedNode && selectedNode.type === 'section' && selectedNode.sectionData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" gutterBottom>
              Section: {selectedNode.title}
            </Typography>
            <TextField
              label="Section Name"
              value={selectedNode.sectionData.title || ''}
              onChange={(e) => {
                onUpdateSection(selectedNode.id, { title: e.target.value });
              }}
              onBlur={() => {
                if (markFieldTouched) {
                  markFieldTouched('section', selectedNode.id, 'title');
                }
              }}
              required
              fullWidth
              error={shouldShowError && (!selectedNode.sectionData.title || selectedNode.sectionData.title.trim() === '') && shouldShowError('section', selectedNode.id, 'title')}
              helperText={shouldShowError && (!selectedNode.sectionData.title || selectedNode.sectionData.title.trim() === '') && shouldShowError('section', selectedNode.id, 'title') ? 'Section name is required' : ''}
            />
            {selectedNode.sectionData.description !== undefined && (
              <TextField
                label="Description"
                value={selectedNode.sectionData.description || ''}
                onChange={(e) => {
                  onUpdateSection(selectedNode.id, { description: e.target.value || undefined });
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
                      if (selectedNode && selectedNode.type === 'section') {
                        onAddLesson(selectedNode.id);
                      }
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
        )}

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

      <MediaSelectModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onSelect={handleCoverSelect}
        mediaType="cover"
        title="Select or Upload Cover Image"
        courseId={course.course_id}
      />
    </Box>
  );
}

