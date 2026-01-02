/**
 * Metadata Section Component
 * 
 * Shared metadata section component that can be used across all entity types
 * (Courses, Learning Paths, Role Playing, Assets/Content, Kits).
 * 
 * Conditionally renders fields based on entity type:
 * - Product, Product Suite, Topic Tags, Audience: All entity types
 * - Badges: Only Courses, Learning Paths, Role Playing
 */

import { Box, Grid, Typography } from '@mui/material';
import { MetadataMultiSelect } from './MetadataMultiSelect';
import { shouldShowMetadataField, type EntityType } from '@gravyty/domain';
import type { MetadataGroupKey } from '@gravyty/domain';

export interface MetadataSectionProps {
  entityType: EntityType;
  entityId: string; // For error handling and focus registry
  
  // Product fields (all entity types)
  productIds: string[];
  onProductIdsChange: (ids: string[]) => void;
  
  // Product Suite fields (all entity types)
  productSuiteIds: string[];
  onProductSuiteIdsChange: (ids: string[]) => void;
  
  // Topic Tags (all entity types)
  topicTagIds: string[];
  onTopicTagIdsChange: (ids: string[]) => void;
  
  // Audience (all entity types - REQUIRED)
  audienceIds: string[];
  onAudienceIdsChange: (ids: string[]) => void;
  
  // Badges (conditional - only Courses, Learning Paths, Role Playing)
  badgeIds?: string[];
  onBadgeIdsChange?: (ids: string[]) => void;
  
  // Error handling
  shouldShowError?: (fieldKey: string) => boolean;
  markFieldTouched?: (fieldKey: string) => void;
  
  // Refs for focus registry (optional)
  refs?: {
    productRef?: React.RefObject<HTMLDivElement>;
    productSuiteRef?: React.RefObject<HTMLDivElement>;
    topicTagsRef?: React.RefObject<HTMLDivElement>;
    audienceRef?: React.RefObject<HTMLDivElement>;
    badgesRef?: React.RefObject<HTMLDivElement>;
  };
}

export function MetadataSection({
  entityType,
  entityId,
  productIds,
  onProductIdsChange,
  productSuiteIds,
  onProductSuiteIdsChange,
  topicTagIds,
  onTopicTagIdsChange,
  audienceIds,
  onAudienceIdsChange,
  badgeIds,
  onBadgeIdsChange,
  shouldShowError,
  markFieldTouched,
  refs,
}: MetadataSectionProps) {
  
  const handleFieldChange = (fieldKey: string, value: string[]) => {
    if (markFieldTouched) {
      markFieldTouched(fieldKey);
    }
  };

  return (
    <Grid container spacing={2}>
      {/* Product Suite */}
      {shouldShowMetadataField('product_suite', entityType) && (
        <Grid item xs={12} sm={6}>
          <Box ref={refs?.productSuiteRef}>
            <MetadataMultiSelect
              groupKey="product_suite"
              values={productSuiteIds}
              onChange={(optionIds: string[]) => {
                onProductSuiteIdsChange(optionIds);
                handleFieldChange('product_suite_ids', optionIds);
              }}
              label="Product Suite"
              placeholder="Select product suites"
              fullWidth
              error={shouldShowError ? shouldShowError('product_suite_ids') : false}
            />
          </Box>
        </Grid>
      )}

      {/* Product */}
      {shouldShowMetadataField('product', entityType) && (
        <Grid item xs={12} sm={6}>
          <Box ref={refs?.productRef}>
            <MetadataMultiSelect
              groupKey="product"
              values={productIds}
              onChange={(optionIds: string[]) => {
                onProductIdsChange(optionIds);
                handleFieldChange('product_ids', optionIds);
              }}
              label="Product"
              placeholder="Select products"
              fullWidth
              error={shouldShowError ? shouldShowError('product_ids') : false}
            />
          </Box>
        </Grid>
      )}

      {/* Topic Tags */}
      {shouldShowMetadataField('topic_tag', entityType) && (
        <Grid item xs={12}>
          <Box ref={refs?.topicTagsRef}>
            <MetadataMultiSelect
              groupKey="topic_tag"
              values={topicTagIds}
              onChange={(optionIds: string[]) => {
                onTopicTagIdsChange(optionIds);
                handleFieldChange('topic_tag_ids', optionIds);
              }}
              label="Topic Tags"
              placeholder="Add topic tags"
              fullWidth
              error={shouldShowError ? shouldShowError('topic_tag_ids') : false}
            />
          </Box>
        </Grid>
      )}

      {/* Audience */}
      {shouldShowMetadataField('audience', entityType) && (
        <Grid item xs={12}>
          <Box ref={refs?.audienceRef}>
            <MetadataMultiSelect
              groupKey="audience"
              values={audienceIds}
              onChange={(optionIds: string[]) => {
                onAudienceIdsChange(optionIds);
                handleFieldChange('audience_ids', optionIds);
              }}
              label="Audience"
              placeholder="Select audiences"
              fullWidth
              error={shouldShowError ? shouldShowError('audience_ids') : false}
            />
          </Box>
        </Grid>
      )}

      {/* Badges (conditional) */}
      {shouldShowMetadataField('badge', entityType) && badgeIds !== undefined && onBadgeIdsChange && (
        <Grid item xs={12}>
          <Box ref={refs?.badgesRef}>
            <MetadataMultiSelect
              groupKey="badge"
              values={badgeIds}
              onChange={(optionIds: string[]) => {
                if (onBadgeIdsChange) {
                  onBadgeIdsChange(optionIds);
                  handleFieldChange('badge_ids', optionIds);
                }
              }}
              label="Badges"
              placeholder="Select badges"
              fullWidth
              error={shouldShowError ? shouldShowError('badge_ids') : false}
            />
          </Box>
        </Grid>
      )}
    </Grid>
  );
}

