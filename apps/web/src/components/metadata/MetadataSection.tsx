/**
 * Metadata Section Component
 * 
 * Shared metadata section component that can be used across all entity types
 * (Courses, Learning Paths, Role Playing, Assets/Content, Kits).
 * 
 * Conditionally renders fields based on entity type:
 * - Product, Product Suite, Topic Tags, Audience: All entity types
 */

import { useEffect } from 'react';
import { Box, Grid, Typography } from '@mui/material';
import { MetadataMultiSelect } from './MetadataMultiSelect';
import { shouldShowMetadataField, type EntityType } from '@gravyty/domain';
import type { MetadataGroupKey } from '@gravyty/domain';
import { useMetadataOptions } from '../../hooks/useMetadataOptions';

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
  
  // Error handling
  shouldShowError?: (fieldKey: string) => boolean;
  markFieldTouched?: (fieldKey: string) => void;
  
  // Refs for focus registry (optional)
  refs?: {
    productRef?: React.RefObject<HTMLDivElement>;
    productSuiteRef?: React.RefObject<HTMLDivElement>;
    topicTagsRef?: React.RefObject<HTMLDivElement>;
    audienceRef?: React.RefObject<HTMLDivElement>;
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
  shouldShowError,
  markFieldTouched,
  refs,
}: MetadataSectionProps) {
  
  // Fetch all products to validate against Product Suite selection
  // This is needed to check parent_id relationships for validation
  const { options: allProducts } = useMetadataOptions('product', {
    include_archived: true, // Include archived to check all products
  });
  
  // Fetch all product suites to validate selected IDs exist
  const { options: allProductSuites } = useMetadataOptions('product_suite', {
    include_archived: true, // Include archived to check all product suites
  });
  
  // Fetch all topic tags to validate selected IDs exist
  const { options: allTopicTags } = useMetadataOptions('topic_tag', {
    include_archived: true, // Include archived to check all topic tags
  });
  
  // Fetch all audiences to validate selected IDs exist
  const { options: allAudiences } = useMetadataOptions('audience', {
    include_archived: true, // Include archived to check all audiences
  });
  
  // Validate and remove invalid Product Suite IDs (e.g., after deletion)
  useEffect(() => {
    if (allProductSuites.length === 0) {
      // Product Suites not loaded yet, skip validation
      return;
    }
    
    if (productSuiteIds.length === 0) {
      // No Product Suites selected, nothing to validate
      return;
    }
    
    // Filter out Product Suite IDs that don't exist in the database
    const validProductSuiteIds = productSuiteIds.filter((suiteId) =>
      allProductSuites.find((ps) => ps.option_id === suiteId)
    );
    
    // If any Product Suite IDs were removed, update the selection
    const currentIdsStr = JSON.stringify([...productSuiteIds].sort());
    const validIdsStr = JSON.stringify([...validProductSuiteIds].sort());
    if (currentIdsStr !== validIdsStr) {
      console.log('[MetadataSection] Removing invalid Product Suite IDs:', {
        removed: productSuiteIds.filter((id) => !validProductSuiteIds.includes(id)),
        validProductSuiteIds,
      });
      onProductSuiteIdsChange(validProductSuiteIds);
    }
  }, [productSuiteIds, allProductSuites, onProductSuiteIdsChange]);

  // Validate and remove invalid Topic Tag IDs (e.g., after deletion)
  useEffect(() => {
    if (allTopicTags.length === 0) {
      // Topic Tags not loaded yet, skip validation
      return;
    }
    
    if (topicTagIds.length === 0) {
      // No Topic Tags selected, nothing to validate
      return;
    }
    
    // Filter out Topic Tag IDs that don't exist in the database
    const validTopicTagIds = topicTagIds.filter((tagId) =>
      allTopicTags.find((tt) => tt.option_id === tagId)
    );
    
    // If any Topic Tag IDs were removed, update the selection
    const currentIdsStr = JSON.stringify([...topicTagIds].sort());
    const validIdsStr = JSON.stringify([...validTopicTagIds].sort());
    if (currentIdsStr !== validIdsStr) {
      console.log('[MetadataSection] Removing invalid Topic Tag IDs:', {
        removed: topicTagIds.filter((id) => !validTopicTagIds.includes(id)),
        validTopicTagIds,
      });
      onTopicTagIdsChange(validTopicTagIds);
    }
  }, [topicTagIds, allTopicTags, onTopicTagIdsChange]);

  // Validate and remove invalid Audience IDs (e.g., after deletion)
  useEffect(() => {
    if (allAudiences.length === 0) {
      // Audiences not loaded yet, skip validation
      return;
    }
    
    if (audienceIds.length === 0) {
      // No Audiences selected, nothing to validate
      return;
    }
    
    // Filter out Audience IDs that don't exist in the database
    const validAudienceIds = audienceIds.filter((audienceId) =>
      allAudiences.find((a) => a.option_id === audienceId)
    );
    
    // If any Audience IDs were removed, update the selection
    const currentIdsStr = JSON.stringify([...audienceIds].sort());
    const validIdsStr = JSON.stringify([...validAudienceIds].sort());
    if (currentIdsStr !== validIdsStr) {
      console.log('[MetadataSection] Removing invalid Audience IDs:', {
        removed: audienceIds.filter((id) => !validAudienceIds.includes(id)),
        validAudienceIds,
      });
      onAudienceIdsChange(validAudienceIds);
    }
  }, [audienceIds, allAudiences, onAudienceIdsChange]);

  // Validate and remove invalid products when Product Suite selection changes
  useEffect(() => {
    // Only validate if we have products loaded and Product Suites selected
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
      console.log('[MetadataSection] Removing invalid products:', {
        removed: productIds.filter((id) => !validProductIds.includes(id)),
        validProductIds,
        productSuiteIds,
      });
      onProductIdsChange(validProductIds);
    }
  }, [productSuiteIds, productIds, allProducts, onProductIdsChange]);
  
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
              error={
                shouldShowError && shouldShowError('product_suite_ids')
                  ? // Check if any selected Product Suite IDs don't exist (invalid references)
                    productSuiteIds.some((id) => !allProductSuites.find((ps) => ps.option_id === id))
                  : false
              }
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
              parentIds={productSuiteIds.length > 0 ? productSuiteIds : undefined}
              label="Product"
              placeholder="Select products"
              fullWidth
              error={
                shouldShowError && shouldShowError('product_ids')
                  ? // Check if any selected Product IDs don't exist (invalid references)
                    productIds.some((id) => !allProducts.find((p) => p.option_id === id))
                  : false
              }
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
              error={
                shouldShowError && shouldShowError('topic_tag_ids')
                  ? // Check if any selected Topic Tag IDs don't exist (invalid references)
                    topicTagIds.some((id) => !allTopicTags.find((tt) => tt.option_id === id))
                  : false
              }
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
              error={
                shouldShowError && shouldShowError('audience_ids')
                  ? // Check if any selected Audience IDs don't exist (invalid references)
                    audienceIds.some((id) => !allAudiences.find((a) => a.option_id === id))
                  : false
              }
            />
          </Box>
        </Grid>
      )}
    </Grid>
  );
}

