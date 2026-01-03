/**
 * Assessment API Handlers
 * 
 * Learner-facing assessment API endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { AssessmentRepo } from '../storage/dynamo/assessmentRepo';
import { lmsRepo } from '../storage/dynamo/lmsRepo';
import { emitLmsEvent } from '../telemetry/lmsTelemetry';
import {
  gradeAttempt,
  getEffectiveScore,
  canStartAttempt,
  createEvidenceSnapshot,
  type QuestionAnswer,
} from '../services/assessmentGradingService';
import type {
  AssessmentSummary,
  AssessmentAttempt,
  AssessmentAnswer,
} from '@gravyty/domain';

const assessmentRepo = new AssessmentRepo();

/**
 * GET /v1/lms/courses/:courseId/assessment
 * Get assessment summary for learner
 */
export async function getAssessmentSummary(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const userId = req.user?.user_id;

  if (!userId) {
    const response: ApiErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      },
      request_id: requestId,
    };
    return res.status(401).json(response);
  }

  try {
    // Verify course exists and is published
    const course = await lmsRepo.getCourseById(courseId, true);
    if (!course) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }

    const config = await assessmentRepo.getAssessmentConfig(courseId);
    if (!config || !config.is_enabled) {
      const response: ApiSuccessResponse<{ summary: null }> = {
        data: { summary: null },
        request_id: requestId,
      };
      return res.json(response);
    }

    // Get questions count
    const questions = await assessmentRepo.getQuestions(config.assessment_config_id);
    const questionCount = questions.length;

    // Get learner attempts
    const attempts = await assessmentRepo.getLearnerAttempts(courseId, userId);

    // Calculate best/latest scores
    const effectiveScore = getEffectiveScore(attempts, config.score_mode);
    const bestScore = attempts.length > 0
      ? Math.max(...attempts.filter((a) => a.status === 'graded').map((a) => a.percent_score), 0)
      : null;
    const latestScore = attempts.length > 0 && attempts[attempts.length - 1].status === 'graded'
      ? attempts[attempts.length - 1].percent_score
      : null;

    // Check if can start attempt
    const { canStart, reason } = canStartAttempt(config, attempts);
    const attemptsRemaining = config.max_attempts !== null && config.max_attempts !== undefined
      ? Math.max(0, config.max_attempts - attempts.filter((a) => a.status === 'graded').length)
      : null;

    const summary: AssessmentSummary = {
      assessment_config: config,
      question_count: questionCount,
      attempts,
      best_score: bestScore,
      latest_score: latestScore,
      can_start_attempt: canStart,
      attempts_remaining: attemptsRemaining,
    };

    const response: ApiSuccessResponse<{ summary: AssessmentSummary }> = {
      data: { summary },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting assessment summary:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get assessment summary',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/lms/courses/:courseId/assessment/me
 * Alias for getAssessmentSummary (for consistency)
 */
export async function getMyAssessment(req: AuthenticatedRequest, res: Response) {
  return getAssessmentSummary(req, res);
}

/**
 * POST /v1/lms/courses/:courseId/assessment/attempts/start
 * Start a new assessment attempt
 */
export async function startAssessmentAttempt(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const userId = req.user?.user_id;

  if (!userId) {
    const response: ApiErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      },
      request_id: requestId,
    };
    return res.status(401).json(response);
  }

  try {
    // Verify course exists
    const course = await lmsRepo.getCourseById(courseId, true);
    if (!course) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }

    const config = await assessmentRepo.getAssessmentConfig(courseId);
    if (!config || !config.is_enabled) {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Assessment is not enabled',
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }

    // Check if can start attempt
    const existingAttempts = await assessmentRepo.getLearnerAttempts(courseId, userId);
    const { canStart, reason } = canStartAttempt(config, existingAttempts);
    
    if (!canStart) {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: reason || 'Cannot start attempt',
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }

    // Start attempt
    const attempt = await assessmentRepo.startAttempt(courseId, config.assessment_config_id, userId);

    // Emit event
    await emitLmsEvent(req, 'assessment.attempt_started' as any, {
      course_id: courseId,
      attempt_id: attempt.attempt_id,
    });

    const response: ApiSuccessResponse<{ attempt: AssessmentAttempt }> = {
      data: { attempt },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error starting assessment attempt:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start assessment attempt',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * POST /v1/lms/courses/:courseId/assessment/attempts/:attemptId/submit
 * Submit an assessment attempt for grading
 */
export async function submitAssessmentAttempt(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const attemptId = req.params.attemptId;
  const userId = req.user?.user_id;

  if (!userId) {
    const response: ApiErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      },
      request_id: requestId,
    };
    return res.status(401).json(response);
  }

  try {
    // Get attempt
    const attempt = await assessmentRepo.getAttempt(attemptId);
    if (!attempt) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Attempt not found',
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }

    // Verify ownership
    if (attempt.learner_id !== userId || attempt.course_id !== courseId) {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
        request_id: requestId,
      };
      return res.status(403).json(response);
    }

    // Check if already submitted
    if (attempt.status !== 'in_progress') {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Attempt already submitted',
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }

    // Get config and questions
    const config = await assessmentRepo.getAssessmentConfig(courseId);
    if (!config) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Assessment config not found',
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }

    const questions = await assessmentRepo.getQuestionsWithOptions(config.assessment_config_id);

    // Validate answers
    const answers: QuestionAnswer[] = req.body.answers || [];
    if (!Array.isArray(answers)) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Answers must be an array',
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }

    // Check required questions are answered
    const requiredQuestions = questions.filter((q) => q.is_required);
    for (const question of requiredQuestions) {
      const answer = answers.find((a) => a.question_id === question.question_id);
      if (!answer || (question.type === 'multiple_choice' && !answer.selected_option_id) ||
          (question.type === 'true_false' && answer.boolean_answer === undefined)) {
        const response: ApiErrorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Required question ${question.question_id} is not answered`,
          },
          request_id: requestId,
        };
        return res.status(400).json(response);
      }
    }

    // Grade the attempt
    const gradingResult = gradeAttempt(config, questions, answers);

    // Update attempt with grading results
    const now = new Date().toISOString();
    const updatedAttempt: AssessmentAttempt = {
      ...attempt,
      status: 'graded',
      submitted_at: now,
      graded_at: now,
      raw_score: gradingResult.rawScore,
      max_score: gradingResult.maxScore,
      percent_score: gradingResult.percentScore,
      passed: gradingResult.passed,
      evidence: createEvidenceSnapshot(config, questions.length),
      updated_at: now,
    };

    // Set attempt_id on answers
    const answersWithAttemptId = gradingResult.answers.map((a) => ({
      ...a,
      attempt_id: attemptId,
    }));

    // Save answers and update attempt
    await assessmentRepo.saveAnswers(attemptId, answersWithAttemptId);
    await assessmentRepo.updateAttempt(updatedAttempt);

    // Emit events
    await emitLmsEvent(req, 'assessment.attempt_submitted' as any, {
      course_id: courseId,
      attempt_id: attemptId,
      percent_score: gradingResult.percentScore,
      passed: gradingResult.passed,
    });

    // Evaluate badges
    const { processBadgeEvent } = await import('../services/badgeService');
    await processBadgeEvent('assessment.attempt_submitted', userId, {
      course_id: courseId,
      attempt_id: attemptId,
      percent_score: gradingResult.percentScore,
      passed: gradingResult.passed,
    });

    if (gradingResult.passed) {
      await emitLmsEvent(req, 'assessment.passed' as any, {
        course_id: courseId,
        attempt_id: attemptId,
        percent_score: gradingResult.percentScore,
      });

      // Evaluate badges for assessment passed
      await processBadgeEvent('assessment.passed', userId, {
        course_id: courseId,
        attempt_id: attemptId,
        percent_score: gradingResult.percentScore,
      });

      // Re-evaluate course completion if assessment passed and course is at 100% lessons
      const progress = await lmsRepo.getProgress(userId, courseId);
      if (progress && progress.percent_complete === 100 && !progress.completed) {
        // Re-check completion (this will now pass because assessment is passed)
        const { evaluateCourseCompletion } = await import('../services/courseCompletionService');
        const completionCheck = await evaluateCourseCompletion(courseId, progress);
        
        if (completionCheck.completed) {
          // Update progress to mark as completed
          const now = new Date().toISOString();
          await lmsRepo.updateProgress(userId, courseId, {
            lesson_id: progress.current_lesson_id || '', // Use existing lesson_id
            completed: true,
          });
          
          // Emit course completed event
          await emitLmsEvent(req, 'lms_course_completed' as any, {
            course_id: courseId,
          });
        }
      }
    }

    const response: ApiSuccessResponse<{
      attempt: AssessmentAttempt;
      answers: AssessmentAnswer[];
    }> = {
      data: {
        attempt: updatedAttempt,
        answers: answersWithAttemptId,
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error submitting assessment attempt:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to submit assessment attempt',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/lms/courses/:courseId/assessment/attempts/:attemptId
 * Get attempt results
 */
export async function getAttemptResults(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const attemptId = req.params.attemptId;
  const userId = req.user?.user_id;

  if (!userId) {
    const response: ApiErrorResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      },
      request_id: requestId,
    };
    return res.status(401).json(response);
  }

  try {
    const attempt = await assessmentRepo.getAttempt(attemptId);
    if (!attempt) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Attempt not found',
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }

    // Verify ownership
    if (attempt.learner_id !== userId || attempt.course_id !== courseId) {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
        request_id: requestId,
      };
      return res.status(403).json(response);
    }

    const answers = await assessmentRepo.getAnswersForAttempt(attemptId);

    // For in-progress attempts, include questions so learner can take the assessment
    let questions: any[] = [];
    if (attempt.status === 'in_progress') {
      const config = await assessmentRepo.getAssessmentConfig(courseId);
      if (config) {
        questions = await assessmentRepo.getQuestionsWithOptions(config.assessment_config_id);
      }
    }

    const response: ApiSuccessResponse<{
      attempt: AssessmentAttempt;
      answers: AssessmentAnswer[];
      questions?: any[];
    }> = {
      data: {
        attempt,
        answers,
        ...(questions.length > 0 && { questions }),
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting attempt results:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get attempt results',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

