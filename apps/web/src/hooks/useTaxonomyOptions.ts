/**
 * Taxonomy Options Hook
 * 
 * Hook for fetching taxonomy options
 */

import { useState, useEffect, useCallback } from 'react';
import { taxonomyApi, type ListTaxonomyOptionsParams } from '../api/taxonomyClient';
import type { TaxonomyOption, TaxonomyGroupKey } from '@gravyty/domain';

export interface UseTaxonomyOptionsResult {
  options: TaxonomyOption[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setOptions: (options: TaxonomyOption[]) => void; // For optimistic updates
}

export function useTaxonomyOptions(
  groupKey: TaxonomyGroupKey,
  params?: ListTaxonomyOptionsParams
): UseTaxonomyOptionsResult {
  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await taxonomyApi.listOptions(groupKey, params);
      if ('error' in response) {
        setError(response.error.message);
        setOptions([]);
      } else {
        setOptions(response.data.options);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load taxonomy options');
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

