/**
 * Learning Path Domain Types
 *
 * Defines LearningPath and related types.
 */
import { z } from 'zod';
import { MediaRefSchema } from './media.js';
/**
 * Learning Path Status
 *
 * Publishing state machine: draft -> published (immutable snapshots)
 */
export const LearningPathStatusSchema = z.enum(['draft', 'published', 'archived']);
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
    // New field names (preferred)
    product: z.string().optional(), // Was "product_suite"
    product_suite: z.string().optional(), // Was "product_concept"
    topic_tags: z.array(z.string()).default([]),
    product_id: z.string().optional(), // Was "product_suite_id"
    product_suite_id: z.string().optional(), // Was "product_concept_id"
    topic_tag_ids: z.array(z.string()).default([]),
    audience_ids: z.array(z.string()).default([]), // Multi-select audience IDs
    // Legacy fields (for backward compatibility - will be normalized on read)
    legacy_product_suite: z.string().optional(), // Old product_suite -> maps to product
    legacy_product_concept: z.string().optional(), // Old product_concept -> maps to product_suite
    legacy_product_suite_id: z.string().optional(), // Old product_suite_id -> maps to product_id
    legacy_product_concept_id: z.string().optional(), // Old product_concept_id -> maps to product_suite_id
    // Media
    cover_image: MediaRefSchema.optional(),
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
/**
 * Learning Path Publishing Invariants
 *
 * - draft paths can be edited freely
 * - published paths create immutable snapshots (version increment)
 * - published snapshots cannot be modified (only archived)
 * - learners see published versions only
 */
export function validateLearningPathPublishing(path) {
    const errors = [];
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
//# sourceMappingURL=path.js.map