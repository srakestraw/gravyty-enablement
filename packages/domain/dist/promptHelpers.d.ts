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
export declare const PromptHelperStatusSchema: z.ZodEnum<["draft", "published", "archived"]>;
export type PromptHelperStatus = z.infer<typeof PromptHelperStatusSchema>;
/**
 * Prompt Helper Applies To
 *
 * Contexts where a helper can be used
 */
export declare const PromptHelperAppliesToSchema: z.ZodEnum<["cover_image", "description", "rte"]>;
export type PromptHelperAppliesTo = z.infer<typeof PromptHelperAppliesToSchema>;
/**
 * Composition Mode
 *
 * How the helper composes prompts
 */
export declare const CompositionModeSchema: z.ZodEnum<["template", "style_pack", "hybrid"]>;
export type CompositionMode = z.infer<typeof CompositionModeSchema>;
/**
 * RTE Action Type
 */
export declare const RteActionTypeSchema: z.ZodEnum<["shorten", "expand", "rewrite", "tone_shift", "summarize"]>;
export type RteActionType = z.infer<typeof RteActionTypeSchema>;
/**
 * RTE Action Instructions
 *
 * Per-action instructions for RTE helpers
 */
export declare const RteActionInstructionsSchema: z.ZodOptional<z.ZodRecord<z.ZodEnum<["shorten", "expand", "rewrite", "tone_shift", "summarize"]>, z.ZodOptional<z.ZodString>>>;
export type RteActionInstructions = z.infer<typeof RteActionInstructionsSchema>;
/**
 * Provider Overrides
 *
 * Provider-specific additions to prompts
 */
export declare const ProviderOverridesSchema: z.ZodOptional<z.ZodObject<{
    openai: z.ZodOptional<z.ZodString>;
    gemini: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    openai?: string | undefined;
    gemini?: string | undefined;
}, {
    openai?: string | undefined;
    gemini?: string | undefined;
}>>;
export type ProviderOverrides = z.infer<typeof ProviderOverridesSchema>;
/**
 * Prompt Helper Context
 *
 * Contexts where a helper can be set as default
 */
export declare const PromptHelperContextSchema: z.ZodEnum<["cover_image", "description", "rte_shorten", "rte_expand", "rte_rewrite", "rte_tone_shift", "rte_summarize"]>;
export type PromptHelperContext = z.infer<typeof PromptHelperContextSchema>;
/**
 * Prompt Helper
 *
 * A reusable prompt template with composition rules
 */
