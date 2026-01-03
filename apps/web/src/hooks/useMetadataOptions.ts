/**
 * Metadata Options Hook
 * 
 * Hook for fetching metadata options
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { metadataApi, type ListMetadataOptionsParams } from '../api/metadataClient';
import type { MetadataOption, MetadataGroupKey } from '@gravyty/domain';

export interface UseMetadataOptionsResult {
  options: MetadataOption[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setOptions: (options: MetadataOption[]) => void; // For optimistic updates
}

export interface UseMetadataOptionsParams extends Omit<ListMetadataOptionsParams, 'parent_id'> {
  parentIds?: string[]; // Support multiple parent IDs for hierarchical filtering
}

export function useMetadataOptions(
  groupKey: MetadataGroupKey,
  params?: UseMetadataOptionsParams
): UseMetadataOptionsResult {
  const [options, setOptions] = useState<MetadataOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // When multiple parentIds are provided, fetch all options and filter client-side
  // When single parentId is provided, use backend filtering
  // When no parentIds, fetch all options
  const apiParams = useMemo(() => {
    if (!params) return undefined;
    
    const { parentIds, ...rest } = params;
    
    // If single parent ID, use backend filtering
    if (parentIds && parentIds.length === 1) {
      return { ...rest, parent_id: parentIds[0] };
    }
    
    // If multiple or no parent IDs, fetch all (will filter client-side if needed)
    return rest;
  }, [params]);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await metadataApi.listOptions(groupKey, apiParams);
      if ('error' in response) {
        console.error(`[useMetadataOptions:${groupKey}] API error:`, response.error);
        setError(response.error.message);
        setOptions([]);
      } else {
        let fetchedOptions = response.data.options;
        
        // Client-side filtering for multiple parent IDs
        // Show products that belong to ANY selected Product Suite OR have no parent_id (backward compatibility)
        if (params?.parentIds && params.parentIds.length > 1) {
          const parentIdSet = new Set(params.parentIds);
          fetchedOptions = fetchedOptions.filter((opt) => 
            opt.parent_id === null || 
            opt.parent_id === undefined || 
            (opt.parent_id && parentIdSet.has(opt.parent_id))
          );
        }
        
        // If backend filtering returned empty results but we have parentIds, 
        // fetch all products to ensure products with null parent_id are shown
        // This handles the case where backend filtering might be too strict
        if (fetchedOptions.length === 0 && params?.parentIds && params.parentIds.length > 0 && groupKey === 'product') {
          // Don't refetch here to avoid infinite loop - the backend should handle this
        }
        
        setOptions(fetchedOptions);
      }
    } catch (err) {
      console.error(`[useMetadataOptions:${groupKey}] Exception:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load metadata options');
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [groupKey, params?.query, params?.include_archived, params?.parentIds, apiParams?.parent_id, apiParams?.limit]);

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

