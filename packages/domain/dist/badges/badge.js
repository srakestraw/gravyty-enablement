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
/**
 * Badge Expiration Policy Type
 */
export const BadgeExpirationPolicyTypeSchema = z.enum([
    'never',
    'fixed_duration',
    'custom',
]);
/**
 * Badge Awarding Rules
 *
 * Defines the criteria for awarding a badge
 */
export const BadgeAwardingRulesSchema = z.object({
    trigger: BadgeAwardingTriggerSchema,
    criteria: z.record(z.unknown()).optional(), // Additional criteria based on trigger type
});
/**
 * Badge Expiration Policy
 *
 * Defines when a badge expires
 */
export const BadgeExpirationPolicySchema = z.object({
    type: BadgeExpirationPolicyTypeSchema,
    duration_days: z.number().int().min(1).optional(), // For fixed_duration type
});
/**
 * Badge
 *
 * A badge that can be awarded to users
 */
export const BadgeSchema = z.object({
    badge_id: z.string(),
    name: z.string().min(1),
    description: z.string().optional(),
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
/**
 * Create Badge Request
 */
export const CreateBadgeSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    icon_url: z.string().url().optional(),
    color: z.string().optional(),
    awarding_rules: BadgeAwardingRulesSchema.optional(),
    expiration_policy: BadgeExpirationPolicySchema.optional(),
});
/**
 * Update Badge Request
 */
export const UpdateBadgeSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    icon_url: z.string().url().optional().nullable(),
    color: z.string().optional().nullable(),
    awarding_rules: BadgeAwardingRulesSchema.optional().nullable(),
    expiration_policy: BadgeExpirationPolicySchema.optional().nullable(),
    archived_at: z.string().optional().nullable(), // Set to ISO datetime to archive, null to unarchive
});
//# sourceMappingURL=badge.js.map