/**
 * Assignment Domain Types
 *
 * Defines Assignment types for assigning courses and paths to learners.
 */
import { z } from 'zod';
/**
 * Assignment Status
 *
 * State machine: assigned -> started -> completed
 * Terminal states: completed, waived
 * Overdue is computed if due_at < now and status is not completed/waived
 */
export declare const AssignmentStatusSchema: z.ZodEnum<["assigned", "started", "completed", "waived"]>;
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;
/**
 * Assignment Type
 */
export declare const AssignmentTypeSchema: z.ZodEnum<["course", "path"]>;
export type AssignmentType = z.infer<typeof AssignmentTypeSchema>;
/**
 * Assignment
 *
 * Assigns a course or learning path to a learner with a due date.
 */
export declare const AssignmentSchema: z.ZodObject<{
    assignment_id: z.ZodString;
    user_id: z.ZodString;
    assignment_type: z.ZodEnum<["course", "path"]>;
    course_id: z.ZodOptional<z.ZodString>;
    path_id: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["assigned", "started", "completed", "waived"]>;
    due_at: z.ZodOptional<z.ZodString>;
    assigned_by: z.ZodString;
    assigned_at: z.ZodString;
    waived_by: z.ZodOptional<z.ZodString>;
    waived_at: z.ZodOptional<z.ZodString>;
    started_at: z.ZodOptional<z.ZodString>;
    completed_at: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "assigned" | "completed" | "started" | "waived";
    user_id: string;
    updated_at: string;
    assignment_id: string;
    assignment_type: "path" | "course";
    assigned_by: string;
    assigned_at: string;
    course_id?: string | undefined;
    due_at?: string | undefined;
    path_id?: string | undefined;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    waived_by?: string | undefined;
    waived_at?: string | undefined;
}, {
    status: "assigned" | "completed" | "started" | "waived";
    user_id: string;
    updated_at: string;
    assignment_id: string;
    assignment_type: "path" | "course";
    assigned_by: string;
    assigned_at: string;
    course_id?: string | undefined;
    due_at?: string | undefined;
    path_id?: string | undefined;
    completed_at?: string | undefined;
    started_at?: string | undefined;
    waived_by?: string | undefined;
    waived_at?: string | undefined;
}>;
export type Assignment = z.infer<typeof AssignmentSchema>;
/**
 * Assignment Validation
 *
 * - Must have either course_id or path_id (not both)
 * - Terminal states (completed, waived) cannot transition back
 * - Overdue is computed: due_at < now && status not in [completed, waived]
 */
export declare function validateAssignment(assignment: Assignment): {
    valid: boolean;
    errors: string[];
};
/**
 * Check if assignment is overdue
 */
export declare function isAssignmentOverdue(assignment: Assignment): boolean;
/**
 * Assignment Status Transitions
 *
 * Valid transitions:
 * - assigned -> started (learner starts)
 * - started -> completed (learner completes)
 * - assigned -> waived (admin action)
 * - started -> waived (admin action)
 * - completed and waived are terminal states
 */
export declare function canTransitionAssignmentStatus(currentStatus: AssignmentStatus, newStatus: AssignmentStatus): boolean;
//# sourceMappingURL=assignment.d.ts.map