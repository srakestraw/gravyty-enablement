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
export declare const EnrollmentOriginSchema: z.ZodEnum<["self_enrolled", "assigned", "required", "recommended"]>;
export type EnrollmentOrigin = z.infer<typeof EnrollmentOriginSchema>;
/**
 * Lesson Progress
 *
 * Progress for a single lesson within a course.
 */
export declare const LessonProgressSchema: z.ZodObject<{
    lesson_id: z.ZodString;
    percent_complete: z.ZodDefault<z.ZodNumber>;
    completed: z.ZodDefault<z.ZodBoolean>;
    completed_at: z.ZodOptional<z.ZodString>;
    started_at: z.ZodOptional<z.ZodString>;
    last_accessed_at: z.ZodOptional<z.ZodString>;
    current_position_ms: z.ZodOptional<z.ZodNumber>;
    current_lesson_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lesson_id: string;
    percent_complete: number;
    completed: boolean;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    last_accessed_at?: string | undefined;
    current_position_ms?: number | undefined;
    current_lesson_id?: string | undefined;
}, {
    lesson_id: string;
    percent_complete?: number | undefined;
    completed?: boolean | undefined;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    last_accessed_at?: string | undefined;
    current_position_ms?: number | undefined;
    current_lesson_id?: string | undefined;
}>;
export type LessonProgress = z.infer<typeof LessonProgressSchema>;
/**
 * Course Progress
 *
 * Tracks learner progress through a course.
 */
export declare const CourseProgressSchema: z.ZodObject<{
    user_id: z.ZodString;
    course_id: z.ZodString;
    enrollment_origin: z.ZodEnum<["self_enrolled", "assigned", "required", "recommended"]>;
    enrolled_at: z.ZodString;
    percent_complete: z.ZodDefault<z.ZodNumber>;
    completed: z.ZodDefault<z.ZodBoolean>;
    completed_at: z.ZodOptional<z.ZodString>;
    lesson_progress: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        lesson_id: z.ZodString;
        percent_complete: z.ZodDefault<z.ZodNumber>;
        completed: z.ZodDefault<z.ZodBoolean>;
        completed_at: z.ZodOptional<z.ZodString>;
        started_at: z.ZodOptional<z.ZodString>;
        last_accessed_at: z.ZodOptional<z.ZodString>;
        current_position_ms: z.ZodOptional<z.ZodNumber>;
        current_lesson_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lesson_id: string;
        percent_complete: number;
        completed: boolean;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        last_accessed_at?: string | undefined;
        current_position_ms?: number | undefined;
        current_lesson_id?: string | undefined;
    }, {
        lesson_id: string;
        percent_complete?: number | undefined;
        completed?: boolean | undefined;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        last_accessed_at?: string | undefined;
        current_position_ms?: number | undefined;
        current_lesson_id?: string | undefined;
    }>>>;
    current_section_id: z.ZodOptional<z.ZodString>;
    current_lesson_id: z.ZodOptional<z.ZodString>;
    last_position_ms: z.ZodOptional<z.ZodNumber>;
    started_at: z.ZodOptional<z.ZodString>;
    last_accessed_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    user_id: string;
    course_id: string;
    updated_at: string;
    percent_complete: number;
    completed: boolean;
    last_accessed_at: string;
    enrollment_origin: "required" | "self_enrolled" | "assigned" | "recommended";
    enrolled_at: string;
    lesson_progress: Record<string, {
        lesson_id: string;
        percent_complete: number;
        completed: boolean;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        last_accessed_at?: string | undefined;
        current_position_ms?: number | undefined;
        current_lesson_id?: string | undefined;
    }>;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    current_lesson_id?: string | undefined;
    current_section_id?: string | undefined;
    last_position_ms?: number | undefined;
}, {
    user_id: string;
    course_id: string;
    updated_at: string;
    last_accessed_at: string;
    enrollment_origin: "required" | "self_enrolled" | "assigned" | "recommended";
    enrolled_at: string;
    percent_complete?: number | undefined;
    completed?: boolean | undefined;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    current_lesson_id?: string | undefined;
    lesson_progress?: Record<string, {
        lesson_id: string;
        percent_complete?: number | undefined;
        completed?: boolean | undefined;
        completed_at?: string | undefined;
        started_at?: string | undefined;
        last_accessed_at?: string | undefined;
        current_position_ms?: number | undefined;
        current_lesson_id?: string | undefined;
    }> | undefined;
    current_section_id?: string | undefined;
    last_position_ms?: number | undefined;
}>;
export type CourseProgress = z.infer<typeof CourseProgressSchema>;
/**
 * Path Progress Status
 */
export declare const PathProgressStatusSchema: z.ZodEnum<["not_started", "in_progress", "completed"]>;
export type PathProgressStatus = z.infer<typeof PathProgressStatusSchema>;
/**
 * Path Progress
 *
 * Tracks learner progress through a learning path with rollup from course completion.
 */
export declare const PathProgressSchema: z.ZodObject<{
    user_id: z.ZodString;
    path_id: z.ZodString;
    enrollment_origin: z.ZodEnum<["self_enrolled", "assigned", "required", "recommended"]>;
    enrolled_at: z.ZodString;
    total_courses: z.ZodDefault<z.ZodNumber>;
    completed_courses: z.ZodDefault<z.ZodNumber>;
    percent_complete: z.ZodDefault<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["not_started", "in_progress", "completed"]>>;
    completed: z.ZodDefault<z.ZodBoolean>;
    completed_at: z.ZodOptional<z.ZodString>;
    next_course_id: z.ZodOptional<z.ZodString>;
    started_at: z.ZodOptional<z.ZodString>;
    last_activity_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "not_started" | "in_progress";
    user_id: string;
    updated_at: string;
    path_id: string;
    percent_complete: number;
    completed: boolean;
    enrollment_origin: "required" | "self_enrolled" | "assigned" | "recommended";
    enrolled_at: string;
    total_courses: number;
    completed_courses: number;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    next_course_id?: string | undefined;
    last_activity_at?: string | undefined;
}, {
    user_id: string;
    updated_at: string;
    path_id: string;
    enrollment_origin: "required" | "self_enrolled" | "assigned" | "recommended";
    enrolled_at: string;
    status?: "completed" | "not_started" | "in_progress" | undefined;
    percent_complete?: number | undefined;
    completed?: boolean | undefined;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    total_courses?: number | undefined;
    completed_courses?: number | undefined;
    next_course_id?: string | undefined;
    last_activity_at?: string | undefined;
}>;
export type PathProgress = z.infer<typeof PathProgressSchema>;
/**
 * Progress Invariants
 *
 * - percent_complete must be 0-100
 * - completion sets completed_at and percent=100
 * - resume pointers (current_lesson_id, last_position_ms) track where learner left off
 */
export declare function validateProgress(progress: CourseProgress | PathProgress): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=progress.d.ts.map