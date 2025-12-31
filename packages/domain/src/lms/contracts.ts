/**
 * LMS API Contracts
 * 
 * Canonical request/response shapes for LMS API endpoints.
 * These types are used by both API and web UI for type safety.
 */

import { z } from 'zod';
import {
  CourseSchema,
  CourseSectionSchema,
  CourseBadgeSchema,
} from './course.js';
import {
  LessonSchema,
  TranscriptSchema,
  TranscriptSegmentSchema,
} from './lesson.js';
import {
  LearningPathSchema,
  LearningPathCourseRefSchema,
} from './path.js';
import {
  CourseProgressSchema,
  PathProgressSchema,
  LessonProgressSchema,
} from './progress.js';
import {
  AssignmentSchema,
  AssignmentStatusSchema,
} from './assignment.js';
import {
  CertificateTemplateSchema,
  IssuedCertificateSchema,
} from './certificates.js';
import { MediaRefSchema } from './media.js';

/**
 * Course Summary
 * 
 * Lightweight course representation for catalog and related courses.
 */
export const CourseSummarySchema = z.object({
  course_id: z.string(),
  title: z.string(),
  short_description: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  product: z.string().optional(), // Was "product_suite"
  product_suite: z.string().optional(), // Was "product_concept"
  topic_tags: z.array(z.string()).default([]),
  estimated_duration_minutes: z.number().int().min(0).optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  status: z.enum(['draft', 'published', 'archived']),
  published_at: z.string().optional(),
});

export type CourseSummary = z.infer<typeof CourseSummarySchema>;

/**
 * Course Detail
 * 
 * Full course metadata with outline (sections and lessons).
 */
export const CourseDetailSchema = CourseSchema.extend({
  // Sections with hydrated lesson summaries
  sections: z.array(
    CourseSectionSchema.extend({
      lessons: z.array(
        z.object({
          lesson_id: z.string(),
          title: z.string(),
          type: z.enum(['video', 'reading', 'quiz', 'assignment', 'interactive']),
          order: z.number().int().min(0),
          estimated_duration_minutes: z.number().int().min(0).optional(),
          required: z.boolean().default(true),
        })
      ),
    })
  ),
});

export type CourseDetail = z.infer<typeof CourseDetailSchema>;

/**
 * Lesson Detail
 * 
 * Full lesson content including resources.
 * Note: content is already part of LessonSchema, resources are hydrated MediaRefs.
 */
export const LessonDetailSchema = LessonSchema.extend({
  // Hydrated resources (MediaRef objects instead of just IDs)
  resources: z.array(MediaRefSchema).default([]),
});

export type LessonDetail = z.infer<typeof LessonDetailSchema>;

/**
 * Learning Path Summary
 * 
 * Lightweight path representation for catalog.
 */
export const LearningPathSummarySchema = z.object({
  path_id: z.string(),
  title: z.string(),
  short_description: z.string().optional(),
  product: z.string().optional(), // Was "product_suite"
  product_suite: z.string().optional(), // Was "product_concept"
  topic_tags: z.array(z.string()).default([]),
  estimated_duration_minutes: z.number().int().min(0).optional(),
  course_count: z.number().int().min(0).default(0),
  status: z.enum(['draft', 'published', 'archived']),
  published_at: z.string().optional(),
});

export type LearningPathSummary = z.infer<typeof LearningPathSummarySchema>;

/**
 * Path Summary with Rollup Progress (Learner View)
 * 
 * Path summary enriched with user's progress rollup.
 */
export const PathSummarySchema = LearningPathSummarySchema.extend({
  // Rollup progress (only present for learner views)
  progress: z.object({
    total_courses: z.number().int().min(0),
    completed_courses: z.number().int().min(0),
    percent_complete: z.number().int().min(0).max(100),
    status: z.enum(['not_started', 'in_progress', 'completed']),
    next_course_id: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    last_activity_at: z.string().optional(),
  }).optional(),
});

export type PathSummary = z.infer<typeof PathSummarySchema>;

/**
 * Learning Path Detail
 * 
 * Full path metadata with hydrated course summaries.
 */
