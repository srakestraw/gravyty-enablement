/**
 * Lesson Domain Types
 *
 * Defines Lesson and Transcript types.
 */
import { z } from 'zod';
import { MediaRefSchema } from './media.js';
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
 * Quiz Question Option
 */
export declare const QuizQuestionOptionSchema: z.ZodObject<{
    option_id: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    option_id: string;
}, {
    text: string;
    option_id: string;
}>;
export type QuizQuestionOption = z.infer<typeof QuizQuestionOptionSchema>;
/**
 * Quiz Question (MVP: single choice only)
 */
export declare const QuizQuestionSchema: z.ZodObject<{
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
}>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
/**
 * Lesson Content Discriminated Union
 *
 * Type-specific content for each lesson type.
 */
export declare const LessonContentSchema: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
    kind: z.ZodLiteral<"video">;
    video_id: z.ZodString;
    duration_seconds: z.ZodNumber;
    transcript: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    kind: "video";
    video_id: string;
    duration_seconds: number;
    transcript?: string | undefined;
}, {
    kind: "video";
    video_id: string;
    duration_seconds: number;
    transcript?: string | undefined;
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
export type LessonContent = z.infer<typeof LessonContentSchema>;
/**
 * Lesson Resource (MediaRef alias for clarity)
 */
export type LessonResource = z.infer<typeof MediaRefSchema>;
/**
 * Lesson
 *
 * A single learning unit within a course section.
 * Uses discriminated union for type-specific content.
 */
export declare const LessonSchema: z.ZodObject<{
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
    }, "strip", z.ZodTypeAny, {
        kind: "video";
        video_id: string;
        duration_seconds: number;
        transcript?: string | undefined;
    }, {
        kind: "video";
        video_id: string;
        duration_seconds: number;
        transcript?: string | undefined;
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
    resources: z.ZodOptional<z.ZodArray<z.ZodObject<{
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
    }>, "many">>;
    required: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
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
    required: boolean;
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
    }[] | undefined;
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
    }[] | undefined;
    required?: boolean | undefined;
}>;
export type Lesson = z.infer<typeof LessonSchema>;
//# sourceMappingURL=lesson.d.ts.map