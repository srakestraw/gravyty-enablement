/**
 * Taxonomy API Client
 * 
 * Client for taxonomy API endpoints
 */

import { apiFetch } from '../lib/apiClient';
import type {
  TaxonomyOption,
  TaxonomyGroupKey,
  CreateTaxonomyOption,
  UpdateTaxonomyOption,
  TaxonomyOptionUsageResponse,
  MergeTaxonomyOption,
} from '@gravyty/domain';

const BASE_URL = '/v1/taxonomy';

export interface ListTaxonomyOptionsParams {
  query?: string;
  include_archived?: boolean;
  parent_id?: string;
  limit?: number;
  cursor?: string;
}

export interface ListTaxonomyOptionsResponse {
  options: TaxonomyOption[];
  next_cursor?: string;
}

export interface CreateTaxonomyOptionResponse {
  option: TaxonomyOption;
}

export interface UpdateTaxonomyOptionResponse {
  option: TaxonomyOption;
}

export interface GetTaxonomyOptionResponse {
  option: TaxonomyOption;
}

export const taxonomyApi = {
  /**
   * List taxonomy options for a group
   */
  async listOptions(
    groupKey: TaxonomyGroupKey,
    params?: ListTaxonomyOptionsParams
  ) {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    if (params?.include_archived) queryParams.append('include_archived', 'true');
    if (params?.parent_id) queryParams.append('parent_id', params.parent_id);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);

    const queryString = queryParams.toString();
    const url = `${BASE_URL}/${groupKey}/options${queryString ? `?${queryString}` : ''}`;

    return apiFetch<ListTaxonomyOptionsResponse>(url);
  },

  /**
   * Get a single taxonomy option by ID
   */
  async getOption(optionId: string) {
    return apiFetch<GetTaxonomyOptionResponse>(`${BASE_URL}/options/${optionId}`);
  },

  /**
   * Create a new taxonomy option
   */
  async createOption(
    groupKey: TaxonomyGroupKey,
    data: Omit<CreateTaxonomyOption, 'group_key'>
  ) {
    return apiFetch<CreateTaxonomyOptionResponse>(`${BASE_URL}/${groupKey}/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a taxonomy option
   */
  async updateOption(optionId: string, data: UpdateTaxonomyOption) {
    return apiFetch<UpdateTaxonomyOptionResponse>(`${BASE_URL}/options/${optionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get usage count for a taxonomy option
   */
  async getUsage(groupKey: TaxonomyGroupKey, optionId: string) {
    return apiFetch<{ data: TaxonomyOptionUsageResponse }>(
      `${BASE_URL}/${groupKey}/options/${optionId}/usage`
    );
  },

  /**
   * Delete a taxonomy option
   */
  async deleteOption(groupKey: TaxonomyGroupKey, optionId: string, force?: boolean) {
    const url = `${BASE_URL}/${groupKey}/options/${optionId}${force ? '?force=true' : ''}`;
    return apiFetch<{ data: { message: string } }>(url, {
      method: 'DELETE',
    });
  },

  /**
   * Merge a taxonomy option into another
   */
  async mergeOption(
    groupKey: TaxonomyGroupKey,
    sourceOptionId: string,
    targetOptionId: string,
    deleteSource?: boolean
  ) {
    return apiFetch<{
      data: {
        message: string;
        migrated_courses: number;
        migrated_resources: number;
      };
    }>(`${BASE_URL}/${groupKey}/options/${sourceOptionId}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target_option_id: targetOptionId,
        delete_source: deleteSource || false,
      }),
    });
  },
};


