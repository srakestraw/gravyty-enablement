/**
 * Details Tab Content Component
 * 
 * Contains all course details fields organized into stable groups:
 * - Basics: Title, Short Description, Long Description
 * - Media: Cover Image
 * - Metadata: Product, Product Suite, Topic Tags
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
import { MetadataSelect, MetadataMultiSelect, MetadataSection } from '../../metadata';
import { RichTextEditor } from '../../common/RichTextEditor';
import { AssetPicker } from '../../content-hub/AssetPicker';
import { CourseAssets } from '../../lms/CourseAssets';
import { CoverImageSelector } from '../../shared/CoverImageSelector';
import { lmsAdminApi } from '../../../api/lmsAdminClient';
import { promptHelpersApi } from '../../../api/promptHelpersClient';
import { isErrorResponse } from '../../../lib/apiClient';
import { AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Course, MediaRef } from '@gravyty/domain';
import type { NodeType } from '../../../types/courseTree';
import { Add } from '@mui/icons-material';

export interface DetailsTabContentProps {
  course: Course;
  onUpdateCourse: (updates: Partial<Course>) => void;
  onUpdateCourseField?: (field: string, value: any) => void; // New direct field update callback
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
  onUpdateCourseField,
  shouldShowError,
  markFieldTouched,
  titleRef,
  shortDescriptionRef,
  descriptionRef,
  onTemporaryMediaCreated,
}: DetailsTabContentProps) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productSuiteIds, setProductSuiteIds] = useState<string[]>([]);

  // Debug: Track Product Suite state changes
  useEffect(() => {
    console.log('[DetailsTabContent] Product Suite state changed:', {
      productSuiteIds,
      courseProductSuiteIds: course?.product_suite_ids,
      courseProductSuiteId: course?.product_suite_id, // legacy
      timestamp: new Date().toISOString(),
    });
  }, [productSuiteIds, course?.product_suite_ids, course?.product_suite_id]);

  // Debug: Track Product state changes
  useEffect(() => {
    console.log('[DetailsTabContent] Product state changed:', {
      productIds,
      productSuiteIds,
      courseProductIds: course?.product_ids,
      courseProductId: course?.product_id, // legacy
      timestamp: new Date().toISOString(),
    });
  }, [productIds, productSuiteIds, course?.product_ids, course?.product_id]);
  const [topicTagIds, setTopicTagIds] = useState<string[]>([]);
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetsRefreshKey, setAssetsRefreshKey] = useState(0);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [descriptionHelpers, setDescriptionHelpers] = useState<any[]>([]);
  const [selectedDescriptionHelperId, setSelectedDescriptionHelperId] = useState<string>('');
  const [generatingDescription, setGeneratingDescription] = useState(false);

  // Refs for focus registry
  const productRef = useRef<HTMLDivElement>(null);
  const productSuiteRef = useRef<HTMLDivElement>(null);
  const topicTagsRef = useRef<HTMLDivElement>(null);
  const audienceRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);

  // Track the last synced course ID to avoid overwriting user input
  const lastSyncedCourseIdRef = useRef<string | null>(null);

  // Sync state with course (only when course ID changes)
  // Only sync if course_id actually changed to avoid overwriting user input
  useEffect(() => {
    const courseIdChanged = course && course.course_id !== lastSyncedCourseIdRef.current;
    console.log('[DetailsTabContent] Sync useEffect triggered:', {
      courseId: course?.course_id,
      lastSyncedCourseId: lastSyncedCourseIdRef.current,
      courseIdChanged,
      courseProductIds: course?.product_ids,
      courseProductSuiteIds: course?.product_suite_ids,
      courseProductId: course?.product_id, // legacy
      courseProductSuiteId: course?.product_suite_id, // legacy
      localProductIds: productIds,
      localProductSuiteIds: productSuiteIds,
      willSync: courseIdChanged,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack,
    });
    
    // IMPORTANT: Only sync when course_id actually changes, not when course object reference changes
    // This prevents overwriting user input when course updates come back from the server
    if (courseIdChanged) {
      console.log('[DetailsTabContent] Syncing local state with course (course_id changed):', {
        courseId: course.course_id,
        courseTitle: course.title,
        courseProductIds: course.product_ids,
        courseProductSuiteIds: course.product_suite_ids,
        courseProductId: course.product_id, // legacy
        courseProductSuiteId: course.product_suite_id, // legacy
        currentLocalTitle: title,
        currentLocalProductIds: productIds,
        currentLocalProductSuiteIds: productSuiteIds,
      });
      // Only sync if course_id changed - this is a new course being loaded
      // Support both new array fields and legacy single values for backward compatibility
      const courseProductIds = course.product_ids && course.product_ids.length > 0 
        ? course.product_ids 
        : (course.product_id ? [course.product_id] : []);
      const courseProductSuiteIds = course.product_suite_ids && course.product_suite_ids.length > 0
        ? course.product_suite_ids
        : (course.product_suite_id ? [course.product_suite_id] : []);
      
      console.log('[DetailsTabContent] Syncing product fields:', {
        courseProductIds,
        courseProductSuiteIds,
        courseProductId: course.product_id, // legacy
        courseProductSuiteId: course.product_suite_id, // legacy
      });
      
      setProductIds(courseProductIds);
      setProductSuiteIds(courseProductSuiteIds);
      setTopicTagIds(course.topic_tag_ids && course.topic_tag_ids.length > 0 ? course.topic_tag_ids : []);
      setAudienceIds(course.audience_ids && course.audience_ids.length > 0 ? course.audience_ids : []);
      setTitle(course.title || '');
      setShortDescription(course.short_description || '');
      setDescription(course.description || '');
      setEstimatedMinutes(course.estimated_minutes?.toString() || '');
      lastSyncedCourseIdRef.current = course.course_id;
    } else if (course) {
      console.log('[DetailsTabContent] Course ID unchanged, NOT syncing to preserve user input:', {
        courseId: course.course_id,
        courseProductIds: course.product_ids,
        courseProductSuiteIds: course.product_suite_ids,
        courseProductId: course.product_id, // legacy
        courseProductSuiteId: course.product_suite_id, // legacy
        localProductIds: productIds,
        localProductSuiteIds: productSuiteIds,
        note: 'This prevents overwriting user input when course updates come back from server',
      });
    }
    // Don't sync individual fields when course object changes but course_id stays the same
    // This prevents overwriting user input during updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.course_id]); // Only depend on course_id, not the entire course object or other fields

  // Debug: Track when course prop changes (any field, not just course_id)
  useEffect(() => {
    console.log('[DetailsTabContent] course prop changed:', {
      courseId: course?.course_id,
      courseTitle: course?.title,
      courseProductIds: course?.product_ids,
      courseProductSuiteIds: course?.product_suite_ids,
      courseProductId: course?.product_id, // legacy
      courseProductSuiteId: course?.product_suite_id, // legacy
      localProductIds: productIds,
      localProductSuiteIds: productSuiteIds,
      localTitle: title,
      titleMismatch: course?.title !== title,
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack,
    });
    
    // WARNING: If course prop has undefined values but local state has values, this might clear them
    if (course && course.course_id === lastSyncedCourseIdRef.current) {
      const courseHasProductIds = (course.product_ids && course.product_ids.length > 0) || course.product_id;
      const courseHasProductSuiteIds = (course.product_suite_ids && course.product_suite_ids.length > 0) || course.product_suite_id;
      if ((productSuiteIds.length > 0 && !courseHasProductSuiteIds) || (productIds.length > 0 && !courseHasProductIds)) {
        console.warn('[DetailsTabContent] ⚠️ Course prop update might clear local state!', {
          courseProductIds: course.product_ids,
          courseProductSuiteIds: course.product_suite_ids,
          courseProductId: course.product_id, // legacy
          courseProductSuiteId: course.product_suite_id, // legacy
          localProductIds: productIds,
          localProductSuiteIds: productSuiteIds,
          note: 'Course prop has undefined values but local state has values - sync useEffect should NOT run',
        });
      }
    }
  }, [course, productIds, productSuiteIds, title]);

  // Register fields with focus registry
  useEffect(() => {
    if (!course) return;

    const unregisters: Array<() => void> = [];

    if (productRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'product_ids',
        ref: productRef,
      }));
    }

    if (productSuiteRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'product_suite_ids',
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

    if (audienceRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'audience_ids',
        ref: audienceRef,
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

  const handleCourseFieldChange = (field: string, value: any) => {
    if (!course) {
      console.warn('handleCourseFieldChange: course is null');
      return;
    }
    if (!onUpdateCourse) {
      console.warn('handleCourseFieldChange: onUpdateCourse is undefined');
      return;
    }
    
    // Create updates object explicitly based on field name to avoid TypeScript/computed property issues
    let updates: Partial<Course>;
    
    // Use explicit object creation for each field to ensure proper structure
    switch (field) {
      case 'title':
        updates = { title: value };
        break;
      case 'short_description':
        updates = { short_description: value };
        break;
      case 'description':
        updates = { description: value };
        break;
      case 'product_id':
        updates = { product_id: value };
        break;
      case 'product_ids':
        updates = { product_ids: Array.isArray(value) ? value : [] };
        break;
      case 'product_suite_id':
        updates = { product_suite_id: value };
        break;
      case 'product_suite_ids':
        updates = { product_suite_ids: Array.isArray(value) ? value : [] };
        break;
      case 'topic_tag_ids':
        updates = { topic_tag_ids: value };
        break;
      case 'audience_ids':
        updates = { audience_ids: value };
        break;
      case 'estimated_minutes':
        updates = { estimated_minutes: typeof value === 'string' ? parseInt(value, 10) || undefined : value };
        break;
      default:
        updates = { [field]: value } as Partial<Course>;
    }
    
    console.log('[DetailsTabContent] handleCourseFieldChange calling onUpdateCourse:', {
      field,
      value,
      updates,
      updatesKeys: Object.keys(updates),
      updatesEntries: Object.entries(updates),
      hasTitle: 'title' in updates,
      titleValue: updates.title,
      updatesStringified: JSON.stringify(updates),
      updatesType: typeof updates,
      updatesConstructor: updates?.constructor?.name,
      timestamp: new Date().toISOString(),
    });
    
    // Create a fresh plain object to ensure no proxy/wrapper issues
    // Parse and re-stringify to ensure we have a completely plain object
    const updatesJson = JSON.stringify(updates);
    const plainUpdates = JSON.parse(updatesJson) as Partial<Course>;
    
    console.log('[DetailsTabContent] Plain updates object:', {
      plainUpdates,
      plainUpdatesKeys: Object.keys(plainUpdates),
      plainHasTitle: 'title' in plainUpdates,
      plainTitleValue: plainUpdates.title,
      plainUpdatesStringified: JSON.stringify(plainUpdates),
      updatesJson,
    });
    
    // Try the direct field update callback first (more reliable)
    if (onUpdateCourseField) {
      console.log('[DetailsTabContent] Using direct field update callback:', { field, value });
      onUpdateCourseField(field, value);
    } else {
      // Fallback to object-based callback
      onUpdateCourse(plainUpdates);
    }
  };

  // Debug: Track course.title changes
  useEffect(() => {
    console.log('[DetailsTabContent] course.title changed:', {
      courseId: course?.course_id,
      courseTitle: course?.title,
      localTitle: title,
      areEqual: course?.title === title,
    });
  }, [course?.title, course?.course_id, title]);

  // Debug: Track local title state changes
  useEffect(() => {
    console.log('[DetailsTabContent] local title state changed:', {
      localTitle: title,
      courseTitle: course?.title,
      areEqual: course?.title === title,
    });
  }, [title, course?.title]);

  // Debug: Track shouldShowError calls and results
  const debugShouldShowError = useCallback((entityType: NodeType, entityId: string, fieldKey: string): boolean => {
    if (!shouldShowError) {
      console.log('[DetailsTabContent] shouldShowError is undefined');
      return false;
    }
    const result = shouldShowError(entityType, entityId, fieldKey);
    console.log('[DetailsTabContent] shouldShowError called:', {
      entityType,
      entityId,
      fieldKey,
      result,
      courseTitle: course?.title,
      localTitle: title,
      isEmpty: !course?.title || course.title.trim() === '',
    });
    return result;
  }, [shouldShowError, course?.title, title]);

  // Debug: Calculate error state for title field
  useEffect(() => {
    if (!shouldShowError) return;
    
    // Use local title state for validation since it updates immediately
    const isEmpty = !title || title.trim() === '';
    const shouldShow = shouldShowError('course', course?.course_id || '', 'title');
    const errorState = isEmpty && shouldShow;
    
    console.log('[DetailsTabContent] Title error state calculation:', {
      courseTitle: course?.title,
      localTitle: title,
      isEmpty,
      shouldShow,
      errorState,
      courseId: course?.course_id,
    });
  }, [course?.title, course?.course_id, title, shouldShowError]);

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
              error={(() => {
                // Use local title state for validation since it updates immediately
                // course.title may lag behind due to React state update batching
                const isEmpty = !title || title.trim() === '';
                const shouldShow = shouldShowError ? debugShouldShowError('course', course.course_id, 'title') : false;
                const errorState = isEmpty && shouldShow;
                console.log('[DetailsTabContent] Title TextField error prop evaluation:', {
                  courseTitle: course.title,
                  localTitle: title,
                  isEmpty,
                  shouldShow,
                  errorState,
                  timestamp: new Date().toISOString(),
                });
                return errorState;
              })()}
              helperText={(() => {
                // Use local title state for validation since it updates immediately
                // course.title may lag behind due to React state update batching
                const isEmpty = !title || title.trim() === '';
                const shouldShow = shouldShowError ? debugShouldShowError('course', course.course_id, 'title') : false;
                const helperText = isEmpty && shouldShow ? 'Course title is required' : '';
                console.log('[DetailsTabContent] Title TextField helperText prop evaluation:', {
                  courseTitle: course.title,
                  localTitle: title,
                  isEmpty,
                  shouldShow,
                  helperText,
                  timestamp: new Date().toISOString(),
                });
                return helperText;
              })()}
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
              multiline
              rows={2}
              fullWidth
              helperText="Recommended: Brief description for course cards"
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
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
              <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={async () => {
                  try {
                    const response = await promptHelpersApi.getForContext('description');
                    if (!isErrorResponse(response)) {
                      setDescriptionHelpers(response.data.helpers);
                      const defaultHelper = response.data.helpers.find(h => h.is_default_for.includes('description'));
                      if (defaultHelper) {
                        setSelectedDescriptionHelperId(defaultHelper.helper_id);
                      }
                      setDescriptionModalOpen(true);
                    }
                  } catch (err) {
                    alert('Failed to load description helpers');
                  }
                }}
                sx={{ mt: 1 }}
              >
                Generate
              </Button>
            </Box>
          </Box>
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

          </Box>
        </Paper>

        {/* Metadata Section */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>
            Metadata
          </Typography>
          <MetadataSection
            entityType="course"
            entityId={course.course_id}
            productIds={productIds}
            onProductIdsChange={(ids) => {
              setProductIds(ids);
              handleCourseFieldChange('product_ids', ids);
            }}
            productSuiteIds={productSuiteIds}
            onProductSuiteIdsChange={(ids) => {
              setProductSuiteIds(ids);
              handleCourseFieldChange('product_suite_ids', ids);
            }}
            topicTagIds={topicTagIds}
            onTopicTagIdsChange={(ids) => {
              setTopicTagIds(ids);
              handleCourseFieldChange('topic_tag_ids', ids);
            }}
            audienceIds={audienceIds}
            onAudienceIdsChange={(ids) => {
              setAudienceIds(ids);
              handleCourseFieldChange('audience_ids', ids);
            }}
            shouldShowError={(fieldKey) => {
              return shouldShowError ? shouldShowError('course', course.course_id, fieldKey) : false;
            }}
            markFieldTouched={(fieldKey) => {
              if (markFieldTouched) {
                markFieldTouched('course', course.course_id, fieldKey);
              }
            }}
            refs={{
              productRef,
              productSuiteRef,
              topicTagsRef,
              audienceRef,
            }}
          />
          
          {/* Estimated Time */}
          <Grid container spacing={2} sx={{ mt: 1 }}>
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

      {/* Description Generation Modal */}
      <Dialog open={descriptionModalOpen} onClose={() => setDescriptionModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Description</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Prompt Helper</InputLabel>
            <Select
              value={selectedDescriptionHelperId}
              onChange={(e) => setSelectedDescriptionHelperId(e.target.value)}
              label="Prompt Helper"
            >
              <MenuItem value="">
                {descriptionHelpers.find(h => h.is_default_for.includes('description'))
                  ? 'Default (recommended)'
                  : 'None'}
              </MenuItem>
              {descriptionHelpers.map((helper) => (
                <MenuItem key={helper.helper_id} value={helper.helper_id}>
                  {helper.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              setGeneratingDescription(true);
              try {
                const response = await promptHelpersApi.composePreview({
                  helper_id: selectedDescriptionHelperId || undefined,
                  context: 'description',
                  variables: {
                    course: {
                      title: course.title,
                      audience: course.audience_ids?.join(', '),
                      level: course.difficulty_level,
                      duration: course.estimated_minutes?.toString(),
                      topics: course.topic_tag_ids?.join(', '),
                    },
                  },
                });
                
                if (!isErrorResponse(response)) {
                  // Use chat completion to generate actual description
                  const chatResponse = await lmsAdminApi.chatCompletion({
                    prompt: response.data.composed_prompt,
                    context: 'course description',
                  });
                  
                  if (!isErrorResponse(chatResponse)) {
                    const generated = chatResponse.data.content;
                    // Try to split into short and long description
                    const lines = generated.split('\n').filter(l => l.trim());
                    if (lines.length >= 2) {
                      setShortDescription(lines[0].replace(/^\d+\.\s*/, '').trim());
                      handleCourseFieldChange('short_description', lines[0].replace(/^\d+\.\s*/, '').trim());
                      setDescription(lines.slice(1).join('\n').trim());
                      handleCourseFieldChange('description', lines.slice(1).join('\n').trim());
                    } else {
                      setDescription(generated);
                      handleCourseFieldChange('description', generated);
                    }
                    setDescriptionModalOpen(false);
                  }
                }
              } catch (err) {
                alert('Failed to generate description');
              } finally {
                setGeneratingDescription(false);
              }
            }}
            disabled={generatingDescription}
            startIcon={generatingDescription ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
          >
            {generatingDescription ? 'Generating...' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

