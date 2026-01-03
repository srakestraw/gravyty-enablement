/**
 * Content Hub - Comment Domain Model
 * 
 * Threaded comments on assets for feedback and collaboration.
 */

import { z } from 'zod';

/**
 * Comment
 * 
 * Threaded comment on an asset or specific version.
 */
export const CommentSchema = z.object({
  // Primary key
  comment_id: z.string(),
  asset_id: z.string(),
  version_id: z.string().optional(), // Nullable - comment on asset or specific version
  
  // Comment content
  user_id: z.string(),
  body: z.string().min(1),
  
  // Threading
  parent_comment_id: z.string().optional(), // Nullable - top-level if null
  
  // Resolution
  resolved_at: z.string().optional(), // ISO datetime
  resolved_by: z.string().optional(), // User ID
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  updated_at: z.string().optional(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('COMMENT').default('COMMENT'),
  
  // GSI attributes
  'asset_id#created_at': z.string().optional(), // For querying comments by asset
});

export type Comment = z.infer<typeof CommentSchema>;


