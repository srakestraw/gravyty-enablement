/**
 * LMS API Handlers
 * 
 * Learner-facing LMS API endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { lmsRepo } from '../storage/dynamo/lmsRepo';
import { emitLmsEvent } from '../telemetry/lmsTelemetry';

/**
 * GET /v1/lms/health
 * LMS service health check
 */
export async function getLmsHealth(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  const response: ApiSuccessResponse<{ ok: boolean; service: string; version: string }> = {
    data: {
      ok: true,
      service: 'lms',
      version: '2.0.0',
    },
    request_id: requestId,
  };
  
  res.json(response);
}

/**
 * GET /v1/lms/courses
 * List published courses with optional filters
 */
export async function listCourses(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const q = req.query.q as string | undefined;
    const product = req.query.product as string | undefined;
    const product_suite = req.query.product_suite as string | undefined;
    const badge = req.query.badge as string | undefined;
    const badges = req.query.badges as string | undefined;
    const topic = req.query.topic as string | undefined;
    const topics = req.query.topics as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await lmsRepo.listPublishedCourses({
      query: q,
      product,
      product_suite,
      badge,
      badges: badges ? badges.split(',') : undefined,
      topic,
      topics: topics ? topics.split(',') : undefined,
      limit,
      cursor,
    });
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_courses_listed' as any, {
      query: q,
      result_count: result.items.length,
      has_more: !!result.next_cursor,
    });
    
    const response: ApiSuccessResponse<{ courses: typeof result.items; next_cursor?: string }> = {
      data: {
        courses: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing courses:`, error);
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
 * GET /v1/lms/courses/:courseId
 * Get course detail with lessons
 */
export async function getCourseDetail(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  
  try {
    const course = await lmsRepo.getCourseById(courseId, true);
    
    if (!course) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    const lessons = await lmsRepo.getLessonsForCourse(courseId);
    
    // Get user progress if authenticated
    let progress = null;
    if (req.user?.user_id) {
      progress = await lmsRepo.getProgress(req.user.user_id, courseId);
    }
    
    // Get related courses (same product suite or topic tags)
    const related = await lmsRepo.listPublishedCourses({
      product_suite: course.product_suite,
      limit: 5,
    });
    const relatedCourses = related.items
      .filter(c => c.course_id !== courseId)
      .slice(0, 4);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_course_viewed' as any, {
      course_id: courseId,
      has_progress: !!progress,
    });
    
    const response: ApiSuccessResponse<{
      course: typeof course;
      lessons: typeof lessons;
      progress: typeof progress;
      related_courses: typeof relatedCourses;
    }> = {
      data: {
        course,
        lessons,
        progress,
        related_courses: relatedCourses,
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting course detail:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get course detail',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/courses/:courseId/lessons/:lessonId
 * Get lesson detail
 */
export async function getLessonDetail(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId;
  const lessonId = req.params.lessonId;
  
  try {
    const course = await lmsRepo.getCourseById(courseId, true);
    
    if (!course) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    const lessons = await lmsRepo.getLessonsForCourse(courseId);
    const lesson = lessons.find(l => l.lesson_id === lessonId);
    
    if (!lesson) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Lesson not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Get user progress if authenticated
    let progress = null;
    if (req.user?.user_id) {
      progress = await lmsRepo.getProgress(req.user.user_id, courseId);
    }
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_lesson_viewed' as any, {
      course_id: courseId,
      lesson_id: lessonId,
    });
    
    const response: ApiSuccessResponse<{ lesson: typeof lesson; progress: typeof progress }> = {
      data: {
        lesson,
        progress,
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting lesson detail:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get lesson detail',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/paths
 * List published learning paths
 */
export async function listPaths(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await lmsRepo.listPublishedPaths({
      limit,
      cursor,
    });
    
    // Get user progress for paths if authenticated
    let pathsWithProgress = result.items;
    if (req.user?.user_id) {
      const progressPromises = result.items.map(path =>
        lmsRepo.getUserPathProgress(req.user!.user_id!, path.path_id)
      );
      const progressList = await Promise.all(progressPromises);
      
      pathsWithProgress = result.items.map((path, idx) => ({
        ...path,
        progress: progressList[idx] || undefined,
      }));
    }
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_paths_listed' as any, {
      result_count: result.items.length,
      has_more: !!result.next_cursor,
    });
    
    const response: ApiSuccessResponse<{ paths: typeof pathsWithProgress; next_cursor?: string }> = {
      data: {
        paths: pathsWithProgress,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing paths:`, error);
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
 * GET /v1/lms/paths/:pathId
 * Get learning path detail
 */
export async function getPathDetail(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const pathId = req.params.pathId;
  
  try {
    const path = await lmsRepo.getPathById(pathId, true);
    
    if (!path) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Learning path not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Get user progress if authenticated
    let progress = null;
    if (req.user?.user_id) {
      progress = await lmsRepo.getUserPathProgress(req.user.user_id, pathId);
    }
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_path_viewed' as any, {
      path_id: pathId,
      has_progress: !!progress,
    });
    
    const response: ApiSuccessResponse<{ path: typeof path; progress: typeof progress }> = {
      data: {
        path,
        progress,
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting path detail:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get path detail',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/paths/:pathId/start
 * Start a learning path (enroll in all courses)
 */
export async function startPath(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const pathId = req.params.pathId;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const path = await lmsRepo.getPathById(pathId, true);
    
    if (!path) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Learning path not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Enroll user in all courses in the path
    const enrollments = await Promise.all(
      path.courses.map(course =>
        lmsRepo.upsertEnrollment(userId, course.course_id, 'self_enrolled')
      )
    );
    
    // Create or update path progress
    // First get existing progress or create new
    let progress = await lmsRepo.getUserPathProgress(userId, pathId);
    if (!progress) {
      // Create new path progress
      const now = new Date().toISOString();
      progress = {
        user_id: userId,
        path_id: pathId,
        enrollment_origin: 'self_enrolled',
        enrolled_at: now,
        total_courses: path.courses.length,
        completed_courses: 0,
        percent_complete: 0,
        status: 'in_progress',
        completed: false,
        started_at: now,
        last_activity_at: now,
        updated_at: now,
      };
    }
    await lmsRepo.upsertUserPathProgress(progress);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_path_started' as any, {
      path_id: pathId,
      course_count: path.courses.length,
    });
    
    const response: ApiSuccessResponse<{ progress: typeof progress }> = {
      data: { progress },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error starting path:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to start path',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/enrollments
 * Create enrollment in a course
 */
export async function createEnrollment(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const courseId = req.body.course_id as string;
    const origin = (req.body.enrollment_origin || 'self_enrolled') as 'self_enrolled' | 'assigned' | 'required' | 'recommended';
    
    if (!courseId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'course_id is required',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Verify course exists and is published
    const course = await lmsRepo.getCourseById(courseId, true);
    if (!course) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    const enrollment = await lmsRepo.upsertEnrollment(userId, courseId, origin);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_enrollment_created' as any, {
      course_id: courseId,
      origin,
    });
    
    const response: ApiSuccessResponse<{ enrollment: typeof enrollment }> = {
      data: { enrollment },
      request_id: requestId,
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating enrollment:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create enrollment',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/lms/progress
 * Update course progress
 */
export async function updateProgress(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const courseId = req.body.course_id as string;
    const lessonId = req.body.lesson_id as string;
    const completed = req.body.completed as boolean | undefined;
    const percentComplete = req.body.percent_complete as number | undefined;
    const positionMs = req.body.position_ms as number | undefined;
    
    if (!courseId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'course_id is required',
        },
        request_id: requestId,
      });
      return;
    }
    
    if (!lessonId) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'lesson_id is required',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Verify course exists
    const course = await lmsRepo.getCourseById(courseId, true);
    if (!course) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Update progress
    const result = await lmsRepo.updateProgress(userId, courseId, {
      lesson_id: lessonId,
      completed,
      percent_complete: percentComplete,
      position_ms: positionMs,
    });
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_progress_updated' as any, {
      course_id: courseId,
      lesson_id: lessonId,
      percent_complete: result.progress.percent_complete,
      completed: result.progress.completed,
    });
    
    const response: ApiSuccessResponse<{ progress: typeof result.progress }> = {
      data: { progress: result.progress },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating progress:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update progress',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/me
 * Get user's learning summary
 */
export async function getMyLearning(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    // Get user enrollments (course progress) and path progress
    // Query progress table for all courses (SK starts with COURSE#)
    const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
    const { dynamoDocClient } = await import('../aws/dynamoClient');
    const { LMS_PROGRESS_TABLE } = await import('../storage/dynamo/lmsRepo');
    
    const courseProgressCommand = new QueryCommand({
      TableName: LMS_PROGRESS_TABLE,
      KeyConditionExpression: 'user_id = :userId AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':skPrefix': 'COURSE#',
      },
      Limit: 100,
    });
    
    const courseProgressResult = await dynamoDocClient.send(courseProgressCommand);
    const enrollments = (courseProgressResult.Items || []).map((item: any) => ({
      user_id: item.user_id,
      course_id: item.course_id,
      enrollment_origin: item.enrollment_origin,
      enrolled_at: item.enrolled_at,
      percent_complete: item.percent_complete || 0,
      completed: item.completed || false,
      completed_at: item.completed_at,
      lesson_progress: item.lesson_progress || {},
      current_lesson_id: item.current_lesson_id,
      last_position_ms: item.last_position_ms,
      started_at: item.started_at,
      last_accessed_at: item.last_accessed_at,
      updated_at: item.updated_at,
    }));
    
    const pathsResult = await lmsRepo.listUserPathProgress(userId, { limit: 100 });
    
    const myLearning = {
      enrollments,
      paths: pathsResult.items,
    };
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_my_learning_viewed' as any, {
      enrollment_count: myLearning.enrollments.length,
      path_count: myLearning.paths.length,
    });
    
    const response: ApiSuccessResponse<{ my_learning: typeof myLearning }> = {
      data: { my_learning: myLearning },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting my learning:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get my learning',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/assignments
 * List user's assignments
 */
export async function listAssignments(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const assignments = await lmsRepo.listUserAssignments(userId);
    // Filter by status if provided
    const status = req.query.status as string | undefined;
    const filteredAssignments = status
      ? assignments.filter(a => a.status === status)
      : assignments;
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_assignments_listed' as any, {
      status,
      result_count: filteredAssignments.length,
    });
    
    const response: ApiSuccessResponse<{ assignments: typeof filteredAssignments }> = {
      data: { assignments: filteredAssignments },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing assignments:`, error);
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
 * GET /v1/lms/certificates
 * List user's certificates
 */
export async function listCertificates(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const certificates = await lmsRepo.listUserIssuedCertificates(userId);
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_certificates_listed' as any, {
      result_count: certificates.length,
    });
    
    const response: ApiSuccessResponse<{ certificates: typeof certificates }> = {
      data: { certificates },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing certificates:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list certificates',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/certificates/:certificateId
 * Get certificate detail
 */
export async function getCertificate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const certificateId = req.params.certificateId;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const certificate = await lmsRepo.getIssuedCertificate(certificateId, userId);
    
    if (!certificate) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Certificate not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_certificate_viewed' as any, {
      certificate_id: certificateId,
    });
    
    const response: ApiSuccessResponse<{ certificate: typeof certificate }> = {
      data: { certificate },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting certificate:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get certificate',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/lms/certificates/:certificateId/download
 * Download certificate PDF
 */
export async function downloadCertificate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const certificateId = req.params.certificateId;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }
  
  try {
    const certificate = await lmsRepo.getIssuedCertificate(certificateId, userId);
    
    if (!certificate) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Certificate not found',
        },
        request_id: requestId,
      });
      return;
    }
    
    // Generate presigned URL for certificate PDF from S3
    // Certificate PDFs are stored in S3 at: certificates/{certificate_id}.pdf
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { s3Client } = await import('../aws/s3Client');
    const { LMS_MEDIA_BUCKET } = await import('../storage/dynamo/lmsRepo');
    
    const command = new GetObjectCommand({
      Bucket: LMS_MEDIA_BUCKET,
      Key: `certificates/${certificateId}.pdf`,
    });
    
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Emit telemetry
    await emitLmsEvent(req, 'lms_certificate_downloaded' as any, {
      certificate_id: certificateId,
    });
    
    // Redirect to presigned URL
    res.redirect(downloadUrl);
  } catch (error) {
    console.error(`[${requestId}] Error downloading certificate:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to download certificate',
      },
      request_id: requestId,
    });
  }
}
