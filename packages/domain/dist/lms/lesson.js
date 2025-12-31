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
export const TranscriptSegmentSchema = z.object({
    segment_id: z.string(),
    start_ms: z.number().int().min(0), // Start time in milliseconds
    end_ms: z.number().int().min(0), // End time in milliseconds
    text: z.string(), // Segment text
    speaker: z.string().optional(), // Speaker identifier
});
/**
 * Transcript
 *
 * Full transcript with optional segments and cached full text.
 * Transcripts are stored for later RAG ingestion (Phase 7+).
 */
export const TranscriptSchema = z.object({
    transcript_id: z.string(),
    lesson_id: z.string(), // Reference to lesson
    video_media_id: z.string().optional(), // Reference to video media
    // Segments (optional, for interactive transcripts)
    segments: z.array(TranscriptSegmentSchema).optional(),
    // Cached full text (optional, for search)
    full_text: z.string().optional(),
    // Language
    language: z.string().default('en'),
    // Timestamps
    created_at: z.string(), // ISO datetime
    created_by: z.string(), // User ID
    updated_at: z.string(), // ISO datetime
});
/**
 * Lesson Type
 */
export const LessonTypeSchema = z.enum(['video', 'reading', 'quiz', 'assignment', 'interactive']);
/**
 * Quiz Question Option
 */
export const QuizQuestionOptionSchema = z.object({
    option_id: z.string(),
    text: z.string(),
});
/**
 * Quiz Question (MVP: single choice only)
 */
export const QuizQuestionSchema = z.object({
    question_id: z.string(),
    kind: z.literal('single_choice'),
    prompt: z.string(),
    options: z.array(QuizQuestionOptionSchema).min(2),
    correct_option_id: z.string(),
    explanation: z.string().optional(),
});
/**
 * Lesson Content Discriminated Union
 *
 * Type-specific content for each lesson type.
 */
export const LessonContentSchema = z.discriminatedUnion('kind', [
    // Video lesson content
    z.object({
        kind: z.literal('video'),
        video_id: z.string(), // Media ID reference
        duration_seconds: z.number().int().min(1),
        transcript: z.string().optional(),
        transcript_status: z.enum(['queued', 'processing', 'complete', 'failed']).optional(),
    }),
    // Reading lesson content
    z.object({
        kind: z.literal('reading'),
        format: z.literal('markdown'),
        markdown: z.string(),
    }),
    // Quiz lesson content
    z.object({
        kind: z.literal('quiz'),
        passing_score_percent: z.number().int().min(0).max(100).optional(),
        allow_retry: z.boolean().optional().default(false),
        show_answers_after_submit: z.boolean().optional().default(false),
        questions: z.array(QuizQuestionSchema).min(1),
    }),
    // Assignment lesson content
    z.object({
        kind: z.literal('assignment'),
        instructions_markdown: z.string(),
        submission_type: z.enum(['none', 'text', 'file', 'link']),
        due_at: z.string().optional(), // ISO datetime
    }),
    // Interactive lesson content
    z.object({
        kind: z.literal('interactive'),
        provider: z.literal('embed'),
        embed_url: z.string().url(),
        height_px: z.number().int().min(1).optional(),
        allow_fullscreen: z.boolean().optional().default(true),
    }),
]);
/**
 * Lesson
 *
 * A single learning unit within a course section.
 * Uses discriminated union for type-specific content.
 */
export const LessonSchema = z.object({
    lesson_id: z.string(),
    course_id: z.string(), // Parent course
    section_id: z.string(), // Parent section
    title: z.string(),
    description: z.string().optional(),
    type: LessonTypeSchema,
    order: z.number().int().min(0), // Display order within section
    // Type-specific content (discriminated union)
    content: LessonContentSchema,
    // Resources (optional, shared across all types)
    resources: z.array(MediaRefSchema).optional(),
    // Metadata
    required: z.boolean().default(true), // Whether lesson is required for completion
    // Timestamps
    created_at: z.string(), // ISO datetime
    created_by: z.string(), // User ID
    updated_at: z.string(), // ISO datetime
    updated_by: z.string(), // User ID
});
//# sourceMappingURL=lesson.js.map