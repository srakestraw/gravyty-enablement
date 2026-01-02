/**
 * API Client
 * 
 * Typed client for calling the enablement API
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface ApiSuccessResponse<T> {
  data: T;
  request_id: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
  request_id: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Check if response is an error
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return 'error' in response;
}

/**
 * Get authentication token
 * Falls back to dev headers if Cognito not configured
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Try to get JWT token from Amplify
  try {
    const { getIdToken, decodeJwtPayload } = await import('./auth');
    // Force refresh token to ensure we have latest groups/claims
    // This is important when user's group membership changes
    const token = await getIdToken(true); // Force refresh
    if (token) {
      // Debug: Decode and log token claims in dev mode
      if (import.meta.env.DEV) {
        try {
          const payload = decodeJwtPayload(token);
          if (payload) {
            const groups = payload['cognito:groups'] || payload.groups || [];
            const groupsArray = Array.isArray(groups) ? groups : (groups ? [groups] : []);
            
            if (!groups.includes('Admin') && groups.length > 0) {
              console.warn('[API Client] ⚠️ Token does NOT contain Admin group!', {
                groups,
                groupsArray: Array.isArray(groups) ? groups : [groups],
                message: 'You may need to sign out and sign back in to get a fresh token.',
              });
            }
          }
        } catch (decodeError) {
          console.warn('[API Client] Failed to decode token for debugging:', decodeError);
        }
      }
      
      headers['Authorization'] = `Bearer ${token}`;
      return headers;
    }
  } catch (error) {
    // Cognito not configured or user not authenticated
    console.debug('JWT token not available, using dev headers');
  }

  // Fallback to dev headers for local development
  const devRole = import.meta.env.VITE_DEV_ROLE || 'Viewer';
  const devUserId = import.meta.env.VITE_DEV_USER_ID || 'dev-user';
  
  headers['x-dev-role'] = devRole;
  headers['x-dev-user-id'] = devUserId;

  return headers;
}

/**
 * Base fetch wrapper with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Normalize URL construction to avoid double slashes
  const baseUrl = API_BASE_URL.replace(/\/+$/, ''); // Remove trailing slashes
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;
  
  const authHeaders = await getAuthHeaders();
  const headers: HeadersInit = {
    ...authHeaders,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // If response is not JSON, create error response
      return {
        error: {
          code: 'INVALID_RESPONSE',
          message: `Server returned non-JSON response: ${response.status}`,
        },
        request_id: 'unknown',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      // Log full error response for debugging (especially 403 errors)
      if (response.status === 403 || response.status === 401) {
        console.error('[API Client] ❌ Auth error response:', {
          status: response.status,
          statusText: response.statusText,
          endpoint: url,
          error: data.error,
          fullResponse: data,
        });
      }
      
      return {
        error: {
          code: data.error?.code || 'HTTP_ERROR',
          message: data.error?.message || `HTTP ${response.status}`,
          // Include debug info if available
          debug: data.error?.debug,
        },
        request_id: data.request_id || 'unknown',
      };
    }

    return data as ApiSuccessResponse<T>;
  } catch (error) {
    // Provide user-friendly error messages
    let errorMessage = 'Network error';
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      errorMessage = `Unable to connect to API server at ${API_BASE_URL}. Please ensure the API server is running.`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      error: {
        code: 'NETWORK_ERROR',
        message: errorMessage,
      },
      request_id: 'unknown',
    };
  }
}

/**
 * Events API
 * 
 * Note: Browser console may show network errors (ERR_CONNECTION_REFUSED) when
 * the API server isn't running. These errors are handled gracefully and don't
 * affect app functionality. Telemetry failures are non-critical and silently ignored.
 */
export const eventsApi = {
  track: async (event: {
    event_name: string;
    user_id?: string;
    content_id?: string;
    metadata?: Record<string, unknown>;
  }) => {
    // Non-blocking - fire and forget
    // Silently fail - telemetry should never break the app
    try {
      const result = await apiFetch<{ received: boolean }>('/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
        }),
      });
      
      // Check if it's an error response (network error or API error)
      if (isErrorResponse(result)) {
        // Silently ignore telemetry failures
        // Network errors (API not running) are expected in development
        if (result.error.code === 'NETWORK_ERROR') {
          // Only log if explicitly enabled via env var
          if (import.meta.env.DEV && import.meta.env.VITE_LOG_TELEMETRY_ERRORS === 'true') {
            console.debug('[Telemetry] API not available (non-critical)', event.event_name);
          }
        } else if (import.meta.env.DEV) {
          // Other API errors - log in development for debugging
          console.debug('[Telemetry] Failed to track event (non-critical)', event.event_name, result.error);
        }
      }
    } catch (error) {
      // Catch any unexpected errors (shouldn't happen since apiFetch handles errors)
      // But just in case, silently ignore
      if (import.meta.env.DEV && import.meta.env.VITE_LOG_TELEMETRY_ERRORS === 'true') {
        console.debug('[Telemetry] Unexpected error (non-critical)', event.event_name, error);
      }
    }
  },
};

