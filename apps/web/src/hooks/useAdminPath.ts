/**
 * Admin Path Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi } from '../api/lmsAdminClient';
import type { LearningPath } from '@gravyty/domain';

export function useAdminPath(pathId: string | null) {
  const [data, setData] = useState<{ path: LearningPath & { courses?: Array<{ course?: any }> }; is_draft: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!pathId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.getPath(pathId)
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
          setError(err instanceof Error ? err : new Error('Failed to load path'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathId]);

  const refetch = () => {
    if (!pathId) return;
    setLoading(true);
    setError(null);
    lmsAdminApi.getPath(pathId)
      .then((response) => {
        if ('data' in response) {
          setData(response.data);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load path'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

