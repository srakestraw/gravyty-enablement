/**
 * Learning Path Domain Types
 *
 * Defines LearningPath and related types.
 */
import { z } from 'zod';
/**
 * Learning Path Status
 *
 * Publishing state machine: draft -> published (immutable snapshots)
 */
export declare const LearningPathStatusSchema: z.ZodEnum<["draft", "published", "archived"]>;
export type LearningPathStatus = z.infer<typeof LearningPathStatusSchema>;
/**
 * Learning Path Course Reference
 *
 * References a course within a learning path with optional overrides.
 */
export declare const LearningPathCourseRefSchema: z.ZodObject<{
    course_id: z.ZodString;
    order: z.ZodNumber;
    required: z.ZodDefault<z.ZodBoolean>;
    title_override: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    order: number;
    course_id: string;
    required: boolean;
    title_override?: string | undefined;
}, {
    order: number;
    course_id: string;
    required?: boolean | undefined;
    title_override?: string | undefined;
}>;
export type LearningPathCourseRef = z.infer<typeof LearningPathCourseRefSchema>;
/**
 * Learning Path
 *
 * A structured sequence of courses that guide learners through a learning journey.
 * Supports versioning: published paths create immutable snapshots.
 */
export declare const LearningPathSchema: z.ZodObject<{
    path_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    short_description: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    product_suite: z.ZodOptional<z.ZodString>;
    topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    product_id: z.ZodOptional<z.ZodString>;
    product_suite_id: z.ZodOptional<z.ZodString>;
    topic_tag_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    audience_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    legacy_product_suite: z.ZodOptional<z.ZodString>;
    legacy_product_concept: z.ZodOptional<z.ZodString>;
    legacy_product_suite_id: z.ZodOptional<z.ZodString>;
    legacy_product_concept_id: z.ZodOptional<z.ZodString>;
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
    courses: z.ZodDefault<z.ZodArray<z.ZodObject<{
        course_id: z.ZodString;
        order: z.ZodNumber;
        required: z.ZodDefault<z.ZodBoolean>;
        title_override: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        order: number;
        course_id: string;
        required: boolean;
        title_override?: string | undefined;
    }, {
        order: number;
        course_id: string;
        required?: boolean | undefined;
        title_override?: string | undefined;
    }>, "many">>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    version: z.ZodDefault<z.ZodNumber>;
    published_version: z.ZodOptional<z.ZodNumber>;
    published_at: z.ZodOptional<z.ZodString>;
    published_by: z.ZodOptional<z.ZodString>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    topic_tag_ids: string[];
    version: number;
    created_by: string;
    topic_tags: string[];
    audience_ids: string[];
    updated_at: string;
    updated_by: string;
    path_id: string;
    courses: {
        order: number;
        course_id: string;
        required: boolean;
        title_override?: string | undefined;
    }[];
    product?: string | undefined;
    product_suite?: string | undefined;
    product_id?: string | undefined;
    product_suite_id?: string | undefined;
    legacy_product_suite?: string | undefined;
    legacy_product_concept?: string | undefined;
    legacy_product_suite_id?: string | undefined;
    legacy_product_concept_id?: string | undefined;
    description?: string | undefined;
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
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
}, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    path_id: string;
    product?: string | undefined;
    product_suite?: string | undefined;
    product_id?: string | undefined;
    product_suite_id?: string | undefined;
    topic_tag_ids?: string[] | undefined;
    legacy_product_suite?: string | undefined;
    legacy_product_concept?: string | undefined;
    legacy_product_suite_id?: string | undefined;
    legacy_product_concept_id?: string | undefined;
    version?: number | undefined;
    description?: string | undefined;
    short_description?: string | undefined;
    topic_tags?: string[] | undefined;
    audience_ids?: string[] | undefined;
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
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    courses?: {
        order: number;
        course_id: string;
        required?: boolean | undefined;
        title_override?: string | undefined;
    }[] | undefined;
}>;
export type LearningPath = z.infer<typeof LearningPathSchema>;
/**
 * Learning Path Publishing Invariants
 *
 * - draft paths can be edited freely
 * - published paths create immutable snapshots (version increment)
 * - published snapshots cannot be modified (only archived)
 * - learners see published versions only
 */
export declare function validateLearningPathPublishing(path: LearningPath): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=path.d.ts.map