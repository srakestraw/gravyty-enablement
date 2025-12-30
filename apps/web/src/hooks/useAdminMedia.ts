/**
 * Admin Media Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi } from '../api/lmsAdminClient';

export function useAdminMedia(params?: { media_type?: string; course_id?: string; lesson_id?: string }) {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.listMedia(params)
      .then((response) => {
        if (!cancelled) {
          if ('data' in response) {
            setData(response.data.media);
          } else {
            setError(new Error(response.error.message));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load media'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params?.media_type, params?.course_id, params?.lesson_id]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    lmsAdminApi.listMedia(params)
      .then((response) => {
        if ('data' in response) {
          setData(response.data.media);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load media'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

