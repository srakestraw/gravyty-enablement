/**
 * Metadata Domain Types
 * 
 * Defines metadata groups and options for categorizing content (Courses, Resources).
 * Metadata groups: product, product_suite, topic_tag, badge, audience
 * 
 * Note: Renamed from legacy naming:
 * - Legacy "product_suite" -> "product"
 * - Legacy "product_concept" -> "product_suite"
 */

import { z } from 'zod';

/**
 * Metadata Group Key
 * 
 * Enum of metadata group types
 * 
 * Renamed:
 * - "product" (was "product_suite")
 * - "product_suite" (was "product_concept")
 * - "topic_tag" (unchanged)
 */
export const MetadataGroupKeySchema = z.enum(['product', 'product_suite', 'topic_tag', 'badge', 'audience']);
export type MetadataGroupKey = z.infer<typeof MetadataGroupKeySchema>;

/**
 * Metadata Option
 * 
 * A single option within a metadata group (e.g., "CRM" in product).
 * Options can be archived but remain visible on existing content.
 */
export const MetadataOptionSchema = z.object({
  option_id: z.string(), // Unique ID (UUID)
  group_key: MetadataGroupKeySchema,
  label: z.string().min(1), // Display name
  slug: z.string().min(1), // URL-friendly identifier
  sort_order: z.number().int().min(0).default(0), // Display order within group
  archived_at: z.string().optional(), // ISO datetime if archived (legacy, use status)
  status: z.enum(['active', 'archived']).default('active'), // active | archived
  deleted_at: z.string().optional().nullable(), // ISO datetime if soft-deleted
  parent_id: z.string().optional(), // For hierarchical metadata (e.g., product_suite -> product)
  color: z.string().optional(), // Optional color for UI display
  short_description: z.string().max(140).optional(), // Optional short description (max ~140 chars)
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string(), // User ID
});

export type MetadataOption = z.infer<typeof MetadataOptionSchema>;

/**
 * Create Metadata Option Request
 */
export const CreateMetadataOptionSchema = z.object({
  group_key: MetadataGroupKeySchema,
  label: z.string().min(1),
  slug: z.string().min(1).optional(), // Auto-generated from label if not provided
  sort_order: z.number().int().min(0).optional(),
  parent_id: z.string().optional(),
  color: z.string().optional(),
  short_description: z.string().max(140).optional(),
});

export type CreateMetadataOption = z.infer<typeof CreateMetadataOptionSchema>;

/**
 * Update Metadata Option Request
 */
export const UpdateMetadataOptionSchema = z.object({
  label: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  archived_at: z.string().optional(), // Set to ISO datetime to archive, undefined to unarchive (legacy)
  status: z.enum(['active', 'archived']).optional(), // active | archived
  deleted_at: z.string().optional().nullable(), // Set to ISO datetime to soft-delete, null to restore
  color: z.string().optional().nullable(), // Set to null to clear color
  short_description: z.string().max(140).optional().nullable(), // Set to null to clear description
});

export type UpdateMetadataOption = z.infer<typeof UpdateMetadataOptionSchema>;

/**
 * List Metadata Options Response
 */
export interface ListMetadataOptionsResponse {
  options: MetadataOption[];
  next_cursor?: string;
}

/**
 * Metadata Option Usage Response
 * 
 * Returns usage counts for a metadata option across Courses and Resources
 */
export interface MetadataOptionUsageResponse {
  used_by_courses: number;
  used_by_resources: number;
  sample_course_ids?: string[];
  sample_resource_ids?: string[];
}

/**
 * Merge Metadata Option Request
 * 
 * Moves all references from source option to target option
 */
export const MergeMetadataOptionSchema = z.object({
  target_option_id: z.string().min(1),
});

export type MergeMetadataOption = z.infer<typeof MergeMetadataOptionSchema>;

