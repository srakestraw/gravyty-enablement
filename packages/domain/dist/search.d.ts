/**
 * Unified Search Domain Types
 *
 * Types for searching and filtering across multiple entity types
 * (Courses, Learning Paths, Role Playing, Content/Assets, Content Kits)
 */
import { z } from 'zod';
/**
 * Unified Search Result
 *
 * Represents a search result that can be any entity type
 */
export declare const UnifiedSearchResultSchema: z.ZodObject<{
    entity_type: z.ZodEnum<["course", "learning_path", "role_playing", "content", "content_kit"]>;
    entity_id: z.ZodString;
    title: z.ZodString;
    short_description: z.ZodOptional<z.ZodString>;
    cover_image: z.ZodOptional<z.ZodObject<{
        media_id: z.ZodString;
        type: z.ZodEnum<["image", "video", "document", "audio", "other"]>;
        url: z.ZodString;
        s3_bucket: z.ZodOptional<z.ZodString>;
        s3_key: z.ZodOptional<z.ZodString>;
        filename: z.ZodOptional<z.ZodString>;
        content_type: z.ZodOptional<z.ZodString>;
        size_bytes: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        thumbnail_url: z.ZodOptional<z.ZodString>;
        transcription_job_id: z.ZodOptional<z.ZodString>;
        transcription_status: z.ZodOptional<z.ZodEnum<["queued", "processing", "complete", "failed"]>>;
        transcription_language: z.ZodOptional<z.ZodString>;
        transcription_error: z.ZodOptional<z.ZodString>;
        created_at: z.ZodString;
        created_by: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    }, {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    }>>;
    metadata: z.ZodObject<{
        product_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        product_suite_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        topic_tag_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        audience_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        badge_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        product_ids?: string[] | undefined;
        product_suite_ids?: string[] | undefined;
        topic_tag_ids?: string[] | undefined;
        audience_ids?: string[] | undefined;
        badge_ids?: string[] | undefined;
    }, {
        product_ids?: string[] | undefined;
        product_suite_ids?: string[] | undefined;
        topic_tag_ids?: string[] | undefined;
        audience_ids?: string[] | undefined;
        badge_ids?: string[] | undefined;
    }>;
    status: z.ZodOptional<z.ZodString>;
    published_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    metadata: {
        product_ids?: string[] | undefined;
        product_suite_ids?: string[] | undefined;
        topic_tag_ids?: string[] | undefined;
        audience_ids?: string[] | undefined;
        badge_ids?: string[] | undefined;
    };
    updated_at: string;
    entity_type: "content" | "course" | "learning_path" | "role_playing" | "content_kit";
    entity_id: string;
    status?: string | undefined;
    short_description?: string | undefined;
    cover_image?: {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    } | undefined;
    published_at?: string | undefined;
}, {
    title: string;
    metadata: {
        product_ids?: string[] | undefined;
        product_suite_ids?: string[] | undefined;
        topic_tag_ids?: string[] | undefined;
        audience_ids?: string[] | undefined;
        badge_ids?: string[] | undefined;
    };
    updated_at: string;
    entity_type: "content" | "course" | "learning_path" | "role_playing" | "content_kit";
    entity_id: string;
    status?: string | undefined;
    short_description?: string | undefined;
    cover_image?: {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    } | undefined;
    published_at?: string | undefined;
}>;
export type UnifiedSearchResult = z.infer<typeof UnifiedSearchResultSchema>;
/**
 * Unified Search Parameters
 */
export declare const UnifiedSearchParamsSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    entity_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["course", "learning_path", "role_playing", "content", "content_kit"]>, "many">>;
    product_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    product_suite_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topic_tag_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    audience_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    badge_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    product_ids?: string[] | undefined;
    product_suite_ids?: string[] | undefined;
    topic_tag_ids?: string[] | undefined;
    audience_ids?: string[] | undefined;
    badge_ids?: string[] | undefined;
    q?: string | undefined;
    entity_types?: ("content" | "course" | "learning_path" | "role_playing" | "content_kit")[] | undefined;
    cursor?: string | undefined;
}, {
    product_ids?: string[] | undefined;
    product_suite_ids?: string[] | undefined;
    topic_tag_ids?: string[] | undefined;
    audience_ids?: string[] | undefined;
    badge_ids?: string[] | undefined;
    q?: string | undefined;
    entity_types?: ("content" | "course" | "learning_path" | "role_playing" | "content_kit")[] | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
export type UnifiedSearchParams = z.infer<typeof UnifiedSearchParamsSchema>;
/**
 * Unified Search Response
 */
export interface UnifiedSearchResponse {
    results: UnifiedSearchResult[];
    next_cursor?: string;
    total?: number;
}
//# sourceMappingURL=search.d.ts.map