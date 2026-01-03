/**
 * Assessment Grading Service
 * 
 * Core logic for grading assessment attempts.
 */

import type {
  AssessmentConfig,
  AssessmentQuestion,
  AssessmentOption,
  AssessmentAttempt,
  AssessmentAnswer,
} from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

export interface GradingResult {
  attempt: AssessmentAttempt;
  answers: AssessmentAnswer[];
  rawScore: number;
  maxScore: number;
  percentScore: number;
  passed: boolean;
}

export interface QuestionAnswer {
  question_id: string;
  selected_option_id?: string | null;
  boolean_answer?: boolean | null;
}

/**
 * Grade an assessment attempt
 */
export function gradeAttempt(
  config: AssessmentConfig,
  questions: Array<AssessmentQuestion & { options?: AssessmentOption[] }>,
  answers: QuestionAnswer[]
): GradingResult {
  const now = new Date().toISOString();
  
  // Calculate max score (sum of all question points)
  const maxScore = questions.reduce((sum, q) => sum + q.points, 0);
  
  // Grade each answer
  const gradedAnswers: AssessmentAnswer[] = [];
  let rawScore = 0;
  
  for (const question of questions) {
    const answer = answers.find((a) => a.question_id === question.question_id);
    
    let isCorrect = false;
    let pointsEarned = 0;
    
    if (question.type === 'multiple_choice') {
      // Find the correct option
      const correctOption = question.options?.find((o) => o.is_correct);
      if (correctOption && answer?.selected_option_id === correctOption.option_id) {
        isCorrect = true;
        pointsEarned = question.points;
      }
    } else if (question.type === 'true_false') {
      // For T/F, use correct_boolean_answer from question
      const correctAnswer = question.correct_boolean_answer;
      
      if (correctAnswer !== undefined && answer?.boolean_answer === correctAnswer) {
        isCorrect = true;
        pointsEarned = question.points;
      }
    }
    
    rawScore += pointsEarned;
    
    gradedAnswers.push({
      answer_id: `answer_${uuidv4()}`,
      attempt_id: '', // Will be set by caller
      question_id: question.question_id,
      selected_option_id: answer?.selected_option_id ?? null,
      boolean_answer: answer?.boolean_answer ?? null,
      is_correct: isCorrect,
      points_earned: pointsEarned,
      created_at: now,
      updated_at: now,
    });
  }
  
  // Calculate percentage (rounded)
  const percentScore = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  
  // Determine if passed
  const passed = percentScore >= config.passing_score;
  
  return {
    rawScore,
    maxScore,
    percentScore,
    passed,
    answers: gradedAnswers,
    attempt: {} as AssessmentAttempt, // Will be populated by caller
  };
}

/**
 * Determine best or latest score based on score mode
 */
export function getEffectiveScore(
  attempts: AssessmentAttempt[],
  scoreMode: 'best' | 'latest'
): { score: number; passed: boolean } | null {
  if (attempts.length === 0) {
    return null;
  }
  
  // Filter to only graded attempts
  const gradedAttempts = attempts.filter((a) => a.status === 'graded');
  if (gradedAttempts.length === 0) {
    return null;
  }
  
  if (scoreMode === 'best') {
    // Find attempt with highest percent_score
    const bestAttempt = gradedAttempts.reduce((best, current) => 
      current.percent_score > best.percent_score ? current : best
    );
    return {
      score: bestAttempt.percent_score,
      passed: bestAttempt.passed,
    };
  } else {
    // Latest: most recent attempt (highest attempt_number)
    const latestAttempt = gradedAttempts.reduce((latest, current) =>
      current.attempt_number > latest.attempt_number ? current : latest
    );
    return {
      score: latestAttempt.percent_score,
      passed: latestAttempt.passed,
    };
  }
}

/**
 * Check if learner can start a new attempt
 */
export function canStartAttempt(
  config: AssessmentConfig,
  existingAttempts: AssessmentAttempt[]
): { canStart: boolean; reason?: string } {
  // Check if assessment is enabled
  if (!config.is_enabled) {
    return { canStart: false, reason: 'Assessment is not enabled' };
  }
  
  // Check max attempts
  if (config.max_attempts !== null && config.max_attempts !== undefined) {
    const gradedAttempts = existingAttempts.filter((a) => a.status === 'graded');
    if (gradedAttempts.length >= config.max_attempts) {
      return { canStart: false, reason: 'Maximum attempts reached' };
    }
  }
  
  // Check if there's an in-progress attempt
  const inProgressAttempt = existingAttempts.find((a) => a.status === 'in_progress');
  if (inProgressAttempt) {
    return { canStart: false, reason: 'An attempt is already in progress' };
  }
  
  return { canStart: true };
}

/**
 * Create evidence snapshot for attempt
 */
export function createEvidenceSnapshot(
  config: AssessmentConfig,
  questionCount: number
): Record<string, unknown> {
  return {
    passing_score: config.passing_score,
    score_mode: config.score_mode,
    max_attempts: config.max_attempts,
    question_count: questionCount,
    snapshot_at: new Date().toISOString(),
  };
}

