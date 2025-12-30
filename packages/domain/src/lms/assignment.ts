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
export const AssignmentStatusSchema = z.enum([
  'assigned',   // Assigned but not started
  'started',    // Learner has started
  'completed',  // Terminal: completed
  'waived',     // Terminal: waived (admin action)
]);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

/**
 * Assignment Type
 */
export const AssignmentTypeSchema = z.enum(['course', 'path']);
export type AssignmentType = z.infer<typeof AssignmentTypeSchema>;

/**
 * Assignment
 * 
 * Assigns a course or learning path to a learner with a due date.
 */
export const AssignmentSchema = z.object({
  assignment_id: z.string(),
  user_id: z.string(), // PK
  
  // Assignment target
  assignment_type: AssignmentTypeSchema,
  course_id: z.string().optional(), // If assignment_type is 'course'
  path_id: z.string().optional(), // If assignment_type is 'path'
  
  // Status
  status: AssignmentStatusSchema,
  
  // Due date
  due_at: z.string().optional(), // ISO datetime
  
  // Metadata
  assigned_by: z.string(), // User ID who created assignment
  assigned_at: z.string(), // ISO datetime
  waived_by: z.string().optional(), // User ID who waived (if waived)
  waived_at: z.string().optional(), // ISO datetime
  
  // Timestamps
  started_at: z.string().optional(), // ISO datetime
  completed_at: z.string().optional(), // ISO datetime
  updated_at: z.string(), // ISO datetime
});

export type Assignment = z.infer<typeof AssignmentSchema>;

/**
 * Assignment Validation
 * 
 * - Must have either course_id or path_id (not both)
 * - Terminal states (completed, waived) cannot transition back
 * - Overdue is computed: due_at < now && status not in [completed, waived]
 */
export function validateAssignment(assignment: Assignment): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (assignment.assignment_type === 'course' && !assignment.course_id) {
    errors.push('Course assignments must have course_id');
  }
  if (assignment.assignment_type === 'path' && !assignment.path_id) {
    errors.push('Path assignments must have path_id');
  }
  if (assignment.course_id && assignment.path_id) {
    errors.push('Assignment cannot have both course_id and path_id');
  }
  
  if (assignment.status === 'waived' && !assignment.waived_at) {
    errors.push('Waived assignments must have waived_at timestamp');
  }
  if (assignment.status === 'waived' && !assignment.waived_by) {
    errors.push('Waived assignments must have waived_by user ID');
  }
  
  if (assignment.status === 'completed' && !assignment.completed_at) {
    errors.push('Completed assignments must have completed_at timestamp');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if assignment is overdue
 */
export function isAssignmentOverdue(assignment: Assignment): boolean {
  if (!assignment.due_at) {
    return false;
  }
  
  const terminalStates: AssignmentStatus[] = ['completed', 'waived'];
  if (terminalStates.includes(assignment.status)) {
    return false;
  }
  
  const dueDate = new Date(assignment.due_at);
  const now = new Date();
  
  return dueDate < now;
}

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
export function canTransitionAssignmentStatus(
  currentStatus: AssignmentStatus,
  newStatus: AssignmentStatus
): boolean {
  const transitions: Record<AssignmentStatus, AssignmentStatus[]> = {
    assigned: ['started', 'waived'],
    started: ['completed', 'waived'],
    completed: [], // Terminal
    waived: [], // Terminal
  };
  
  return transitions[currentStatus]?.includes(newStatus) ?? false;
}


