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
  'document',
  'text_content', // Text Content - rich text body is primary content
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
  'RICHTEXT',
]);

export type AssetSourceType = z.infer<typeof AssetSourceTypeSchema>;

/**
 * Source Reference (JSON)
 * 
 * Structure depends on sourceType:
 * - LINK: { url: string, preview?: string } or { urls: string[], previews?: string[] } for multiple links
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
  description: z.string().optional(), // Plain text description (deprecated, use descriptionRichText or bodyRichText)
  short_description: z.string().optional(), // Brief description for card displays (renamed to summary in UI)
  description_rich_text: z.string().optional(), // Rich text description for non-text content types
  body_rich_text: z.string().optional(), // Rich text body for text_content type
  asset_type: AssetTypeSchema,
  
  // Ownership
  owner_id: z.string(),
  
  // Metadata
  metadata_node_ids: z.array(z.string()).default([]),
  audience_ids: z.array(z.string()).default([]), // Multi-select audience IDs
  keywords: z.array(z.string()).default([]), // Free-form search keywords
  
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

