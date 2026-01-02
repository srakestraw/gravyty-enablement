/**
 * Metadata Options Hook
 * 
 * Hook for fetching metadata options
 */

import { useState, useEffect, useCallback } from 'react';
import { metadataApi, type ListMetadataOptionsParams } from '../api/metadataClient';
import type { MetadataOption, MetadataGroupKey } from '@gravyty/domain';

export interface UseMetadataOptionsResult {
  options: MetadataOption[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setOptions: (options: MetadataOption[]) => void; // For optimistic updates
}

export function useMetadataOptions(
  groupKey: MetadataGroupKey,
  params?: ListMetadataOptionsParams
): UseMetadataOptionsResult {
  const [options, setOptions] = useState<MetadataOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    console.log(`[useMetadataOptions:${groupKey}] Fetching options:`, {
      groupKey,
      params,
      parent_id: params?.parent_id,
      query: params?.query,
      timestamp: new Date().toISOString(),
    });
    setLoading(true);
    setError(null);

    try {
      const response = await metadataApi.listOptions(groupKey, params);
      console.log(`[useMetadataOptions:${groupKey}] API response:`, {
        groupKey,
        hasError: 'error' in response,
        error: 'error' in response ? response.error : null,
        optionsCount: 'data' in response ? response.data.options.length : 0,
        options: 'data' in response ? response.data.options.map(opt => ({ 
          id: opt.option_id, 
          label: opt.label, 
          parent_id: opt.parent_id 
        })) : [],
        timestamp: new Date().toISOString(),
      });
      if ('error' in response) {
        console.error(`[useMetadataOptions:${groupKey}] API error:`, response.error);
        setError(response.error.message);
        setOptions([]);
      } else {
        setOptions(response.data.options);
      }
    } catch (err) {
      console.error(`[useMetadataOptions:${groupKey}] Exception:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load metadata options');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [groupKey, params?.query, params?.include_archived, params?.parent_id, params?.limit]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return {
    options,
    loading,
    error,
    refetch: fetchOptions,
    setOptions, // Expose setOptions for optimistic updates
  };
}

