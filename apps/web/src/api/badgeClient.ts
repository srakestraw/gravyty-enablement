/**
 * Badge API Client
 * 
 * Client for badge API endpoints
 */

import { apiFetch } from '../lib/apiClient';
import type {
  Badge,
  CreateBadge,
  UpdateBadge,
  ListBadgesResponse,
  ListBadgeAwardsResponse,
} from '@gravyty/domain';

const BASE_URL = '/v1/admin/badges';

export interface ListBadgesParams {
  query?: string;
  include_archived?: boolean;
  limit?: number;
  cursor?: string;
}

export interface GetBadgeResponse {
  badge: Badge;
}

export interface CreateBadgeResponse {
  badge: Badge;
}

export interface UpdateBadgeResponse {
  badge: Badge;
}

export const badgeApi = {
  /**
   * List badges
   */
  async listBadges(params?: ListBadgesParams) {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    if (params?.include_archived) queryParams.append('include_archived', 'true');
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);

    const queryString = queryParams.toString();
    const url = `${BASE_URL}${queryString ? `?${queryString}` : ''}`;

    return apiFetch<{ data: ListBadgesResponse }>(url);
  },

  /**
   * Get a single badge by ID
   */
  async getBadge(badgeId: string) {
    return apiFetch<{ data: GetBadgeResponse }>(`${BASE_URL}/${badgeId}`);
  },

  /**
   * Create a new badge
   */
  async createBadge(data: CreateBadge) {
    return apiFetch<{ data: CreateBadgeResponse }>(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a badge
   */
  async updateBadge(badgeId: string, data: UpdateBadge) {
    return apiFetch<{ data: UpdateBadgeResponse }>(`${BASE_URL}/${badgeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  /**
   * List badge awards for a badge
   */
  async listBadgeAwards(badgeId: string) {
    return apiFetch<{ data: ListBadgeAwardsResponse }>(`${BASE_URL}/${badgeId}/awards`);
  },

  /**
   * Manually award badge to user
   */
  async awardBadgeToUser(badgeId: string, userId: string, courseId?: string) {
    return apiFetch<{ data: { message: string } }>(`${BASE_URL}/${badgeId}/award`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, course_id: courseId }),
    });
  },

  /**
   * Delete a badge (soft delete)
   */
  async deleteBadge(badgeId: string, force?: boolean) {
    const url = `${BASE_URL}/${badgeId}${force ? '?force=true' : ''}`;
    return apiFetch<{ data: { message: string } }>(url, {
      method: 'DELETE',
    });
  },
};

