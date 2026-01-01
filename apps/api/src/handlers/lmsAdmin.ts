/**
 * LMS Admin API Handlers
 * 
 * Admin-facing endpoints for managing LMS content
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { 
  lmsRepo, 
  LMS_COURSES_TABLE,
  LMS_PATHS_TABLE,
  LMS_ASSIGNMENTS_TABLE,
  LMS_CERTIFICATES_TABLE,
  LMS_MEDIA_BUCKET,
} from '../storage/dynamo/lmsRepo';
import { emitLmsEvent, LMS_EVENTS } from '../telemetry/lmsTelemetry';
import { dynamoDocClient } from '../aws/dynamoClient';
import type {
  Course,
  CourseSummary,
  LearningPath,
  LearningPathSummary,
  Assignment,
  CertificateTemplate,
  CertificateTemplateSummary,
  MediaRef,
} from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../aws/s3Client';
import { startTranscriptionJob, getMediaFormatFromContentType } from '../aws/transcribeClient';
import { createChatCompletion, generateImage, ChatMessage } from '../ai/aiService';
import { ssmClient } from '../aws/ssmClient';
import { GetParameterCommand } from '@aws-sdk/client-ssm';

// ============================================================================
// COURSES ADMIN
// ============================================================================

/**
 * GET /v1/lms/admin/courses
 * List all courses (draft and published) for admin
 */
