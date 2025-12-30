/**
 * Admin Course Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi } from '../api/lmsAdminClient';
import type { Course } from '@gravyty/domain';

export function useAdminCourse(courseId: string | null) {
  const [data, setData] = useState<{ course: Course; is_draft: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.getCourse(courseId)
      .then((response) => {
        if (!cancelled) {
          if ('data' in response) {
            setData(response.data);
          } else {
            setError(new Error(response.error.message));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load course'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const refetch = () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    lmsAdminApi.getCourse(courseId)
      .then((response) => {
        if ('data' in response) {
          setData(response.data);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load course'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

