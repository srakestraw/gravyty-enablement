/**
 * Content Hub - Asset Domain Model
 * 
 * Represents a logical asset (e.g., "Q1 Sales Deck") that can have multiple versions.
 */

import { z } from 'zod';
import { MediaRefSchema } from '../lms/media.js';

/**
 * Asset Type
 */
export const AssetTypeSchema = z.enum([
  'deck',
  'doc',
  'image',
  'video',
  'logo',
  'worksheet',
  'link',
]);

export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Asset Source Type
 */
export const AssetSourceTypeSchema = z.enum([
  'UPLOAD',
  'LINK',
  'GOOGLE_DRIVE',
]);

export type AssetSourceType = z.infer<typeof AssetSourceTypeSchema>;

/**
 * Source Reference (JSON)
 * 
 * Structure depends on sourceType:
 * - LINK: { url: string, preview?: string }
 * - GOOGLE_DRIVE: { driveFileId: string, driveMimeType: string, driveWebViewLink?: string, connectorId: string }
 */
export const SourceRefSchema = z.record(z.unknown());

export type SourceRef = z.infer<typeof SourceRefSchema>;

/**
 * Asset
 * 
 * Logical asset that can have multiple versions.
 */
export const AssetSchema = z.object({
  // Primary key
  asset_id: z.string(),
  
  // Basic metadata
  title: z.string(),
  description: z.string().optional(),
  asset_type: AssetTypeSchema,
  
  // Ownership
  owner_id: z.string(),
  
  // Metadata
  metadata_node_ids: z.array(z.string()).default([]),
  audience_ids: z.array(z.string()).default([]), // Multi-select audience IDs
  
  // Source information
  source_type: AssetSourceTypeSchema,
  source_ref: SourceRefSchema.optional(),
  
  // Version tracking
  current_published_version_id: z.string().optional(),
  
  // Pinning
  pinned: z.boolean().default(false),
  
  // Cover image
  cover_image: MediaRefSchema.optional(),
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string(), // User ID
  
  // DynamoDB discriminator
  entity_type: z.literal('ASSET').default('ASSET'),
  
  // GSI attributes
  'metadata_node_id#status': z.string().optional(), // For ByMetadataStatusUpdated GSI
  'owner_id#updated_at': z.string().optional(), // For ByOwnerUpdated GSI
  'pinned#updated_at': z.string().optional(), // For ByPinnedUpdated GSI
});

export type Asset = z.infer<typeof AssetSchema>;

