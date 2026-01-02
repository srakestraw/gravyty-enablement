/**
 * Search API Client
 * 
 * Client for unified search API
 */

import { apiFetch } from '../lib/apiClient';
import type { UnifiedSearchParams, UnifiedSearchResponse } from '@gravyty/domain';

export interface ApiResponse<T> {
  data: T;
  request_id?: string;
}

/**
 * Unified search across all entity types
 */
export async function searchUnified(
  params: UnifiedSearchParams
): Promise<ApiResponse<UnifiedSearchResponse>> {
  const queryParams = new URLSearchParams();
  
  if (params.q) {
    queryParams.append('q', params.q);
  }
  
  if (params.entity_types && params.entity_types.length > 0) {
    queryParams.append('entity_types', params.entity_types.join(','));
  }
  
  if (params.product_ids && params.product_ids.length > 0) {
    queryParams.append('product_ids', params.product_ids.join(','));
  }
  
  if (params.product_suite_ids && params.product_suite_ids.length > 0) {
    queryParams.append('product_suite_ids', params.product_suite_ids.join(','));
  }
  
  if (params.topic_tag_ids && params.topic_tag_ids.length > 0) {
    queryParams.append('topic_tag_ids', params.topic_tag_ids.join(','));
  }
  
  if (params.audience_ids && params.audience_ids.length > 0) {
    queryParams.append('audience_ids', params.audience_ids.join(','));
  }
  
  if (params.badge_ids && params.badge_ids.length > 0) {
    queryParams.append('badge_ids', params.badge_ids.join(','));
  }
  
  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  
  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }
  
  const queryString = queryParams.toString();
  const url = `/v1/search${queryString ? `?${queryString}` : ''}`;
  
  return apiFetch<UnifiedSearchResponse>(url, {
    method: 'GET',
  });
}