export declare const PromptHelperSchema: z.ZodObject<{
    helper_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    applies_to: z.ZodArray<z.ZodEnum<["cover_image", "description", "rte"]>, "many">;
    composition_mode: z.ZodEnum<["template", "style_pack", "hybrid"]>;
    prefix_text: z.ZodOptional<z.ZodString>;
    template_text: z.ZodOptional<z.ZodString>;
    suffix_text: z.ZodOptional<z.ZodString>;
    negative_text: z.ZodOptional<z.ZodString>;
    rte_action_instructions: z.ZodOptional<z.ZodRecord<z.ZodEnum<["shorten", "expand", "rewrite", "tone_shift", "summarize"]>, z.ZodOptional<z.ZodString>>>;
    provider_overrides: z.ZodOptional<z.ZodObject<{
        openai: z.ZodOptional<z.ZodString>;
        gemini: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        openai?: string | undefined;
        gemini?: string | undefined;
    }, {
        openai?: string | undefined;
        gemini?: string | undefined;
    }>>;
    allowed_variables: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    is_default_for: z.ZodDefault<z.ZodArray<z.ZodEnum<["cover_image", "description", "rte_shorten", "rte_expand", "rte_rewrite", "rte_tone_shift", "rte_summarize"]>, "many">>;
    is_system: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    name: string;
    created_at: string;
    created_by: string;
    description: string;
    updated_at: string;
    updated_by: string;
    applies_to: ("description" | "cover_image" | "rte")[];
    helper_id: string;
    composition_mode: "template" | "style_pack" | "hybrid";
    allowed_variables: string[];
    is_default_for: ("description" | "cover_image" | "rte_shorten" | "rte_expand" | "rte_rewrite" | "rte_tone_shift" | "rte_summarize")[];
    is_system: boolean;
    prefix_text?: string | undefined;
    template_text?: string | undefined;
    suffix_text?: string | undefined;
    negative_text?: string | undefined;
    rte_action_instructions?: Partial<Record<"shorten" | "expand" | "rewrite" | "tone_shift" | "summarize", string | undefined>> | undefined;
    provider_overrides?: {
        openai?: string | undefined;
        gemini?: string | undefined;
    } | undefined;
}, {
    status: "draft" | "published" | "archived";
    name: string;
    created_at: string;
    created_by: string;
    description: string;
    updated_at: string;
    updated_by: string;
    applies_to: ("description" | "cover_image" | "rte")[];
    helper_id: string;
    composition_mode: "template" | "style_pack" | "hybrid";
    prefix_text?: string | undefined;
    template_text?: string | undefined;
    suffix_text?: string | undefined;
    negative_text?: string | undefined;
    rte_action_instructions?: Partial<Record<"shorten" | "expand" | "rewrite" | "tone_shift" | "summarize", string | undefined>> | undefined;
    provider_overrides?: {
        openai?: string | undefined;
        gemini?: string | undefined;
    } | undefined;
    allowed_variables?: string[] | undefined;
    is_default_for?: ("description" | "cover_image" | "rte_shorten" | "rte_expand" | "rte_rewrite" | "rte_tone_shift" | "rte_summarize")[] | undefined;
    is_system?: boolean | undefined;
}>;
export type PromptHelper = z.infer<typeof PromptHelperSchema>;
/**
 * Create Prompt Helper
 */
export declare const CreatePromptHelperSchema: z.ZodObject<Omit<{
    helper_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    applies_to: z.ZodArray<z.ZodEnum<["cover_image", "description", "rte"]>, "many">;
    composition_mode: z.ZodEnum<["template", "style_pack", "hybrid"]>;
    prefix_text: z.ZodOptional<z.ZodString>;
    template_text: z.ZodOptional<z.ZodString>;
    suffix_text: z.ZodOptional<z.ZodString>;
    negative_text: z.ZodOptional<z.ZodString>;
    rte_action_instructions: z.ZodOptional<z.ZodRecord<z.ZodEnum<["shorten", "expand", "rewrite", "tone_shift", "summarize"]>, z.ZodOptional<z.ZodString>>>;
    provider_overrides: z.ZodOptional<z.ZodObject<{
        openai: z.ZodOptional<z.ZodString>;
        gemini: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        openai?: string | undefined;
        gemini?: string | undefined;
    }, {
        openai?: string | undefined;
        gemini?: string | undefined;
    }>>;
    allowed_variables: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    is_default_for: z.ZodDefault<z.ZodArray<z.ZodEnum<["cover_image", "description", "rte_shorten", "rte_expand", "rte_rewrite", "rte_tone_shift", "rte_summarize"]>, "many">>;
    is_system: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
}, "status" | "created_at" | "created_by" | "updated_at" | "updated_by" | "helper_id"> & {
    status: z.ZodOptional<z.ZodLiteral<"draft">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    applies_to: ("description" | "cover_image" | "rte")[];
    composition_mode: "template" | "style_pack" | "hybrid";
    allowed_variables: string[];
    is_default_for: ("description" | "cover_image" | "rte_shorten" | "rte_expand" | "rte_rewrite" | "rte_tone_shift" | "rte_summarize")[];
    is_system: boolean;
    status?: "draft" | undefined;
    prefix_text?: string | undefined;
    template_text?: string | undefined;
    suffix_text?: string | undefined;
    negative_text?: string | undefined;
    rte_action_instructions?: Partial<Record<"shorten" | "expand" | "rewrite" | "tone_shift" | "summarize", string | undefined>> | undefined;
    provider_overrides?: {
        openai?: string | undefined;
        gemini?: string | undefined;
    } | undefined;
}, {
    name: string;
    description: string;
    applies_to: ("description" | "cover_image" | "rte")[];
    composition_mode: "template" | "style_pack" | "hybrid";
    status?: "draft" | undefined;
    prefix_text?: string | undefined;
    template_text?: string | undefined;
    suffix_text?: string | undefined;
    negative_text?: string | undefined;
    rte_action_instructions?: Partial<Record<"shorten" | "expand" | "rewrite" | "tone_shift" | "summarize", string | undefined>> | undefined;
    provider_overrides?: {
        openai?: string | undefined;
        gemini?: string | undefined;
    } | undefined;
    allowed_variables?: string[] | undefined;
    is_default_for?: ("description" | "cover_image" | "rte_shorten" | "rte_expand" | "rte_rewrite" | "rte_tone_shift" | "rte_summarize")[] | undefined;
    is_system?: boolean | undefined;
}>;
export type CreatePromptHelper = z.infer<typeof CreatePromptHelperSchema>;
/**
 * Update Prompt Helper
 *
 * Only draft helpers can be updated
 */
