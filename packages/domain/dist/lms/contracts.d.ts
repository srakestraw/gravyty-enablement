/**
 * LMS API Contracts
 *
 * Canonical request/response shapes for LMS API endpoints.
 * These types are used by both API and web UI for type safety.
 */
import { z } from 'zod';
/**
 * Course Summary
 *
 * Lightweight course representation for catalog and related courses.
 */
export declare const CourseSummarySchema: z.ZodObject<{
    course_id: z.ZodString;
    title: z.ZodString;
    short_description: z.ZodOptional<z.ZodString>;
    cover_image_url: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    product_suite: z.ZodOptional<z.ZodString>;
    topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    estimated_minutes: z.ZodOptional<z.ZodNumber>;
    difficulty_level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    title: string;
    course_id: string;
    topic_tags: string[];
    product?: string | undefined;
    product_suite?: string | undefined;
    short_description?: string | undefined;
    published_at?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    estimated_minutes?: number | undefined;
    difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
    cover_image_url?: string | undefined;
}, {
    status: "draft" | "published" | "archived";
    title: string;
    course_id: string;
    product?: string | undefined;
    product_suite?: string | undefined;
    short_description?: string | undefined;
    topic_tags?: string[] | undefined;
    published_at?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    estimated_minutes?: number | undefined;
    difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
    cover_image_url?: string | undefined;
}>;
export type CourseSummary = z.infer<typeof CourseSummarySchema>;
/**
 * Course Detail
 *
 * Full course metadata with outline (sections and lessons).
 */