export async function listAdminCourses(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const status = req.query.status as string | undefined;
    const product = req.query.product as string | undefined;
    const productSuite = req.query.product_suite as string | undefined;
    const badge = req.query.badge as string | undefined;
    const q = req.query.q as string | undefined;
    
    // For MVP, scan all courses and filter client-side
    // In production, use GSI for status filtering
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: LMS_COURSES_TABLE,
      ...(status && {
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
      }),
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    let courses = (Items as Course[]).map((c) => ({
      course_id: c.course_id,
      title: c.title,
      status: c.status,
      version: c.version || 0,
      updated_at: c.updated_at,
      created_at: c.created_at,
      product: c.product,
      product_suite: c.product_suite,
    }));
    
    // Apply filters
    if (q) {
      const lowerQ = q.toLowerCase();
      courses = courses.filter((c) => c.title.toLowerCase().includes(lowerQ));
    }
    if (product) {
      courses = courses.filter((c) => c.product === product);
    }
    if (productSuite) {
      courses = courses.filter((c) => c.product_suite === productSuite);
    }
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_courses_listed' as any, {
      status,
      result_count: courses.length,
    });
    
    const response: ApiSuccessResponse<{ courses: typeof courses }> = {
      data: { courses },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing admin courses:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list courses',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/courses
 * Create a new course draft
 */
export async function createCourse(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  const CreateCourseSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    short_description: z.string().optional(),
    // New field names (preferred)
    product: z.string().optional(), // Was "product_suite"
    product_suite: z.string().optional(), // Was "product_concept"
    topic_tags: z.array(z.string()).optional(),
    product_id: z.string().optional(), // Was "product_suite_id"
    product_suite_id: z.string().optional(), // Was "product_concept_id"
    topic_tag_ids: z.array(z.string()).optional(),
    // Legacy fields (for backward compatibility - will be normalized)
    legacy_product_suite: z.string().optional(), // Old product_suite -> maps to product
    legacy_product_concept: z.string().optional(), // Old product_concept -> maps to product_suite
    legacy_product_suite_id: z.string().optional(), // Old product_suite_id -> maps to product_id
    legacy_product_concept_id: z.string().optional(), // Old product_concept_id -> maps to product_suite_id
    badges: z.array(z.object({ 
      badge_id: z.string(), 
      name: z.string(), 
      description: z.string().optional(),
      icon_url: z.string().optional(),
    })).optional(),
    badge_ids: z.array(z.string()).optional(),
    estimated_minutes: z.union([z.number(), z.string(), z.null()]).optional(),
  });
  
  const parsed = CreateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const now = new Date().toISOString();
    const courseId = `course_${uuidv4()}`;
    
    // Normalize taxonomy fields (map legacy to new names)
    const product = parsed.data.product ?? parsed.data.legacy_product_suite;
    const product_suite = parsed.data.product_suite ?? parsed.data.legacy_product_concept;
    const product_id = parsed.data.product_id ?? parsed.data.legacy_product_suite_id;
    const product_suite_id = parsed.data.product_suite_id ?? parsed.data.legacy_product_concept_id;
    
    // Handle estimated_minutes: normalize null/empty string to undefined, validate range
    let estimatedMinutes: number | undefined = undefined;
    if (parsed.data.estimated_minutes !== undefined && parsed.data.estimated_minutes !== null && parsed.data.estimated_minutes !== '') {
      const parsedValue = typeof parsed.data.estimated_minutes === 'string' 
        ? parseInt(parsed.data.estimated_minutes, 10) 
        : parsed.data.estimated_minutes;
      if (isNaN(parsedValue) || parsedValue < 1 || parsedValue > 600) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'estimated_minutes must be an integer between 1 and 600',
          },
          request_id: requestId,
        });
        return;
      }
      estimatedMinutes = parsedValue;
    }
    
    const course: Course = {
      course_id: courseId,
      title: parsed.data.title,
      description: parsed.data.description || '',
      short_description: parsed.data.short_description,
      status: 'draft',
      version: 1,
      // New field names (preferred)
      product,
      product_suite,
      topic_tags: parsed.data.topic_tags || [],
      product_id,
      product_suite_id,
      topic_tag_ids: parsed.data.topic_tag_ids || [],
      badges: parsed.data.badges || [],
      badge_ids: parsed.data.badge_ids || [],
      estimated_minutes: estimatedMinutes,
      sections: [],
      related_course_ids: [],
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
    };
    
    await lmsRepo.createCourseDraft(course);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_course_created' as any, {
      course_id: courseId,
    });
    
    const response: ApiSuccessResponse<{ course: Course }> = {
      data: { course },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating course:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create course',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/admin/courses/:courseId
 * Get course for editing (draft or latest published)
 */
export async function getAdminCourse(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId as string;
  
  try {
    const course = await lmsRepo.getCourseDraftOrPublished(courseId);
    if (!course) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Course ${courseId} not found` },
        request_id: requestId,
      });
      return;
    }
    
    const response: ApiSuccessResponse<{ course: Course; is_draft: boolean }> = {
      data: {
        course,
        is_draft: course.status === 'draft',
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting admin course:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get course',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/lms/admin/courses/:courseId
 * Update course draft
 */
export async function updateCourse(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const courseId = req.params.courseId as string;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  const UpdateCourseSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    // New field names (preferred)
    product: z.string().optional(), // Was "product_suite"
    product_suite: z.string().optional(), // Was "product_concept"
    topic_tags: z.array(z.string()).optional(),
    product_id: z.string().optional(), // Was "product_suite_id"
    product_suite_id: z.string().optional(), // Was "product_concept_id"
    topic_tag_ids: z.array(z.string()).optional(),
    // Legacy fields (for backward compatibility - will be normalized)
    legacy_product_suite: z.string().optional(),
    legacy_product_concept: z.string().optional(),
    legacy_product_suite_id: z.string().optional(),
    legacy_product_concept_id: z.string().optional(),
    badges: z.array(z.object({ 
      badge_id: z.string(), 
      name: z.string(), 
      description: z.string().optional(),
      icon_url: z.string().optional(),
    })).optional(),
    badge_ids: z.array(z.string()).optional(),
    cover_image: z.object({
      media_id: z.string(),
      type: z.enum(['image', 'video', 'document', 'audio', 'other']),
      url: z.string().url(),
      created_at: z.string(),
      created_by: z.string(),
    }).optional(),
    estimated_minutes: z.union([z.number(), z.string(), z.null()]).optional(),
  });
  
  const parsed = UpdateCourseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    // Normalize taxonomy fields (map legacy to new names)
    const updates: any = { ...parsed.data };
    if (updates.product === undefined && updates.legacy_product_suite !== undefined) {
      updates.product = updates.legacy_product_suite;
    }
    if (updates.product_suite === undefined && updates.legacy_product_concept !== undefined) {
      updates.product_suite = updates.legacy_product_concept;
    }
    if (updates.product_id === undefined && updates.legacy_product_suite_id !== undefined) {
      updates.product_id = updates.legacy_product_suite_id;
    }
    if (updates.product_suite_id === undefined && updates.legacy_product_concept_id !== undefined) {
      updates.product_suite_id = updates.legacy_product_concept_id;
    }
    // Remove legacy fields from updates
    delete updates.legacy_product_suite;
    delete updates.legacy_product_concept;
    delete updates.legacy_product_suite_id;
    delete updates.legacy_product_concept_id;
    
    // Handle estimated_minutes: normalize null/empty string to undefined, validate range
    if ('estimated_minutes' in updates) {
      if (updates.estimated_minutes === null || updates.estimated_minutes === '' || updates.estimated_minutes === undefined) {
        updates.estimated_minutes = undefined;
      } else {
        const parsedValue = typeof updates.estimated_minutes === 'string' 
          ? parseInt(updates.estimated_minutes, 10) 
          : updates.estimated_minutes;
        if (isNaN(parsedValue) || parsedValue < 1 || parsedValue > 600) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'estimated_minutes must be an integer between 1 and 600',
            },
            request_id: requestId,
          });
          return;
        }
        updates.estimated_minutes = parsedValue;
      }
    }
    
    const course = await lmsRepo.updateCourseDraft(courseId, userId, updates);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_course_updated' as any, {
      course_id: courseId,
    });
    
    const response: ApiSuccessResponse<{ course: Course }> = {
      data: { course },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating course:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update course',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/admin/courses/:courseId/lessons
 * Get all lessons for a course
 */
export async function getAdminCourseLessons(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId as string;
  
  try {
    const lessons = await lmsRepo.getLessonsForCourse(courseId);
    
    const response: ApiSuccessResponse<{ lessons: any[] }> = {
      data: { lessons },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting course lessons:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get lessons',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/lms/admin/courses/:courseId/lessons
 * Bulk update lessons and sections for a course draft
 */
export async function updateCourseLessons(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const courseId = req.params.courseId as string;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  // Quiz question schemas for validation
  const QuizQuestionOptionSchema = z.object({
    option_id: z.string(),
    text: z.string(),
  });

  const QuizQuestionSchema = z.object({
    question_id: z.string(),
    kind: z.literal('single_choice'),
    prompt: z.string(),
    options: z.array(QuizQuestionOptionSchema).min(2),
    correct_option_id: z.string(),
    explanation: z.string().optional(),
  });

  // Lesson content discriminated union
  const LessonContentSchema = z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('video'),
      video_id: z.string(),
      duration_seconds: z.number().int().min(1),
      transcript: z.string().optional(),
    }),
    z.object({
      kind: z.literal('reading'),
      format: z.literal('markdown'),
      markdown: z.string(),
    }),
    z.object({
      kind: z.literal('quiz'),
      passing_score_percent: z.number().int().min(0).max(100).optional(),
      allow_retry: z.boolean().optional(),
      show_answers_after_submit: z.boolean().optional(),
      questions: z.array(QuizQuestionSchema).min(1),
    }),
    z.object({
      kind: z.literal('assignment'),
      instructions_markdown: z.string(),
      submission_type: z.enum(['none', 'text', 'file', 'link']),
      due_at: z.string().optional(),
    }),
    z.object({
      kind: z.literal('interactive'),
      provider: z.literal('embed'),
      embed_url: z.string().url(),
      height_px: z.number().int().min(1).optional(),
      allow_fullscreen: z.boolean().optional(),
    }),
  ]);

  const UpdateLessonsSchema = z.object({
    sections: z.array(z.object({
      section_id: z.string(),
      title: z.string(),
      order: z.number(),
      lesson_ids: z.array(z.string()),
    })),
    lessons: z.array(z.object({
      lesson_id: z.string(),
      section_id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      type: z.enum(['video', 'reading', 'quiz', 'assignment', 'interactive']),
      order: z.number(),
      required: z.boolean().optional(),
      content: LessonContentSchema,
      resources: z.array(z.object({
        media_id: z.string(),
        type: z.enum(['image', 'video', 'document', 'audio', 'other']),
        url: z.string().url(),
        filename: z.string().optional(),
        created_at: z.string(),
        created_by: z.string(),
      })).optional(),
    })),
  });
  
  const parsed = UpdateLessonsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    await lmsRepo.updateCourseLessons(courseId, userId, parsed.data.sections, parsed.data.lessons);
    
    const response: ApiSuccessResponse<{ success: boolean }> = {
      data: { success: true },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating course lessons:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update lessons',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/courses/:courseId/publish
 * Publish course draft (create immutable published snapshot)
 */
export async function publishCourse(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const courseId = req.params.courseId as string;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    // Get course and lessons for validation
    const course = await lmsRepo.getCourseDraftOrPublished(courseId);
    if (!course) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Course ${courseId} not found` },
        request_id: requestId,
      });
      return;
    }

    if (course.status === 'published') {
      res.status(400).json({
        error: { code: 'ALREADY_PUBLISHED', message: 'Course is already published' },
        request_id: requestId,
      });
      return;
    }

    // Get lessons for validation
    const lessons = await lmsRepo.getLessonsForCourse(courseId);
    
    // Validate publish readiness
    const { validateCoursePublish } = await import('./lmsAdminValidators');
    const validation = validateCoursePublish(course, lessons);
    
    if (!validation.valid) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Course validation failed',
          details: validation.errors,
        },
        request_id: requestId,
      });
      return;
    }

    const publishedCourse = await lmsRepo.publishCourse(courseId, userId);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_course_published' as any, {
      course_id: courseId,
      version: publishedCourse.version,
    });
    
    const response: ApiSuccessResponse<{ course: Course }> = {
      data: { course: publishedCourse },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error publishing course:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish course',
      },
      request_id: requestId,
    });
  }
}

