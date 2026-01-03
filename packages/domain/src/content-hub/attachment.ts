/**
 * Content Hub - Attachment Domain Model
 * 
 * Represents an attachment (file, link, or drive item) associated with an asset version.
 */

import { z } from 'zod';

/**
 * Attachment Type
 */
export const AttachmentTypeSchema = z.enum([
  'FILE_UPLOAD',
  'LINK',
  'DRIVE',
]);

export type AttachmentType = z.infer<typeof AttachmentTypeSchema>;

/**
 * Attachment Status
 */
export const AttachmentStatusSchema = z.enum([
  'ready',
  'uploading',
  'failed',
]);

export type AttachmentStatus = z.infer<typeof AttachmentStatusSchema>;

/**
 * Attachment
 * 
 * Represents a single attachment (file, link, or drive item) for an asset version.
 */
export const AttachmentSchema = z.object({
  // Primary key
  attachment_id: z.string(),
  asset_id: z.string(),
  version_id: z.string(),
  
  // Attachment metadata
  type: AttachmentTypeSchema,
  title: z.string().optional(), // User-editable display name
  is_primary: z.boolean().default(false), // Only one primary attachment per version (for non-text content)
  sort_order: z.number().int().min(0).default(0), // For ordering attachments
  
  // File metadata (for FILE_UPLOAD)
  storage_key: z.string().optional(), // S3 key
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().int().min(0).optional(),
  checksum: z.string().optional(),
  
  // Link metadata (for LINK)
  url: z.string().optional(), // URL string
  
  // Drive metadata (for DRIVE)
  drive_file_id: z.string().optional(),
  drive_file_name: z.string().optional(),
  drive_web_view_link: z.string().optional(),
  
  // Status
  status: AttachmentStatusSchema.default('ready'),
  error_message: z.string().optional(),
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('ATTACHMENT').default('ATTACHMENT'),
  
  // GSI attributes
  'asset_id#version_id': z.string().optional(), // For querying attachments by asset/version
  'version_id#sort_order': z.string().optional(), // For ordering attachments within a version
});

export type Attachment = z.infer<typeof AttachmentSchema>;

