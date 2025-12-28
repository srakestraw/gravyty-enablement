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
    const { getIdToken } = await import('./auth');
    // Force refresh token to ensure we have latest groups/claims
    // This is important when user's group membership changes
    const token = await getIdToken(true); // Force refresh
    if (token) {
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
  const url = `${API_BASE_URL}${endpoint}`;
  
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
      return {
        error: {
          code: data.error?.code || 'HTTP_ERROR',
          message: data.error?.message || `HTTP ${response.status}`,
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
    apiFetch<{ received: boolean }>('/v1/events', {
      method: 'POST',
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently ignore telemetry failures
      // Only log in development mode for debugging
      if (import.meta.env.DEV) {
        console.debug('[Telemetry] Failed to track event (non-critical)', event.event_name);
      }
    });
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

