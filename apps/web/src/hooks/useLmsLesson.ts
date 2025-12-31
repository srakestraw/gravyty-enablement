/**
 * Hook for fetching a single LMS lesson
 */

import { useState, useEffect } from 'react';
import { lmsApi } from '../api/lmsClient';
import type { LessonDetail } from '@gravyty/domain';
import { isErrorResponse } from '../lib/apiClient';

export interface UseLmsLessonResult {
  lesson: LessonDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLmsLesson(courseId: string | undefined, lessonId: string | undefined): UseLmsLessonResult {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLesson = async () => {
    if (!courseId || !lessonId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.getLesson(courseId, lessonId);
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setLesson(null);
      } else {
        setLesson(response.data.lesson);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
      setLesson(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, lessonId]);

  return {
    lesson,
    loading,
    error,
    refetch: fetchLesson,
  };
}



