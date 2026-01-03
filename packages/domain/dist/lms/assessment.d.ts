/**
 * Assessment Domain Types
 *
 * Defines Assessment types for course assessments, questions, options, attempts, and answers.
 */
import { z } from 'zod';
/**
 * Assessment Question Type
 */
export declare const AssessmentQuestionTypeSchema: z.ZodEnum<["multiple_choice", "true_false"]>;
export type AssessmentQuestionType = z.infer<typeof AssessmentQuestionTypeSchema>;
/**
 * Assessment Score Mode
 */
export declare const AssessmentScoreModeSchema: z.ZodEnum<["best", "latest"]>;
export type AssessmentScoreMode = z.infer<typeof AssessmentScoreModeSchema>;
/**
 * Assessment Attempt Status
 */
export declare const AssessmentAttemptStatusSchema: z.ZodEnum<["in_progress", "submitted", "graded"]>;
export type AssessmentAttemptStatus = z.infer<typeof AssessmentAttemptStatusSchema>;
/**
 * Assessment Config
 *
 * Configuration for a course assessment (1 per course).
 */
export declare const AssessmentConfigSchema: z.ZodObject<{
    assessment_config_id: z.ZodString;
    course_id: z.ZodString;
    is_enabled: z.ZodDefault<z.ZodBoolean>;
    title: z.ZodDefault<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    passing_score: z.ZodDefault<z.ZodNumber>;
    score_mode: z.ZodDefault<z.ZodEnum<["best", "latest"]>>;
    max_attempts: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    required_for_completion: z.ZodDefault<z.ZodBoolean>;
    is_certification: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    title: string;
    course_id: string;
    updated_at: string;
    assessment_config_id: string;
    is_enabled: boolean;
    passing_score: number;
    score_mode: "best" | "latest";
    required_for_completion: boolean;
    is_certification: boolean;
    description?: string | undefined;
    max_attempts?: number | null | undefined;
}, {
    created_at: string;
    course_id: string;
    updated_at: string;
    assessment_config_id: string;
    title?: string | undefined;
    description?: string | undefined;
    is_enabled?: boolean | undefined;
    passing_score?: number | undefined;
    score_mode?: "best" | "latest" | undefined;
    max_attempts?: number | null | undefined;
    required_for_completion?: boolean | undefined;
    is_certification?: boolean | undefined;
}>;
export type AssessmentConfig = z.infer<typeof AssessmentConfigSchema>;
/**
 * Assessment Question
 *
 * A question within an assessment.
 */
export declare const AssessmentQuestionSchema: z.ZodObject<{
    question_id: z.ZodString;
    assessment_config_id: z.ZodString;
    type: z.ZodEnum<["multiple_choice", "true_false"]>;
    prompt: z.ZodString;
    points: z.ZodDefault<z.ZodNumber>;
    order_index: z.ZodNumber;
    is_required: z.ZodDefault<z.ZodBoolean>;
    correct_boolean_answer: z.ZodOptional<z.ZodBoolean>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "multiple_choice" | "true_false";
    created_at: string;
    updated_at: string;
    question_id: string;
    prompt: string;
    assessment_config_id: string;
    points: number;
    order_index: number;
    is_required: boolean;
    correct_boolean_answer?: boolean | undefined;
}, {
    type: "multiple_choice" | "true_false";
    created_at: string;
    updated_at: string;
    question_id: string;
    prompt: string;
    assessment_config_id: string;
    order_index: number;
    points?: number | undefined;
    is_required?: boolean | undefined;
    correct_boolean_answer?: boolean | undefined;
}>;
export type AssessmentQuestion = z.infer<typeof AssessmentQuestionSchema>;
/**
 * Assessment Option
 *
 * An option for a multiple choice question.
 */
export declare const AssessmentOptionSchema: z.ZodObject<{
    option_id: z.ZodString;
    question_id: z.ZodString;
    label: z.ZodString;
    order_index: z.ZodNumber;
    is_correct: z.ZodBoolean;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    updated_at: string;
    option_id: string;
    question_id: string;
    order_index: number;
    label: string;
    is_correct: boolean;
}, {
    created_at: string;
    updated_at: string;
    option_id: string;
    question_id: string;
    order_index: number;
    label: string;
    is_correct: boolean;
}>;
export type AssessmentOption = z.infer<typeof AssessmentOptionSchema>;
/**
 * Assessment Attempt
 *
 * A learner's attempt at an assessment.
 */
