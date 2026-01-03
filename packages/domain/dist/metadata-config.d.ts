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
    entityTypes: EntityType[];
}
/**
 * Metadata Field Configuration
 *
 * Defines which metadata fields are available for each entity type.
 *
 * - Product, Product Suite, Topic Tags, Audience: Available for ALL entity types
 */
export declare const METADATA_FIELD_CONFIG: MetadataFieldConfig[];
/**
 * Get metadata fields for a specific entity type
 */
export declare function getMetadataFieldsForEntityType(entityType: EntityType): MetadataFieldConfig[];
/**
 * Check if a metadata field should be shown for an entity type
 */
export declare function shouldShowMetadataField(groupKey: MetadataGroupKey, entityType: EntityType): boolean;
//# sourceMappingURL=metadata-config.d.ts.map