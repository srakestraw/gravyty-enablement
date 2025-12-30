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
export const LearningPathStatusSchema = z.enum(['draft', 'published', 'archived']);
export type LearningPathStatus = z.infer<typeof LearningPathStatusSchema>;

/**
 * Learning Path Course Reference
 * 
 * References a course within a learning path with optional overrides.
 */
export const LearningPathCourseRefSchema = z.object({
  course_id: z.string(),
  order: z.number().int().min(0), // Display order within path
  required: z.boolean().default(true), // Whether course is required for completion
  title_override: z.string().optional(), // Optional custom title
});

export type LearningPathCourseRef = z.infer<typeof LearningPathCourseRefSchema>;

/**
 * Learning Path
 * 
 * A structured sequence of courses that guide learners through a learning journey.
 * Supports versioning: published paths create immutable snapshots.
 */
export const LearningPathSchema = z.object({
  path_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(), // For cards/lists
  
  // Categorization
  product_suite: z.string().optional(),
  product_concept: z.string().optional(),
  topic_tags: z.array(z.string()).default([]),
  badges: z.array(z.string()).default([]), // Badge IDs that can be earned
  
  // Structure
  courses: z.array(LearningPathCourseRefSchema).default([]), // Ordered list of courses
  
  // Versioning and publishing
  status: LearningPathStatusSchema,
  version: z.number().int().min(1).default(1), // Increments on publish
  published_version: z.number().int().min(1).optional(), // Latest published version
  published_at: z.string().optional(), // ISO datetime
  published_by: z.string().optional(), // User ID
  
  // Metadata
  estimated_duration_minutes: z.number().int().min(0).optional(),
  
  // Timestamps
  created_at: z.string(), // ISO datetime
  created_by: z.string(), // User ID
  updated_at: z.string(), // ISO datetime
  updated_by: z.string(), // User ID
});

export type LearningPath = z.infer<typeof LearningPathSchema>;

/**
 * Learning Path Publishing Invariants
 * 
 * - draft paths can be edited freely
 * - published paths create immutable snapshots (version increment)
 * - published snapshots cannot be modified (only archived)
 * - learners see published versions only
 */
export function validateLearningPathPublishing(path: LearningPath): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (path.status === 'published') {
    // Published paths must have all required fields
    if (!path.published_at) {
      errors.push('Published paths must have published_at timestamp');
    }
    if (!path.published_by) {
      errors.push('Published paths must have published_by user ID');
    }
    if (path.courses.length === 0) {
      errors.push('Published paths must have at least one course');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}