export declare const AssessmentAttemptSchema: z.ZodObject<{
    attempt_id: z.ZodString;
    course_id: z.ZodString;
    assessment_config_id: z.ZodString;
    learner_id: z.ZodString;
    attempt_number: z.ZodNumber;
    status: z.ZodEnum<["in_progress", "submitted", "graded"]>;
    started_at: z.ZodString;
    submitted_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    graded_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    raw_score: z.ZodNumber;
    max_score: z.ZodNumber;
    percent_score: z.ZodNumber;
    passed: z.ZodBoolean;
    evidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "in_progress" | "submitted" | "graded";
    created_at: string;
    course_id: string;
    updated_at: string;
    started_at: string;
    assessment_config_id: string;
    attempt_id: string;
    learner_id: string;
    attempt_number: number;
    raw_score: number;
    max_score: number;
    percent_score: number;
    passed: boolean;
    submitted_at?: string | null | undefined;
    graded_at?: string | null | undefined;
    evidence?: Record<string, unknown> | undefined;
}, {
    status: "in_progress" | "submitted" | "graded";
    created_at: string;
    course_id: string;
    updated_at: string;
    started_at: string;
    assessment_config_id: string;
    attempt_id: string;
    learner_id: string;
    attempt_number: number;
    raw_score: number;
    max_score: number;
    percent_score: number;
    passed: boolean;
    submitted_at?: string | null | undefined;
    graded_at?: string | null | undefined;
    evidence?: Record<string, unknown> | undefined;
}>;
export type AssessmentAttempt = z.infer<typeof AssessmentAttemptSchema>;
/**
 * Assessment Answer
 *
 * A learner's answer to a question within an attempt.
 */
export declare const AssessmentAnswerSchema: z.ZodObject<{
    answer_id: z.ZodString;
    attempt_id: z.ZodString;
    question_id: z.ZodString;
    selected_option_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    boolean_answer: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    is_correct: z.ZodBoolean;
    points_earned: z.ZodNumber;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    updated_at: string;
    question_id: string;
    is_correct: boolean;
    attempt_id: string;
    answer_id: string;
    points_earned: number;
    selected_option_id?: string | null | undefined;
    boolean_answer?: boolean | null | undefined;
}, {
    created_at: string;
    updated_at: string;
    question_id: string;
    is_correct: boolean;
    attempt_id: string;
    answer_id: string;
    points_earned: number;
    selected_option_id?: string | null | undefined;
    boolean_answer?: boolean | null | undefined;
}>;
export type AssessmentAnswer = z.infer<typeof AssessmentAnswerSchema>;
/**
 * Assessment Summary (for learner view)
 *
 * Summary of assessment status and attempts for a learner.
 */