export declare const UpdatePromptHelperSchema: z.ZodObject<Omit<{
    helper_id: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    applies_to: z.ZodOptional<z.ZodArray<z.ZodEnum<["cover_image", "description", "rte"]>, "many">>;
    composition_mode: z.ZodOptional<z.ZodEnum<["template", "style_pack", "hybrid"]>>;
    prefix_text: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    template_text: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    suffix_text: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    negative_text: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    rte_action_instructions: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodEnum<["shorten", "expand", "rewrite", "tone_shift", "summarize"]>, z.ZodOptional<z.ZodString>>>>;
    provider_overrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        openai: z.ZodOptional<z.ZodString>;
        gemini: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        openai?: string | undefined;
        gemini?: string | undefined;
    }, {
        openai?: string | undefined;
        gemini?: string | undefined;
    }>>>;
    allowed_variables: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
    status: z.ZodOptional<z.ZodEnum<["draft", "published", "archived"]>>;
    is_default_for: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEnum<["cover_image", "description", "rte_shorten", "rte_expand", "rte_rewrite", "rte_tone_shift", "rte_summarize"]>, "many">>>;
    is_system: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    created_at: z.ZodOptional<z.ZodString>;
    created_by: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
    updated_by: z.ZodOptional<z.ZodString>;
}, "status" | "created_at" | "created_by" | "updated_at" | "updated_by" | "helper_id">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    applies_to?: ("description" | "cover_image" | "rte")[] | undefined;
    composition_mode?: "template" | "style_pack" | "hybrid" | undefined;
    prefix_text?: string | undefined;
    template_text?: string | undefined;
    suffix_text?: string | undefined;
    negative_text?: string | undefined;
    rte_action_instructions?: Partial<Record<"shorten" | "expand" | "rewrite" | "tone_shift" | "summarize", string | undefined>> | undefined;
    provider_overrides?: {
        openai?: string | undefined;
        gemini?: string | undefined;
    } | undefined;
    allowed_variables?: string[] | undefined;
    is_default_for?: ("description" | "cover_image" | "rte_shorten" | "rte_expand" | "rte_rewrite" | "rte_tone_shift" | "rte_summarize")[] | undefined;
    is_system?: boolean | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    applies_to?: ("description" | "cover_image" | "rte")[] | undefined;
    composition_mode?: "template" | "style_pack" | "hybrid" | undefined;
    prefix_text?: string | undefined;
    template_text?: string | undefined;
    suffix_text?: string | undefined;
    negative_text?: string | undefined;
    rte_action_instructions?: Partial<Record<"shorten" | "expand" | "rewrite" | "tone_shift" | "summarize", string | undefined>> | undefined;
    provider_overrides?: {
        openai?: string | undefined;
        gemini?: string | undefined;
    } | undefined;
    allowed_variables?: string[] | undefined;
    is_default_for?: ("description" | "cover_image" | "rte_shorten" | "rte_expand" | "rte_rewrite" | "rte_tone_shift" | "rte_summarize")[] | undefined;
    is_system?: boolean | undefined;
}>;
export type UpdatePromptHelper = z.infer<typeof UpdatePromptHelperSchema>;
/**
 * Prompt Helper Version
 *
 * Immutable snapshot of a published helper
 */