// ============================================================================
// PATHS ADMIN
// ============================================================================

/**
 * GET /v1/lms/admin/paths
 * List all paths (draft and published) for admin
 */
export async function listAdminPaths(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const status = req.query.status as string | undefined;
    
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: LMS_PATHS_TABLE,
      ...(status && {
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
      }),
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    const paths = (Items as LearningPath[]).map((p) => ({
      path_id: p.path_id,
      title: p.title,
      status: p.status,
      version: p.version || 0,
      updated_at: p.updated_at,
      created_at: p.created_at,
      course_count: p.courses?.length || 0,
    }));
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_paths_listed' as any, {
      status,
      result_count: paths.length,
    });
    
    const response: ApiSuccessResponse<{ paths: typeof paths }> = {
      data: { paths },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing admin paths:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list paths',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/paths
 * Create a new path draft
 */
export async function createPath(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  const CreatePathSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    short_description: z.string().optional(),
    product: z.string().optional(), // Was "product_suite"
    product_suite: z.string().optional(), // Was "product_concept"
    topic_tags: z.array(z.string()).optional(),
    badges: z.array(z.string()).optional(),
    courses: z.array(z.object({
      course_id: z.string(),
      order: z.number(),
      required: z.boolean().optional(),
      title_override: z.string().optional(),
    })).optional(),
  });
  
  const parsed = CreatePathSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const now = new Date().toISOString();
    const pathId = `path_${uuidv4()}`;
    
    // Normalize taxonomy fields
    const product = parsed.data.product;
    const product_suite = parsed.data.product_suite;
    
    const path: LearningPath = {
      path_id: pathId,
      title: parsed.data.title,
      description: parsed.data.description,
      short_description: parsed.data.short_description,
      status: 'draft',
      version: 1,
      product,
      product_suite,
      topic_tags: parsed.data.topic_tags || [],
      badges: parsed.data.badges || [],
      courses: (parsed.data.courses || []).map((c) => ({
        course_id: c.course_id,
        order: c.order,
        required: c.required ?? true,
        title_override: c.title_override,
      })),
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
    };
    
    await lmsRepo.createPathDraft(path);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_path_created' as any, {
      path_id: pathId,
    });
    
    const response: ApiSuccessResponse<{ path: LearningPath }> = {
      data: { path },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating path:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create path',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/admin/paths/:pathId
 * Get path for editing (draft or latest published)
 */
export async function getAdminPath(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const pathId = req.params.pathId as string;
  
  try {
    const path = await lmsRepo.getPathById(pathId, false);
    if (!path) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Path ${pathId} not found` },
        request_id: requestId,
      });
      return;
    }
    
    // Hydrate course summaries if requested
    const hydratedCourses = await Promise.all(
      path.courses.map(async (courseRef) => {
        const course = await lmsRepo.getCourseDraftOrPublished(courseRef.course_id);
        if (course && course.status === 'published') {
          return {
            ...courseRef,
            course: {
              course_id: course.course_id,
              title: course.title,
              short_description: course.short_description,
              cover_image_url: course.cover_image?.url,
              product: course.product,
              product_suite: course.product_suite,
              topic_tags: course.topic_tags || [],
              estimated_duration_minutes: course.estimated_duration_minutes,
              estimated_minutes: course.estimated_minutes,
              difficulty_level: course.difficulty_level,
              status: course.status,
              published_at: course.published_at,
            },
          };
        }
        return courseRef;
      })
    );
    
    const pathWithCourses = {
      ...path,
      courses: hydratedCourses,
    };
    
    const response: ApiSuccessResponse<{ path: typeof pathWithCourses; is_draft: boolean }> = {
      data: {
        path: pathWithCourses,
        is_draft: path.status === 'draft',
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting admin path:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get path',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/lms/admin/paths/:pathId
 * Update path draft
 */
export async function updatePath(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const pathId = req.params.pathId as string;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  const UpdatePathSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    short_description: z.string().optional(),
    product: z.string().optional(), // Was "product_suite"
    product_suite: z.string().optional(), // Was "product_concept"
    topic_tags: z.array(z.string()).optional(),
    badges: z.array(z.string()).optional(),
    courses: z.array(z.object({
      course_id: z.string(),
      order: z.number(),
      required: z.boolean().optional(),
      title_override: z.string().optional(),
    })).optional(),
  });
  
  const parsed = UpdatePathSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const path = await lmsRepo.updatePathDraft(pathId, userId, parsed.data);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_path_updated' as any, {
      path_id: pathId,
    });
    
    const response: ApiSuccessResponse<{ path: LearningPath }> = {
      data: { path },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating path:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update path',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/paths/:pathId/publish
 * Publish path draft (create immutable published snapshot)
 */
export async function publishPath(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const pathId = req.params.pathId as string;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    // Get path for validation
    const path = await lmsRepo.getPathById(pathId, false);
    if (!path) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Path ${pathId} not found` },
        request_id: requestId,
      });
      return;
    }

    if (path.status === 'published') {
      res.status(400).json({
        error: { code: 'ALREADY_PUBLISHED', message: 'Path is already published' },
        request_id: requestId,
      });
      return;
    }

    // Validate publish readiness
    const { validatePathPublish } = await import('./lmsAdminValidators');
    const validation = validatePathPublish(path);
    
    if (!validation.valid) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Path validation failed',
          details: validation.errors,
        },
        request_id: requestId,
      });
      return;
    }

    const publishedPath = await lmsRepo.publishPath(pathId, userId);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_path_published' as any, {
      path_id: pathId,
      version: publishedPath.version,
    });
    
    const response: ApiSuccessResponse<{ path: LearningPath }> = {
      data: { path: publishedPath },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error publishing path:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish path',
      },
      request_id: requestId,
    });
  }
}

