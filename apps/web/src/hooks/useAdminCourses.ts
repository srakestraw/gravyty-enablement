/**
 * Admin Courses Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi, type AdminCourseSummary } from '../api/lmsAdminClient';

export function useAdminCourses(params?: { status?: string; product_suite?: string; q?: string }) {
  const [data, setData] = useState<AdminCourseSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.listCourses(params)
      .then((response) => {
        if (!cancelled) {
          if ('data' in response) {
            setData(response.data.courses);
          } else {
            setError(new Error(response.error.message));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load courses'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params?.status, params?.product_suite, params?.q]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    lmsAdminApi.listCourses(params)
      .then((response) => {
        if ('data' in response) {
          setData(response.data.courses);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load courses'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

