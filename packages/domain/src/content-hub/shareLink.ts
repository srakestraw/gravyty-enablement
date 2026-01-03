/**
 * Content Hub - Share Link Domain Model
 * 
 * External sharing via unique URLs with tracking and revocation.
 */

import { z } from 'zod';

/**
 * Share Link Target Type
 */
export const ShareLinkTargetTypeSchema = z.enum([
  'canonicalAsset',
  'version',
]);

export type ShareLinkTargetType = z.infer<typeof ShareLinkTargetTypeSchema>;

/**
 * Share Link Status
 */
export const ShareLinkStatusSchema = z.enum([
  'active',
  'expired',
  'revoked',
]);

export type ShareLinkStatus = z.infer<typeof ShareLinkStatusSchema>;

/**
 * Share Link Access Mode
 */
export const ShareLinkAccessModeSchema = z.enum([
  'open',
  'emailVerify',
  'password', // Phase 2
]);

export type ShareLinkAccessMode = z.infer<typeof ShareLinkAccessModeSchema>;

/**
 * Share Link
 * 
 * Unique URL for external sharing with tracking and controls.
 */
export const ShareLinkSchema = z.object({
  // Primary key
  share_link_id: z.string(),
  token: z.string(), // High entropy, unguessable token
  
  // Target
  target_type: ShareLinkTargetTypeSchema,
  asset_id: z.string(),
  version_id: z.string().optional(), // Nullable - null for canonical
  
  // Status and expiration
  status: ShareLinkStatusSchema,
  expires_at: z.string().optional(), // ISO datetime
  expire_with_asset: z.boolean().default(false), // Expire when asset expires
  
  // Access controls
  access_mode: ShareLinkAccessModeSchema,
  allow_download: z.boolean().default(true),
  allow_comments: z.boolean().default(false),
  
  // Notifications
  notify_on_new_version: z.boolean().default(false), // For canonical links
  
  // Tracking
  last_access_at: z.string().optional(), // ISO datetime
  
  // Metadata
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  
  // DynamoDB discriminator
  entity_type: z.literal('SHARE_LINK').default('SHARE_LINK'),
  
  // GSI attributes
  share_token: z.string().optional(), // For ByShareToken GSI (unique lookup)
});

export type ShareLink = z.infer<typeof ShareLinkSchema>;


