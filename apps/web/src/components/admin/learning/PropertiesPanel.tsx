/**
 * Properties Panel
 * 
 * Shows context-specific properties for the selected node
 * Includes taxonomy fields and metadata not in the main editor form
 */

import { Box, Typography, Paper, Divider, Chip, CircularProgress } from '@mui/material';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';
import { metadataApi } from '../../../api/metadataClient';
import { useState, useEffect } from 'react';
import type { CourseTreeNode } from '../../../types/courseTree';
import type { Course, MetadataOption } from '@gravyty/domain';

export interface PropertiesPanelProps {
  selectedNode: CourseTreeNode | null;
  course: Course | null;
}

export function PropertiesPanel({ selectedNode, course }: PropertiesPanelProps) {
  const [productOption, setProductOption] = useState<MetadataOption | null>(null);
  const [productSuiteOption, setProductSuiteOption] = useState<MetadataOption | null>(null);
  const [topicTagOptions, setTopicTagOptions] = useState<MetadataOption[]>([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(false);

  // Fetch taxonomy option labels
  useEffect(() => {
    if (!course) return;

    const fetchTaxonomyLabels = async () => {
      setLoadingTaxonomy(true);
      try {
        // Fetch Product
        if (course.product_id || course.product_suite_id) {
          const productId = course.product_id || course.product_suite_id;
          const productRes = await metadataApi.getOption(productId!);
          if ('data' in productRes) {
            setProductOption(productRes.data.option);
          }
        } else {
          setProductOption(null);
        }

        // Fetch Product Suite
        if (course.product_suite_id || course.product_concept_id) {
          const productSuiteId = course.product_suite_id || course.product_concept_id;
          const productSuiteRes = await metadataApi.getOption(productSuiteId!);
          if ('data' in productSuiteRes) {
            setProductSuiteOption(productSuiteRes.data.option);
          }
        } else {
          setProductSuiteOption(null);
        }

        // Fetch Topic Tags
        const topicTagIds = course.topic_tag_ids || [];
        if (topicTagIds.length > 0) {
          const tagPromises = topicTagIds.map((id) => metadataApi.getOption(id));
          const tagResults = await Promise.all(tagPromises);
          const tags = tagResults
            .filter((r) => 'data' in r)
            .map((r) => ('data' in r ? r.data.option : null))
            .filter((t): t is MetadataOption => t !== null);
          setTopicTagOptions(tags);
        } else {
          setTopicTagOptions([]);
        }
      } catch (err) {
        console.error('Failed to load taxonomy labels:', err);
      } finally {
        setLoadingTaxonomy(false);
      }
    };

    fetchTaxonomyLabels();
  }, [course?.product_id, course?.product_suite_id, course?.product_suite_id, course?.product_concept_id, course?.topic_tag_ids]);

  if (!selectedNode || !course) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Select a node to view properties
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {selectedNode.type === 'course' && (
        <>
          {/* Taxonomy Fields */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Categorization
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Product
              </Typography>
              {loadingTaxonomy ? (
                <CircularProgress size={16} />
              ) : productOption ? (
                <Chip label={productOption.label} size="small" sx={{ mb: 1 }} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                  Not set
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, mt: 1 }}>
                Product Suite
              </Typography>
              {loadingTaxonomy ? (
                <CircularProgress size={16} />
              ) : productSuiteOption ? (
                <Chip label={productSuiteOption.label} size="small" sx={{ mb: 1 }} />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic' }}>
                  Not set
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5, mt: 1 }}>
                Topic Tags
              </Typography>
              {loadingTaxonomy ? (
                <CircularProgress size={16} />
              ) : topicTagOptions.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {topicTagOptions.map((tag) => (
                    <Chip key={tag.option_id} label={tag.label} size="small" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  None
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Cover Image */}
          {course.cover_image && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Cover Image
              </Typography>
              <Box sx={{ mt: 1 }}>
                {course.cover_image.media_type === 'image' && course.cover_image.url && (
                  <Box
                    component="img"
                    src={course.cover_image.url}
                    alt="Cover"
                    sx={{ maxWidth: '100%', borderRadius: 1 }}
                  />
                )}
                {course.cover_image.media_id && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Media ID: {course.cover_image.media_id}
                  </Typography>
                )}
              </Box>
            </Paper>
          )}

          {/* Badges */}
          {course.badges && course.badges.length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Badges
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {course.badges.map((badge) => (
                  <Chip key={badge.badge_id} label={badge.name} size="small" />
                ))}
              </Box>
            </Paper>
          )}

          {/* Course Metadata */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Metadata
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Course ID
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {course.course_id}
              </Typography>

              <Typography variant="caption" color="text.secondary" display="block">
                Status
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {course.status}
              </Typography>

              {course.version && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Version
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {course.version}
                  </Typography>
                </>
              )}

              {course.created_at && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(course.created_at).toLocaleDateString()}
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        </>
      )}

      {selectedNode.type === 'section' && selectedNode.sectionData && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Section Metadata
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Section ID
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedNode.sectionData.section_id}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">
              Order
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedNode.sectionData.order}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">
              Lessons Count
            </Typography>
            <Typography variant="body2">
              {selectedNode.sectionData.lesson_ids.length}
            </Typography>
          </Box>
        </Paper>
      )}

      {selectedNode.type === 'lesson' && selectedNode.lessonData && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Lesson Metadata
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Lesson ID
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedNode.lessonData.lesson_id}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">
              Type
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedNode.lessonData.type}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">
              Order
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedNode.lessonData.order}
            </Typography>

            <Typography variant="caption" color="text.secondary" display="block">
              Required
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedNode.lessonData.required ? 'Yes' : 'No'}
            </Typography>

            {selectedNode.lessonData.created_at && (
              <>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(selectedNode.lessonData.created_at).toLocaleDateString()}
                </Typography>
              </>
            )}
          </Box>
        </Paper>
      )}
    </Box>
  );
}

