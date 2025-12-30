/**
 * Hook for fetching LMS courses
 */

import { useState, useEffect } from 'react';
import { lmsApi, type ListCoursesParams, type LmsClientOptions } from '../api/lmsClient';
import type { CourseSummary } from '@gravyty/domain';
import { isErrorResponse } from '../lib/apiClient';

export interface UseLmsCoursesResult {
  courses: CourseSummary[];
  loading: boolean;
  error: string | null;
  nextCursor: string | undefined;
  refetch: () => void;
}

export function useLmsCourses(params?: ListCoursesParams, options?: LmsClientOptions): UseLmsCoursesResult {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.listCourses(params, options);
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setCourses([]);
        setNextCursor(undefined);
      } else {
        setCourses(response.data.courses);
        setNextCursor(response.data.next_cursor);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      setCourses([]);
      setNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.q, params?.product_suite, params?.product_concept, params?.badge, params?.topic, params?.limit]);

  return {
    courses,
    loading,
    error,
    nextCursor,
    refetch: fetchCourses,
  };
}

