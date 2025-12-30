/**
 * Admin Paths Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi, type AdminPathSummary } from '../api/lmsAdminClient';

export function useAdminPaths(params?: { status?: string }) {
  const [data, setData] = useState<AdminPathSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.listPaths(params)
      .then((response) => {
        if (!cancelled) {
          if ('data' in response) {
            setData(response.data.paths);
          } else {
            setError(new Error(response.error.message));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load paths'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params?.status]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    lmsAdminApi.listPaths(params)
      .then((response) => {
        if ('data' in response) {
          setData(response.data.paths);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load paths'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