// ============================================================================
// ASSIGNMENTS ADMIN
// ============================================================================

/**
 * GET /v1/lms/admin/assignments
 * List assignments (admin view)
 */
export async function listAdminAssignments(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const assigneeUserId = req.query.assignee_user_id as string | undefined;
    const status = req.query.status as string | undefined;
    
    const assignments = await lmsRepo.listAdminAssignments({
      assignee_user_id: assigneeUserId,
      status,
    });
    
    const response: ApiSuccessResponse<{ assignments: Assignment[] }> = {
      data: { assignments },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing admin assignments:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list assignments',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/assignments
 * Create assignment
 */
export async function createAssignment(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  const CreateAssignmentSchema = z.object({
    assignee_user_id: z.string(),
    target_type: z.enum(['course', 'path']),
    target_id: z.string(),
    due_at: z.string().optional(),
    assignment_reason: z.enum(['required', 'recommended']).optional().default('required'),
    note: z.string().optional(),
  });
  
  const parsed = CreateAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const now = new Date().toISOString();
    const assignmentId = `assignment_${uuidv4()}`;
    
    const assignment: Assignment = {
      assignment_id: assignmentId,
      user_id: parsed.data.assignee_user_id,
      assignment_type: parsed.data.target_type,
      course_id: parsed.data.target_type === 'course' ? parsed.data.target_id : undefined,
      path_id: parsed.data.target_type === 'path' ? parsed.data.target_id : undefined,
      status: 'assigned',
      due_at: parsed.data.due_at,
      assigned_by: userId,
      assigned_at: now,
      updated_at: now,
    };
    
    await lmsRepo.createAssignment(assignment);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_assignment_created' as any, {
      assignment_id: assignmentId,
      course_id: assignment.course_id,
      path_id: assignment.path_id,
    });
    
    const response: ApiSuccessResponse<{ assignment: Assignment }> = {
      data: { assignment },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating assignment:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create assignment',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/assignments/waive
 * Waive assignment by PK+SK
 * Query params: assignee_user_id (required), sk (required)
 */
export async function waiveAssignment(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const assigneeUserId = req.query.assignee_user_id as string;
  const sk = req.query.sk as string;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  if (!assigneeUserId || !sk) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'assignee_user_id and sk query parameters are required',
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const assignment = await lmsRepo.waiveAssignment(assigneeUserId, sk, userId);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_assignment_waived' as any, {
      assignment_id: assignment.assignment_id,
    });
    
    const response: ApiSuccessResponse<{ assignment: Assignment }> = {
      data: { assignment },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error waiving assignment:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to waive assignment',
      },
      request_id: requestId,
    });
  }
}

// ============================================================================
// CERTIFICATE TEMPLATES ADMIN
// ============================================================================

/**
 * GET /v1/lms/admin/certificates/templates
 * List certificate templates
 */
