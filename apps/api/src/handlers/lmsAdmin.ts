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
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../aws/s3Client';

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
    cover_image: z.object({
      media_id: z.string(),
      type: z.enum(['image', 'video', 'document', 'audio', 'other']),
      url: z.string().url(),
      created_at: z.string(),
      created_by: z.string(),
    }).optional(),
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
      estimated_duration_minutes: z.number().optional(),
      required: z.boolean().optional(),
      video_media: z.object({
        media_id: z.string(),
        url: z.string(),
      }).optional(),
      transcript: z.object({
        segments: z.array(z.object({
          start_ms: z.number(),
          end_ms: z.number(),
          text: z.string(),
        })),
        full_text: z.string().optional(),
      }).optional(),
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
              product_suite: course.product_suite,
              product_concept: course.product_concept,
              topic_tags: course.topic_tags || [],
              estimated_duration_minutes: course.estimated_duration_minutes,
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
    if (parsed.data.media_type === 'cover' && parsed.data.course_id) {
      s3Key = `covers/${parsed.data.course_id}/${sanitizedFilename}`;
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
    const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
    const metadataCommand = new PutCommand({
      TableName: LMS_CERTIFICATES_TABLE, // Reusing table with entity_type pattern
      Item: {
        PK: 'MEDIA',
        SK: mediaId,
        entity_type: 'MEDIA',
        ...mediaRef,
        course_id: parsed.data.course_id,
        lesson_id: parsed.data.lesson_id,
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

