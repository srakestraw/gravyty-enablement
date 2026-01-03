/**
 * Assessment Domain Types
 *
 * Defines Assessment types for course assessments, questions, options, attempts, and answers.
 */
import { z } from 'zod';
/**
 * Assessment Question Type
 */
export const AssessmentQuestionTypeSchema = z.enum(['multiple_choice', 'true_false']);
/**
 * Assessment Score Mode
 */
export const AssessmentScoreModeSchema = z.enum(['best', 'latest']);
/**
 * Assessment Attempt Status
 */
export const AssessmentAttemptStatusSchema = z.enum(['in_progress', 'submitted', 'graded']);
/**
 * Assessment Config
 *
 * Configuration for a course assessment (1 per course).
 */
export const AssessmentConfigSchema = z.object({
    assessment_config_id: z.string(),
    course_id: z.string(), // Unique per course
    // Basic settings
    is_enabled: z.boolean().default(false),
    title: z.string().default('Assessment'),
    description: z.string().optional(), // Rich text
    // Scoring
    passing_score: z.number().int().min(0).max(100).default(80),
    score_mode: AssessmentScoreModeSchema.default('best'),
    // Attempts
    max_attempts: z.number().int().min(1).nullable().optional(),
    // Completion gating
    required_for_completion: z.boolean().default(false),
    is_certification: z.boolean().default(false),
    // Timestamps
    created_at: z.string(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Assessment Question
 *
 * A question within an assessment.
 */
export const AssessmentQuestionSchema = z.object({
    question_id: z.string(),
    assessment_config_id: z.string(),
    type: AssessmentQuestionTypeSchema,
    prompt: z.string(), // Rich text
    points: z.number().int().min(1).default(1),
    order_index: z.number().int().min(0),
    is_required: z.boolean().default(true),
    // For True/False questions, store the correct answer directly
    correct_boolean_answer: z.boolean().optional(), // Only for T/F questions
    // Timestamps
    created_at: z.string(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Assessment Option
 *
 * An option for a multiple choice question.
 */
export const AssessmentOptionSchema = z.object({
    option_id: z.string(),
    question_id: z.string(),
    label: z.string(), // Rich text or plain string
    order_index: z.number().int().min(0),
    is_correct: z.boolean(), // Only one true per question in Phase 1
    // Timestamps
    created_at: z.string(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Assessment Attempt
 *
 * A learner's attempt at an assessment.
 */
export const AssessmentAttemptSchema = z.object({
    attempt_id: z.string(),
    course_id: z.string(),
    assessment_config_id: z.string(),
    learner_id: z.string(),
    attempt_number: z.number().int().min(1),
    status: AssessmentAttemptStatusSchema,
    // Timestamps
    started_at: z.string(), // ISO datetime
    submitted_at: z.string().nullable().optional(),
    graded_at: z.string().nullable().optional(),
    // Scoring (snapshot at time of attempt)
    raw_score: z.number().int().min(0), // Total points earned
    max_score: z.number().int().min(1), // Total available points at time of attempt
    percent_score: z.number().int().min(0).max(100), // 0-100
    passed: z.boolean(),
    // Evidence snapshot (store config at time of attempt)
    evidence: z.record(z.unknown()).optional(), // JSON snapshot of passingScore, scoreMode, questionCount, etc.
    // Timestamps
    created_at: z.string(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Assessment Answer
 *
 * A learner's answer to a question within an attempt.
 */
export const AssessmentAnswerSchema = z.object({
    answer_id: z.string(),
    attempt_id: z.string(),
    question_id: z.string(),
    // Answer data (one of these will be set based on question type)
    selected_option_id: z.string().nullable().optional(), // For MCQ
    boolean_answer: z.boolean().nullable().optional(), // For T/F
    // Grading results
    is_correct: z.boolean(),
    points_earned: z.number().int().min(0),
    // Timestamps
    created_at: z.string(), // ISO datetime
    updated_at: z.string(), // ISO datetime
});
/**
 * Assessment Summary (for learner view)
 *
 * Summary of assessment status and attempts for a learner.
 */
export const AssessmentSummarySchema = z.object({
    assessment_config: AssessmentConfigSchema,
    question_count: z.number().int().min(0),
    attempts: z.array(AssessmentAttemptSchema).default([]),
    best_score: z.number().int().min(0).max(100).nullable().optional(),
    latest_score: z.number().int().min(0).max(100).nullable().optional(),
    can_start_attempt: z.boolean(),
    attempts_remaining: z.number().int().nullable().optional(), // null if unlimited
});
/**
 * Assessment Validation
 */
export function validateAssessmentConfig(config) {
    const errors = [];
    if (config.passing_score < 0 || config.passing_score > 100) {
        errors.push('passing_score must be between 0 and 100');
    }
    if (config.max_attempts !== null && config.max_attempts !== undefined && config.max_attempts < 1) {
        errors.push('max_attempts must be at least 1 if specified');
    }
    if (config.required_for_completion && !config.is_enabled) {
        errors.push('Assessment must be enabled if required for completion');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=assessment.js.map