export async function listCertificateTemplates(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const templates = await lmsRepo.listCertificateTemplates();

    // Note: No specific event for listing, use generic admin action if needed

    const response: ApiSuccessResponse<{ templates: CertificateTemplateSummary[] }> = {
      data: { templates },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing certificate templates:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list certificate templates',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/certificates/templates
 * Create certificate template
 */
export async function createCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;

  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      },
      request_id: requestId,
    });
    return;
  }

  const CreateTemplateSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    applies_to: z.enum(['course', 'path']),
    applies_to_id: z.string().min(1),
    badge_text: z.string().min(1),
    signatory_name: z.string().optional(),
    signatory_title: z.string().optional(),
    issued_copy: z.object({
      title: z.string().min(1),
      body: z.string().min(1),
    }),
  });

  const parsed = CreateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request body',
      },
      request_id: requestId,
    });
    return;
  }

  try {
    const now = new Date().toISOString();
    const templateId = `template_${uuidv4()}`;

    const template: CertificateTemplate = {
      template_id: templateId,
      name: parsed.data.name,
      description: parsed.data.description,
      status: 'draft',
      applies_to: parsed.data.applies_to,
      applies_to_id: parsed.data.applies_to_id,
      badge_text: parsed.data.badge_text,
      signatory_name: parsed.data.signatory_name,
      signatory_title: parsed.data.signatory_title,
      issued_copy: parsed.data.issued_copy,
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
    };

    await lmsRepo.createCertificateTemplate(template);

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.ADMIN_CERTIFICATE_TEMPLATE_CREATED, {
      template_id: templateId,
      applies_to: parsed.data.applies_to,
      applies_to_id: parsed.data.applies_to_id,
    });

    const response: ApiSuccessResponse<{ template: CertificateTemplate }> = {
      data: { template },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating certificate template:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create certificate template',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/admin/certificates/templates/:templateId
 * Get certificate template
 */
export async function getCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const templateId = req.params.templateId;

  try {
    const template = await lmsRepo.getCertificateTemplate(templateId);
    if (!template) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Certificate template ${templateId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<{ template: CertificateTemplate }> = {
      data: { template },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting certificate template:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get certificate template',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/lms/admin/certificates/templates/:templateId
 * Update certificate template
 */
export async function updateCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const templateId = req.params.templateId;
  const userId = req.user?.user_id;

  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User ID required',
      },
      request_id: requestId,
    });
    return;
  }

  const UpdateTemplateSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    applies_to: z.enum(['course', 'path']).optional(),
    applies_to_id: z.string().min(1).optional(),
    badge_text: z.string().min(1).optional(),
    signatory_name: z.string().optional(),
    signatory_title: z.string().optional(),
    issued_copy: z.object({
      title: z.string().min(1),
      body: z.string().min(1),
    }).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  });

  const parsed = UpdateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors[0]?.message || 'Invalid request body',
      },
      request_id: requestId,
    });
    return;
  }

  try {
    const updates: Partial<CertificateTemplate> = {
      ...parsed.data,
      updated_by: userId,
    };

    const template = await lmsRepo.updateCertificateTemplate(templateId, updates);

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.ADMIN_CERTIFICATE_TEMPLATE_UPDATED, {
      template_id: templateId,
      applies_to: template.applies_to,
      applies_to_id: template.applies_to_id,
    });

    const response: ApiSuccessResponse<{ template: CertificateTemplate }> = {
      data: { template },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating certificate template:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update certificate template',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/certificates/templates/:templateId/publish
 * Publish certificate template
 */
export async function publishCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const templateId = req.params.templateId;

  try {
    const template = await lmsRepo.publishCertificateTemplate(templateId);

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.ADMIN_CERTIFICATE_TEMPLATE_PUBLISHED, {
      template_id: templateId,
      applies_to: template.applies_to,
      applies_to_id: template.applies_to_id,
    });

    const response: ApiSuccessResponse<{ template: CertificateTemplate }> = {
      data: { template },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error publishing certificate template:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish certificate template',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/certificates/templates/:templateId/archive
 * Archive certificate template
 */
export async function archiveCertificateTemplate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const templateId = req.params.templateId;

  try {
    const template = await lmsRepo.archiveCertificateTemplate(templateId);

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.ADMIN_CERTIFICATE_TEMPLATE_ARCHIVED, {
      template_id: templateId,
      applies_to: template.applies_to,
      applies_to_id: template.applies_to_id,
    });

    const response: ApiSuccessResponse<{ template: CertificateTemplate }> = {
      data: { template },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error archiving certificate template:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to archive certificate template',
      },
      request_id: requestId,
    });
  }
}

// ============================================================================
// MEDIA LIBRARY ADMIN
// ============================================================================

/**
 * GET /v1/lms/admin/media
 * List media metadata
 */
