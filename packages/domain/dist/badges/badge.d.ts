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
export declare const BadgeAwardingTriggerSchema: z.ZodEnum<["course_completion", "assessment_pass", "manual", "custom"]>;
export type BadgeAwardingTrigger = z.infer<typeof BadgeAwardingTriggerSchema>;
/**
 * Badge Expiration Policy Type
 */
export declare const BadgeExpirationPolicyTypeSchema: z.ZodEnum<["never", "fixed_duration", "custom"]>;
export type BadgeExpirationPolicyType = z.infer<typeof BadgeExpirationPolicyTypeSchema>;
/**
 * Badge Awarding Rules
 *
 * Defines the criteria for awarding a badge
 */
export declare const BadgeAwardingRulesSchema: z.ZodObject<{
    trigger: z.ZodEnum<["course_completion", "assessment_pass", "manual", "custom"]>;
    criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
    criteria?: Record<string, unknown> | undefined;
}, {
    trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
    criteria?: Record<string, unknown> | undefined;
}>;
export type BadgeAwardingRules = z.infer<typeof BadgeAwardingRulesSchema>;
/**
 * Badge Expiration Policy
 *
 * Defines when a badge expires
 */
export declare const BadgeExpirationPolicySchema: z.ZodObject<{
    type: z.ZodEnum<["never", "fixed_duration", "custom"]>;
    duration_days: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "never" | "custom" | "fixed_duration";
    duration_days?: number | undefined;
}, {
    type: "never" | "custom" | "fixed_duration";
    duration_days?: number | undefined;
}>;
export type BadgeExpirationPolicy = z.infer<typeof BadgeExpirationPolicySchema>;
/**
 * Badge
 *
 * A badge that can be awarded to users
 */
export declare const BadgeSchema: z.ZodObject<{
    badge_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon_url: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    awarding_rules: z.ZodOptional<z.ZodObject<{
        trigger: z.ZodEnum<["course_completion", "assessment_pass", "manual", "custom"]>;
        criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    }, {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    }>>;
    expiration_policy: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["never", "fixed_duration", "custom"]>;
        duration_days: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    }, {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    }>>;
    archived_at: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    created_at: string;
    created_by: string;
    badge_id: string;
    updated_at: string;
    updated_by: string;
    description?: string | undefined;
    icon_url?: string | undefined;
    archived_at?: string | undefined;
    color?: string | undefined;
    awarding_rules?: {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    } | undefined;
    expiration_policy?: {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    } | undefined;
}, {
    name: string;
    created_at: string;
    created_by: string;
    badge_id: string;
    updated_at: string;
    updated_by: string;
    description?: string | undefined;
    icon_url?: string | undefined;
    archived_at?: string | undefined;
    color?: string | undefined;
    awarding_rules?: {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    } | undefined;
    expiration_policy?: {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    } | undefined;
}>;
export type Badge = z.infer<typeof BadgeSchema>;
/**
 * Create Badge Request
 */
export declare const CreateBadgeSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    icon_url: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    awarding_rules: z.ZodOptional<z.ZodObject<{
        trigger: z.ZodEnum<["course_completion", "assessment_pass", "manual", "custom"]>;
        criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    }, {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    }>>;
    expiration_policy: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["never", "fixed_duration", "custom"]>;
        duration_days: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    }, {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    icon_url?: string | undefined;
    color?: string | undefined;
    awarding_rules?: {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    } | undefined;
    expiration_policy?: {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    } | undefined;
}, {
    name: string;
    description?: string | undefined;
    icon_url?: string | undefined;
    color?: string | undefined;
    awarding_rules?: {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    } | undefined;
    expiration_policy?: {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    } | undefined;
}>;
export type CreateBadge = z.infer<typeof CreateBadgeSchema>;
/**
 * Update Badge Request
 */
export declare const UpdateBadgeSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    icon_url: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    awarding_rules: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        trigger: z.ZodEnum<["course_completion", "assessment_pass", "manual", "custom"]>;
        criteria: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    }, {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    }>>>;
    expiration_policy: z.ZodNullable<z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["never", "fixed_duration", "custom"]>;
        duration_days: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    }, {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    }>>>;
    archived_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    icon_url?: string | null | undefined;
    archived_at?: string | null | undefined;
    color?: string | null | undefined;
    awarding_rules?: {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    } | null | undefined;
    expiration_policy?: {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    } | null | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    icon_url?: string | null | undefined;
    archived_at?: string | null | undefined;
    color?: string | null | undefined;
    awarding_rules?: {
        trigger: "custom" | "course_completion" | "assessment_pass" | "manual";
        criteria?: Record<string, unknown> | undefined;
    } | null | undefined;
    expiration_policy?: {
        type: "never" | "custom" | "fixed_duration";
        duration_days?: number | undefined;
    } | null | undefined;
}>;
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
    awarded_at: string;
    expires_at?: string;
    evidence: Record<string, unknown>;
}
/**
 * List Badge Awards Response
 */
export interface ListBadgeAwardsResponse {
    awards: BadgeAward[];
    next_cursor?: string;
}
//# sourceMappingURL=badge.d.ts.map