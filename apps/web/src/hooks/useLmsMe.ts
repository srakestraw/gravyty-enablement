/**
 * Hook for fetching My Learning dashboard
 */

import { useState, useEffect } from 'react';
import { lmsApi } from '../api/lmsClient';
import type { MyLearning } from '@gravyty/domain';
import { isErrorResponse } from '../lib/apiClient';

export interface UseLmsMeResult {
  learning: MyLearning | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLmsMe(): UseLmsMeResult {
  const [learning, setLearning] = useState<MyLearning | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyLearning = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.getMyLearning();
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setLearning(null);
      } else {
        setLearning(response.data.learning);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load my learning');
      setLearning(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLearning();
  }, []);

  return {
    learning,
    loading,
    error,
    refetch: fetchMyLearning,
  };
}

