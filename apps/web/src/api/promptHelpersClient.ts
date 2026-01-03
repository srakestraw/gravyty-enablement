/**
 * Prompt Helpers API Client
 * 
 * Client for prompt helper management endpoints
 */

import { apiFetch, type ApiResponse, type ApiSuccessResponse } from '../lib/apiClient';
import type {
  PromptHelper,
  PromptHelperVersion,
  PromptHelperAuditLog,
  CreatePromptHelper,
  UpdatePromptHelper,
  ComposePromptRequest,
  ComposedPromptResponse,
  PromptHelperAppliesTo,
  PromptHelperContext,
  PromptHelperStatus,
} from '@gravyty/domain';

const ADMIN_BASE_URL = '/v1/admin/prompt-helpers';
const CONSUMER_BASE_URL = '/v1/prompt-helpers';

export interface ListPromptHelpersParams {
  status?: PromptHelperStatus;
  applies_to?: PromptHelperAppliesTo;
  provider_support?: 'openai' | 'gemini' | 'both';
  limit?: number;
  cursor?: string;
}

export interface SetDefaultRequest {
  contexts: PromptHelperContext[];
}

class PromptHelpersClient {
  /**
   * List prompt helpers (Admin)
   */
  async list(params?: ListPromptHelpersParams): Promise<ApiResponse<{ helpers: PromptHelper[]; next_cursor?: string }>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.applies_to) queryParams.append('applies_to', params.applies_to);
    if (params?.provider_support) queryParams.append('provider_support', params.provider_support);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);
    
    const url = `${ADMIN_BASE_URL}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiFetch<{ helpers: PromptHelper[]; next_cursor?: string }>(url);
  }

  /**
   * Get prompt helper (Admin)
   */
  async get(helperId: string): Promise<ApiResponse<{ helper: PromptHelper }>> {
    return apiFetch<{ helper: PromptHelper }>(`${ADMIN_BASE_URL}/${helperId}`);
  }

  /**
   * Create prompt helper (Admin)
   */
  async create(data: CreatePromptHelper): Promise<ApiResponse<{ helper: PromptHelper }>> {
    return apiFetch<{ helper: PromptHelper }>(ADMIN_BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update prompt helper (Admin, draft only)
   */
  async update(helperId: string, data: UpdatePromptHelper): Promise<ApiResponse<{ helper: PromptHelper }>> {
    return apiFetch<{ helper: PromptHelper }>(`${ADMIN_BASE_URL}/${helperId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Publish prompt helper (Admin)
   */
  async publish(helperId: string): Promise<ApiResponse<{ version: PromptHelperVersion }>> {
    return apiFetch<{ version: PromptHelperVersion }>(`${ADMIN_BASE_URL}/${helperId}/publish`, {
      method: 'POST',
    });
  }

  /**
   * Archive prompt helper (Admin)
   */
  async archive(helperId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiFetch<{ success: boolean }>(`${ADMIN_BASE_URL}/${helperId}/archive`, {
      method: 'POST',
    });
  }

  /**
   * Delete prompt helper (Admin)
   */
  async delete(helperId: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiFetch<{ success: boolean }>(`${ADMIN_BASE_URL}/${helperId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Set default prompt helper (Admin)
   */
  async setDefault(helperId: string, contexts: PromptHelperContext[]): Promise<ApiResponse<{ success: boolean }>> {
    return apiFetch<{ success: boolean }>(`${ADMIN_BASE_URL}/${helperId}/set-default`, {
      method: 'POST',
      body: JSON.stringify({ contexts }),
    });
  }

  /**
   * List versions (Admin)
   */
  async listVersions(helperId: string): Promise<ApiResponse<{ versions: PromptHelperVersion[] }>> {
    return apiFetch<{ versions: PromptHelperVersion[] }>(`${ADMIN_BASE_URL}/${helperId}/versions`);
  }

  /**
   * Get audit log (Admin)
   */
  async getAuditLog(helperId: string, limit?: number): Promise<ApiResponse<{ audit_log: PromptHelperAuditLog[] }>> {
    const queryParams = limit ? `?limit=${limit}` : '';
    return apiFetch<{ audit_log: PromptHelperAuditLog[] }>(`${ADMIN_BASE_URL}/${helperId}/audit-log${queryParams}`);
  }

  /**
   * Get prompt helpers for context (Consumer - published only)
   */
  async getForContext(appliesTo: PromptHelperAppliesTo): Promise<ApiResponse<{ helpers: PromptHelper[] }>> {
    return apiFetch<{ helpers: PromptHelper[] }>(`${CONSUMER_BASE_URL}?applies_to=${appliesTo}`);
  }

  /**
   * Compose prompt preview (Consumer)
   */
  async composePreview(request: ComposePromptRequest): Promise<ApiResponse<ComposedPromptResponse>> {
    return apiFetch<ComposedPromptResponse>(`${CONSUMER_BASE_URL}/compose-preview`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const promptHelpersApi = new PromptHelpersClient();