export async function listMedia(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const mediaType = req.query.media_type as string | undefined;
    const courseId = req.query.course_id as string | undefined;
    const lessonId = req.query.lesson_id as string | undefined;
    
    // For MVP, scan certificates table for MEDIA entity_type
    // In production, use dedicated media table or GSI
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: LMS_CERTIFICATES_TABLE, // Reusing table with entity_type pattern
      FilterExpression: 'entity_type = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'MEDIA',
      },
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    let media = Items.map((item: any) => ({
      media_id: item.media_id,
      type: item.type,
      url: item.url,
      course_id: item.course_id,
      lesson_id: item.lesson_id,
      filename: item.filename,
      created_at: item.created_at,
    }));
    
    // Apply filters
    if (mediaType) {
      media = media.filter((m) => m.type === mediaType);
    }
    if (courseId) {
      media = media.filter((m) => m.course_id === courseId);
    }
    if (lessonId) {
      media = media.filter((m) => m.lesson_id === lessonId);
    }
    
    const response: ApiSuccessResponse<{ media: typeof media }> = {
      data: { media },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing media:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list media',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/media/presign
 * Generate pre-signed URL for media upload
 */
export async function presignMediaUpload(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  const PresignSchema = z.object({
    media_type: z.enum(['cover', 'video', 'poster', 'attachment']),
    course_id: z.string().optional(),
    lesson_id: z.string().optional(),
    filename: z.string(),
    content_type: z.string(),
    temporary: z.boolean().optional(), // Flag to mark upload as temporary (for unsaved courses)
  });
  
  const parsed = PresignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const now = new Date().toISOString();
    const mediaId = `media_${uuidv4()}`;
    const fileExt = parsed.data.filename.split('.').pop() || '';
    const sanitizedFilename = `${mediaId}.${fileExt}`;
    
    // Build S3 key according to convention
    let s3Key = '';
    if (parsed.data.media_type === 'cover') {
      if (parsed.data.course_id && parsed.data.course_id !== 'new') {
        s3Key = `covers/${parsed.data.course_id}/${sanitizedFilename}`;
      } else if (parsed.data.temporary) {
        // Temporary media for unsaved courses/assets - use temp prefix
        s3Key = `temp/covers/${mediaId}/${sanitizedFilename}`;
      } else {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'course_id is required for cover images (or set temporary=true for unsaved entities)',
          },
          request_id: requestId,
        });
        return;
      }
    } else if (parsed.data.media_type === 'video' && parsed.data.course_id && parsed.data.lesson_id) {
      s3Key = `videos/${parsed.data.course_id}/${parsed.data.lesson_id}/${sanitizedFilename}`;
    } else if (parsed.data.media_type === 'poster' && parsed.data.course_id && parsed.data.lesson_id) {
      s3Key = `posters/${parsed.data.course_id}/${parsed.data.lesson_id}/${sanitizedFilename}`;
    } else if (parsed.data.media_type === 'attachment' && parsed.data.course_id && parsed.data.lesson_id) {
      s3Key = `attachments/${parsed.data.course_id}/${parsed.data.lesson_id}/${sanitizedFilename}`;
    } else {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media_type/course_id/lesson_id combination',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Generate pre-signed URL (15 minute expiry)
    const putCommand = new PutObjectCommand({
      Bucket: LMS_MEDIA_BUCKET,
      Key: s3Key,
      ContentType: parsed.data.content_type,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 900 });
    
    // Create media reference
    const mediaRef: MediaRef = {
      media_id: mediaId,
      type: parsed.data.media_type === 'cover' ? 'image' : parsed.data.media_type === 'video' ? 'video' : 'document',
      url: `https://${LMS_MEDIA_BUCKET}.s3.amazonaws.com/${s3Key}`, // Public URL (or use CloudFront in production)
      s3_bucket: LMS_MEDIA_BUCKET,
      s3_key: s3Key,
      filename: parsed.data.filename,
      content_type: parsed.data.content_type,
      created_at: now,
      created_by: userId,
    };
    
    // Store media metadata (for listMedia to query)
    // Note: LMS_CERTIFICATES_TABLE uses entity_type as partition key and SK as sort key
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const metadataCommand = new PutCommand({
      TableName: LMS_CERTIFICATES_TABLE, // Reusing table with entity_type pattern
      Item: {
        entity_type: 'MEDIA', // Partition key
        SK: mediaId, // Sort key
        ...mediaRef,
        course_id: parsed.data.course_id,
        lesson_id: parsed.data.lesson_id,
        temporary: parsed.data.temporary || false, // Mark as temporary if flag is set
      },
    });
    await dynamoDocClient.send(metadataCommand);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_media_presigned' as any, {
      media_id: mediaId,
      media_type: parsed.data.media_type,
      course_id: parsed.data.course_id,
      lesson_id: parsed.data.lesson_id,
    });
    
    const response: ApiSuccessResponse<{
      upload_url: string;
      bucket: string;
      key: string;
      media_ref: MediaRef;
    }> = {
      data: {
        upload_url: uploadUrl,
        bucket: LMS_MEDIA_BUCKET,
        key: s3Key,
        media_ref: mediaRef,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error generating presigned URL:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate presigned URL',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/lms/admin/media/:media_id/upload
 * Upload media file directly through API (proxy to avoid CORS issues)
 * Accepts file as raw binary in request body with media_id in URL
 */
export async function uploadMedia(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const mediaId = req.params.media_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  if (!mediaId) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'media_id is required in URL' },
      request_id: requestId,
    });
    return;
  }

  try {
    // Get file data from request body (raw buffer)
    const fileBuffer = Buffer.isBuffer(req.body) ? req.body : null;
    
    if (!fileBuffer || fileBuffer.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File data not found in request body',
        },
        request_id: requestId,
      });
      return;
    }

    // Get media metadata from query params
    const PresignSchema = z.object({
      content_type: z.string(),
    });

    const parsed = PresignSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    // Look up media metadata
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const mediaCommand = new GetCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Key: {
        entity_type: 'MEDIA',
        SK: mediaId,
      },
    });

    const { Item: mediaItem } = await dynamoDocClient.send(mediaCommand);
    if (!mediaItem || mediaItem.entity_type !== 'MEDIA') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Media not found. Call presignMediaUpload first.' },
        request_id: requestId,
      });
      return;
    }

    const mediaRef = mediaItem as any as MediaRef;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: mediaRef.s3_bucket,
      Key: mediaRef.s3_key,
      Body: fileBuffer,
      ContentType: parsed.data.content_type,
    });
    
    await s3Client.send(putCommand);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_media_uploaded' as any, {
      media_id: mediaId,
      media_type: mediaRef.type,
    });
    
    const response: ApiSuccessResponse<{
      media_ref: MediaRef;
    }> = {
      data: {
        media_ref: mediaRef,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error uploading media:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to upload media',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/media/:media_id/transcribe
 * Start transcription job for a video media file
 */
export async function startMediaTranscription(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const mediaId = req.params.media_id;

  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  if (!mediaId) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'media_id is required' },
      request_id: requestId,
    });
    return;
  }

  try {
    // Find media record
    const { GetCommand } = await import('@aws-sdk/lib-dynamodb');
    const mediaCommand = new GetCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Key: {
        entity_type: 'MEDIA',
        SK: mediaId,
      },
    });

    const { Item: mediaItem } = await dynamoDocClient.send(mediaCommand);
    if (!mediaItem || mediaItem.entity_type !== 'MEDIA') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Media not found' },
        request_id: requestId,
      });
      return;
    }

    const media = mediaItem as any as MediaRef;

    // Validate it's a video
    if (media.type !== 'video') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Transcription is only available for video media' },
        request_id: requestId,
      });
      return;
    }

    // Validate S3 location exists
    if (!media.s3_bucket || !media.s3_key) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Media must have S3 bucket and key' },
        request_id: requestId,
      });
      return;
    }

    // Check if transcription already in progress or complete
    if (media.transcription_status === 'processing' || media.transcription_status === 'queued') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Transcription already in progress' },
        request_id: requestId,
      });
      return;
    }

    // Generate job name (must be unique, use media_id + timestamp)
    const jobName = `transcribe_${mediaId}_${Date.now()}`;
    const mediaFileUri = `s3://${media.s3_bucket}/${media.s3_key}`;
    const outputKey = `transcripts/${jobName}.json`;
    const mediaFormat = media.content_type ? getMediaFormatFromContentType(media.content_type) : undefined;

    // Start transcription job
    const { status } = await startTranscriptionJob({
      jobName,
      mediaFileUri,
      outputBucket: media.s3_bucket,
      outputKey,
      languageCode: 'en-US',
      mediaFormat,
    });

    // Update media record with transcription job info
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const updateCommand = new UpdateCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Key: {
        entity_type: 'MEDIA',
        SK: mediaId,
      },
      UpdateExpression: 'SET transcription_job_id = :jobId, transcription_status = :status, transcription_language = :lang',
      ExpressionAttributeValues: {
        ':jobId': jobName,
        ':status': status === 'IN_PROGRESS' ? 'processing' : 'queued',
        ':lang': 'en-US',
      },
    });
    await dynamoDocClient.send(updateCommand);

    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_media_transcription_started' as any, {
      media_id: mediaId,
      transcription_job_id: jobName,
    });

    const response: ApiSuccessResponse<{
      transcription_job_id: string;
      status: string;
    }> = {
      data: {
        transcription_job_id: jobName,
        status: status === 'IN_PROGRESS' ? 'processing' : 'queued',
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error starting transcription:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start transcription',
      },
      request_id: requestId,
    });
  }
}

/**
 * DELETE /v1/lms/admin/media/:media_id
 * Delete media file and metadata
 */
