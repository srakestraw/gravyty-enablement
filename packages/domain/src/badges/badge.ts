/**
 * Badge Domain Types
 *
 * Defines badge types for the badge management system.
 * Badges can be awarded to users based on various criteria.
 */

import { z } from 'zod';

/**
 * Badge Awarding Trigger
 *
 * Defines when/how a badge can be awarded
 */
export const BadgeAwardingTriggerSchema = z.enum([
  'course_completion',
  'assessment_pass',
  'manual',
  'custom',
]);

export type BadgeAwardingTrigger = z.infer<typeof BadgeAwardingTriggerSchema>;

/**
 * Badge Expiration Policy Type
 */
export const BadgeExpirationPolicyTypeSchema = z.enum([
  'never',
  'fixed_duration',
  'custom',
]);

export type BadgeExpirationPolicyType = z.infer<typeof BadgeExpirationPolicyTypeSchema>;

/**
 * Badge Awarding Rules
 *
 * Defines the criteria for awarding a badge
 */
export const BadgeAwardingRulesSchema = z.object({
  trigger: BadgeAwardingTriggerSchema,
  criteria: z.record(z.unknown()).optional(), // Additional criteria based on trigger type
});

export type BadgeAwardingRules = z.infer<typeof BadgeAwardingRulesSchema>;

/**
 * Badge Expiration Policy
 *
 * Defines when a badge expires
 */
export const BadgeExpirationPolicySchema = z.object({
  type: BadgeExpirationPolicyTypeSchema,
  duration_days: z.number().int().min(1).optional(), // For fixed_duration type
});

export type BadgeExpirationPolicy = z.infer<typeof BadgeExpirationPolicySchema>;

/**
 * Badge Icon Type
 */
export const BadgeIconTypeSchema = z.enum(['mui']);
export type BadgeIconType = z.infer<typeof BadgeIconTypeSchema>;

/**
 * Badge
 *
 * A badge that can be awarded to users
 */
export const BadgeSchema = z.object({
  badge_id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  // Icon configuration (new)
  icon_type: BadgeIconTypeSchema.default('mui'),
  icon_key: z.string().nullable().optional(), // MUI icon key (e.g., "WorkspacePremiumOutlined")
  icon_color: z.string().nullable().optional(), // Optional hex color override
  // Legacy icon_url (deprecated, kept for backward compatibility)
  icon_url: z.string().url().optional(),
  color: z.string().optional(), // Hex color for UI display
  awarding_rules: BadgeAwardingRulesSchema.optional(),
  expiration_policy: BadgeExpirationPolicySchema.optional(),
  archived_at: z.string().optional(), // ISO datetime if archived
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string(), // User ID
});

export type Badge = z.infer<typeof BadgeSchema>;

/**
 * Create Badge Request
 */
export const CreateBadgeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon_type: BadgeIconTypeSchema.optional().default('mui'),
  icon_key: z.string().nullable().optional(),
  icon_color: z.string().nullable().optional(),
  icon_url: z.string().url().optional(), // Legacy, deprecated
  color: z.string().optional(),
  awarding_rules: BadgeAwardingRulesSchema.optional(),
  expiration_policy: BadgeExpirationPolicySchema.optional(),
});

export type CreateBadge = z.infer<typeof CreateBadgeSchema>;

/**
 * Update Badge Request
 */
export const UpdateBadgeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  icon_type: BadgeIconTypeSchema.optional(),
  icon_key: z.string().nullable().optional(),
  icon_color: z.string().nullable().optional(),
  icon_url: z.string().url().optional().nullable(), // Legacy, deprecated
  color: z.string().optional().nullable(),
  awarding_rules: BadgeAwardingRulesSchema.optional().nullable(),
  expiration_policy: BadgeExpirationPolicySchema.optional().nullable(),
  archived_at: z.string().optional().nullable(), // Set to ISO datetime to archive, null to unarchive
});

export type UpdateBadge = z.infer<typeof UpdateBadgeSchema>;

/**
 * List Badges Response
 */
export interface ListBadgesResponse {
  badges: Badge[];
  next_cursor?: string;
}

/**
 * Badge Award
 *
 * Represents a badge awarded to a user
 */
export interface BadgeAward {
  user_id: string;
  badge_id: string;
  badge_name: string;
  course_id?: string;
  awarded_at: string; // ISO datetime
  expires_at?: string; // ISO datetime
  evidence: Record<string, unknown>; // JSON evidence of why badge was awarded
}

/**
 * List Badge Awards Response
 */
export interface ListBadgeAwardsResponse {
  awards: BadgeAward[];
  next_cursor?: string;
}

