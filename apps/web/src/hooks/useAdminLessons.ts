/**
 * Admin Lessons Hook
 * 
 * Hook to fetch lessons for a course (admin only)
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi } from '../api/lmsAdminClient';
import type { Lesson } from '@gravyty/domain';

export function useAdminLessons(courseId: string | null) {
  const [data, setData] = useState<Lesson[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      return;
    }

    // For now, we'll need to fetch lessons from the course's sections
    // Since there's no direct admin endpoint, we'll extract from course data
    // This is a temporary solution - ideally we'd have a GET /admin/courses/:id/lessons endpoint
    setLoading(false);
    setData([]);
  }, [courseId]);

  const refetch = () => {
    // Same as above
  };

  return { data, loading, error, refetch };
}