export async function deleteMedia(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const mediaId = req.params.media_id;

  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  if (!mediaId) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'media_id is required' },
      request_id: requestId,
    });
    return;
  }

  try {
    // Find media record
    const { GetCommand, DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
    const mediaCommand = new GetCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Key: {
        entity_type: 'MEDIA',
        SK: mediaId,
      },
    });

    const { Item: mediaItem } = await dynamoDocClient.send(mediaCommand);
    if (!mediaItem || mediaItem.entity_type !== 'MEDIA') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Media not found' },
        request_id: requestId,
      });
      return;
    }

    // Delete from S3 if s3_key exists
    if (mediaItem.s3_key && mediaItem.s3_bucket) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: mediaItem.s3_bucket,
          Key: mediaItem.s3_key,
        });
        await s3Client.send(deleteCommand);
      } catch (s3Error) {
        // Log but don't fail if S3 delete fails (file might already be deleted)
        console.warn(`[${requestId}] Failed to delete S3 object ${mediaItem.s3_key}:`, s3Error);
      }
    }

    // Delete from DynamoDB
    const deleteCommand = new DeleteCommand({
      TableName: LMS_CERTIFICATES_TABLE,
      Key: {
        entity_type: 'MEDIA',
        SK: mediaId,
      },
    });
    await dynamoDocClient.send(deleteCommand);

    // Emit telemetry
    await emitLmsEvent(req, 'lms_admin_media_deleted' as any, {
      media_id: mediaId,
      media_type: mediaItem.media_type,
    });

    const response: ApiSuccessResponse<void> = {
      data: undefined,
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error deleting media:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete media',
      },
      request_id: requestId,
    });
  }
}

// ============================================================================
// AI IMAGE GENERATION
// ============================================================================

/**
 * POST /v1/lms/admin/ai/suggest-image-prompt
 * Generate image prompt suggestion from entity details
 */
