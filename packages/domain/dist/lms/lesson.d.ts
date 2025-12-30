/**
 * Lesson Domain Types
 *
 * Defines Lesson and Transcript types.
 */
import { z } from 'zod';
/**
 * Transcript Segment
 *
 * A segment of a transcript with timing information.
 */
export declare const TranscriptSegmentSchema: z.ZodObject<{
    segment_id: z.ZodString;
    start_ms: z.ZodNumber;
    end_ms: z.ZodNumber;
    text: z.ZodString;
    speaker: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    segment_id: string;
    start_ms: number;
    end_ms: number;
    text: string;
    speaker?: string | undefined;
}, {
    segment_id: string;
    start_ms: number;
    end_ms: number;
    text: string;
    speaker?: string | undefined;
}>;
export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;
/**
 * Transcript
 *
 * Full transcript with optional segments and cached full text.
 * Transcripts are stored for later RAG ingestion (Phase 7+).
 */
export declare const TranscriptSchema: z.ZodObject<{
    transcript_id: z.ZodString;
    lesson_id: z.ZodString;
    video_media_id: z.ZodOptional<z.ZodString>;
    segments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        segment_id: z.ZodString;
        start_ms: z.ZodNumber;
        end_ms: z.ZodNumber;
        text: z.ZodString;
        speaker: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        segment_id: string;
        start_ms: number;
        end_ms: number;
        text: string;
        speaker?: string | undefined;
    }, {
        segment_id: string;
        start_ms: number;
        end_ms: number;
        text: string;
        speaker?: string | undefined;
    }>, "many">>;
    full_text: z.ZodOptional<z.ZodString>;
    language: z.ZodDefault<z.ZodString>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    created_by: string;
    updated_at: string;
    transcript_id: string;
    lesson_id: string;
    language: string;
    video_media_id?: string | undefined;
    segments?: {
        segment_id: string;
        start_ms: number;
        end_ms: number;
        text: string;
        speaker?: string | undefined;
    }[] | undefined;
    full_text?: string | undefined;
}, {
    created_at: string;
    created_by: string;
    updated_at: string;
    transcript_id: string;
    lesson_id: string;
    video_media_id?: string | undefined;
    segments?: {
        segment_id: string;
        start_ms: number;
        end_ms: number;
        text: string;
        speaker?: string | undefined;
    }[] | undefined;
    full_text?: string | undefined;
    language?: string | undefined;
}>;
export type Transcript = z.infer<typeof TranscriptSchema>;
/**
 * Lesson Type
 */
export declare const LessonTypeSchema: z.ZodEnum<["video", "reading", "quiz", "assignment", "interactive"]>;
export type LessonType = z.infer<typeof LessonTypeSchema>;
/**
 * Lesson
 *
 * A single learning unit within a course section.
 * Lessons can contain video content, transcripts, and resource references.
 */
export declare const LessonSchema: z.ZodObject<{
    lesson_id: z.ZodString;
    course_id: z.ZodString;
    section_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["video", "reading", "quiz", "assignment", "interactive"]>;
    order: z.ZodNumber;
    video_media: z.ZodOptional<z.ZodObject<{
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
    transcript_ref: z.ZodOptional<z.ZodString>;
    transcript: z.ZodOptional<z.ZodObject<{
        transcript_id: z.ZodString;
        lesson_id: z.ZodString;
        video_media_id: z.ZodOptional<z.ZodString>;
        segments: z.ZodOptional<z.ZodArray<z.ZodObject<{
            segment_id: z.ZodString;
            start_ms: z.ZodNumber;
            end_ms: z.ZodNumber;
            text: z.ZodString;
            speaker: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            segment_id: string;
            start_ms: number;
            end_ms: number;
            text: string;
            speaker?: string | undefined;
        }, {
            segment_id: string;
            start_ms: number;
            end_ms: number;
            text: string;
            speaker?: string | undefined;
        }>, "many">>;
        full_text: z.ZodOptional<z.ZodString>;
        language: z.ZodDefault<z.ZodString>;
        created_at: z.ZodString;
        created_by: z.ZodString;
        updated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        created_by: string;
        updated_at: string;
        transcript_id: string;
        lesson_id: string;
        language: string;
        video_media_id?: string | undefined;
        segments?: {
            segment_id: string;
            start_ms: number;
            end_ms: number;
            text: string;
            speaker?: string | undefined;
        }[] | undefined;
        full_text?: string | undefined;
    }, {
        created_at: string;
        created_by: string;
        updated_at: string;
        transcript_id: string;
        lesson_id: string;
        video_media_id?: string | undefined;
        segments?: {
            segment_id: string;
            start_ms: number;
            end_ms: number;
            text: string;
            speaker?: string | undefined;
        }[] | undefined;
        full_text?: string | undefined;
        language?: string | undefined;
    }>>;
    resource_refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimated_duration_minutes: z.ZodOptional<z.ZodNumber>;
    required: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "video" | "reading" | "quiz" | "assignment" | "interactive";
    title: string;
    created_at: string;
    created_by: string;
    section_id: string;
    order: number;
    course_id: string;
    updated_at: string;
    updated_by: string;
    lesson_id: string;
    resource_refs: string[];
    required: boolean;
    description?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    video_media?: {
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
    transcript_ref?: string | undefined;
    transcript?: {
        created_at: string;
        created_by: string;
        updated_at: string;
        transcript_id: string;
        lesson_id: string;
        language: string;
        video_media_id?: string | undefined;
        segments?: {
            segment_id: string;
            start_ms: number;
            end_ms: number;
            text: string;
            speaker?: string | undefined;
        }[] | undefined;
        full_text?: string | undefined;
    } | undefined;
}, {
    type: "video" | "reading" | "quiz" | "assignment" | "interactive";
    title: string;
    created_at: string;
    created_by: string;
    section_id: string;
    order: number;
    course_id: string;
    updated_at: string;
    updated_by: string;
    lesson_id: string;
    description?: string | undefined;
    estimated_duration_minutes?: number | undefined;
    video_media?: {
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
    transcript_ref?: string | undefined;
    transcript?: {
        created_at: string;
        created_by: string;
        updated_at: string;
        transcript_id: string;
        lesson_id: string;
        video_media_id?: string | undefined;
        segments?: {
            segment_id: string;
            start_ms: number;
            end_ms: number;
            text: string;
            speaker?: string | undefined;
        }[] | undefined;
        full_text?: string | undefined;
        language?: string | undefined;
    } | undefined;
    resource_refs?: string[] | undefined;
    required?: boolean | undefined;
}>;
export type Lesson = z.infer<typeof LessonSchema>;
//# sourceMappingURL=lesson.d.ts.map