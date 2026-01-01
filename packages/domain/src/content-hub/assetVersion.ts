/**
 * Content Hub - Asset Version Domain Model
 * 
 * Represents a specific version of an asset (v1, v2, v3).
 */

import { z } from 'zod';

/**
 * Asset Version Status
 */
export const AssetVersionStatusSchema = z.enum([
  'draft',
  'scheduled',
  'published',
  'deprecated',
  'expired',
  'archived',
]);

export type AssetVersionStatus = z.infer<typeof AssetVersionStatusSchema>;

/**
 * Source Version Reference (for Google Drive sync)
 */
export const SourceVersionRefSchema = z.object({
  drive_revision_id: z.string().optional(),
  modified_time: z.string().optional(),
  checksum: z.string().optional(),
}).optional();

export type SourceVersionRef = z.infer<typeof SourceVersionRefSchema>;

/**
 * Asset Version
 * 
 * Specific revision of an asset with lifecycle state.
 */
export const AssetVersionSchema = z.object({
  // Primary key
  version_id: z.string(),
  asset_id: z.string(),
  version_number: z.number().int().min(1),
  
  // Lifecycle state
  status: AssetVersionStatusSchema,
  publish_at: z.string().optional(), // ISO datetime (for scheduled)
  expire_at: z.string().optional(), // ISO datetime
  
  // Publishing metadata
  published_by: z.string().optional(), // User ID
  published_at: z.string().optional(), // ISO datetime
  change_log: z.string().optional(), // Required on publish
  
  // File metadata (for UPLOAD source)
  storage_key: z.string().optional(), // S3 key
  checksum: z.string().optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().min(0).optional(),
  
  // Rendition metadata (thumbnails/previews)
  thumbnail_key: z.string().optional(),
  preview_key: z.string().optional(),
  
  // Source version reference (for GOOGLE_DRIVE sync)
  source_version_ref: SourceVersionRefSchema,
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('ASSET_VERSION').default('ASSET_VERSION'),
  
  // GSI attributes
  'asset_id#version_number': z.string().optional(), // For ByAssetVersions GSI
});

export type AssetVersion = z.infer<typeof AssetVersionSchema>;

