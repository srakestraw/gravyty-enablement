/**
 * Path Rollup Computation
 * 
 * Computes path progress rollup from course completion (deterministic and idempotent).
 * Exported for testability.
 */

import type { LearningPath, PathProgress, CourseProgress } from '@gravyty/domain';
import { lmsRepo } from '../storage/dynamo/lmsRepo';

/**
 * Path Progress Rollup
 * 
 * Computed rollup fields from course completion (subset of PathProgress).
 */
export type PathProgressRollup = Pick<
  PathProgress,
  | 'total_courses'
  | 'completed_courses'
  | 'percent_complete'
  | 'status'
  | 'next_course_id'
  | 'started_at'
  | 'completed_at'
  | 'last_activity_at'
>;

/**
 * Compute path progress rollup from course completion (deterministic and idempotent)
 * 
 * @param userId - User ID
 * @param path - Learning path with ordered courses
 * @param existingProgress - Existing path progress (for timestamp preservation)
 * @param getProgressFn - Function to get course progress (for testability)
 * @returns Computed path progress rollup
 */
export async function computePathRollup(
  userId: string,
  path: LearningPath,
  existingProgress: PathProgress | null = null,
  getProgressFn?: (userId: string, courseId: string) => Promise<CourseProgress | null>
): Promise<PathProgressRollup> {
  const now = new Date().toISOString();
  const courses = path.courses || [];
  const totalCourses = courses.length;

  if (totalCourses === 0) {
    return {
      total_courses: 0,
      completed_courses: 0,
      percent_complete: 0,
      status: 'not_started',
    };
  }

  // Use provided function or default to repo
  const getProgress = getProgressFn || ((userId: string, courseId: string) => 
    lmsRepo.getProgress(userId, courseId)
  );

  // Fetch existing progress if not provided (for timestamp preservation)
  if (!existingProgress) {
    existingProgress = await lmsRepo.getUserPathProgress(userId, path.path_id);
  }

  // Check completion for each course (deterministic: same completion state = same result)
  let completedCourses = 0;
  let nextCourseId: string | undefined;
  let hasStarted = false;

  for (const courseRef of courses) {
    const courseProgress = await getProgress(userId, courseRef.course_id);
    if (courseProgress?.completed) {
      completedCourses++;
      hasStarted = true;
    } else if (!nextCourseId) {
      // First incomplete course (by order)
      nextCourseId = courseRef.course_id;
      if (courseProgress) {
        hasStarted = true;
      }
    }
  }

  // Compute rollup fields deterministically
  const percentComplete = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;
  const isCompleted = completedCourses === totalCourses;
  const status: 'not_started' | 'in_progress' | 'completed' =
    isCompleted ? 'completed' : hasStarted ? 'in_progress' : 'not_started';

  // Preserve timestamps idempotently
  // started_at: set once on first transition out of not_started
  let startedAt = existingProgress?.started_at;
  if (!startedAt && hasStarted) {
    startedAt = now;
  }

  // completed_at: set once when reaching 100% (never overwritten)
  let completedAt = existingProgress?.completed_at;
  if (isCompleted && !completedAt) {
    completedAt = now;
  }

  // last_activity_at: update whenever rollup is recomputed due to a progress write
  // This indicates recent activity even if no courses were completed
  const lastActivityAt = now;

  // next_course_id: null when completed, otherwise first incomplete
  const finalNextCourseId = isCompleted ? undefined : nextCourseId;

  return {
    total_courses: totalCourses,
    completed_courses: completedCourses,
    percent_complete: percentComplete,
    status,
    next_course_id: finalNextCourseId,
    started_at: startedAt,
    completed_at: completedAt,
    last_activity_at: lastActivityAt,
  };
}

