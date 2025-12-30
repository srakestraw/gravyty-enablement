/**
 * Progress Domain Types
 *
 * Defines Progress types for tracking learner progress through courses and paths.
 */
import { z } from 'zod';
/**
 * Enrollment Origin
 *
 * How the learner was enrolled in the course/path.
 */
export const EnrollmentOriginSchema = z.enum([
    'self_enrolled',
    'assigned',
    'required',
    'recommended',
]);
/**
 * Lesson Progress
 *
 * Progress for a single lesson within a course.
 */
export const LessonProgressSchema = z.object({
    lesson_id: z.string(),
    percent_complete: z.number().int().min(0).max(100).default(0),
    completed: z.boolean().default(false),
    completed_at: z.string().optional(), // ISO datetime
    started_at: z.string().optional(), // ISO datetime
    last_accessed_at: z.string().optional(), // ISO datetime
    // Resume pointers
    current_position_ms: z.number().int().min(0).optional(), // For video lessons
    current_lesson_id: z.string().optional(), // For multi-part lessons
});
/**
 * Course Progress
 *
 * Tracks learner progress through a course.
 */
export const CourseProgressSchema = z.object({
    user_id: z.string(), // PK
    course_id: z.string(), // SK
    // Enrollment
    enrollment_origin: EnrollmentOriginSchema,
    enrolled_at: z.string(), // ISO datetime
    // Overall progress
    percent_complete: z.number().int().min(0).max(100).default(0),
    completed: z.boolean().default(false),
    completed_at: z.string().optional(), // ISO datetime
    // Per-lesson progress
    lesson_progress: z.record(z.string(), LessonProgressSchema).default({}), // lesson_id -> LessonProgress
    // Resume pointers
    current_section_id: z.string().optional(),
    current_lesson_id: z.string().optional(),
    last_position_ms: z.number().int().min(0).optional(), // For video lessons
    // Timestamps
    started_at: z.string().optional(), // ISO datetime
    last_accessed_at: z.string(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Path Progress Status
 */
export const PathProgressStatusSchema = z.enum(['not_started', 'in_progress', 'completed']);
/**
 * Path Progress
 *
 * Tracks learner progress through a learning path with rollup from course completion.
 */
export const PathProgressSchema = z.object({
    user_id: z.string(), // PK
    path_id: z.string(), // SK
    // Enrollment
    enrollment_origin: EnrollmentOriginSchema,
    enrolled_at: z.string(), // ISO datetime
    // Rollup progress (computed from course completion)
    total_courses: z.number().int().min(0).default(0),
    completed_courses: z.number().int().min(0).default(0),
    percent_complete: z.number().int().min(0).max(100).default(0),
    status: PathProgressStatusSchema.default('not_started'),
    // Completion
    completed: z.boolean().default(false),
    completed_at: z.string().optional(), // ISO datetime
    // Resume pointers
    next_course_id: z.string().optional(), // First incomplete course in order
    // Timestamps
    started_at: z.string().optional(), // ISO datetime
    last_activity_at: z.string().optional(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Progress Invariants
 *
 * - percent_complete must be 0-100
 * - completion sets completed_at and percent=100
 * - resume pointers (current_lesson_id, last_position_ms) track where learner left off
 */
export function validateProgress(progress) {
    const errors = [];
    if (progress.percent_complete < 0 || progress.percent_complete > 100) {
        errors.push('percent_complete must be between 0 and 100');
    }
    if (progress.completed) {
        if (!progress.completed_at) {
            errors.push('Completed progress must have completed_at timestamp');
        }
        if (progress.percent_complete !== 100) {
            errors.push('Completed progress must have percent_complete = 100');
        }
    }
    if (progress.percent_complete === 100 && !progress.completed) {
        errors.push('Progress with 100% completion must be marked as completed');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=progress.js.map