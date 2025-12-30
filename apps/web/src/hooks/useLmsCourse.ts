/**
 * Hook for fetching a single LMS course
 */

import { useState, useEffect } from 'react';
import { lmsApi, type LmsClientOptions } from '../api/lmsClient';
import type { CourseDetail, CourseSummary } from '@gravyty/domain';
import { isErrorResponse } from '../lib/apiClient';

export interface UseLmsCourseResult {
  course: CourseDetail | null;
  relatedCourses: CourseSummary[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLmsCourse(courseId: string | undefined, options?: LmsClientOptions): UseLmsCourseResult {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [relatedCourses, setRelatedCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.getCourse(courseId, options);
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setCourse(null);
        setRelatedCourses([]);
      } else {
        setCourse(response.data.course);
        setRelatedCourses(response.data.related_courses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
      setCourse(null);
      setRelatedCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return {
    course,
    relatedCourses,
    loading,
    error,
    refetch: fetchCourse,
  };
}

