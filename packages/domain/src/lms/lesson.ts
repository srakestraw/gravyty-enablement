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

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

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

export type Transcript = z.infer<typeof TranscriptSchema>;

/**
 * Lesson Type
 */
export const LessonTypeSchema = z.enum(['video', 'reading', 'quiz', 'assignment', 'interactive']);
export type LessonType = z.infer<typeof LessonTypeSchema>;

/**
 * Lesson
 * 
 * A single learning unit within a course section.
 * Lessons can contain video content, transcripts, and resource references.
 */
export const LessonSchema = z.object({
  lesson_id: z.string(),
  course_id: z.string(), // Parent course
  section_id: z.string(), // Parent section
  
  title: z.string(),
  description: z.string().optional(),
  
  type: LessonTypeSchema,
  order: z.number().int().min(0), // Display order within section
  
  // Video content
  video_media: MediaRefSchema.optional(), // Video media reference
  
  // Transcript
  transcript_ref: z.string().optional(), // Reference to transcript_id
  transcript: TranscriptSchema.optional(), // Embedded transcript (for detail views)
  
  // Resources
  resource_refs: z.array(z.string()).default([]), // Array of media_id references
  
  // Metadata
  estimated_duration_minutes: z.number().int().min(0).optional(),
  required: z.boolean().default(true), // Whether lesson is required for completion
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string(), // User ID
});

export type Lesson = z.infer<typeof LessonSchema>;


