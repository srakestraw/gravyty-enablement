/**
 * Hook for fetching LMS learning paths
 */

import { useState, useEffect } from 'react';
import { lmsApi, type ListPathsParams } from '../api/lmsClient';
import type { PathSummary, PathDetail } from '@gravyty/domain';
import { isErrorResponse } from '../lib/apiClient';

export interface UseLmsPathsResult {
  paths: PathSummary[];
  loading: boolean;
  error: string | null;
  nextCursor: string | undefined;
  refetch: () => void;
}

export interface UseLmsPathResult {
  path: PathDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLmsPaths(params?: ListPathsParams): UseLmsPathsResult {
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const fetchPaths = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.listPaths(params);
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setPaths([]);
        setNextCursor(undefined);
      } else {
        setPaths(response.data.paths);
        setNextCursor(response.data.next_cursor);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load paths');
      setPaths([]);
      setNextCursor(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.limit, params?.cursor]);

  return {
    paths,
    loading,
    error,
    nextCursor,
    refetch: fetchPaths,
  };
}

export function useLmsPath(pathId: string | undefined): UseLmsPathResult {
  const [path, setPath] = useState<PathDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPath = async () => {
    if (!pathId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await lmsApi.getPath(pathId);
      if (isErrorResponse(response)) {
        setError(response.error.message);
        setPath(null);
      } else {
        setPath(response.data.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load path');
      setPath(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPath();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathId]);

  return {
    path,
    loading,
    error,
    refetch: fetchPath,
  };
}

