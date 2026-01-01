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
import { TaxonomySelect, TaxonomyMultiSelect } from '../../taxonomy';
import { RichTextEditor } from '../../common/RichTextEditor';
import { AssetPicker } from '../../content-hub/AssetPicker';
import { CourseAssets } from '../../lms/CourseAssets';
import { CoverImageSelector } from '../../shared/CoverImageSelector';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { isErrorResponse } from '../../../lib/apiClient';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Course, MediaRef } from '@gravyty/domain';
import type { NodeType } from '../../../types/courseTree';
import { Add } from '@mui/icons-material';

export interface DetailsTabContentProps {
  course: Course;
  onUpdateCourse: (updates: Partial<Course>) => void;
  shouldShowError?: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: NodeType, entityId: string, fieldKey: string) => void;
  // Refs for basic fields (Title, Short Description, Description)
  titleRef?: React.RefObject<HTMLInputElement>;
  shortDescriptionRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  descriptionRef?: React.RefObject<HTMLDivElement>;
  onTemporaryMediaCreated?: (mediaId: string) => void; // Callback when temporary media is uploaded
}

export function DetailsTabContent({
  course,
  onUpdateCourse,
  shouldShowError,
  markFieldTouched,
  titleRef,
  shortDescriptionRef,
  descriptionRef,
  onTemporaryMediaCreated,
}: DetailsTabContentProps) {
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [productSuiteId, setProductSuiteId] = useState<string | undefined>(undefined);
  const [topicTagIds, setTopicTagIds] = useState<string[]>([]);
  const [badgeIds, setBadgeIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);

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
      setBadgeIds(course.badge_ids && course.badge_ids.length > 0 ? course.badge_ids : []);
      setTitle(course.title || '');
      setShortDescription(course.short_description || '');
      setDescription(course.description || '');
      setEstimatedMinutes(course.estimated_minutes?.toString() || '');
      lastSyncedCourseIdRef.current = course.course_id;
    }
  }, [course?.course_id]);

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
        fieldKey: 'badge_ids',
        ref: badgesRef,
      }));
    }

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [course?.course_id]);

  const handleCourseFieldChange = (field: string, value: any) => {
    if (!course) {
      console.warn('handleCourseFieldChange: course is null');
      return;
    }
    if (!onUpdateCourse) {
      console.warn('handleCourseFieldChange: onUpdateCourse is undefined');
      return;
    }
    console.log('handleCourseFieldChange:', field, value);
    onUpdateCourse({ [field]: value });
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
                const newValue = e.target.value;
                setTitle(newValue);
                handleCourseFieldChange('title', newValue);
              }}
              onBlur={() => {
                if (markFieldTouched) {
                  markFieldTouched('course', course.course_id, 'title');
                }
              }}
              required
              fullWidth
              error={shouldShowError && (!course.title || course.title.trim() === '') && shouldShowError('course', course.course_id, 'title')}
              helperText={shouldShowError && (!course.title || course.title.trim() === '') && shouldShowError('course', course.course_id, 'title') ? 'Course title is required' : ''}
            />

            <TextField
              inputRef={shortDescriptionRef}
              label="Short Description"
              value={shortDescription}
              onChange={(e) => {
                const newValue = e.target.value;
                setShortDescription(newValue);
                handleCourseFieldChange('short_description', newValue);
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
              error={shouldShowError && (!course.short_description || course.short_description.trim() === '') && shouldShowError('course', course.course_id, 'short_description')}
              helperText={shouldShowError && (!course.short_description || course.short_description.trim() === '') && shouldShowError('course', course.course_id, 'short_description') ? 'Short description is required' : 'Required: Brief description for course cards'}
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

            {/* Estimated Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Estimated time"
                type="number"
                value={estimatedMinutes}
                onChange={(e) => {
                  const value = e.target.value;
                  setEstimatedMinutes(value);
                  // Parse and validate
                  if (value === '' || value === null || value === undefined) {
                    handleCourseFieldChange('estimated_minutes', undefined);
                  } else {
                    const parsed = parseInt(value, 10);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 600) {
                      handleCourseFieldChange('estimated_minutes', parsed);
                    } else if (value !== '') {
                      // Invalid value, but keep it in the field for user to correct
                      handleCourseFieldChange('estimated_minutes', undefined);
                    }
                  }
                }}
                onBlur={() => {
                  if (markFieldTouched) {
                    markFieldTouched('course', course.course_id, 'estimated_minutes');
                  }
                }}
                inputProps={{
                  min: 1,
                  max: 600,
                  step: 1,
                }}
                fullWidth
                helperText={
                  shouldShowError &&
                  estimatedMinutes !== '' &&
                  (isNaN(parseInt(estimatedMinutes, 10)) ||
                    parseInt(estimatedMinutes, 10) < 1 ||
                    parseInt(estimatedMinutes, 10) > 600) &&
                  shouldShowError('course', course.course_id, 'estimated_minutes')
                    ? 'Must be an integer between 1 and 600'
                    : 'Displayed on course cards. Use the total time to complete this course.'
                }
                error={
                  shouldShowError &&
                  estimatedMinutes !== '' &&
                  (isNaN(parseInt(estimatedMinutes, 10)) ||
                    parseInt(estimatedMinutes, 10) < 1 ||
                    parseInt(estimatedMinutes, 10) > 600) &&
                  shouldShowError('course', course.course_id, 'estimated_minutes')
                }
                InputProps={{
                  endAdornment: <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mr: 1 }}>minutes</Typography>,
                }}
              />
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
              <CoverImageSelector
                entityType="course"
                entityId={course.course_id}
                coverImage={course.cover_image}
                entityTitle={course.title || ''}
                entityShortDescription={course.short_description || ''}
                entityDescription={course.description || ''}
                onCoverImageSelected={(mediaRef) => handleCourseFieldChange('cover_image', mediaRef)}
                onCoverImageRemoved={() => handleCourseFieldChange('cover_image', undefined)}
                onTemporaryMediaCreated={onTemporaryMediaCreated}
              />
            </Box>

            {/* Badges */}
            <Box ref={badgesRef}>
              <TaxonomyMultiSelect
                groupKey="badge"
                values={badgeIds}
                onChange={(optionIds) => {
                  setBadgeIds(optionIds);
                  handleCourseFieldChange('badge_ids', optionIds);
                  if (markFieldTouched) {
                    markFieldTouched('course', course.course_id, 'badge_ids');
                  }
                }}
                label="Badges"
                placeholder="Select badges"
                fullWidth
                error={shouldShowError && shouldShowError('course', course.course_id, 'badge_ids')}
              />
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Course Assets */}
      <Box sx={{ mb: 3 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Course Assets</Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => setAssetPickerOpen(true)}
            >
              Add Asset
            </Button>
          </Box>
          <CourseAssets 
            key={assetsRefreshKey}
            courseId={course.course_id} 
            readOnly={false}
            onAssetDetached={() => setAssetsRefreshKey(prev => prev + 1)}
          />
        </Paper>
      </Box>

      <AssetPicker
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={async (assetId, versionId, displayLabel) => {
          try {
            const response = await lmsAdminApi.attachAssetToCourse(course.course_id, {
              asset_id: assetId,
              version_id: versionId || undefined,
              display_label: displayLabel,
            });
            
            if (isErrorResponse(response)) {
              alert(response.error.message);
              return;
            }
            
            // Refresh assets list
            setAssetPickerOpen(false);
            setAssetsRefreshKey(prev => prev + 1);
          } catch (err) {
            alert('Failed to attach asset');
          }
        }}
        courseId={course.course_id}
      />
    </>
  );
}

