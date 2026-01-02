/**
 * Metadata API Client
 * 
 * Client for metadata API endpoints
 */

import { apiFetch } from '../lib/apiClient';
import type {
  MetadataOption,
  MetadataGroupKey,
  CreateMetadataOption,
  UpdateMetadataOption,
  MetadataOptionUsageResponse,
  MergeMetadataOption,
} from '@gravyty/domain';

const BASE_URL = '/v1/metadata';

export interface ListMetadataOptionsParams {
  query?: string;
  include_archived?: boolean;
  parent_id?: string;
  limit?: number;
  cursor?: string;
}

export interface ListMetadataOptionsResponse {
  options: MetadataOption[];
  next_cursor?: string;
}

export interface CreateMetadataOptionResponse {
  option: MetadataOption;
}

export interface UpdateMetadataOptionResponse {
  option: MetadataOption;
}

export interface GetMetadataOptionResponse {
  option: MetadataOption;
}

export const metadataApi = {
  /**
   * List metadata options for a group
   */
  async listOptions(
    groupKey: MetadataGroupKey,
    params?: ListMetadataOptionsParams
  ) {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    if (params?.include_archived) queryParams.append('include_archived', 'true');
    if (params?.parent_id) queryParams.append('parent_id', params.parent_id);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);

    const queryString = queryParams.toString();
    const url = `${BASE_URL}/${groupKey}/options${queryString ? `?${queryString}` : ''}`;

    return apiFetch<ListMetadataOptionsResponse>(url);
  },

  /**
   * Get a single metadata option by ID
   */
  async getOption(optionId: string) {
    return apiFetch<GetMetadataOptionResponse>(`${BASE_URL}/options/${optionId}`);
  },

  /**
   * Create a new metadata option
   */
  async createOption(
    groupKey: MetadataGroupKey,
    data: Omit<CreateMetadataOption, 'group_key'>
  ) {
    return apiFetch<CreateMetadataOptionResponse>(`${BASE_URL}/${groupKey}/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a metadata option
   */
  async updateOption(optionId: string, data: UpdateMetadataOption) {
    return apiFetch<UpdateMetadataOptionResponse>(`${BASE_URL}/options/${optionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get usage count for a metadata option
   */
  async getUsage(groupKey: MetadataGroupKey, optionId: string) {
    return apiFetch<{ data: MetadataOptionUsageResponse }>(
      `${BASE_URL}/${groupKey}/options/${optionId}/usage`
    );
  },

  /**
   * Delete a metadata option
   */
  async deleteOption(groupKey: MetadataGroupKey, optionId: string, force?: boolean) {
    const url = `${BASE_URL}/${groupKey}/options/${optionId}${force ? '?force=true' : ''}`;
    return apiFetch<{ data: { message: string } }>(url, {
      method: 'DELETE',
    });
  },

  /**
   * Merge a metadata option into another
   */
  async mergeOption(
    groupKey: MetadataGroupKey,
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

