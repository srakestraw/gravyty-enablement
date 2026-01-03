/**
 * Prompt Helpers Domain Types
 *
 * Defines PromptHelper, PromptHelperVersion, PromptHelperAuditLog types
 * and related enums for AI prompt management.
 */
import { z } from 'zod';
/**
 * Prompt Helper Status
 */
export const PromptHelperStatusSchema = z.enum(['draft', 'published', 'archived']);
/**
 * Prompt Helper Applies To
 *
 * Contexts where a helper can be used
 */
export const PromptHelperAppliesToSchema = z.enum(['cover_image', 'description', 'rte']);
/**
 * Composition Mode
 *
 * How the helper composes prompts
 */
export const CompositionModeSchema = z.enum(['template', 'style_pack', 'hybrid']);
/**
 * RTE Action Type
 */
export const RteActionTypeSchema = z.enum(['shorten', 'expand', 'rewrite', 'tone_shift', 'summarize']);
/**
 * RTE Action Instructions
 *
 * Per-action instructions for RTE helpers
 */
export const RteActionInstructionsSchema = z.record(RteActionTypeSchema, z.string().optional()).optional();
/**
 * Provider Overrides
 *
 * Provider-specific additions to prompts
 */
export const ProviderOverridesSchema = z.object({
    openai: z.string().optional(),
    gemini: z.string().optional(),
}).optional();
/**
 * Prompt Helper Context
 *
 * Contexts where a helper can be set as default
 */
export const PromptHelperContextSchema = z.enum([
    'cover_image',
    'description',
    'rte_shorten',
    'rte_expand',
    'rte_rewrite',
    'rte_tone_shift',
    'rte_summarize',
]);
/**
 * Prompt Helper
 *
 * A reusable prompt template with composition rules
 */
export const PromptHelperSchema = z.object({
    helper_id: z.string().uuid(),
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(500),
    applies_to: z.array(PromptHelperAppliesToSchema).min(1),
    composition_mode: CompositionModeSchema,
    // Composition fields
    prefix_text: z.string().optional(),
    template_text: z.string().optional(),
    suffix_text: z.string().optional(),
    negative_text: z.string().optional(),
    // RTE-specific
    rte_action_instructions: RteActionInstructionsSchema,
    // Provider overrides
    provider_overrides: ProviderOverridesSchema,
    // Variable control
    allowed_variables: z.array(z.string()).default([]),
    // Status and defaults
    status: PromptHelperStatusSchema,
    is_default_for: z.array(PromptHelperContextSchema).default([]),
    // System flag (for starter library)
    is_system: z.boolean().default(false),
    // Timestamps
    created_at: z.string(),
    created_by: z.string(),
    updated_at: z.string(),
    updated_by: z.string(),
});
/**
 * Create Prompt Helper
 */
export const CreatePromptHelperSchema = PromptHelperSchema.omit({
    helper_id: true,
    created_at: true,
    created_by: true,
    updated_at: true,
    updated_by: true,
    status: true, // Always starts as draft
}).extend({
    status: z.literal('draft').optional(), // Optional, defaults to draft
});
/**
 * Update Prompt Helper
 *
 * Only draft helpers can be updated
 */
export const UpdatePromptHelperSchema = PromptHelperSchema.partial().omit({
    helper_id: true,
    created_at: true,
    created_by: true,
    updated_at: true,
    updated_by: true,
    status: true, // Status changes via publish/archive actions
});
/**
 * Prompt Helper Version
 *
 * Immutable snapshot of a published helper
 */
export const PromptHelperVersionSchema = z.object({
    helper_id: z.string().uuid(),
    version_number: z.number().int().positive(),
    snapshot_json: z.string(), // JSON stringified PromptHelper
    published_at: z.string(),
    published_by: z.string(),
});
/**
 * Prompt Helper Audit Log Entry
 */
export const PromptHelperAuditLogSchema = z.object({
    helper_id: z.string().uuid(),
    timestamp: z.string(),
    action_id: z.string().uuid(),
    action: z.enum([
        'create',
        'update',
        'publish',
        'archive',
        'set_default',
        'unset_default',
        'duplicate',
    ]),
    actor_id: z.string(),
    diff_summary_json: z.string().optional(), // JSON stringified diff
});
/**
 * Compose Prompt Request
 */
export const ComposePromptRequestSchema = z.object({
    helper_id: z.string().uuid().optional(),
    context: PromptHelperAppliesToSchema,
    variables: z.record(z.string(), z.any()).optional(),
    user_content: z.string().optional(),
    user_instruction: z.string().optional(),
    action_type: RteActionTypeSchema.optional(),
    provider: z.enum(['openai', 'gemini']).optional(),
});
/**
 * Composed Prompt Response
 */
export const ComposedPromptResponseSchema = z.object({
    composed_prompt: z.string(),
    helper_id: z.string().uuid().optional(),
    helper_name: z.string().optional(),
    variables_used: z.array(z.string()).default([]),
    warnings: z.array(z.string()).default([]),
});
//# sourceMappingURL=promptHelpers.js.map