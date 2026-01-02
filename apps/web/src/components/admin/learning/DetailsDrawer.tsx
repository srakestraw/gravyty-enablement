/**
 * Details Drawer Component
 * 
 * Collapsible drawer containing course metadata fields:
 * - Product Suite (single select, independent)
 * - Product (single select, independent)
 * - Topic Tags (multi-select)
 * - Cover Image (upload/select)
 * - Badges (multi-select)
 */

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Collapse,
  TextField,
  Chip,
  Button,
  Paper,
  Typography,
  Grid,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Image as ImageIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  InfoOutlined as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { MediaSelectModal } from './MediaSelectModal';
import { MetadataSelect, MetadataMultiSelect } from '../../metadata';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';
import { focusRegistry } from '../../../utils/focusRegistry';
import type { Course, MediaRef } from '@gravyty/domain';

export interface DetailsDrawerProps {
  course: Course | null;
  open: boolean;
  onToggle: () => void;
  onUpdateCourse: (updates: Partial<Course>) => void;
  shouldShowError?: (entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string) => boolean;
  markFieldTouched?: (entityType: 'course' | 'section' | 'lesson', entityId: string, fieldKey: string) => void;
}

export function DetailsDrawer({
  course,
  open,
  onToggle,
  onUpdateCourse,
  shouldShowError,
  markFieldTouched,
}: DetailsDrawerProps) {
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productSuiteIds, setProductSuiteIds] = useState<string[]>([]);
  const [topicTagIds, setTopicTagIds] = useState<string[]>([]);
  const [badgeIds, setBadgeIds] = useState<string[]>([]);

  // Refs for focus registry
  const productRef = useRef<HTMLDivElement>(null);
  const productSuiteRef = useRef<HTMLDivElement>(null);
  const topicTagsRef = useRef<HTMLDivElement>(null);
  const coverImageRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  // Track the last synced course ID to avoid overwriting user input
  const lastSyncedCourseIdRef = useRef<string | null>(null);

  // Fetch all products to validate against Product Suite selection
  const { options: allProducts } = useMetadataOptions('product', {
    include_archived: true, // Include archived to check all products
  });

  // Sync state with course (only when course ID changes)
  useEffect(() => {
    if (course && course.course_id !== lastSyncedCourseIdRef.current) {
      // Support both new array fields and legacy single values for backward compatibility
      const courseProductIds = course.product_ids && course.product_ids.length > 0 
        ? course.product_ids 
        : (course.product_id ? [course.product_id] : []);
      const courseProductSuiteIds = course.product_suite_ids && course.product_suite_ids.length > 0
        ? course.product_suite_ids
        : (course.product_suite_id ? [course.product_suite_id] : []);
      setProductIds(courseProductIds);
      setProductSuiteIds(courseProductSuiteIds);
      setTopicTagIds(course.topic_tag_ids && course.topic_tag_ids.length > 0 ? course.topic_tag_ids : []);
      setBadgeIds(course.badge_ids && course.badge_ids.length > 0 ? course.badge_ids : []);
      lastSyncedCourseIdRef.current = course.course_id;
    }
  }, [course?.course_id, course?.badge_ids]);

  // Validate and remove invalid products when Product Suite selection changes
  useEffect(() => {
    // Only validate if we have products loaded
    if (allProducts.length === 0) {
      // Products not loaded yet, skip validation
      return;
    }
    
    // Only validate if we have Product Suites selected and products selected
    if (productSuiteIds.length === 0 || productIds.length === 0) {
      // If no Product Suites selected, keep all products (backward compatibility)
      // If no products selected, nothing to validate
      return;
    }
    
    // Create set of valid Product Suite IDs for quick lookup
    const validProductSuiteIds = new Set(productSuiteIds);
    
    // Filter products to only keep those that:
    // 1. Belong to at least one selected Product Suite (parent_id matches), OR
    // 2. Have no parent_id (backward compatibility)
    const validProductIds = productIds.filter((productId) => {
      const product = allProducts.find((p) => p.option_id === productId);
      if (!product) {
        // Product not found, remove it
        return false;
      }
      // Keep if no parent_id (backward compatibility) or parent_id matches selected Product Suite
      return (
        product.parent_id === null ||
        product.parent_id === undefined ||
        (product.parent_id && validProductSuiteIds.has(product.parent_id))
      );
    });
    
    // If any products were removed, update the selection
    // Use JSON.stringify to compare arrays to avoid unnecessary updates
    const currentIdsStr = JSON.stringify([...productIds].sort());
    const validIdsStr = JSON.stringify([...validProductIds].sort());
    if (currentIdsStr !== validIdsStr) {
      console.log('[DetailsDrawer] Removing invalid products:', {
        removed: productIds.filter((id) => !validProductIds.includes(id)),
        validProductIds,
        productSuiteIds,
      });
      setProductIds(validProductIds);
      if (course) {
        handleCourseFieldChange('product_ids', validProductIds);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSuiteIds, productIds, allProducts]);

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
        onFocus: () => {
          if (!open) {
            onToggle();
          }
        },
      }));
    }

    if (productSuiteRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'product_suite_id',
        ref: productSuiteRef,
        onFocus: () => {
          if (!open) {
            onToggle();
          }
        },
      }));
    }

    if (topicTagsRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'topic_tag_ids',
        ref: topicTagsRef,
        onFocus: () => {
          if (!open) {
            onToggle();
          }
        },
      }));
    }

    if (coverImageRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'cover_image',
        ref: coverImageRef,
        onFocus: () => {
          if (!open) {
            onToggle();
          }
        },
      }));
    }

    if (badgesRef.current) {
      unregisters.push(focusRegistry.register({
        entityType: 'course',
        entityId: course.course_id,
        fieldKey: 'badge_ids',
        ref: badgesRef,
        onFocus: () => {
          if (!open) {
            onToggle();
          }
        },
      }));
    }

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [course?.course_id, open, onToggle]); // Re-register when drawer opens/closes

  const handleCourseFieldChange = (field: string, value: any) => {
    if (!course) return;
    onUpdateCourse({ [field]: value });
  };

  const handleCoverSelect = (mediaRef: MediaRef) => {
    handleCourseFieldChange('cover_image', mediaRef);
  };

  if (!course) return null;

  return (
    <>
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 1.5,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={onToggle}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
            Details
          </Typography>
          <IconButton size="small">
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        <Collapse in={open}>
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              {/* Product Suite */}
              <Grid item xs={12} sm={6}>
                <Box ref={productSuiteRef}>
                  <MetadataMultiSelect
                    groupKey="product_suite"
                    values={productSuiteIds}
                    onChange={(optionIds) => {
                      setProductSuiteIds(optionIds);
                      handleCourseFieldChange('product_suite_ids', optionIds);
                      if (markFieldTouched) {
                        markFieldTouched('course', course.course_id, 'product_suite_ids');
                      }
                    }}
                    label="Product Suite"
                    placeholder="Select product suites"
                    fullWidth
                    error={shouldShowError && shouldShowError('course', course.course_id, 'product_suite_ids')}
                  />
                </Box>
              </Grid>

              {/* Product */}
              <Grid item xs={12} sm={6}>
                <Box ref={productRef}>
                  <MetadataMultiSelect
                    groupKey="product"
                    values={productIds}
                    onChange={(optionIds) => {
                      setProductIds(optionIds);
                      handleCourseFieldChange('product_ids', optionIds);
                      if (markFieldTouched) {
                        markFieldTouched('course', course.course_id, 'product_ids');
                      }
                    }}
                    parentIds={productSuiteIds.length > 0 ? productSuiteIds : undefined}
                    label="Product"
                    placeholder="Select products"
                    fullWidth
                    error={shouldShowError && shouldShowError('course', course.course_id, 'product_ids')}
                  />
                </Box>
              </Grid>

              {/* Topic Tags */}
              <Grid item xs={12}>
                <Box ref={topicTagsRef}>
                  <MetadataMultiSelect
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

              {/* Cover Image */}
              <Grid item xs={12}>
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
              </Grid>

              {/* Badges */}
              <Grid item xs={12}>
                <Paper ref={badgesRef} sx={{ p: 2 }}>
                  <MetadataMultiSelect
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
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
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

