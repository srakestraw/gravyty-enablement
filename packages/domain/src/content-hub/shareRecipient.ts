/**
 * Content Hub - Share Recipient Domain Model
 * 
 * Email verification for share links with email-verified access mode.
 */

import { z } from 'zod';

/**
 * Share Recipient
 * 
 * Email address associated with a share link for verification.
 */
export const ShareRecipientSchema = z.object({
  // Primary key
  recipient_id: z.string(),
  share_link_id: z.string(),
  
  // Email
  email: z.string().email(),
  email_hash: z.string().optional(), // Hash for privacy (if needed)
  
  // Verification
  verified: z.boolean().default(false),
  verification_token: z.string().optional(),
  verified_at: z.string().optional(), // ISO datetime
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  
  // DynamoDB discriminator
  entity_type: z.literal('SHARE_RECIPIENT').default('SHARE_RECIPIENT'),
  
  // GSI attributes
  'share_link_id#email': z.string().optional(), // For querying recipients by share link
});

export type ShareRecipient = z.infer<typeof ShareRecipientSchema>;


