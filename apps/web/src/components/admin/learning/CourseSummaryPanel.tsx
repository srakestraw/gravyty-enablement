/**
 * Course Summary Panel
 * 
 * Read-only summary of course metadata for Inspector when Details tab is active
 */

import { Box, Typography, Paper, Chip, Divider } from '@mui/material';
import { useMetadataOptions } from '../../../hooks/useMetadataOptions';
import { metadataApi } from '../../../api/metadataClient';
import { useState, useEffect } from 'react';
import type { Course, MetadataOption } from '@gravyty/domain';

export interface CourseSummaryPanelProps {
  course: Course | null;
}

export function CourseSummaryPanel({ course }: CourseSummaryPanelProps) {
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
  }, [course?.product_id, course?.product_suite_id, course?.product_concept_id, course?.topic_tag_ids]);

  if (!course) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Course data not available
        </Typography>
      </Box>
    );
  }

  const sectionsCount = course.sections?.length || 0;
  const badgesCount = course.badges?.length || 0;
  const hasCoverImage = !!course.cover_image;

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Course Summary
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Product */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Product
            </Typography>
            {loadingTaxonomy ? (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            ) : productOption ? (
              <Chip label={productOption.label} size="small" />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Not set
              </Typography>
            )}
          </Box>

          {/* Product Suite */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Product Suite
            </Typography>
            {loadingTaxonomy ? (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            ) : productSuiteOption ? (
              <Chip label={productSuiteOption.label} size="small" />
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Not set
              </Typography>
            )}
          </Box>

          {/* Topic Tags */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Topic Tags ({topicTagOptions.length})
            </Typography>
            {loadingTaxonomy ? (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            ) : topicTagOptions.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {topicTagOptions.map((tag) => (
                  <Chip key={tag.option_id} label={tag.label} size="small" />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No tags
              </Typography>
            )}
          </Box>

          {/* Cover Image Status */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Cover Image
            </Typography>
            <Typography variant="body2" color={hasCoverImage ? 'success.main' : 'text.secondary'}>
              {hasCoverImage ? 'Attached' : 'Not attached'}
            </Typography>
          </Box>

          {/* Badges Count */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Badges
            </Typography>
            <Typography variant="body2">
              {badgesCount} badge{badgesCount !== 1 ? 's' : ''}
            </Typography>
          </Box>

          {/* Sections Count */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Course Structure
            </Typography>
            <Typography variant="body2">
              {sectionsCount} section{sectionsCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

