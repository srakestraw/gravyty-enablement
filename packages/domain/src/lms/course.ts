/**
 * Course Domain Types
 * 
 * Defines Course, CourseSection, CourseBadge, and CourseStatus types.
 */

import { z } from 'zod';
import { MediaRefSchema } from './media.js';

/**
 * Course Badge
 * 
 * Badges that can be earned by completing a course.
 */
export const CourseBadgeSchema = z.object({
  badge_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon_url: z.string().url().optional(),
});

export type CourseBadge = z.infer<typeof CourseBadgeSchema>;

/**
 * Course Status
 * 
 * Publishing state machine: draft -> published (immutable snapshots)
 */
export const CourseStatusSchema = z.enum(['draft', 'published', 'archived']);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

/**
 * Course Section
 * 
 * A section within a course containing lessons.
 */
export const CourseSectionSchema = z.object({
  section_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number().int().min(0), // Display order within course
  lesson_ids: z.array(z.string()), // Ordered list of lesson IDs
});

export type CourseSection = z.infer<typeof CourseSectionSchema>;

/**
 * Course
 * 
 * A structured learning experience with sections and lessons.
 * Supports versioning: published courses create immutable snapshots.
 */
export const CourseSchema = z.object({
  course_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(), // For cards/lists
  
  // Categorization
  // New field names (preferred)
  product: z.string().optional(), // Was "product_suite" (legacy, use product_ids)
  product_suite: z.string().optional(), // Was "product_concept" (legacy, use product_suite_ids)
  topic_tags: z.array(z.string()).default([]),
  product_id: z.string().optional(), // Legacy single value (use product_ids)
  product_ids: z.array(z.string()).default([]), // Multi-select product IDs
  product_suite_id: z.string().optional(), // Legacy single value (use product_suite_ids)
  product_suite_ids: z.array(z.string()).default([]), // Multi-select product suite IDs
  topic_tag_ids: z.array(z.string()).default([]),
  // Legacy fields (for backward compatibility - will be normalized on read)
  // These are kept in schema but should not be written going forward
  legacy_product_suite: z.string().optional(), // Old product_suite -> maps to product
  legacy_product_concept: z.string().optional(), // Old product_concept -> maps to product_suite
  legacy_product_suite_id: z.string().optional(), // Old product_suite_id -> maps to product_id
  legacy_product_concept_id: z.string().optional(), // Old product_concept_id -> maps to product_suite_id
  related_course_ids: z.array(z.string()).default([]), // Manual related courses
  
  // Media
  cover_image: MediaRefSchema.optional(),
  
  // Badges
  badges: z.array(CourseBadgeSchema).default([]), // Legacy badges (kept for backward compatibility)
  badge_ids: z.array(z.string()).default([]), // New taxonomy-based badge IDs
  
  // Structure
  sections: z.array(CourseSectionSchema).default([]),
  
  // Versioning and publishing
  status: CourseStatusSchema,
  version: z.number().int().min(1).default(1), // Increments on publish
  published_version: z.number().int().min(1).optional(), // Latest published version
  published_at: z.string().optional(), // ISO datetime
  published_by: z.string().optional(), // User ID
  
  // Metadata
  estimated_duration_minutes: z.number().int().min(0).optional(),
  estimated_minutes: z.number().int().min(1).max(600).optional(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string(), // User ID
});

export type Course = z.infer<typeof CourseSchema>;

/**
 * Course Publishing Invariants
 * 
 * - draft courses can be edited freely
 * - published courses create immutable snapshots (version increment)
 * - published snapshots cannot be modified (only archived)
 * - learners see published versions only
 */
export function validateCoursePublishing(course: Course): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (course.status === 'published') {
    // Published courses must have all required fields
    if (!course.published_at) {
      errors.push('Published courses must have published_at timestamp');
    }
    if (!course.published_by) {
      errors.push('Published courses must have published_by user ID');
    }
    if (course.sections.length === 0) {
      errors.push('Published courses must have at least one section');
    }
    // Validate all sections have lessons
    for (const section of course.sections) {
      if (section.lesson_ids.length === 0) {
        errors.push(`Section ${section.section_id} must have at least one lesson`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}



