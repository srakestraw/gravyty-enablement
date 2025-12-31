/**
 * Course Domain Types
 *
 * Defines Course, CourseSection, CourseBadge, and CourseStatus types.
 */
import { z } from 'zod';
/**
 * Course Badge
 *
 * Badges that can be earned by completing a course.
 */
export declare const CourseBadgeSchema: z.ZodObject<{
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
}>;
export type CourseBadge = z.infer<typeof CourseBadgeSchema>;
/**
 * Course Status
 *
 * Publishing state machine: draft -> published (immutable snapshots)
 */
export declare const CourseStatusSchema: z.ZodEnum<["draft", "published", "archived"]>;
export type CourseStatus = z.infer<typeof CourseStatusSchema>;
/**
 * Course Section
 *
 * A section within a course containing lessons.
 */
export declare const CourseSectionSchema: z.ZodObject<{
    section_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    order: z.ZodNumber;
    lesson_ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    section_id: string;
    order: number;
    lesson_ids: string[];
    description?: string | undefined;
}, {
    title: string;
    section_id: string;
    order: number;
    lesson_ids: string[];
    description?: string | undefined;
}>;
export type CourseSection = z.infer<typeof CourseSectionSchema>;
/**
 * Course
 *
 * A structured learning experience with sections and lessons.
 * Supports versioning: published courses create immutable snapshots.
 */
export declare const CourseSchema: z.ZodObject<{
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
    sections: z.ZodDefault<z.ZodArray<z.ZodObject<{
        section_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        order: z.ZodNumber;
        lesson_ids: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        description?: string | undefined;
    }, {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        description?: string | undefined;
    }>, "many">>;
    status: z.ZodEnum<["draft", "published", "archived"]>;
    version: z.ZodDefault<z.ZodNumber>;
    published_version: z.ZodOptional<z.ZodNumber>;
    published_at: z.ZodOptional<z.ZodString>;
    published_by: z.ZodOptional<z.ZodString>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    difficulty_level: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
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
    course_id: string;
    topic_tags: string[];
    related_course_ids: string[];
    badges: {
        name: string;
        badge_id: string;
        description?: string | undefined;
        icon_url?: string | undefined;
    }[];
    sections: {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
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
    } | undefined;
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
}, {
    status: "draft" | "published" | "archived";
    created_at: string;
    title: string;
    created_by: string;
    course_id: string;
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
    } | undefined;
    badges?: {
        name: string;
        badge_id: string;
        description?: string | undefined;
        icon_url?: string | undefined;
    }[] | undefined;
    sections?: {
        title: string;
        section_id: string;
        order: number;
        lesson_ids: string[];
        description?: string | undefined;
    }[] | undefined;
    published_version?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    difficulty_level?: "beginner" | "intermediate" | "advanced" | undefined;
}>;
export type Course = z.infer<typeof CourseSchema>;
/**
 * Course Publishing Invariants
 *
 * - draft courses can be edited freely
 * - published courses create immutable snapshots (version increment)
 * - published snapshots cannot be modified (only archived)
 * - learners see published versions only
 */
export declare function validateCoursePublishing(course: Course): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=course.d.ts.map