/**
 * LMS API Handlers
 * 
 * Learner-facing endpoints for LMS v2.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { lmsRepo } from '../storage/dynamo/lmsRepo';
import { emitLmsEvent, LMS_EVENTS } from '../telemetry/lmsTelemetry';
import { computePathRollup } from '../lms/pathRollup';
import type {
  CourseSummary,
  CourseDetail,
  LessonDetail,
  LearningPathSummary,
  LearningPathDetail,
  PathSummary,
  PathDetail,
  MyLearning,
  AssignmentSummary,
  CertificateSummary,
  CourseProgress,
  PathProgress,
  EnrollmentOrigin,
  CertificateTemplate,
  LearningPath,
} from '@gravyty/domain';

/**
 * GET /v1/lms/health
 */
export async function getLmsHealth(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const response: ApiSuccessResponse<{ ok: boolean; service: string; version: string }> = {
    data: {
      ok: true,
      service: 'lms',
      version: 'v2',
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
    // Parse query parameters
    const query = req.query.q as string | undefined;
    const productSuite = req.query.product_suite as string | undefined;
    const productConcept = req.query.product_concept as string | undefined;
    const badge = req.query.badge as string | undefined;
    const badges = req.query.badges
      ? (req.query.badges as string).split(',').map((b) => b.trim())
      : undefined;
    const topic = req.query.topic as string | undefined;
    const topics = req.query.topics
      ? (req.query.topics as string).split(',').map((t) => t.trim())
      : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    const result = await lmsRepo.listPublishedCourses({
      query,
      product_suite: productSuite,
      product_concept: productConcept,
      badge,
      badges,
      topic,
      topics,
      limit,
      cursor,
    });

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.COURSES_LISTED, {
      q: query,
      product_suite: productSuite,
      product_concept: productConcept,
      badge_filters: badges || (badge ? [badge] : undefined),
      topic_filters: topics || (topic ? [topic] : undefined),
      result_count: result.items.length,
    });

    const response: ApiSuccessResponse<{ courses: CourseSummary[]; next_cursor?: string }> = {
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
 * GET /v1/lms/paths
 * List published learning paths with rollup progress
 */
export async function listPaths(req: AuthenticatedRequest, res: Response) {
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

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    const result = await lmsRepo.listPublishedPaths({
      limit,
      cursor,
    });

    // Enrich with rollup progress
    const pathsWithProgress: PathSummary[] = await Promise.all(
      result.items.map(async (pathSummary) => {
        const path = await lmsRepo.getPathById(pathSummary.path_id, true);
        if (!path) {
          return { ...pathSummary, progress: undefined };
        }
        // Get existing progress for timestamp preservation
        const existingProgress = await lmsRepo.getUserPathProgress(userId, path.path_id);
        const progress = await computePathRollup(userId, path, existingProgress);
        return {
          ...pathSummary,
          progress,
        };
      })
    );

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.PATHS_LISTED, {
      result_count: pathsWithProgress.length,
    });

    const response: ApiSuccessResponse<{ paths: PathSummary[]; next_cursor?: string }> = {
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
 * GET /v1/lms/courses/:courseId
 * Get course detail with outline
 */
export async function getCourseDetail(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.courseId as string;

  try {
    const course = await lmsRepo.getCourseById(courseId, true);
    if (!course) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Course ${courseId} not found or not published`,
        },
        request_id: requestId,
      });
      return;
    }

    // Hydrate related courses
    const relatedCourses: CourseSummary[] = [];
    if (course.related_course_ids && course.related_course_ids.length > 0) {
      for (const relatedId of course.related_course_ids) {
        const relatedCourse = await lmsRepo.getCourseDraftOrPublished(relatedId);
        if (relatedCourse && relatedCourse.status === 'published') {
          relatedCourses.push({
            course_id: relatedCourse.course_id,
            title: relatedCourse.title,
            short_description: relatedCourse.short_description,
            cover_image_url: relatedCourse.cover_image?.url,
            product_suite: relatedCourse.product_suite,
            product_concept: relatedCourse.product_concept,
            topic_tags: relatedCourse.topic_tags || [],
            estimated_duration_minutes: relatedCourse.estimated_duration_minutes,
            difficulty_level: relatedCourse.difficulty_level,
            status: relatedCourse.status,
            published_at: relatedCourse.published_at,
          });
        }
      }
    }

    // Fetch all lessons for the course
    const allLessons = await lmsRepo.getLessonsForCourse(courseId);
    const lessonsById = new Map(allLessons.map((l) => [l.lesson_id, l]));

    // Build course detail with hydrated lesson summaries
    const courseDetail: CourseDetail = {
      ...course,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: section.lesson_ids
          .map((lessonId) => {
            const lesson = lessonsById.get(lessonId);
            if (!lesson) {
              return null;
            }
            return {
              lesson_id: lesson.lesson_id,
              title: lesson.title,
              type: lesson.type,
              order: lesson.order,
              estimated_duration_minutes: lesson.estimated_duration_minutes,
              required: lesson.required ?? true,
            };
          })
          .filter((l): l is NonNullable<typeof l> => l !== null)
          .sort((a, b) => a.order - b.order),
      })),
    };

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.COURSE_VIEWED, {
      course_id: courseId,
    });

    const response: ApiSuccessResponse<{ course: CourseDetail; related_courses: CourseSummary[] }> =
      {
        data: {
          course: courseDetail,
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
  const courseId = req.params.courseId as string;
  const lessonId = req.params.lessonId as string;

  try {
    const lesson = await lmsRepo.getLesson(courseId, lessonId);
    if (!lesson) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Lesson ${lessonId} not found in course ${courseId}`,
        },
        request_id: requestId,
      });
      return;
    }

    // Build lesson detail
    const lessonDetail: LessonDetail = {
      ...lesson,
      video_media: lesson.video_media,
      transcript: lesson.transcript,
      resources: [], // MVP: resources placeholder
    };

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.LESSON_VIEWED, {
      course_id: courseId,
      lesson_id: lessonId,
    });

    const response: ApiSuccessResponse<{ lesson: LessonDetail }> = {
      data: {
        lesson: lessonDetail,
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
 * GET /v1/lms/paths/:pathId
 * Get path detail with rollup progress
 */
export async function getPathDetail(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const pathId = req.params.pathId as string;
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

  try {
    const path = await lmsRepo.getPathById(pathId, true);
    if (!path) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Path ${pathId} not found or not published`,
        },
        request_id: requestId,
      });
      return;
    }

    // Hydrate course summaries and get completion states
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
        return {
          ...courseRef,
          course: undefined,
        };
      })
    );

    // Compute rollup progress (get existing for timestamp preservation)
    const existingProgress = await lmsRepo.getUserPathProgress(userId, path.path_id);
    const progress = await computePathRollup(userId, path, existingProgress);

    // Get course completion states
    const courseCompletion: Record<string, boolean> = {};
    for (const courseRef of path.courses) {
      const courseProgress = await lmsRepo.getProgress(userId, courseRef.course_id);
      courseCompletion[courseRef.course_id] = courseProgress?.completed || false;
    }

    const pathDetail: PathDetail = {
      ...path,
      courses: hydratedCourses,
      progress,
      course_completion: courseCompletion,
    };

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.PATH_VIEWED, {
      path_id: pathId,
    });

    const response: ApiSuccessResponse<{ path: PathDetail }> = {
      data: {
        path: pathDetail,
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
 * Start a learning path (creates progress row if not exists)
 */
export async function startPath(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const pathId = req.params.pathId as string;
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

  try {
    const path = await lmsRepo.getPathById(pathId, true);
    if (!path) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Path ${pathId} not found or not published`,
        },
        request_id: requestId,
      });
      return;
    }

    // Get or create path progress
    let pathProgress = await lmsRepo.getUserPathProgress(userId, pathId);
    const now = new Date().toISOString();

    if (!pathProgress) {
      // Create new path progress
      const progress = await computePathRollup(userId, path, null);
      pathProgress = {
        user_id: userId,
        path_id: pathId,
        enrollment_origin: 'self_enrolled',
        enrolled_at: now,
        total_courses: progress.total_courses,
        completed_courses: progress.completed_courses,
        percent_complete: progress.percent_complete,
        status: progress.status,
        completed: progress.status === 'completed',
        completed_at: progress.completed_at,
        next_course_id: progress.next_course_id,
        started_at: progress.started_at || now,
        last_activity_at: progress.last_activity_at || now,
        updated_at: now,
      };
      await lmsRepo.upsertUserPathProgress(pathProgress);
    } else if (!pathProgress.started_at) {
      // Update started_at if not set and recompute rollup to ensure timestamps are correct
      const progress = await computePathRollup(userId, path, pathProgress);
      pathProgress.started_at = progress.started_at || now;
      pathProgress.last_activity_at = progress.last_activity_at || now;
      pathProgress.updated_at = now;
      await lmsRepo.upsertUserPathProgress(pathProgress);
    }

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.PATH_STARTED, {
      path_id: pathId,
    });

    const response: ApiSuccessResponse<{ progress: PathProgress }> = {
      data: {
        progress: pathProgress,
      },
      request_id: requestId,
    };
    res.status(201).json(response);
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
 * Enroll in a course (idempotent)
 */
