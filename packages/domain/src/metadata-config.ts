/**
 * Metadata Field Configuration
 * 
 * Defines which metadata fields are available for each entity type.
 * Used by MetadataSection component to conditionally render fields.
 */

import type { MetadataGroupKey } from './metadata.js';

/**
 * Entity Type
 * 
 * Types of entities that can have metadata
 */
export type EntityType = 'course' | 'learning_path' | 'role_playing' | 'content' | 'content_kit';

/**
 * Metadata Field Configuration
 * 
 * Defines which metadata fields are shown for which entity types
 */
export interface MetadataFieldConfig {
  groupKey: MetadataGroupKey;
  label: string;
  required?: boolean;
  entityTypes: EntityType[]; // Which entity types show this field
}

/**
 * Metadata Field Configuration
 * 
 * Defines which metadata fields are available for each entity type.
 * 
 * - Product, Product Suite, Topic Tags, Audience: Available for ALL entity types
 */
export const METADATA_FIELD_CONFIG: MetadataFieldConfig[] = [
  {
    groupKey: 'product',
    label: 'Product',
    entityTypes: ['course', 'learning_path', 'role_playing', 'content', 'content_kit'],
  },
  {
    groupKey: 'product_suite',
    label: 'Product Suite',
    entityTypes: ['course', 'learning_path', 'role_playing', 'content', 'content_kit'],
  },
  {
    groupKey: 'topic_tag',
    label: 'Topic Tags',
    entityTypes: ['course', 'learning_path', 'role_playing', 'content', 'content_kit'],
  },
  {
    groupKey: 'audience',
    label: 'Audience',
    entityTypes: ['course', 'learning_path', 'role_playing', 'content', 'content_kit'],
  },
];

/**
 * Get metadata fields for a specific entity type
 */
export function getMetadataFieldsForEntityType(entityType: EntityType): MetadataFieldConfig[] {
  return METADATA_FIELD_CONFIG.filter((config) => config.entityTypes.includes(entityType));
}

/**
 * Check if a metadata field should be shown for an entity type
 */
export function shouldShowMetadataField(groupKey: MetadataGroupKey, entityType: EntityType): boolean {
  const config = METADATA_FIELD_CONFIG.find((c) => c.groupKey === groupKey);
  return config ? config.entityTypes.includes(entityType) : false;
}