export declare const AssessmentSummarySchema: z.ZodObject<{
    assessment_config: z.ZodObject<{
        assessment_config_id: z.ZodString;
        course_id: z.ZodString;
        is_enabled: z.ZodDefault<z.ZodBoolean>;
        title: z.ZodDefault<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        passing_score: z.ZodDefault<z.ZodNumber>;
        score_mode: z.ZodDefault<z.ZodEnum<["best", "latest"]>>;
        max_attempts: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        required_for_completion: z.ZodDefault<z.ZodBoolean>;
        is_certification: z.ZodDefault<z.ZodBoolean>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        created_at: string;
        title: string;
        course_id: string;
        updated_at: string;
        assessment_config_id: string;
        is_enabled: boolean;
        passing_score: number;
        score_mode: "best" | "latest";
        required_for_completion: boolean;
        is_certification: boolean;
        description?: string | undefined;
        max_attempts?: number | null | undefined;
    }, {
        created_at: string;
        course_id: string;
        updated_at: string;
        assessment_config_id: string;
        title?: string | undefined;
        description?: string | undefined;
        is_enabled?: boolean | undefined;
        passing_score?: number | undefined;
        score_mode?: "best" | "latest" | undefined;
        max_attempts?: number | null | undefined;
        required_for_completion?: boolean | undefined;
        is_certification?: boolean | undefined;
    }>;
    question_count: z.ZodNumber;
    attempts: z.ZodDefault<z.ZodArray<z.ZodObject<{
        attempt_id: z.ZodString;
        course_id: z.ZodString;
        assessment_config_id: z.ZodString;
        learner_id: z.ZodString;
        attempt_number: z.ZodNumber;
        status: z.ZodEnum<["in_progress", "submitted", "graded"]>;
        started_at: z.ZodString;
        submitted_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        graded_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        raw_score: z.ZodNumber;
        max_score: z.ZodNumber;
        percent_score: z.ZodNumber;
        passed: z.ZodBoolean;
        evidence: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "in_progress" | "submitted" | "graded";
        created_at: string;
        course_id: string;
        updated_at: string;
        started_at: string;
        assessment_config_id: string;
        attempt_id: string;
        learner_id: string;
        attempt_number: number;
        raw_score: number;
        max_score: number;
        percent_score: number;
        passed: boolean;
        submitted_at?: string | null | undefined;
        graded_at?: string | null | undefined;
        evidence?: Record<string, unknown> | undefined;
    }, {
        status: "in_progress" | "submitted" | "graded";
        created_at: string;
        course_id: string;
        updated_at: string;
        started_at: string;
        assessment_config_id: string;
        attempt_id: string;
        learner_id: string;
        attempt_number: number;
        raw_score: number;
        max_score: number;
        percent_score: number;
        passed: boolean;
        submitted_at?: string | null | undefined;
        graded_at?: string | null | undefined;
        evidence?: Record<string, unknown> | undefined;
    }>, "many">>;
    best_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    latest_score: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    can_start_attempt: z.ZodBoolean;
    attempts_remaining: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    assessment_config: {
        created_at: string;
        title: string;
        course_id: string;
        updated_at: string;
        assessment_config_id: string;
        is_enabled: boolean;
        passing_score: number;
        score_mode: "best" | "latest";
        required_for_completion: boolean;
        is_certification: boolean;
        description?: string | undefined;
        max_attempts?: number | null | undefined;
    };
    question_count: number;
    attempts: {
        status: "in_progress" | "submitted" | "graded";
        created_at: string;
        course_id: string;
        updated_at: string;
        started_at: string;
        assessment_config_id: string;
        attempt_id: string;
        learner_id: string;
        attempt_number: number;
        raw_score: number;
        max_score: number;
        percent_score: number;
        passed: boolean;
        submitted_at?: string | null | undefined;
        graded_at?: string | null | undefined;
        evidence?: Record<string, unknown> | undefined;
    }[];
    can_start_attempt: boolean;
    best_score?: number | null | undefined;
    latest_score?: number | null | undefined;
    attempts_remaining?: number | null | undefined;
}, {
    assessment_config: {
        created_at: string;
        course_id: string;
        updated_at: string;
        assessment_config_id: string;
        title?: string | undefined;
        description?: string | undefined;
        is_enabled?: boolean | undefined;
        passing_score?: number | undefined;
        score_mode?: "best" | "latest" | undefined;
        max_attempts?: number | null | undefined;
        required_for_completion?: boolean | undefined;
        is_certification?: boolean | undefined;
    };
    question_count: number;
    can_start_attempt: boolean;
    attempts?: {
        status: "in_progress" | "submitted" | "graded";
        created_at: string;
        course_id: string;
        updated_at: string;
        started_at: string;
        assessment_config_id: string;
        attempt_id: string;
        learner_id: string;
        attempt_number: number;
        raw_score: number;
        max_score: number;
        percent_score: number;
        passed: boolean;
        submitted_at?: string | null | undefined;
        graded_at?: string | null | undefined;
        evidence?: Record<string, unknown> | undefined;
    }[] | undefined;
    best_score?: number | null | undefined;
    latest_score?: number | null | undefined;
    attempts_remaining?: number | null | undefined;
}>;
export type AssessmentSummary = z.infer<typeof AssessmentSummarySchema>;
/**
 * Assessment Validation
 */
export declare function validateAssessmentConfig(config: AssessmentConfig): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=assessment.d.ts.map