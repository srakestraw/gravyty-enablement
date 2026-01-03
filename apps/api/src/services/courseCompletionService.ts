/**
 * Course Completion Service
 * 
 * Centralized logic for evaluating course completion, including assessment requirements.
 */

import { AssessmentRepo } from '../storage/dynamo/assessmentRepo';
import { getEffectiveScore } from './assessmentGradingService';
import type { CourseProgress, AssessmentConfig, AssessmentAttempt } from '@gravyty/domain';

const assessmentRepo = new AssessmentRepo();

/**
 * Evaluate if a course is completed
 * 
 * Checks:
 * 1. All required lessons are completed (percent_complete === 100)
 * 2. If assessment is required, verify assessment passed based on score mode
 */
export async function evaluateCourseCompletion(
  courseId: string,
  progress: CourseProgress
): Promise<{ completed: boolean; reason?: string }> {
  // Check lesson completion (existing logic)
  if (progress.percent_complete !== 100) {
    return { completed: false, reason: 'Not all lessons completed' };
  }

  // Check assessment requirement
  const config = await assessmentRepo.getAssessmentConfig(courseId);
  if (config && config.is_enabled && config.required_for_completion) {
    // Get learner attempts
    const attempts = await assessmentRepo.getLearnerAttempts(courseId, progress.user_id);
    
    // Check if assessment passed based on score mode
    const effectiveScore = getEffectiveScore(attempts, config.score_mode);
    
    if (!effectiveScore || !effectiveScore.passed) {
      return {
        completed: false,
        reason: `Assessment not passed (required score: ${config.passing_score}%, score mode: ${config.score_mode})`,
      };
    }
  }

  return { completed: true };
}

/**
 * Check if assessment is required for course completion
 */
export async function isAssessmentRequired(courseId: string): Promise<boolean> {
  const config = await assessmentRepo.getAssessmentConfig(courseId);
  return config !== null && config.is_enabled && config.required_for_completion;
}

/**
 * Get assessment status for a learner
 */
export async function getAssessmentStatus(
  courseId: string,
  learnerId: string
): Promise<{ passed: boolean; score: number | null; config: AssessmentConfig | null }> {
  const config = await assessmentRepo.getAssessmentConfig(courseId);
  if (!config || !config.is_enabled) {
    return { passed: false, score: null, config: null };
  }

  const attempts = await assessmentRepo.getLearnerAttempts(courseId, learnerId);
  const effectiveScore = getEffectiveScore(attempts, config.score_mode);

  return {
    passed: effectiveScore?.passed ?? false,
    score: effectiveScore?.score ?? null,
    config,
  };
}


