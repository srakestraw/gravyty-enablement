/**
 * Editor Panel Component
 * 
 * Right panel with tabs for Course/Section/Lesson editing
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Chip,
  Button,
  Paper,
  Autocomplete,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Image as ImageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { LessonEditor } from './LessonEditor';
import { MediaSelectModal } from './MediaSelectModal';
import type { Course, CourseSection, Lesson, MediaRef, CourseBadge } from '@gravyty/domain';

export interface EditorPanelProps {
  course: Course | null;
  selectedSection: CourseSection | null;
  selectedLesson: Lesson | null;
  publishedCourses: Array<{ course_id: string; title: string }>;
  onUpdateCourse: (updates: Partial<Course>) => void;
  onUpdateLesson: (updates: Partial<Lesson>) => void;
}

export function EditorPanel({
  course,
  selectedSection,
  selectedLesson,
  publishedCourses,
  onUpdateCourse,
  onUpdateLesson,
}: EditorPanelProps) {
  const [tab, setTab] = useState<'course' | 'section' | 'lesson'>('course');
  const [coverModalOpen, setCoverModalOpen] = useState(false);

  // Course metadata state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [productSuite, setProductSuite] = useState('');
  const [productConcept, setProductConcept] = useState('');
  const [topicTags, setTopicTags] = useState<string[]>([]);
  const [relatedCourseIds, setRelatedCourseIds] = useState<string[]>([]);
  const [badges, setBadges] = useState<CourseBadge[]>([]);

  // Sync state with course
  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setShortDescription(course.short_description || '');
      setProductSuite(course.product_suite || '');
      setProductConcept(course.product_concept || '');
      setTopicTags(course.topic_tags || []);
      setRelatedCourseIds(course.related_course_ids || []);
      setBadges(course.badges || []);
    }
  }, [course]);

  // Auto-switch to lesson tab when lesson is selected
  useEffect(() => {
    if (selectedLesson) {
      setTab('lesson');
    } else if (selectedSection) {
      setTab('section');
    }
  }, [selectedLesson, selectedSection]);

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

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Course" value="course" />
        <Tab label="Section" value="section" disabled={!selectedSection} />
        <Tab label="Lesson" value="lesson" disabled={!selectedLesson} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {tab === 'course' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleCourseFieldChange('title', e.target.value);
              }}
              required
              fullWidth
            />

            <TextField
              label="Short Description"
              value={shortDescription}
              onChange={(e) => {
                setShortDescription(e.target.value);
                handleCourseFieldChange('short_description', e.target.value);
              }}
              required
              multiline
              rows={2}
              fullWidth
              helperText="Required: Brief description for course cards"
            />

            <TextField
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
              <TextField
                label="Product Suite"
                value={productSuite}
                onChange={(e) => {
                  setProductSuite(e.target.value);
                  handleCourseFieldChange('product_suite', e.target.value || undefined);
                }}
                fullWidth
              />
              <TextField
                label="Product Concept"
                value={productConcept}
                onChange={(e) => {
                  setProductConcept(e.target.value);
                  handleCourseFieldChange('product_concept', e.target.value || undefined);
                }}
                fullWidth
              />
            </Box>

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={topicTags}
              onChange={(_, newValue) => {
                setTopicTags(newValue);
                handleCourseFieldChange('topic_tags', newValue);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Topic Tags" placeholder="Add tags" />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} {...getTagProps({ index })} key={index} />
                ))
              }
            />

            <Paper sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Cover Image</Typography>
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

        {tab === 'section' && selectedSection && (
          <Box>
            <Typography variant="h6" gutterBottom>
              {selectedSection.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Section editing is handled via the outline panel. Use the outline to rename, reorder, or delete sections.
            </Typography>
          </Box>
        )}

        {tab === 'lesson' && selectedLesson && (
          <LessonEditor lesson={selectedLesson} onUpdate={onUpdateLesson} courseId={course.course_id} />
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