export declare const PromptHelperVersionSchema: z.ZodObject<{
    helper_id: z.ZodString;
    version_number: z.ZodNumber;
    snapshot_json: z.ZodString;
    published_at: z.ZodString;
    published_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    published_at: string;
    published_by: string;
    version_number: number;
    helper_id: string;
    snapshot_json: string;
}, {
    published_at: string;
    published_by: string;
    version_number: number;
    helper_id: string;
    snapshot_json: string;
}>;
export type PromptHelperVersion = z.infer<typeof PromptHelperVersionSchema>;
/**
 * Prompt Helper Audit Log Entry
 */
export declare const PromptHelperAuditLogSchema: z.ZodObject<{
    helper_id: z.ZodString;
    timestamp: z.ZodString;
    action_id: z.ZodString;
    action: z.ZodEnum<["create", "update", "publish", "archive", "set_default", "unset_default", "duplicate"]>;
    actor_id: z.ZodString;
    diff_summary_json: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    helper_id: string;
    action_id: string;
    action: "create" | "update" | "publish" | "archive" | "set_default" | "unset_default" | "duplicate";
    actor_id: string;
    diff_summary_json?: string | undefined;
}, {
    timestamp: string;
    helper_id: string;
    action_id: string;
    action: "create" | "update" | "publish" | "archive" | "set_default" | "unset_default" | "duplicate";
    actor_id: string;
    diff_summary_json?: string | undefined;
}>;
export type PromptHelperAuditLog = z.infer<typeof PromptHelperAuditLogSchema>;
/**
 * Compose Prompt Request
 */
export declare const ComposePromptRequestSchema: z.ZodObject<{
    helper_id: z.ZodOptional<z.ZodString>;
    context: z.ZodEnum<["cover_image", "description", "rte"]>;
    variables: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    user_content: z.ZodOptional<z.ZodString>;
    user_instruction: z.ZodOptional<z.ZodString>;
    action_type: z.ZodOptional<z.ZodEnum<["shorten", "expand", "rewrite", "tone_shift", "summarize"]>>;
    provider: z.ZodOptional<z.ZodEnum<["openai", "gemini"]>>;
}, "strip", z.ZodTypeAny, {
    context: "description" | "cover_image" | "rte";
    provider?: "openai" | "gemini" | undefined;
    helper_id?: string | undefined;
    variables?: Record<string, any> | undefined;
    user_content?: string | undefined;
    user_instruction?: string | undefined;
    action_type?: "shorten" | "expand" | "rewrite" | "tone_shift" | "summarize" | undefined;
}, {
    context: "description" | "cover_image" | "rte";
    provider?: "openai" | "gemini" | undefined;
    helper_id?: string | undefined;
    variables?: Record<string, any> | undefined;
    user_content?: string | undefined;
    user_instruction?: string | undefined;
    action_type?: "shorten" | "expand" | "rewrite" | "tone_shift" | "summarize" | undefined;
}>;
export type ComposePromptRequest = z.infer<typeof ComposePromptRequestSchema>;
/**
 * Composed Prompt Response
 */
export declare const ComposedPromptResponseSchema: z.ZodObject<{
    composed_prompt: z.ZodString;
    helper_id: z.ZodOptional<z.ZodString>;
    helper_name: z.ZodOptional<z.ZodString>;
    variables_used: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    composed_prompt: string;
    variables_used: string[];
    warnings: string[];
    helper_id?: string | undefined;
    helper_name?: string | undefined;
}, {
    composed_prompt: string;
    helper_id?: string | undefined;
    helper_name?: string | undefined;
    variables_used?: string[] | undefined;
    warnings?: string[] | undefined;
}>;
export type ComposedPromptResponse = z.infer<typeof ComposedPromptResponseSchema>;
//# sourceMappingURL=promptHelpers.d.ts.map