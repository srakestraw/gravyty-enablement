/**
 * Assessment Admin API Handlers
 * 
 * Admin-facing endpoints for managing assessments
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { AssessmentRepo } from '../storage/dynamo/assessmentRepo';
import { lmsRepo } from '../storage/dynamo/lmsRepo';
import { v4 as uuidv4 } from 'uuid';
import type {
  AssessmentConfig,
  AssessmentQuestion,
  AssessmentOption,
} from '@gravyty/domain';

const assessmentRepo = new AssessmentRepo();

/**
 * GET /v1/admin/courses/:courseId/assessment
 * Get assessment config for a course
 */
export async function getAssessmentConfig(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;

  try {
    // Verify course exists and user has access
    const course = await lmsRepo.getCourseById(courseId, false);
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
    
    const response: ApiSuccessResponse<{ config: AssessmentConfig | null }> = {
      data: { config },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting assessment config:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get assessment config',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * PUT /v1/admin/courses/:courseId/assessment
 * Create or update assessment config
 */
export async function saveAssessmentConfig(req: AuthenticatedRequest, res: Response) {
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
    const course = await lmsRepo.getCourseById(courseId, false);
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

    // Validate request body
    const ConfigSchema = z.object({
      is_enabled: z.boolean().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      passing_score: z.number().int().min(0).max(100).optional(),
      score_mode: z.enum(['best', 'latest']).optional(),
      max_attempts: z.number().int().min(1).nullable().optional(),
      required_for_completion: z.boolean().optional(),
      is_certification: z.boolean().optional(),
    });

    const parsed = ConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }

    // Get existing config or create new
    const existing = await assessmentRepo.getAssessmentConfig(courseId);
    const now = new Date().toISOString();
    
    const config: AssessmentConfig = {
      assessment_config_id: existing?.assessment_config_id || `config_${uuidv4()}`,
      course_id: courseId,
      is_enabled: parsed.data.is_enabled ?? existing?.is_enabled ?? false,
      title: parsed.data.title ?? existing?.title ?? 'Assessment',
      description: parsed.data.description ?? existing?.description,
      passing_score: parsed.data.passing_score ?? existing?.passing_score ?? 80,
      score_mode: parsed.data.score_mode ?? existing?.score_mode ?? 'best',
      max_attempts: parsed.data.max_attempts !== undefined ? parsed.data.max_attempts : (existing?.max_attempts ?? null),
      required_for_completion: parsed.data.required_for_completion ?? existing?.required_for_completion ?? false,
      is_certification: parsed.data.is_certification ?? existing?.is_certification ?? false,
      created_at: existing?.created_at || now,
      updated_at: now,
    };

    await assessmentRepo.saveAssessmentConfig(config);

    const response: ApiSuccessResponse<{ config: AssessmentConfig }> = {
      data: { config },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error saving assessment config:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save assessment config',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/admin/courses/:courseId/assessment/questions
 * Get all questions for an assessment
 */
export async function getAssessmentQuestions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;

  try {
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

    const response: ApiSuccessResponse<{ questions: Array<AssessmentQuestion & { options?: AssessmentOption[] }> }> = {
      data: { questions },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting assessment questions:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get assessment questions',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * PUT /v1/admin/courses/:courseId/assessment/questions
 * Bulk save questions (replaces all questions)
 */
export async function saveAssessmentQuestions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;

  try {
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

    // Validate request body
    const QuestionSchema = z.object({
      question_id: z.string(),
      type: z.enum(['multiple_choice', 'true_false']),
      prompt: z.string(),
      points: z.number().int().min(1).optional(),
      order_index: z.number().int().min(0),
      is_required: z.boolean().optional(),
      correct_boolean_answer: z.boolean().optional(), // For T/F
      options: z.array(z.object({
        option_id: z.string(),
        label: z.string(),
        order_index: z.number().int().min(0),
        is_correct: z.boolean(),
      })).optional(), // For MCQ
    });

    const QuestionsSchema = z.array(QuestionSchema);
    const parsed = QuestionsSchema.safeParse(req.body.questions || req.body);
    
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }

    // Save questions
    const questionsToSave = parsed.data.map((q) => ({
      question_id: q.question_id || `question_${uuidv4()}`,
      type: q.type,
      prompt: q.prompt,
      points: q.points ?? 1,
      order_index: q.order_index,
      is_required: q.is_required ?? true,
      correct_boolean_answer: q.correct_boolean_answer,
    }));

    const savedQuestions = await assessmentRepo.saveQuestions(config.assessment_config_id, questionsToSave);

    // Save options for MCQ questions
    for (const questionData of parsed.data) {
      if (questionData.type === 'multiple_choice' && questionData.options) {
        await assessmentRepo.saveOptions(
          questionData.question_id || savedQuestions.find((q) => q.prompt === questionData.prompt)?.question_id!,
          questionData.options.map((o) => ({
            option_id: o.option_id || `option_${uuidv4()}`,
            label: o.label,
            order_index: o.order_index,
            is_correct: o.is_correct,
          }))
        );
      }
    }

    // Fetch questions with options to return
    const questionsWithOptions = await assessmentRepo.getQuestionsWithOptions(config.assessment_config_id);

    const response: ApiSuccessResponse<{ questions: Array<AssessmentQuestion & { options?: AssessmentOption[] }> }> = {
      data: { questions: questionsWithOptions },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error saving assessment questions:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save assessment questions',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/admin/courses/:courseId/assessment/results
 * Get all learner results for an assessment (admin view)
 */
export async function getAssessmentResults(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const cursor = req.query.cursor as string | undefined;

  try {
    const result = await assessmentRepo.getCourseAttempts(courseId, { limit, cursor });

    const response: ApiSuccessResponse<{
      items: typeof result.items;
      next_cursor?: string;
    }> = {
      data: {
        items: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting assessment results:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get assessment results',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/admin/courses/:courseId/assessment/results/:learnerId
 * Get attempt history for a specific learner
 */
export async function getLearnerAssessmentResults(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const learnerId = req.params.learnerId;

  try {
    const attempts = await assessmentRepo.getLearnerAttempts(courseId, learnerId);

    const response: ApiSuccessResponse<{ attempts: typeof attempts }> = {
      data: { attempts },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error getting learner assessment results:', error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get learner assessment results',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}


