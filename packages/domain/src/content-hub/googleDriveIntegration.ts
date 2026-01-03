/**
 * Content Hub - Google Drive Integration Domain Model
 * 
 * Models for Google Drive integration and sync status.
 */

import { z } from 'zod';

/**
 * Google Drive Connection Status
 */
export const GoogleDriveConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
]);

export type GoogleDriveConnectionStatus = z.infer<typeof GoogleDriveConnectionStatusSchema>;

/**
 * Google Drive Connection
 * 
 * Organization-level Google Drive connection configuration.
 */
export const GoogleDriveConnectionSchema = z.object({
  // Primary key
  connection_id: z.string(),
  
  // Connection details
  status: GoogleDriveConnectionStatusSchema,
  access_token: z.string().optional(), // Encrypted, stored separately
  refresh_token: z.string().optional(), // Encrypted, stored separately
  token_expires_at: z.string().optional(), // ISO datetime
  
  // Configuration
  allowed_folder_ids: z.array(z.string()).optional(), // Restrict to specific folders
  
  // Metadata
  connected_at: z.string().optional(), // ISO datetime
  connected_by: z.string().optional(), // User ID
  last_sync_at: z.string().optional(), // ISO datetime
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  updated_at: z.string(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('GOOGLE_DRIVE_CONNECTION').default('GOOGLE_DRIVE_CONNECTION'),
});

export type GoogleDriveConnection = z.infer<typeof GoogleDriveConnectionSchema>;

/**
 * Google Drive File Reference
 * 
 * Reference to a Google Drive file for imported assets.
 */
export const GoogleDriveFileRefSchema = z.object({
  file_id: z.string(),
  name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().optional(),
  modified_time: z.string(), // ISO datetime
  web_view_link: z.string().optional(),
  web_content_link: z.string().optional(),
});

export type GoogleDriveFileRef = z.infer<typeof GoogleDriveFileRefSchema>;

/**
 * Asset Sync Status
 */
export const AssetSyncStatusSchema = z.enum([
  'synced',
  'pending',
  'syncing',
  'error',
  'source_unavailable',
]);

export type AssetSyncStatus = z.infer<typeof AssetSyncStatusSchema>;

/**
 * Asset Sync Metadata
 * 
 * Stored as part of Asset.source_ref when source_type is GOOGLE_DRIVE
 */
export const AssetSyncMetadataSchema = z.object({
  drive_file_id: z.string(),
  drive_file_name: z.string(),
  last_synced_at: z.string().optional(), // ISO datetime
  last_sync_status: AssetSyncStatusSchema,
  last_sync_error: z.string().optional(),
  last_modified_time: z.string(), // ISO datetime from Drive
});

export type AssetSyncMetadata = z.infer<typeof AssetSyncMetadataSchema>;