export declare const CourseDetailSchema: z.ZodObject<{
    course_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    short_description: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    product_suite: z.ZodOptional<z.ZodString>;
    topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    product_id: z.ZodOptional<z.ZodString>;
    product_suite_id: z.ZodOptional<z.ZodString>;
    topic_tag_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    legacy_product_suite: z.ZodOptional<z.ZodString>;
    legacy_product_concept: z.ZodOptional<z.ZodString>;
    legacy_product_suite_id: z.ZodOptional<z.ZodString>;
    legacy_product_concept_id: z.ZodOptional<z.ZodString>;
    related_course_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
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
    badges: z.ZodDefault<z.ZodArray<z.ZodObject<{
        badge_id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        icon_url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        badge_id: string;
        description?: string | undefined;
        icon_url?: string | undefined;
    }, {
        name: string;
        badge_id: string;
        description?: string | undefined;
        icon_url?: string | undefined;
    }>, "many">>;
    badge_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    version: z.ZodDefault<z.ZodNumber>;
    published_version: z.ZodOptional<z.ZodNumber>;
    published_at: z.ZodOptional<z.ZodString>;
    published_by: z.ZodOptional<z.ZodString>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    estimated_minutes: z.ZodOptional<z.ZodNumber>;
    difficulty_level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
} & {
    sections: z.ZodArray<z.ZodObject<{
        section_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        lesson_ids: z.ZodArray<z.ZodString, "many">;
    } & {
        lessons: z.ZodArray<z.ZodObject<{
            lesson_id: z.ZodString;
            title: z.ZodString;
            type: z.ZodEnum<["video", "reading", "quiz", "assignment", "interactive"]>;
            order: z.ZodNumber;
            estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
            required: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            type: "video" | "reading" | "quiz" | "assignment" | "interactive";
            title: string;
            order: number;
            lesson_id: string;
            required: boolean;
            estimated_duration_minutes?: number | undefined;
        }, {
            type: "video" | "reading" | "quiz" | "assignment" | "interactive";
            title: string;
            order: number;
            lesson_id: string;
            estimated_duration_minutes?: number | undefined;
            required?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        lessons: {
            type: "video" | "reading" | "quiz" | "assignment" | "interactive";
            title: string;
            order: number;
            lesson_id: string;
            required: boolean;
            estimated_duration_minutes?: number | undefined;
        }[];
        description?: string | undefined;
    }, {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        lessons: {
            type: "video" | "reading" | "quiz" | "assignment" | "interactive";
            title: string;
            order: number;
            lesson_id: string;
            estimated_duration_minutes?: number | undefined;
            required?: boolean | undefined;
        }[];
        description?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    topic_tag_ids: string[];
    version: number;
    created_by: string;
    course_id: string;
    topic_tags: string[];
    related_course_ids: string[];
    badges: {
        name: string;
        badge_id: string;
        description?: string | undefined;
        icon_url?: string | undefined;
    }[];
    badge_ids: string[];
    sections: {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        lessons: {
            type: "video" | "reading" | "quiz" | "assignment" | "interactive";
            title: string;
            order: number;
            lesson_id: string;
            required: boolean;
            estimated_duration_minutes?: number | undefined;
        }[];
        description?: string | undefined;
    }[];
    updated_at: string;
    updated_by: string;
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
    estimated_minutes?: number | undefined;
    difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
}, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    created_by: string;
    course_id: string;
    sections: {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        lessons: {
            type: "video" | "reading" | "quiz" | "assignment" | "interactive";
            title: string;
            order: number;
            lesson_id: string;
            estimated_duration_minutes?: number | undefined;
            required?: boolean | undefined;
        }[];
        description?: string | undefined;
    }[];
    updated_at: string;
    updated_by: string;
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
    related_course_ids?: string[] | undefined;
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
    badges?: {
        name: string;
        badge_id: string;
        description?: string | undefined;
        icon_url?: string | undefined;
    }[] | undefined;
    badge_ids?: string[] | undefined;
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    estimated_minutes?: number | undefined;
    difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
}>;
export type CourseDetail = z.infer<typeof CourseDetailSchema>;
/**
 * Lesson Detail
 *
 * Full lesson content including resources.
 * Note: content is already part of LessonSchema, resources are hydrated MediaRefs.
 */
export declare const LessonDetailSchema: z.ZodObject<{
    lesson_id: z.ZodString;
    course_id: z.ZodString;
    section_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["video", "reading", "quiz", "assignment", "interactive"]>;
    order: z.ZodNumber;
    content: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"video">;
        video_id: z.ZodString;
        duration_seconds: z.ZodNumber;
        transcript: z.ZodOptional<z.ZodString>;
        transcript_status: z.ZodOptional<z.ZodEnum<["queued", "processing", "complete", "failed"]>>;
    }, "strip", z.ZodTypeAny, {
        kind: "video";
        video_id: string;
        duration_seconds: number;
        transcript?: string | undefined;
        transcript_status?: "queued" | "processing" | "complete" | "failed" | undefined;
    }, {
        kind: "video";
        video_id: string;
        duration_seconds: number;
        transcript?: string | undefined;
        transcript_status?: "queued" | "processing" | "complete" | "failed" | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"reading">;
        format: z.ZodLiteral<"markdown">;
        markdown: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        kind: "reading";
        format: "markdown";
        markdown: string;
    }, {
        kind: "reading";
        format: "markdown";
        markdown: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"quiz">;
        passing_score_percent: z.ZodOptional<z.ZodNumber>;
        allow_retry: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        show_answers_after_submit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        questions: z.ZodArray<z.ZodObject<{
            question_id: z.ZodString;
            kind: z.ZodLiteral<"single_choice">;
            prompt: z.ZodString;
            options: z.ZodArray<z.ZodObject<{
                option_id: z.ZodString;
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                text: string;
                option_id: string;
            }, {
                text: string;
                option_id: string;
            }>, "many">;
            correct_option_id: z.ZodString;
            explanation: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            options: {
                text: string;
                option_id: string;
            }[];
            question_id: string;
            kind: "single_choice";
            prompt: string;
            correct_option_id: string;
            explanation?: string | undefined;
        }, {
            options: {
                text: string;
                option_id: string;
            }[];
            question_id: string;
            kind: "single_choice";
            prompt: string;
            correct_option_id: string;
            explanation?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        kind: "quiz";
        allow_retry: boolean;
        show_answers_after_submit: boolean;
        questions: {
            options: {
                text: string;
                option_id: string;
            }[];
            question_id: string;
            kind: "single_choice";
            prompt: string;
            correct_option_id: string;
            explanation?: string | undefined;
        }[];
        passing_score_percent?: number | undefined;
    }, {
        kind: "quiz";
        questions: {
            options: {
                text: string;
                option_id: string;
            }[];
            question_id: string;
            kind: "single_choice";
            prompt: string;
            correct_option_id: string;
            explanation?: string | undefined;
        }[];
        passing_score_percent?: number | undefined;
        allow_retry?: boolean | undefined;
        show_answers_after_submit?: boolean | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"assignment">;
        instructions_markdown: z.ZodString;
        submission_type: z.ZodEnum<["none", "text", "file", "link"]>;
        due_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        kind: "assignment";
        instructions_markdown: string;
        submission_type: "text" | "none" | "file" | "link";
        due_at?: string | undefined;
    }, {
        kind: "assignment";
        instructions_markdown: string;
        submission_type: "text" | "none" | "file" | "link";
        due_at?: string | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"interactive">;
        provider: z.ZodLiteral<"embed">;
        embed_url: z.ZodString;
        height_px: z.ZodOptional<z.ZodNumber>;
        allow_fullscreen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        kind: "interactive";
        provider: "embed";
        embed_url: string;
        allow_fullscreen: boolean;
        height_px?: number | undefined;
    }, {
        kind: "interactive";
        provider: "embed";
        embed_url: string;
        height_px?: number | undefined;
        allow_fullscreen?: boolean | undefined;
    }>]>;
    required: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
} & {
    resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
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
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "video" | "reading" | "quiz" | "assignment" | "interactive";
    created_at: string;
    title: string;
    created_by: string;
    section_id: string;
    order: number;
    course_id: string;
    updated_at: string;
    updated_by: string;
    lesson_id: string;
    content: {
        kind: "video";
        video_id: string;
        duration_seconds: number;
        transcript?: string | undefined;
        transcript_status?: "queued" | "processing" | "complete" | "failed" | undefined;
    } | {
        kind: "reading";
        format: "markdown";
        markdown: string;
    } | {
        kind: "quiz";
        allow_retry: boolean;
        show_answers_after_submit: boolean;
        questions: {
            options: {
                text: string;
                option_id: string;
            }[];
            question_id: string;
            kind: "single_choice";
            prompt: string;
            correct_option_id: string;
            explanation?: string | undefined;
        }[];
        passing_score_percent?: number | undefined;
    } | {
        kind: "assignment";
        instructions_markdown: string;
        submission_type: "text" | "none" | "file" | "link";
        due_at?: string | undefined;
    } | {
        kind: "interactive";
        provider: "embed";
        embed_url: string;
        allow_fullscreen: boolean;
        height_px?: number | undefined;
    };
    resources: {
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
    }[];
    required: boolean;
    description?: string | undefined;
}, {
    type: "video" | "reading" | "quiz" | "assignment" | "interactive";
    created_at: string;
    title: string;
    created_by: string;
    section_id: string;
    order: number;
    course_id: string;
    updated_at: string;
    updated_by: string;
    lesson_id: string;
    content: {
        kind: "video";
        video_id: string;
        duration_seconds: number;
        transcript?: string | undefined;
        transcript_status?: "queued" | "processing" | "complete" | "failed" | undefined;
    } | {
        kind: "reading";
        format: "markdown";
        markdown: string;
    } | {
        kind: "quiz";
        questions: {
            options: {
                text: string;
                option_id: string;
            }[];
            question_id: string;
            kind: "single_choice";
            prompt: string;
            correct_option_id: string;
            explanation?: string | undefined;
        }[];
        passing_score_percent?: number | undefined;
        allow_retry?: boolean | undefined;
        show_answers_after_submit?: boolean | undefined;
    } | {
        kind: "assignment";
        instructions_markdown: string;
        submission_type: "text" | "none" | "file" | "link";
        due_at?: string | undefined;
    } | {
        kind: "interactive";
        provider: "embed";
        embed_url: string;
        height_px?: number | undefined;
        allow_fullscreen?: boolean | undefined;
    };
    description?: string | undefined;
    resources?: {
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
    }[] | undefined;
    required?: boolean | undefined;
}>;
export type LessonDetail = z.infer<typeof LessonDetailSchema>;
/**
 * Learning Path Summary
 *
 * Lightweight path representation for catalog.
 */
