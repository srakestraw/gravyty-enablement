/**
 * Course Details Editor Component (Phase 3)
 * 
 * Controlled component - no local state for form fields.
 * All values come from course prop, all updates go through onUpdateCourse callback.
 * This prevents values from disappearing when component unmounts/remounts.
 * 
 * Contains all course details fields organized into stable groups:
 * - Basics: Title, Short Description, Long Description
 * - Metadata: Product, Product Suite, Topic Tags
 * - Media: Cover Image, Badges
 */

import { useRef, useEffect, useState, useCallback } from 'react';
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

export interface CourseDetailsEditorProps {
  course: Course;
  onUpdateCourse: (updates: Partial<Course>) => void;
  shouldShowError?: (entityType: NodeType, entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: NodeType, entityId: string, fieldKey: string) => void;
  // Refs for basic fields (Title, Short Description, Description)
  titleRef?: React.RefObject<HTMLInputElement>;
  shortDescriptionRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  descriptionRef?: React.RefObject<HTMLDivElement>;
  onTemporaryMediaCreated?: (mediaId: string) => void;
}

export function CourseDetailsEditor({
  course,
  onUpdateCourse,
  shouldShowError,
  markFieldTouched,
  titleRef,
  shortDescriptionRef,
  descriptionRef,
  onTemporaryMediaCreated,
}: CourseDetailsEditorProps) {
  // Only UI state (not form data) - these don't need to persist
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);
  
  // Local state for immediate UI updates (controlled component pattern)
  const [localTitle, setLocalTitle] = useState(course?.title || '');
  const [localShortDescription, setLocalShortDescription] = useState(course?.short_description || '');
  
  // Sync local state with course prop when course changes externally
  useEffect(() => {
    if (course) {
      setLocalTitle(course.title || '');
      setLocalShortDescription(course.short_description || '');
    }
  }, [course?.title, course?.short_description]);

  // Refs for focus registry
  const productRef = useRef<HTMLDivElement>(null);
  const productSuiteRef = useRef<HTMLDivElement>(null);
  const topicTagsRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  // Clear Product Suite when Product is cleared
  useEffect(() => {
    if (!course.product_id && course.product_suite_id) {
      onUpdateCourse({ product_suite_id: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.product_id, course.product_suite_id]);

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

  // Helper to update course field with immediate local state update
  const handleTitleChange = useCallback((value: string) => {
    setLocalTitle(value);
    onUpdateCourse({ title: value } as Partial<Course>);
  }, [onUpdateCourse]);

  const handleShortDescriptionChange = useCallback((value: string) => {
    setLocalShortDescription(value);
    onUpdateCourse({ short_description: value } as Partial<Course>);
  }, [onUpdateCourse]);
  
  // Helper to update other course fields
  const handleFieldChange = useCallback((field: keyof Course, value: any) => {
    onUpdateCourse({ [field]: value } as Partial<Course>);
  }, [onUpdateCourse]);

  // Helper to mark field as touched
  const handleBlur = (fieldKey: string) => {
    if (markFieldTouched && course) {
      markFieldTouched('course', course.course_id, fieldKey);
    }
  };

  // Helper to check if field actually has an error
  // Use local state for title/short_description for immediate validation feedback
  const hasFieldError = (fieldKey: string): boolean => {
    if (!course) return false;
    
    switch (fieldKey) {
      case 'title':
        // Use local state for immediate feedback (course.title may lag due to React batching)
        return !localTitle || localTitle.trim() === '';
      case 'short_description':
        // Use local state for immediate feedback (course.short_description may lag due to React batching)
        return !localShortDescription || localShortDescription.trim() === '';
      default:
        // For other fields, check course prop
        return false;
    }
  };

  // Helper to check if error should be shown (both shouldShowError AND actual error)
  const getErrorState = (fieldKey: string) => {
    if (!shouldShowError || !course) return false;
    // Only show error if: 1) shouldShowError returns true AND 2) field actually has an error
    return shouldShowError('course', course.course_id, fieldKey) && hasFieldError(fieldKey);
  };

  // Helper to get error message for field
  const getErrorMessage = (fieldKey: string): string | undefined => {
    if (!getErrorState(fieldKey)) return undefined;
    
    // Return appropriate error message based on field
    switch (fieldKey) {
      case 'title':
        return 'Course title is required';
      case 'short_description':
        return 'Short description is required';
      default:
        return undefined;
    }
  };

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
              value={localTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => handleBlur('title')}
              error={getErrorState('title')}
              helperText={getErrorMessage('title')}
              fullWidth
            />

            <TextField
              inputRef={shortDescriptionRef}
              label="Short Description"
              value={localShortDescription}
              onChange={(e) => handleShortDescriptionChange(e.target.value)}
              onBlur={() => handleBlur('short_description')}
              error={getErrorState('short_description')}
              helperText={getErrorMessage('short_description')}
              multiline
              rows={2}
              fullWidth
            />

            <RichTextEditor
              inputRef={descriptionRef}
              label="Description"
              value={course.description || ''}
              onChange={(value) => handleFieldChange('description', value)}
              onBlur={() => handleBlur('description')}
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
            {/* Product Suite */}
            <Grid item xs={12} sm={6}>
              <Box ref={productSuiteRef}>
                <TaxonomyMultiSelect
                  groupKey="product_suite"
                  values={
                    (course.product_suite_ids && course.product_suite_ids.length > 0)
                      ? course.product_suite_ids
                      : (course.product_suite_id ? [course.product_suite_id] : [])
                  }
                  onChange={(optionIds) => {
                    handleFieldChange('product_suite_ids', optionIds);
                  }}
                  label="Product Suite"
                  placeholder="Select product suites"
                  fullWidth
                />
              </Box>
            </Grid>

            {/* Product */}
            <Grid item xs={12} sm={6}>
              <Box ref={productRef}>
                <TaxonomyMultiSelect
                  groupKey="product"
                  values={
                    (course.product_ids && course.product_ids.length > 0)
                      ? course.product_ids
                      : (course.product_id ? [course.product_id] : [])
                  }
                  onChange={(optionIds) => {
                    handleFieldChange('product_ids', optionIds);
                  }}
                  label="Product"
                  placeholder="Select products"
                  fullWidth
                />
              </Box>
            </Grid>

            {/* Topic Tags */}
            <Grid item xs={12}>
              <Box ref={topicTagsRef}>
                <TaxonomyMultiSelect
                  groupKey="topic_tag"
                  values={course.topic_tag_ids && course.topic_tag_ids.length > 0 ? course.topic_tag_ids : []}
                  onChange={(optionIds) => {
                    handleFieldChange('topic_tag_ids', optionIds);
                  }}
                  label="Topic Tags"
                  placeholder="Add topic tags"
                  fullWidth
                />
              </Box>
            </Grid>

            {/* Estimated Time */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Estimated time"
                type="number"
                value={course.estimated_minutes?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === null || value === undefined) {
                    handleFieldChange('estimated_minutes', undefined);
                  } else {
                    const parsed = parseInt(value, 10);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 600) {
                      handleFieldChange('estimated_minutes', parsed);
                    }
                  }
                }}
                inputProps={{
                  min: 1,
                  max: 600,
                  step: 1,
                }}
                fullWidth
                helperText="Displayed on course cards. Use the total time to complete this course."
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
                onCoverImageSelected={(mediaRef) => handleFieldChange('cover_image', mediaRef)}
                onCoverImageRemoved={() => handleFieldChange('cover_image', undefined)}
                onTemporaryMediaCreated={onTemporaryMediaCreated}
              />
            </Box>

            {/* Badges */}
            <Box ref={badgesRef}>
              <TaxonomyMultiSelect
                groupKey="badge"
                values={course.badge_ids && course.badge_ids.length > 0 ? course.badge_ids : []}
                onChange={(optionIds) => {
                  handleFieldChange('badge_ids', optionIds);
                }}
                label="Badges"
                placeholder="Select badges"
                fullWidth
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

