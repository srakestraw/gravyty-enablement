/**
 * Metadata Domain Types
 *
 * Defines metadata groups and options for categorizing content (Courses, Resources).
 * Metadata groups: product, product_suite, topic_tag, audience
 *
 * Note: Renamed from legacy naming:
 * - Legacy "product_suite" -> "product"
 * - Legacy "product_concept" -> "product_suite"
 */
import { z } from 'zod';
/**
 * Metadata Group Key
 *
 * Enum of metadata group types
 *
 * Renamed:
 * - "product" (was "product_suite")
 * - "product_suite" (was "product_concept")
 * - "topic_tag" (unchanged)
 */
export declare const MetadataGroupKeySchema: z.ZodEnum<["product", "product_suite", "topic_tag", "audience", "entity_type", "badge"]>;
export type MetadataGroupKey = z.infer<typeof MetadataGroupKeySchema>;
/**
 * Metadata Option
 *
 * A single option within a metadata group (e.g., "CRM" in product).
 * Options can be archived but remain visible on existing content.
 */
export declare const MetadataOptionSchema: z.ZodObject<{
    option_id: z.ZodString;
    group_key: z.ZodEnum<["product", "product_suite", "topic_tag", "audience", "entity_type", "badge"]>;
    label: z.ZodString;
    slug: z.ZodString;
    sort_order: z.ZodDefault<z.ZodNumber>;
    archived_at: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "archived"]>>;
    deleted_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    parent_id: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    short_description: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "archived" | "active";
    created_at: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    option_id: string;
    label: string;
    group_key: "product" | "product_suite" | "topic_tag" | "audience" | "entity_type" | "badge";
    slug: string;
    sort_order: number;
    short_description?: string | undefined;
    archived_at?: string | undefined;
    deleted_at?: string | null | undefined;
    parent_id?: string | undefined;
    color?: string | undefined;
}, {
    created_at: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    option_id: string;
    label: string;
    group_key: "product" | "product_suite" | "topic_tag" | "audience" | "entity_type" | "badge";
    slug: string;
    status?: "archived" | "active" | undefined;
    short_description?: string | undefined;
    sort_order?: number | undefined;
    archived_at?: string | undefined;
    deleted_at?: string | null | undefined;
    parent_id?: string | undefined;
    color?: string | undefined;
}>;
export type MetadataOption = z.infer<typeof MetadataOptionSchema>;
/**
 * Create Metadata Option Request
 */
export declare const CreateMetadataOptionSchema: z.ZodObject<{
    group_key: z.ZodEnum<["product", "product_suite", "topic_tag", "audience", "entity_type", "badge"]>;
    label: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    sort_order: z.ZodOptional<z.ZodNumber>;
    parent_id: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    short_description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    group_key: "product" | "product_suite" | "topic_tag" | "audience" | "entity_type" | "badge";
    short_description?: string | undefined;
    slug?: string | undefined;
    sort_order?: number | undefined;
    parent_id?: string | undefined;
    color?: string | undefined;
}, {
    label: string;
    group_key: "product" | "product_suite" | "topic_tag" | "audience" | "entity_type" | "badge";
    short_description?: string | undefined;
    slug?: string | undefined;
    sort_order?: number | undefined;
    parent_id?: string | undefined;
    color?: string | undefined;
}>;
export type CreateMetadataOption = z.infer<typeof CreateMetadataOptionSchema>;
/**
 * Update Metadata Option Request
 */
export declare const UpdateMetadataOptionSchema: z.ZodObject<{
    label: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    sort_order: z.ZodOptional<z.ZodNumber>;
    archived_at: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "archived"]>>;
    deleted_at: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    color: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    short_description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status?: "archived" | "active" | undefined;
    short_description?: string | null | undefined;
    label?: string | undefined;
    slug?: string | undefined;
    sort_order?: number | undefined;
    archived_at?: string | undefined;
    deleted_at?: string | null | undefined;
    color?: string | null | undefined;
}, {
    status?: "archived" | "active" | undefined;
    short_description?: string | null | undefined;
    label?: string | undefined;
    slug?: string | undefined;
    sort_order?: number | undefined;
    archived_at?: string | undefined;
    deleted_at?: string | null | undefined;
    color?: string | null | undefined;
}>;
export type UpdateMetadataOption = z.infer<typeof UpdateMetadataOptionSchema>;
/**
 * List Metadata Options Response
 */
export interface ListMetadataOptionsResponse {
    options: MetadataOption[];
    next_cursor?: string;
}
/**
 * Metadata Option Usage Response
 *
 * Returns usage counts for a metadata option across Courses and Resources
 */
export interface MetadataOptionUsageResponse {
    used_by_courses: number;
    used_by_resources: number;
    sample_course_ids?: string[];
    sample_resource_ids?: string[];
}
/**
 * Merge Metadata Option Request
 *
 * Moves all references from source option to target option
 */
export declare const MergeMetadataOptionSchema: z.ZodObject<{
    target_option_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    target_option_id: string;
}, {
    target_option_id: string;
}>;
export type MergeMetadataOption = z.infer<typeof MergeMetadataOptionSchema>;
//# sourceMappingURL=metadata.d.ts.map