export async function createEnrollment(req: AuthenticatedRequest, res: Response) {
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

  // Validate request body - use domain contract EnrollmentOriginSchema
  const EnrollmentRequestSchema = z.object({
    course_id: z.string(),
    origin: z.enum(['self_enrolled', 'assigned', 'required', 'recommended']).optional().default('self_enrolled'),
  });

  const parsed = EnrollmentRequestSchema.safeParse(req.body);
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

  const { course_id, origin = 'self_enrolled' } = parsed.data;

  try {
    // Verify course exists and is published
    const course = await lmsRepo.getCourseById(course_id, true);
    if (!course) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Course ${course_id} not found or not published`,
        },
        request_id: requestId,
      });
      return;
    }

    // Upsert enrollment (idempotent)
    const progress = await lmsRepo.upsertEnrollment(userId, course_id, origin);

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.ENROLLED, {
      course_id,
      enrollment_origin: origin,
    });

    const response: ApiSuccessResponse<{ enrollment: CourseProgress }> = {
      data: {
        enrollment: progress,
      },
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
 * Helper: Issue certificate for course/path completion
 */
async function issueCertificateForCompletion(
  req: AuthenticatedRequest,
  userId: string,
  completionType: 'course' | 'path',
  courseId: string | undefined,
  pathId: string | undefined,
  completionDate: string
): Promise<void> {
  const targetId = completionType === 'course' ? courseId : pathId;
  if (!targetId) {
    return;
  }

  // Get published templates for this course/path
  const templates = await lmsRepo.getPublishedTemplatesForTarget(completionType, targetId);
  if (templates.length === 0) {
    return; // No templates configured
  }

  // Get course/path details for certificate data
  let courseTitle: string | undefined;
  let pathTitle: string | undefined;
  let recipientName = userId; // Fallback to user_id if name not available

  if (completionType === 'course' && courseId) {
    const course = await lmsRepo.getCourseDraftOrPublished(courseId);
    if (course) {
      courseTitle = course.title;
    }
  } else if (completionType === 'path' && pathId) {
    const path = await lmsRepo.getPathById(pathId, false); // Allow draft/published for admin context
    if (path) {
      pathTitle = path.title;
    }
  }

  // Issue certificate for each matching template (idempotent)
  for (const template of templates) {
    try {
      const { certificate, isNew } = await lmsRepo.issueCertificate(
        userId,
        template.template_id,
        completionType,
        courseId,
        pathId,
        {
          recipient_name: recipientName,
          course_title: courseTitle,
          path_title: pathTitle,
          completion_date: completionDate,
          badge_text: template.badge_text,
          signatory_name: template.signatory_name,
          signatory_title: template.signatory_title,
          issued_copy: template.issued_copy,
        }
      );

      // Emit telemetry only for newly issued certificates (not duplicates)
      if (isNew) {
        await emitLmsEvent(req, LMS_EVENTS.CERTIFICATE_ISSUED, {
          certificate_id: certificate.certificate_id,
          template_id: template.template_id,
          completion_type: completionType,
          course_id: courseId,
          path_id: pathId,
        });
      }
    } catch (error) {
      // Log but continue with other templates
      console.error(`Error issuing certificate ${template.template_id}:`, error);
    }
  }
}

/**
 * POST /v1/lms/progress
 * Update progress (idempotent)
 */
export async function updateProgress(req: AuthenticatedRequest, res: Response) {
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

  // Validate request body
  const ProgressUpdateSchema = z.object({
    course_id: z.string(),
    lesson_id: z.string(),
    position_ms: z.number().int().min(0).optional(),
    percent_complete: z.number().int().min(0).max(100).optional(),
    completed: z.boolean().optional(),
  });

  const parsed = ProgressUpdateSchema.safeParse(req.body);
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

  const { course_id, lesson_id, position_ms, percent_complete, completed } = parsed.data;

  try {
    // Update progress (idempotent) - returns whether progress event should be emitted
    const { progress: updatedProgress, shouldEmitProgressEvent, lessonCompleted } = await lmsRepo.updateProgress(
      userId,
      course_id,
      {
        lesson_id,
        position_ms,
        percent_complete,
        completed,
      }
    );

    // Emit progress telemetry (rate-limited to once per 30 seconds per user+course+lesson)
    if (shouldEmitProgressEvent) {
      await emitLmsEvent(req, LMS_EVENTS.PROGRESS_UPDATED, {
        course_id,
        lesson_id,
        progress_percent: updatedProgress.percent_complete,
        position_ms,
        completed: updatedProgress.completed,
      });
    }

    // Emit lesson completion event if lesson was just completed
    if (lessonCompleted) {
      await emitLmsEvent(req, LMS_EVENTS.LESSON_COMPLETED, {
        course_id,
        lesson_id,
        progress_percent: 100,
        completed: true,
      });
    }

    // Emit course completion event if course completed
    if (updatedProgress.completed && updatedProgress.completed_at) {
      await emitLmsEvent(req, LMS_EVENTS.COURSE_COMPLETED, {
        course_id,
        completed: true,
        completed_at: updatedProgress.completed_at,
      });

      // Issue certificate if template exists (idempotent)
      try {
        await issueCertificateForCompletion(
          req,
          userId,
          'course',
          course_id,
          undefined,
          updatedProgress.completed_at
        );
      } catch (error) {
        // Log but don't fail the request if certificate issuance fails
        console.error(`[${requestId}] Error issuing certificate for course completion:`, error);
      }

      // Update path rollups for published paths containing this course
      try {
        const affectedPaths = await lmsRepo.getPublishedPathsForCourse(course_id);
        const now = new Date().toISOString();

        for (const path of affectedPaths) {
          // Get existing progress first (for timestamp preservation)
          let pathProgress = await lmsRepo.getUserPathProgress(userId, path.path_id);
          
          // Track previous state for telemetry (only emit on change)
          const prevCompleted = pathProgress?.completed || false;
          const prevPercentComplete = pathProgress?.percent_complete || 0;
          const prevCompletedCourses = pathProgress?.completed_courses || 0;

          // Compute rollup deterministically (pass existing progress for timestamp preservation)
          const rollup = await computePathRollup(userId, path, pathProgress);

          if (!pathProgress) {
            // Create new path progress
            pathProgress = {
              user_id: userId,
              path_id: path.path_id,
              enrollment_origin: 'self_enrolled',
              enrolled_at: now,
              total_courses: rollup.total_courses,
              completed_courses: rollup.completed_courses,
              percent_complete: rollup.percent_complete,
              status: rollup.status,
              completed: rollup.status === 'completed',
              completed_at: rollup.completed_at,
              next_course_id: rollup.next_course_id,
              started_at: rollup.started_at,
              last_activity_at: rollup.last_activity_at || now,
              updated_at: now,
            };
          } else {
            // Update existing progress (preserve timestamps idempotently)
            pathProgress.total_courses = rollup.total_courses;
            pathProgress.completed_courses = rollup.completed_courses;
            pathProgress.percent_complete = rollup.percent_complete;
            pathProgress.status = rollup.status;
            pathProgress.next_course_id = rollup.next_course_id;
            pathProgress.last_activity_at = rollup.last_activity_at || now;
            pathProgress.updated_at = now;

            // Preserve started_at (set once on first transition)
            if (rollup.started_at && !pathProgress.started_at) {
              pathProgress.started_at = rollup.started_at;
            }

            // Preserve completed_at (set once when completed, never overwritten)
            if (rollup.completed_at && !pathProgress.completed_at) {
              pathProgress.completed = true;
              pathProgress.completed_at = rollup.completed_at;
            } else if (rollup.status === 'completed') {
              pathProgress.completed = true;
            }
          }

          await lmsRepo.upsertUserPathProgress(pathProgress);

          // Emit telemetry only when state changes (avoid noisy telemetry)
          const progressChanged =
            pathProgress.percent_complete !== prevPercentComplete ||
            pathProgress.completed_courses !== prevCompletedCourses;

          if (progressChanged) {
            await emitLmsEvent(req, LMS_EVENTS.PATH_PROGRESS_UPDATED, {
              path_id: path.path_id,
              percent_complete: pathProgress.percent_complete,
              completed_courses: pathProgress.completed_courses,
              total_courses: pathProgress.total_courses,
            });
          }

          // Emit path completion event only when path just became completed
          if (pathProgress.completed && !prevCompleted && pathProgress.completed_at) {
            await emitLmsEvent(req, LMS_EVENTS.PATH_COMPLETED, {
              path_id: path.path_id,
              completed_at: pathProgress.completed_at,
            });

            // Issue path certificate if template exists
            try {
              await issueCertificateForCompletion(
                req,
                userId,
                'path',
                undefined,
                path.path_id,
                pathProgress.completed_at
              );
            } catch (error) {
              console.error(`[${requestId}] Error issuing certificate for path completion:`, error);
            }
          }
        }
      } catch (error) {
        // Log but don't fail the request if path rollup update fails
        console.error(`[${requestId}] Error updating path rollups:`, error);
      }
    }

    const response: ApiSuccessResponse<{ progress: CourseProgress }> = {
      data: {
        progress: updatedProgress,
      },
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
 * Get learner's personalized learning dashboard
 */
export async function getMyLearning(req: AuthenticatedRequest, res: Response) {
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

  try {
    // Get assignments (required items)
    const assignments = await lmsRepo.listUserAssignments(userId);
    const required = await Promise.all(
      assignments
        .filter((a) => a.status !== 'completed' && a.status !== 'waived')
        .slice(0, 50)
        .map(async (assignment) => {
          let title = '';
          if (assignment.assignment_type === 'course' && assignment.course_id) {
            const course = await lmsRepo.getCourseDraftOrPublished(assignment.course_id);
            title = course?.title || '';
          } else if (assignment.assignment_type === 'path' && assignment.path_id) {
            const path = await lmsRepo.getPathById(assignment.path_id, false);
            title = path?.title || '';
          }

          return {
            type: assignment.assignment_type,
            course_id: assignment.course_id,
            path_id: assignment.path_id,
            title,
            due_at: assignment.due_at,
            assignment_id: assignment.assignment_id,
            progress_percent: assignment.progress_percent,
          };
        })
    );

    // Get in-progress items from progress table
    // For MVP, we'll scan user progress (in production, use GSI)
    // This is simplified - in production, use a GSI or separate query
    const inProgress: MyLearning['in_progress'] = [];
    const completed: MyLearning['completed'] = [];

    // MVP: Simplified approach - would need GSI or batch queries in production
    // For now, return empty arrays and hydrate from assignments
    const myLearning: MyLearning = {
      required,
      in_progress: inProgress,
      completed: completed,
    };

    const response: ApiSuccessResponse<{ learning: MyLearning }> = {
      data: {
        learning: myLearning,
      },
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
 * List user assignments
 */
export async function listAssignments(req: AuthenticatedRequest, res: Response) {
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

  try {
    const assignments = await lmsRepo.listUserAssignments(userId);

    // Hydrate titles
    const hydratedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        let title = '';
        if (assignment.assignment_type === 'course' && assignment.course_id) {
          const course = await lmsRepo.getCourseDraftOrPublished(assignment.course_id);
          title = course?.title || '';
        } else if (assignment.assignment_type === 'path' && assignment.path_id) {
          const path = await lmsRepo.getPathById(assignment.path_id, false);
          title = path?.title || '';
        }

        return {
          ...assignment,
          title,
        };
      })
    );

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.ASSIGNMENTS_LISTED, {
      assignment_count: hydratedAssignments.length,
    });

    const response: ApiSuccessResponse<{ assignments: AssignmentSummary[] }> = {
      data: {
        assignments: hydratedAssignments,
      },
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
 * List user issued certificates
 */
export async function listCertificates(req: AuthenticatedRequest, res: Response) {
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

  try {
    const certificates = await lmsRepo.listUserIssuedCertificates(userId);

    // Hydrate template names
    const hydratedCertificates = await Promise.all(
      certificates.map(async (cert) => {
        const template = await lmsRepo.getCertificateTemplate(cert.template_id);
        return {
          ...cert,
          template_name: template?.name || cert.template_id,
        };
      })
    );

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.CERTIFICATES_LISTED, {
      certificate_count: hydratedCertificates.length,
    });

    const response: ApiSuccessResponse<{ certificates: CertificateSummary[] }> = {
      data: {
        certificates: hydratedCertificates,
      },
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
 * Get certificate by ID
 */
export async function getCertificate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const certificateId = req.params.certificateId;

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

  try {
    const certificate = await lmsRepo.getIssuedCertificate(certificateId, userId);
    if (!certificate) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Certificate ${certificateId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    // Hydrate template name
    const template = await lmsRepo.getCertificateTemplate(certificate.template_id);
    const summary: CertificateSummary = {
      certificate_id: certificate.certificate_id,
      template_id: certificate.template_id,
      template_name: template?.name || certificate.template_id,
      recipient_name: certificate.certificate_data.recipient_name,
      course_title: certificate.certificate_data.course_title,
      path_title: certificate.certificate_data.path_title,
      completion_date: certificate.certificate_data.completion_date,
      issued_at: certificate.issued_at,
      badge_text: certificate.certificate_data.badge_text,
    };

    const response: ApiSuccessResponse<{ certificate: CertificateSummary }> = {
      data: { certificate: summary },
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
 * Download certificate as PDF
 */
export async function downloadCertificate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  const certificateId = req.params.certificateId;

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

  try {
    const certificate = await lmsRepo.getIssuedCertificate(certificateId, userId);
    if (!certificate) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Certificate ${certificateId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    // Get template for additional context
    const template = await lmsRepo.getCertificateTemplate(certificate.template_id);

    // Generate PDF on demand
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificate-${certificate.certificate_id}.pdf"`
    );
    res.setHeader('Cache-Control', 'private, no-store'); // Prevent caching of certificates

    // Pipe PDF to response
    doc.pipe(res);

    // Certificate content
    const title = template?.name || 'Certificate of Completion';
    const recipientName = certificate.certificate_data.recipient_name;
    const completionDate = new Date(certificate.certificate_data.completion_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const badgeText = certificate.certificate_data.badge_text;
    const issuedCopy = certificate.certificate_data.issued_copy;
    const signatoryName = certificate.certificate_data.signatory_name;
    const signatoryTitle = certificate.certificate_data.signatory_title;
    const courseTitle = certificate.certificate_data.course_title || certificate.certificate_data.path_title || '';

    // Draw certificate
    doc.fontSize(32).font('Helvetica-Bold').text(issuedCopy.title || title, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(16).font('Helvetica').text('This is to certify that', { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(24).font('Helvetica-Bold').text(recipientName, { align: 'center' });
    doc.moveDown(1);

    if (courseTitle) {
      doc.fontSize(16).font('Helvetica').text(`has successfully completed`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).font('Helvetica-Bold').text(courseTitle, { align: 'center' });
      doc.moveDown(1);
    }

    if (badgeText) {
      doc.fontSize(14).font('Helvetica-Oblique').text(badgeText, { align: 'center' });
      doc.moveDown(1);
    }

    if (issuedCopy.body) {
      doc.fontSize(14).font('Helvetica').text(issuedCopy.body, { align: 'center' });
      doc.moveDown(1);
    }

    doc.fontSize(12).font('Helvetica').text(`Completed on ${completionDate}`, { align: 'center' });
    doc.moveDown(3);

    // Signatory section (if provided)
    if (signatoryName) {
      doc.fontSize(12).font('Helvetica').text(signatoryName, { align: 'left' });
      if (signatoryTitle) {
        doc.fontSize(10).font('Helvetica').text(signatoryTitle, { align: 'left' });
      }
    }

    // Finalize PDF
    doc.end();

    // Emit telemetry
    await emitLmsEvent(req, LMS_EVENTS.CERTIFICATE_DOWNLOADED, {
      certificate_id: certificateId,
      template_id: certificate.template_id,
    });
  } catch (error) {
    console.error(`[${requestId}] Error downloading certificate:`, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to download certificate',
        },
        request_id: requestId,
      });
    }
  }
}


