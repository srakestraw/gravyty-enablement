/**
 * Content Hub - Outdated Flag Domain Model
 * 
 * Flags for marking assets as outdated and requesting updates.
 */

import { z } from 'zod';

/**
 * OutdatedFlag
 * 
 * Flag indicating an asset is outdated, with optional resolution.
 */
export const OutdatedFlagSchema = z.object({
  // Primary key
  flag_id: z.string(),
  asset_id: z.string(),
  
  // Flag details
  user_id: z.string(), // User who flagged
  reason: z.string().optional(), // Optional reason text
  
  // Resolution
  resolved_at: z.string().optional(), // ISO datetime
  resolved_by: z.string().optional(), // User ID
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('OUTDATED_FLAG').default('OUTDATED_FLAG'),
  
  // GSI attributes
  'asset_id#created_at': z.string().optional(), // For querying flags by asset
});

export type OutdatedFlag = z.infer<typeof OutdatedFlagSchema>;

/**
 * UpdateRequest
 * 
 * Request for updating an asset.
 */
export const UpdateRequestSchema = z.object({
  // Primary key
  request_id: z.string(),
  asset_id: z.string(),
  
  // Request details
  user_id: z.string(), // User who requested
  message: z.string().optional(), // Optional message
  
  // Resolution
  resolved_at: z.string().optional(), // ISO datetime
  resolved_by: z.string().optional(), // User ID
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('UPDATE_REQUEST').default('UPDATE_REQUEST'),
  
  // GSI attributes
  'asset_id#created_at': z.string().optional(), // For querying requests by asset
});

export type UpdateRequest = z.infer<typeof UpdateRequestSchema>;