/**
 * Notification type
 */
export interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at?: string | null;
  type?: 'info' | 'warning' | 'success' | 'action';
  target_url?: string | null;
}

/**
 * Notifications API
 * 
 * TODO: Implement API endpoints for notifications
 * - GET /v1/notifications (list)
 * - PATCH /v1/notifications/:id/read (mark as read)
 * - PATCH /v1/notifications/read-all (mark all as read)
 */
export const notificationsApi = {
  list: async (limit: number = 20): Promise<ApiResponse<{ items: Notification[] }>> => {
    // TODO: Replace with actual API endpoint when available
    // For now, return empty array
    return {
      data: { items: [] },
      request_id: 'stub',
    };
  },

  markRead: async (id: string): Promise<ApiResponse<{ notification: Notification }>> => {
    // TODO: Implement PATCH /v1/notifications/:id/read
    return apiFetch<{ notification: Notification }>(`/v1/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllRead: async (): Promise<ApiResponse<{ count: number }>> => {
    // TODO: Implement PATCH /v1/notifications/read-all
    return apiFetch<{ count: number }>('/v1/notifications/read-all', {
      method: 'PATCH',
    });
  },
};

/**
 * Admin Users API
 */
export interface AdminUser {
  username: string;
  email: string;
  name: string;
  role: 'Viewer' | 'Contributor' | 'Approver' | 'Admin';
  enabled: boolean;
  user_status: 'UNCONFIRMED' | 'CONFIRMED' | 'ARCHIVED' | 'COMPROMISED' | 'UNKNOWN' | 'RESET_REQUIRED' | 'FORCE_CHANGE_PASSWORD';
  created_at: string;
  modified_at: string;
  groups: string[];
}

export interface ListUsersParams {
  query?: string;
  limit?: number;
  cursor?: string;
}

export interface ListUsersResponse {
  items: AdminUser[];
  next_cursor?: string;
}

export interface InviteUserPayload {
  email: string;
  name: string;
  role?: 'Viewer' | 'Contributor' | 'Approver' | 'Admin';
}

export const usersApi = {
  /**
   * GET /v1/admin/users
   */
  listUsers: async (params?: ListUsersParams): Promise<ApiResponse<ListUsersResponse>> => {
    const queryParams = new URLSearchParams();
    if (params?.query) queryParams.append('query', params.query);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.cursor) queryParams.append('cursor', params.cursor);

    const queryString = queryParams.toString();
    const endpoint = `/v1/admin/users${queryString ? `?${queryString}` : ''}`;
    return apiFetch<ListUsersResponse>(endpoint);
  },

  /**
   * POST /v1/admin/users/invite
   */
  inviteUser: async (payload: InviteUserPayload): Promise<ApiResponse<AdminUser>> => {
    return apiFetch<AdminUser>('/v1/admin/users/invite', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * PATCH /v1/admin/users/:username/role
   */
  setUserRole: async (username: string, role: 'Viewer' | 'Contributor' | 'Approver' | 'Admin'): Promise<ApiResponse<AdminUser>> => {
    return apiFetch<AdminUser>(`/v1/admin/users/${encodeURIComponent(username)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  /**
   * PATCH /v1/admin/users/:username/enable
   */
  enableUser: async (username: string): Promise<ApiResponse<AdminUser>> => {
    return apiFetch<AdminUser>(`/v1/admin/users/${encodeURIComponent(username)}/enable`, {
      method: 'PATCH',
    });
  },

  /**
   * PATCH /v1/admin/users/:username/disable
   */
  disableUser: async (username: string): Promise<ApiResponse<AdminUser>> => {
    return apiFetch<AdminUser>(`/v1/admin/users/${encodeURIComponent(username)}/disable`, {
      method: 'PATCH',
    });
  },

  /**
   * DELETE /v1/admin/users/:username
   */
  deleteUser: async (username: string): Promise<ApiResponse<void>> => {
    return apiFetch<void>(`/v1/admin/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
  },
};