export declare const LearningPathSummarySchema: z.ZodObject<{
    path_id: z.ZodString;
    title: z.ZodString;
    short_description: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    product_suite: z.ZodOptional<z.ZodString>;
    topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    course_count: z.ZodDefault<z.ZodNumber>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    title: string;
    topic_tags: string[];
    path_id: string;
    course_count: number;
    product?: string | undefined;
    product_suite?: string | undefined;
    short_description?: string | undefined;
    published_at?: string | undefined;
    estimated_duration_minutes?: number | undefined;
}, {
    status: "draft" | "published" | "archived";
    title: string;
    path_id: string;
    product?: string | undefined;
    product_suite?: string | undefined;
    short_description?: string | undefined;
    topic_tags?: string[] | undefined;
    published_at?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    course_count?: number | undefined;
}>;
export type LearningPathSummary = z.infer<typeof LearningPathSummarySchema>;
/**
 * Path Summary with Rollup Progress (Learner View)
 *
 * Path summary enriched with user's progress rollup.
 */
export declare const PathSummarySchema: z.ZodObject<{
    path_id: z.ZodString;
    title: z.ZodString;
    short_description: z.ZodOptional<z.ZodString>;
    product: z.ZodOptional<z.ZodString>;
    product_suite: z.ZodOptional<z.ZodString>;
    topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    course_count: z.ZodDefault<z.ZodNumber>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    published_at: z.ZodOptional<z.ZodString>;
} & {
    progress: z.ZodOptional<z.ZodObject<{
        total_courses: z.ZodNumber;
        completed_courses: z.ZodNumber;
        percent_complete: z.ZodNumber;
        status: z.ZodEnum<["not_started", "in_progress", "completed"]>;
        next_course_id: z.ZodOptional<z.ZodString>;
        started_at: z.ZodOptional<z.ZodString>;
        completed_at: z.ZodOptional<z.ZodString>;
        last_activity_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    }, {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    title: string;
    topic_tags: string[];
    path_id: string;
    course_count: number;
    product?: string | undefined;
    product_suite?: string | undefined;
    short_description?: string | undefined;
    published_at?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    progress?: {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    } | undefined;
}, {
    status: "draft" | "published" | "archived";
    title: string;
    path_id: string;
    product?: string | undefined;
    product_suite?: string | undefined;
    short_description?: string | undefined;
    topic_tags?: string[] | undefined;
    published_at?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    course_count?: number | undefined;
    progress?: {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    } | undefined;
}>;
export type PathSummary = z.infer<typeof PathSummarySchema>;
/**
 * Learning Path Detail
 *
 * Full path metadata with hydrated course summaries.
 */
export declare const LearningPathDetailSchema: z.ZodObject<{
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
    legacy_product_suite: z.ZodOptional<z.ZodString>;
    legacy_product_concept: z.ZodOptional<z.ZodString>;
    legacy_product_suite_id: z.ZodOptional<z.ZodString>;
    legacy_product_concept_id: z.ZodOptional<z.ZodString>;
    badges: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
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
} & {
    courses: z.ZodArray<z.ZodObject<{
        course_id: z.ZodString;
        order: z.ZodNumber;
        required: z.ZodDefault<z.ZodBoolean>;
        title_override: z.ZodOptional<z.ZodString>;
    } & {
        course: z.ZodOptional<z.ZodObject<{
            course_id: z.ZodString;
            title: z.ZodString;
            short_description: z.ZodOptional<z.ZodString>;
            cover_image_url: z.ZodOptional<z.ZodString>;
            product: z.ZodOptional<z.ZodString>;
            product_suite: z.ZodOptional<z.ZodString>;
            topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
            estimated_minutes: z.ZodOptional<z.ZodNumber>;
            difficulty_level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
            status: z.ZodEnum<["draft", "published", "archived"]>;
            published_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            topic_tags: string[];
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        }, {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            topic_tags?: string[] | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        order: number;
        course_id: string;
        required: boolean;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            topic_tags: string[];
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }, {
        order: number;
        course_id: string;
        required?: boolean | undefined;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            topic_tags?: string[] | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    topic_tag_ids: string[];
    version: number;
    created_by: string;
    topic_tags: string[];
    badges: string[];
    updated_at: string;
    updated_by: string;
    path_id: string;
    courses: {
        order: number;
        course_id: string;
        required: boolean;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            topic_tags: string[];
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
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
    courses: {
        order: number;
        course_id: string;
        required?: boolean | undefined;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            topic_tags?: string[] | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }[];
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
    badges?: string[] | undefined;
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
}>;
export type LearningPathDetail = z.infer<typeof LearningPathDetailSchema>;
/**
 * Path Detail with Rollup Progress (Learner View)
 *
 * Path detail enriched with user's progress rollup and course completion states.
 */
export declare const PathDetailSchema: z.ZodObject<{
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
    legacy_product_suite: z.ZodOptional<z.ZodString>;
    legacy_product_concept: z.ZodOptional<z.ZodString>;
    legacy_product_suite_id: z.ZodOptional<z.ZodString>;
    legacy_product_concept_id: z.ZodOptional<z.ZodString>;
    badges: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
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
} & {
    courses: z.ZodArray<z.ZodObject<{
        course_id: z.ZodString;
        order: z.ZodNumber;
        required: z.ZodDefault<z.ZodBoolean>;
        title_override: z.ZodOptional<z.ZodString>;
    } & {
        course: z.ZodOptional<z.ZodObject<{
            course_id: z.ZodString;
            title: z.ZodString;
            short_description: z.ZodOptional<z.ZodString>;
            cover_image_url: z.ZodOptional<z.ZodString>;
            product: z.ZodOptional<z.ZodString>;
            product_suite: z.ZodOptional<z.ZodString>;
            topic_tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
            estimated_minutes: z.ZodOptional<z.ZodNumber>;
            difficulty_level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
            status: z.ZodEnum<["draft", "published", "archived"]>;
            published_at: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            topic_tags: string[];
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        }, {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            topic_tags?: string[] | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        order: number;
        course_id: string;
        required: boolean;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            topic_tags: string[];
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }, {
        order: number;
        course_id: string;
        required?: boolean | undefined;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            topic_tags?: string[] | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }>, "many">;
} & {
    progress: z.ZodOptional<z.ZodObject<{
        total_courses: z.ZodNumber;
        completed_courses: z.ZodNumber;
        percent_complete: z.ZodNumber;
        status: z.ZodEnum<["not_started", "in_progress", "completed"]>;
        next_course_id: z.ZodOptional<z.ZodString>;
        started_at: z.ZodOptional<z.ZodString>;
        completed_at: z.ZodOptional<z.ZodString>;
        last_activity_at: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    }, {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    }>>;
    course_completion: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    topic_tag_ids: string[];
    version: number;
    created_by: string;
    topic_tags: string[];
    badges: string[];
    updated_at: string;
    updated_by: string;
    path_id: string;
    courses: {
        order: number;
        course_id: string;
        required: boolean;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            topic_tags: string[];
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }[];
    course_completion: Record<string, boolean>;
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
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    progress?: {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    } | undefined;
}, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    path_id: string;
    courses: {
        order: number;
        course_id: string;
        required?: boolean | undefined;
        title_override?: string | undefined;
        course?: {
            status: "draft" | "published" | "archived";
            title: string;
            course_id: string;
            product?: string | undefined;
            product_suite?: string | undefined;
            short_description?: string | undefined;
            topic_tags?: string[] | undefined;
            published_at?: string | undefined;
            estimated_duration_minutes?: number | undefined;
            estimated_minutes?: number | undefined;
            difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
            cover_image_url?: string | undefined;
        } | undefined;
    }[];
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
    badges?: string[] | undefined;
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    progress?: {
        status: "completed" | "not_started" | "in_progress";
        percent_complete: number;
        total_courses: number;
        completed_courses: number;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        next_course_id?: string | undefined;
        last_activity_at?: string | undefined;
    } | undefined;
    course_completion?: Record<string, boolean> | undefined;
}>;
export type PathDetail = z.infer<typeof PathDetailSchema>;
/**
 * My Learning Response
 *
 * Learner's personalized learning dashboard.
 */
export declare const MyLearningSchema: z.ZodObject<{
    required: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["course", "path"]>;
        course_id: z.ZodOptional<z.ZodString>;
        path_id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        due_at: z.ZodOptional<z.ZodString>;
        assignment_id: z.ZodOptional<z.ZodString>;
        progress_percent: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: "path" | "course";
        title: string;
        progress_percent: number;
        course_id?: string | undefined;
        due_at?: string | undefined;
        path_id?: string | undefined;
        assignment_id?: string | undefined;
    }, {
        type: "path" | "course";
        title: string;
        course_id?: string | undefined;
        due_at?: string | undefined;
        path_id?: string | undefined;
        assignment_id?: string | undefined;
        progress_percent?: number | undefined;
    }>, "many">>;
    in_progress: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["course", "path"]>;
        course_id: z.ZodOptional<z.ZodString>;
        path_id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        progress_percent: z.ZodDefault<z.ZodNumber>;
        last_accessed_at: z.ZodString;
        current_lesson_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "path" | "course";
        title: string;
        last_accessed_at: string;
        progress_percent: number;
        course_id?: string | undefined;
        path_id?: string | undefined;
        current_lesson_id?: string | undefined;
    }, {
        type: "path" | "course";
        title: string;
        last_accessed_at: string;
        course_id?: string | undefined;
        path_id?: string | undefined;
        current_lesson_id?: string | undefined;
        progress_percent?: number | undefined;
    }>, "many">>;
    completed: z.ZodDefault<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["course", "path"]>;
        course_id: z.ZodOptional<z.ZodString>;
        path_id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        completed_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "path" | "course";
        title: string;
        completed_at: string;
        course_id?: string | undefined;
        path_id?: string | undefined;
    }, {
        type: "path" | "course";
        title: string;
        completed_at: string;
        course_id?: string | undefined;
        path_id?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    required: {
        type: "path" | "course";
        title: string;
        progress_percent: number;
        course_id?: string | undefined;
        due_at?: string | undefined;
        path_id?: string | undefined;
        assignment_id?: string | undefined;
    }[];
    completed: {
        type: "path" | "course";
        title: string;
        completed_at: string;
        course_id?: string | undefined;
        path_id?: string | undefined;
    }[];
    in_progress: {
        type: "path" | "course";
        title: string;
        last_accessed_at: string;
        progress_percent: number;
        course_id?: string | undefined;
        path_id?: string | undefined;
        current_lesson_id?: string | undefined;
    }[];
}, {
    required?: {
        type: "path" | "course";
        title: string;
        course_id?: string | undefined;
        due_at?: string | undefined;
        path_id?: string | undefined;
        assignment_id?: string | undefined;
        progress_percent?: number | undefined;
    }[] | undefined;
    completed?: {
        type: "path" | "course";
        title: string;
        completed_at: string;
        course_id?: string | undefined;
        path_id?: string | undefined;
    }[] | undefined;
    in_progress?: {
        type: "path" | "course";
        title: string;
        last_accessed_at: string;
        course_id?: string | undefined;
        path_id?: string | undefined;
        current_lesson_id?: string | undefined;
        progress_percent?: number | undefined;
    }[] | undefined;
}>;
export type MyLearning = z.infer<typeof MyLearningSchema>;
/**
 * Assignment Summary
 *
 * Assignment representation for lists and detail views.
 */
export declare const AssignmentSummarySchema: z.ZodObject<{
    assignment_id: z.ZodString;
    assignment_type: z.ZodEnum<["course", "path"]>;
    course_id: z.ZodOptional<z.ZodString>;
    path_id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    status: z.ZodEnum<["assigned", "started", "completed", "waived"]>;
    due_at: z.ZodOptional<z.ZodString>;
    assigned_at: z.ZodString;
    progress_percent: z.ZodDefault<z.ZodNumber>;
    is_overdue: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "assigned" | "completed" | "started" | "waived";
    title: string;
    assignment_id: string;
    assignment_type: "path" | "course";
    assigned_at: string;
    progress_percent: number;
    is_overdue: boolean;
    course_id?: string | undefined;
    due_at?: string | undefined;
    path_id?: string | undefined;
}, {
    status: "assigned" | "completed" | "started" | "waived";
    title: string;
    assignment_id: string;
    assignment_type: "path" | "course";
    assigned_at: string;
    course_id?: string | undefined;
    due_at?: string | undefined;
    path_id?: string | undefined;
    progress_percent?: number | undefined;
    is_overdue?: boolean | undefined;
}>;
export type AssignmentSummary = z.infer<typeof AssignmentSummarySchema>;
/**
 * Certificate Summary (Issued)
 *
 * Learner-facing certificate representation for "My Certificates".
 */
export declare const CertificateSummarySchema: z.ZodObject<{
    certificate_id: z.ZodString;
    template_id: z.ZodString;
    template_name: z.ZodString;
    recipient_name: z.ZodString;
    course_title: z.ZodOptional<z.ZodString>;
    path_title: z.ZodOptional<z.ZodString>;
    completion_date: z.ZodString;
    issued_at: z.ZodString;
    badge_text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    template_id: string;
    badge_text: string;
    certificate_id: string;
    issued_at: string;
    recipient_name: string;
    completion_date: string;
    template_name: string;
    course_title?: string | undefined;
    path_title?: string | undefined;
}, {
    template_id: string;
    badge_text: string;
    certificate_id: string;
    issued_at: string;
    recipient_name: string;
    completion_date: string;
    template_name: string;
    course_title?: string | undefined;
    path_title?: string | undefined;
}>;
export type CertificateSummary = z.infer<typeof CertificateSummarySchema>;
/**
 * Certificate Template Summary
 *
 * Admin-facing certificate template representation.
 */
export declare const CertificateTemplateSummarySchema: z.ZodObject<{
    template_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    applies_to: z.ZodEnum<["course", "path"]>;
    applies_to_id: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    published_at: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived";
    name: string;
    created_at: string;
    updated_at: string;
    template_id: string;
    applies_to: "path" | "course";
    applies_to_id: string;
    description?: string | undefined;
    published_at?: string | undefined;
}, {
    status: "draft" | "published" | "archived";
    name: string;
    created_at: string;
    updated_at: string;
    template_id: string;
    applies_to: "path" | "course";
    applies_to_id: string;
    description?: string | undefined;
    published_at?: string | undefined;
}>;
export type CertificateTemplateSummary = z.infer<typeof CertificateTemplateSummarySchema>;
//# sourceMappingURL=contracts.d.ts.map