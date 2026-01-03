/**
 * Admin Assignments Hook
 */

import { useState, useEffect } from 'react';
import { lmsAdminApi, type HydratedAssignment } from '../api/lmsAdminClient';

export function useAdminAssignments(params?: { assignee_user_id?: string; status?: string }) {
  const [data, setData] = useState<HydratedAssignment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    lmsAdminApi.listAssignments(params)
      .then((response) => {
        if (!cancelled) {
          if ('data' in response) {
            setData(response.data.assignments);
          } else {
            setError(new Error(response.error.message));
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load assignments'));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params?.assignee_user_id, params?.status]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    lmsAdminApi.listAssignments(params)
      .then((response) => {
        if ('data' in response) {
          setData(response.data.assignments);
        } else {
          setError(new Error(response.error.message));
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load assignments'));
        setLoading(false);
      });
  };

  return { data, loading, error, refetch };
}