export const LearningPathDetailSchema = LearningPathSchema.extend({
  // Hydrated course summaries
  courses: z.array(
    LearningPathCourseRefSchema.extend({
      course: CourseSummarySchema.optional(), // Hydrated course summary
    })
  ),
});

export type LearningPathDetail = z.infer<typeof LearningPathDetailSchema>;

/**
 * Path Detail with Rollup Progress (Learner View)
 * 
 * Path detail enriched with user's progress rollup and course completion states.
 */
export const PathDetailSchema = LearningPathDetailSchema.extend({
  // Rollup progress
  progress: z.object({
    total_courses: z.number().int().min(0),
    completed_courses: z.number().int().min(0),
    percent_complete: z.number().int().min(0).max(100),
    status: z.enum(['not_started', 'in_progress', 'completed']),
    next_course_id: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    last_activity_at: z.string().optional(),
  }).optional(),
  // Course completion states (for each course in path)
  course_completion: z.record(z.string(), z.boolean()).default({}), // course_id -> completed
});

export type PathDetail = z.infer<typeof PathDetailSchema>;

/**
 * My Learning Response
 * 
 * Learner's personalized learning dashboard.
 */
export const MyLearningSchema = z.object({
  // Required/assigned items
  required: z.array(
    z.object({
      type: z.enum(['course', 'path']),
      course_id: z.string().optional(),
      path_id: z.string().optional(),
      title: z.string(),
      due_at: z.string().optional(), // ISO datetime
      assignment_id: z.string().optional(),
      progress_percent: z.number().int().min(0).max(100).default(0),
    })
  ).default([]),
  
  // In-progress items
  in_progress: z.array(
    z.object({
      type: z.enum(['course', 'path']),
      course_id: z.string().optional(),
      path_id: z.string().optional(),
      title: z.string(),
      progress_percent: z.number().int().min(0).max(100).default(0),
      last_accessed_at: z.string(), // ISO datetime
      current_lesson_id: z.string().optional(),
    })
  ).default([]),
  
  // Completed items
  completed: z.array(
    z.object({
      type: z.enum(['course', 'path']),
      course_id: z.string().optional(),
      path_id: z.string().optional(),
      title: z.string(),
      completed_at: z.string(), // ISO datetime
    })
  ).default([]),
});

export type MyLearning = z.infer<typeof MyLearningSchema>;

/**
 * Assignment Summary
 * 
 * Assignment representation for lists and detail views.
 */
export const AssignmentSummarySchema = z.object({
  assignment_id: z.string(),
  assignment_type: z.enum(['course', 'path']),
  course_id: z.string().optional(),
  path_id: z.string().optional(),
  title: z.string(), // Course or path title
  status: AssignmentStatusSchema,
  due_at: z.string().optional(), // ISO datetime
  assigned_at: z.string(), // ISO datetime
  progress_percent: z.number().int().min(0).max(100).default(0),
  is_overdue: z.boolean().default(false),
});

export type AssignmentSummary = z.infer<typeof AssignmentSummarySchema>;

/**
 * Certificate Summary (Issued)
 * 
 * Learner-facing certificate representation for "My Certificates".
 */
export const CertificateSummarySchema = z.object({
  certificate_id: z.string(),
  template_id: z.string(),
  template_name: z.string(),
  recipient_name: z.string(),
  course_title: z.string().optional(),
  path_title: z.string().optional(),
  completion_date: z.string(), // ISO datetime
  issued_at: z.string(), // ISO datetime
  badge_text: z.string(), // Badge text from certificate
});

export type CertificateSummary = z.infer<typeof CertificateSummarySchema>;

/**
 * Certificate Template Summary
 * 
 * Admin-facing certificate template representation.
 */
export const CertificateTemplateSummarySchema = z.object({
  template_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  applies_to: z.enum(['course', 'path']),
  applies_to_id: z.string(),
  created_at: z.string(), // ISO datetime
  updated_at: z.string(), // ISO datetime
  published_at: z.string().optional(), // ISO datetime
});

export type CertificateTemplateSummary = z.infer<typeof CertificateTemplateSummarySchema>;