export async function suggestImagePrompt(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const SuggestPromptSchema = z.object({
      title: z.string().min(1),
      short_description: z.string().optional(),
      description: z.string().optional(),
      entity_type: z.enum(['course', 'asset', 'role-playing']).optional(),
    });

    const parsed = SuggestPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const { title, short_description, description, entity_type } = parsed.data;

    // Build context for prompt generation
    const contextParts: string[] = [];
    contextParts.push(`Title: ${title}`);
    if (short_description) {
      contextParts.push(`Short Description: ${short_description}`);
    }
    if (description) {
      contextParts.push(`Description: ${description}`);
    }

    const context = contextParts.join('\n\n');

    // System prompt for image generation
    const systemPrompt = `You are an expert at creating image generation prompts for cover images. Create a detailed, visual prompt based on the provided information. 

Requirements:
- 16:9 aspect ratio (1600 x 900 recommended)
- Centered subject composition
- High contrast for visibility
- Professional appearance suitable for learning materials
- No text or embedded titles in the image (text will be overlaid)
- Avoid placing important elements near edges (will be cropped)

Focus on visual elements, composition, and style. Keep it concise but descriptive (under 200 words).`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create an image generation prompt for a ${entity_type || 'course'} cover image based on:\n\n${context}` },
    ];

    // Use default provider for prompt suggestion
    const response = await createChatCompletion(messages, {
      maxTokens: 300,
      temperature: 0.7,
    });

    const suggestedPrompt = response.content.trim();

    const apiResponse: ApiSuccessResponse<{ suggested_prompt: string }> = {
      data: { suggested_prompt: suggestedPrompt },
      request_id: requestId,
    };

    res.json(apiResponse);
  } catch (error) {
    console.error(`[${requestId}] Error suggesting image prompt:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to suggest image prompt',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/ai/generate-image
 * Generate image from prompt using AI service
 */
export async function generateAIImage(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const GenerateImageSchema = z.object({
      prompt: z.string().min(1),
      provider: z.enum(['openai', 'gemini']).optional(),
      size: z.enum(['256x256', '512x512', '1024x1024']).optional(),
      quality: z.enum(['standard', 'hd']).optional(),
      style: z.enum(['vivid', 'natural']).optional(),
    });

    const parsed = GenerateImageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const { prompt, provider, size, quality, style } = parsed.data;

    // Generate image using AI service
    const imageResponse = await generateImage(prompt, {
      provider,
      size: size || '1024x1024',
      quality: quality || 'standard',
      style: style || 'vivid',
    });

    const apiResponse: ApiSuccessResponse<{
      image_url: string;
      revised_prompt?: string;
      provider: string;
    }> = {
      data: {
        image_url: imageResponse.url,
        revised_prompt: imageResponse.revisedPrompt,
        provider: provider || 'openai',
      },
      request_id: requestId,
    };

    res.json(apiResponse);
  } catch (error) {
    console.error(`[${requestId}] Error generating image:`, error);
    
    // Handle AI provider errors
    if (error instanceof Error && error.name === 'AIConfigError') {
      res.status(400).json({
        error: {
          code: 'CONFIG_ERROR',
          message: error.message,
        },
        request_id: requestId,
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate image',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/admin/ai/download-image
 * Download image from external URL (proxy to avoid CORS)
 * Returns the image as a blob that can be uploaded to S3
 */
export async function downloadAIImage(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const DownloadImageSchema = z.object({
      image_url: z.string().url(),
    });

    const parsed = DownloadImageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const { image_url } = parsed.data;

    // Download image server-side to avoid CORS issues
    const imageResponse = await fetch(image_url, {
      headers: {
        'User-Agent': 'EnablementPortal/1.0',
      },
    });

    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Return image as base64-encoded data URL for frontend to use
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    const apiResponse: ApiSuccessResponse<{
      data_url: string;
      content_type: string;
      size_bytes: number;
    }> = {
      data: {
        data_url: dataUrl,
        content_type: contentType,
        size_bytes: imageBuffer.byteLength,
      },
      request_id: requestId,
    };

    res.json(apiResponse);
  } catch (error) {
    console.error(`[${requestId}] Error downloading image:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to download image',
      },
      request_id: requestId,
    });
  }
}

// ============================================================================
// UNSPLASH INTEGRATION
// ============================================================================

/**
 * Get Unsplash Access Key from SSM
 * For public API access, Unsplash uses the Access Key with Client-ID header format
 */
async function getUnsplashAccessKey(): Promise<string> {
  try {
    const command = new GetParameterCommand({
      Name: '/enablement-portal/unsplash/access-key',
      WithDecryption: true,
    });
    const response = await ssmClient.send(command);
    const accessKey = response.Parameter?.Value?.trim();

    if (!accessKey || accessKey === 'REPLACE_WITH_UNSPLASH_ACCESS_KEY') {
      throw new Error('Unsplash access key not configured in SSM Parameter Store');
    }

    return accessKey;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not configured')) {
      throw error;
    }
    throw new Error(`Failed to retrieve Unsplash access key from SSM: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * GET /v1/lms/admin/unsplash/search
 * Search Unsplash images (proxy to avoid CORS)
 */
export async function searchUnsplash(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const query = req.query.query as string | undefined;
    const page = parseInt(req.query.page as string || '1', 10);
    const perPage = Math.min(parseInt(req.query.per_page as string || '20', 10), 30); // Max 30 per page
    const orientation = (req.query.orientation as 'landscape' | 'portrait' | 'squarish') || 'landscape';

    const accessKey = await getUnsplashAccessKey();

    // Build Unsplash API URL
    const unsplashUrl = new URL('https://api.unsplash.com/search/photos');
    unsplashUrl.searchParams.set('query', query || '');
    unsplashUrl.searchParams.set('page', page.toString());
    unsplashUrl.searchParams.set('per_page', perPage.toString());
    unsplashUrl.searchParams.set('orientation', orientation);

    // Fetch from Unsplash API
    // Note: Unsplash public API uses Client-ID header format
    const unsplashResponse = await fetch(unsplashUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1', // Specify API version
      },
    });

    if (!unsplashResponse.ok) {
      const errorText = await unsplashResponse.text();
      console.error(`[${requestId}] Unsplash API error:`, {
        status: unsplashResponse.status,
        statusText: unsplashResponse.statusText,
        error: errorText,
        url: unsplashUrl.toString(),
        accessKeyLength: accessKey.length,
        accessKeyPrefix: accessKey.substring(0, 10) + '...',
      });
      
      // Provide helpful error message for 401 errors
      if (unsplashResponse.status === 401) {
        throw new Error(`Unsplash API authentication failed. Please verify your Access Key is valid and not expired in your Unsplash developer account. Error: ${errorText}`);
      }
      
      throw new Error(`Unsplash API error: ${unsplashResponse.status} ${errorText}`);
    }

    const unsplashData = await unsplashResponse.json();

    // Format response
    const results = (unsplashData.results || []).map((photo: any) => ({
      id: photo.id,
      urls: {
        raw: photo.urls.raw,
        full: photo.urls.full,
        regular: photo.urls.regular,
        small: photo.urls.small,
        thumb: photo.urls.thumb,
      },
      user: {
        name: photo.user.name,
        username: photo.user.username,
      },
      description: photo.description || photo.alt_description,
      width: photo.width,
      height: photo.height,
    }));

    const apiResponse: ApiSuccessResponse<{
      results: typeof results;
      total: number;
      total_pages: number;
    }> = {
      data: {
        results,
        total: unsplashData.total || 0,
        total_pages: unsplashData.total_pages || 0,
      },
      request_id: requestId,
    };

    res.json(apiResponse);
  } catch (error) {
    console.error(`[${requestId}] Error searching Unsplash:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to search Unsplash',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/admin/unsplash/trending
 * Get trending Unsplash images (proxy to avoid CORS)
 */
export async function getTrendingUnsplash(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const perPage = Math.min(parseInt(req.query.per_page as string || '20', 10), 30); // Max 30 per page

    const accessKey = await getUnsplashAccessKey();

    // Build Unsplash API URL for trending photos
    const unsplashUrl = new URL('https://api.unsplash.com/photos');
    unsplashUrl.searchParams.set('order_by', 'popular');
    unsplashUrl.searchParams.set('page', page.toString());
    unsplashUrl.searchParams.set('per_page', perPage.toString());
    unsplashUrl.searchParams.set('orientation', 'landscape'); // Default to landscape for 16:9

    // Fetch from Unsplash API
    // Note: Unsplash public API uses Client-ID header format
    const unsplashResponse = await fetch(unsplashUrl.toString(), {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1', // Specify API version
      },
    });

    if (!unsplashResponse.ok) {
      const errorText = await unsplashResponse.text();
      console.error(`[${requestId}] Unsplash API error:`, {
        status: unsplashResponse.status,
        statusText: unsplashResponse.statusText,
        error: errorText,
        url: unsplashUrl.toString(),
        accessKeyLength: accessKey.length,
        accessKeyPrefix: accessKey.substring(0, 10) + '...',
      });
      
      // Provide helpful error message for 401 errors
      if (unsplashResponse.status === 401) {
        throw new Error(`Unsplash API authentication failed. Please verify your Access Key is valid and not expired in your Unsplash developer account. Error: ${errorText}`);
      }
      
      throw new Error(`Unsplash API error: ${unsplashResponse.status} ${errorText}`);
    }

    const unsplashData = await unsplashResponse.json();

    // Format response (trending returns array directly)
    const results = (Array.isArray(unsplashData) ? unsplashData : []).map((photo: any) => ({
      id: photo.id,
      urls: {
        raw: photo.urls.raw,
        full: photo.urls.full,
        regular: photo.urls.regular,
        small: photo.urls.small,
        thumb: photo.urls.thumb,
      },
      user: {
        name: photo.user.name,
        username: photo.user.username,
      },
      description: photo.description || photo.alt_description,
      width: photo.width,
      height: photo.height,
    }));

    const apiResponse: ApiSuccessResponse<{
      results: typeof results;
      total: number;
      total_pages: number;
    }> = {
      data: {
        results,
        total: results.length,
        total_pages: 1, // Unsplash doesn't provide pagination info for trending
      },
      request_id: requestId,
    };

    res.json(apiResponse);
  } catch (error) {
    console.error(`[${requestId}] Error getting trending Unsplash images:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get trending Unsplash images',
      },
      request_id: requestId,
    });
  }
}

