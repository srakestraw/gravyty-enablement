/**
 * Details Tab Content Component
 * 
 * Contains all course details fields organized into stable groups:
 * - Basics: Title, Short Description, Long Description
 * - Metadata: Product, Product Suite, Topic Tags
 * - Media: Cover Image, Badges
 */

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Chip,
  Button,
  Paper,
  Typography,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Image as ImageIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { MediaSelectModal } from './MediaSelectModal';
import { TaxonomySelect, TaxonomyMultiSelect } from '../../taxonomy';
import { RichTextEditor } from '../../common/RichTextEditor';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Course, MediaRef, CourseBadge } from '@gravyty/domain';
import type { NodeType } from '../../../types/courseTree';

export interface DetailsTabContentProps {
  course: Course;
  onUpdateCourse: (updates: Partial<Course>) => void;
  shouldShowError?: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: NodeType, entityId: string, fieldKey: string) => void;
  // Refs for basic fields (Title, Short Description, Description)
  titleRef?: React.RefObject<HTMLInputElement>;
  shortDescriptionRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  descriptionRef?: React.RefObject<HTMLDivElement>;
}

export function DetailsTabContent({
  course,
  onUpdateCourse,
  shouldShowError,
  markFieldTouched,
  titleRef,
  shortDescriptionRef,
  descriptionRef,
}: DetailsTabContentProps) {
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [productSuiteId, setProductSuiteId] = useState<string | undefined>(undefined);
  const [topicTagIds, setTopicTagIds] = useState<string[]>([]);
  const [badges, setBadges] = useState<CourseBadge[]>([]);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');

  // Refs for focus registry
  const productRef = useRef<HTMLDivElement>(null);
  const productSuiteRef = useRef<HTMLDivElement>(null);
  const topicTagsRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  // Track the last synced course ID to avoid overwriting user input
  const lastSyncedCourseIdRef = useRef<string | null>(null);

  // Sync state with course (only when course ID changes)
  useEffect(() => {
    if (course && course.course_id !== lastSyncedCourseIdRef.current) {
      setProductId(course.product_id || course.product_suite_id || undefined);
      setProductSuiteId(course.product_suite_id || course.product_concept_id || undefined);
      setTopicTagIds(course.topic_tag_ids && course.topic_tag_ids.length > 0 ? course.topic_tag_ids : []);
      setBadges(course.badges || []);
      setTitle(course.title || '');
      setShortDescription(course.short_description || '');
      setDescription(course.description || '');
      lastSyncedCourseIdRef.current = course.course_id;
    }
  }, [course?.course_id, course?.title, course?.short_description, course?.description, course?.product_id, course?.product_suite_id, course?.topic_tag_ids, course?.badges]);

  // Register fields with focus registry
  useEffect(() => {
    if (!course) return;

    const unregisters: Array<() => void> = [];

    if (productRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'product_id',
        ref: productRef,
      }));
    }

    if (productSuiteRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'product_suite_id',
        ref: productSuiteRef,
      }));
    }

    if (topicTagsRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'topic_tag_ids',
        ref: topicTagsRef,
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

    if (badgesRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'badges',
        ref: badgesRef,
      }));
    }

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [course?.course_id]);

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

  // Clear Product Suite when Product is cleared
  useEffect(() => {
    if (!productId && productSuiteId) {
      setProductSuiteId(undefined);
      handleCourseFieldChange('product_suite_id', undefined);
    }
  }, [productId]);

  return (
    <>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Basics Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Basics
          </Typography>
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
                if (markFieldTouched) {
                  markFieldTouched('course', course.course_id, 'title');
                }
              }}
              required
              fullWidth
              error={shouldShowError && (!title || title.trim() === '') && shouldShowError('course', course.course_id, 'title')}
              helperText={shouldShowError && (!title || title.trim() === '') && shouldShowError('course', course.course_id, 'title') ? 'Course title is required' : ''}
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
                if (markFieldTouched) {
                  markFieldTouched('course', course.course_id, 'short_description');
                }
              }}
              required
              multiline
              rows={2}
              fullWidth
              error={shouldShowError && (!shortDescription || shortDescription.trim() === '') && shouldShowError('course', course.course_id, 'short_description')}
              helperText={shouldShowError && (!shortDescription || shortDescription.trim() === '') && shouldShowError('course', course.course_id, 'short_description') ? 'Short description is required' : 'Required: Brief description for course cards'}
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
          </Box>
        </Paper>

        {/* Metadata Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Metadata
          </Typography>
          <Grid container spacing={2}>
            {/* Product */}
            <Grid item xs={12} sm={6}>
              <Box ref={productRef}>
                <TaxonomySelect
                  groupKey="product"
                  value={productId}
                  onChange={(optionId) => {
                    setProductId(optionId);
                    handleCourseFieldChange('product_id', optionId);
                    if (markFieldTouched) {
                      markFieldTouched('course', course.course_id, 'product_id');
                    }
                  }}
                  label="Product"
                  placeholder="Select product"
                  fullWidth
                  error={shouldShowError && shouldShowError('course', course.course_id, 'product_id')}
                />
              </Box>
            </Grid>

            {/* Product Suite */}
            <Grid item xs={12} sm={6}>
              <Box ref={productSuiteRef}>
                <TaxonomySelect
                  groupKey="product_suite"
                  value={productSuiteId}
                  parentId={productId}
                  onChange={(optionId) => {
                    setProductSuiteId(optionId);
                    handleCourseFieldChange('product_suite_id', optionId);
                    if (markFieldTouched) {
                      markFieldTouched('course', course.course_id, 'product_suite_id');
                    }
                  }}
                  label="Product Suite"
                  placeholder={productId ? 'Select product suite' : 'Select a Product first'}
                  disabled={!productId}
                  fullWidth
                  error={shouldShowError && shouldShowError('course', course.course_id, 'product_suite_id')}
                  helperText={!productId ? 'Select a Product first' : undefined}
                />
              </Box>
            </Grid>

            {/* Topic Tags */}
            <Grid item xs={12}>
              <Box ref={topicTagsRef}>
                <TaxonomyMultiSelect
                  groupKey="topic_tag"
                  values={topicTagIds}
                  onChange={(optionIds) => {
                    setTopicTagIds(optionIds);
                    handleCourseFieldChange('topic_tag_ids', optionIds);
                    if (markFieldTouched) {
                      markFieldTouched('course', course.course_id, 'topic_tag_ids');
                    }
                  }}
                  label="Topic Tags"
                  placeholder="Add topic tags"
                  fullWidth
                  error={shouldShowError && shouldShowError('course', course.course_id, 'topic_tag_ids')}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Media Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Media
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Cover Image */}
            <Box ref={coverImageRef}>
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
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: course.cover_image ? 1 : 0 }}>
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
            </Box>

            {/* Badges */}
            <Box ref={badgesRef}>
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
            </Box>
          </Box>
        </Paper>
      </Box>

      <MediaSelectModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onSelect={handleCoverSelect}
        mediaType="cover"
        title="Select or Upload Cover Image"
        courseId={course.course_id}
      />
    </>
  );
}

