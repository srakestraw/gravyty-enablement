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
    const token = await getIdToken();
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
 * Content API
 */
export const contentApi = {
  list: async (params?: {
    query?: string;
    product_suite?: string;
    product_concept?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const queryString = searchParams.toString();
    return apiFetch<{ items: any[]; next_cursor?: string }>(
      `/v1/content${queryString ? `?${queryString}` : ''}`
    );
  },

  get: async (id: string) => {
    return apiFetch<any>(`/v1/content/${id}`);
  },

  create: async (data: any) => {
    return apiFetch<any>('/v1/content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: any) => {
    return apiFetch<any>(`/v1/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  approve: async (id: string) => {
    return apiFetch<any>(`/v1/content/${id}/approve`, {
      method: 'POST',
    });
  },

  deprecate: async (id: string) => {
    return apiFetch<any>(`/v1/content/${id}/deprecate`, {
      method: 'POST',
    });
  },

  expire: async (id: string) => {
    return apiFetch<any>(`/v1/content/${id}/expire`, {
      method: 'POST',
    });
  },

  attachFile: async (id: string, data: {
    s3_bucket: string;
    s3_key: string;
    filename: string;
    content_type: string;
    size_bytes: number;
  }) => {
    return apiFetch<any>(`/v1/content/${id}/attach`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  download: async (id: string) => {
    return apiFetch<{
      download_url: string;
      expires_in_seconds: number;
    }>(`/v1/content/${id}/download`);
  },
};

/**
 * Uploads API
 */
export const uploadsApi = {
  presign: async (contentId: string, filename: string, contentType: string) => {
    return apiFetch<{
      upload_url: string;
      s3_bucket: string;
      s3_key: string;
      expires_in_seconds: number;
    }>('/v1/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({
        content_id: contentId,
        filename,
        content_type: contentType,
      }),
    });
  },
};

/**
 * Assistant API
 */
export const assistantApi = {
  query: async (query: string, options?: {
    product_suite?: string;
    product_concept?: string;
    tags?: string[];
    topK?: number;
    context?: Record<string, unknown>;
  }) => {
    return apiFetch<{
      refused: boolean;
      answer: string;
      citations: Array<{
        doc_id: string;
        chunk_id: string;
        title: string;
        s3_key: string;
        snippet: string;
      }>;
      retrieved_chunks_count?: number;
      model?: string;
    }>('/v1/assistant/query', {
      method: 'POST',
      body: JSON.stringify({
        query,
        product_suite: options?.product_suite,
        product_concept: options?.product_concept,
        tags: options?.tags,
        topK: options?.topK,
        context: options?.context,
      }),
    });
  },

  feedback: async (queryId: string, helpful: boolean, feedbackText?: string) => {
    return apiFetch<{ received: boolean }>('/v1/assistant/feedback', {
      method: 'POST',
      body: JSON.stringify({
        query_id: queryId,
        helpful,
        feedback_text: feedbackText,
      }),
    });
  },
};

/**
 * Brain Document type (simplified for API client)
 */
export interface BrainDocument {
  id: string;
  title: string;
  source_type: string;
  status: string;
  created_at: string;
  created_by: string;
  product_suite?: string;
  product_concept?: string;
  tags: string[];
  chunk_count?: number;
  error_message?: string;
  revision?: number;
  expires_at?: string;
  expired_at?: string;
  expired_by?: string;
  replaced_by_doc_id?: string;
  last_ingest_at?: string;
}

/**
 * Brain API
 */
export const brainApi = {
  presignUpload: async (params: {
    filename: string;
    content_type?: string;
    docId?: string;
  }) => {
    return apiFetch<{
      doc_id: string;
      presigned_url: string;
      s3_key: string;
    }>('/v1/brain/documents/presign', {
      method: 'POST',
      body: JSON.stringify({
        filename: params.filename,
        content_type: params.content_type || 'text/plain',
      }),
    });
  },

  createDocument: async (data: {
    id?: string;
    title: string;
    source_type: 'text' | 'pdf' | 'markdown' | 'html';
    s3_bucket?: string;
    s3_key: string;
    product_suite?: string;
    product_concept?: string;
    tags?: string[];
    checksum?: string;
  }) => {
    return apiFetch<{
      id: string;
      title: string;
      source_type: string;
      s3_bucket: string;
      s3_key: string;
      status: string;
      created_at: string;
      created_by: string;
      product_suite?: string;
      product_concept?: string;
      tags: string[];
    }>('/v1/brain/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  ingestDocument: async (docId: string) => {
    return apiFetch<{ enqueued: boolean }>(`/v1/brain/documents/${docId}/ingest`, {
      method: 'POST',
    });
  },

  expireDocument: async (docId: string) => {
    return apiFetch<BrainDocument>(`/v1/brain/documents/${docId}/expire`, {
      method: 'POST',
    });
  },

  reindexDocument: async (docId: string) => {
    return apiFetch<{ enqueued: boolean }>(`/v1/brain/documents/${docId}/reindex`, {
      method: 'POST',
    });
  },

  replaceDocument: async (docId: string) => {
    return apiFetch<BrainDocument>(`/v1/brain/documents/${docId}/replace`, {
      method: 'POST',
    });
  },

  updateDocument: async (docId: string, data: { expires_at?: string | null }) => {
    return apiFetch<BrainDocument>(`/v1/brain/documents/${docId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  listDocuments: async (params?: { status?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const queryString = searchParams.toString();
    return apiFetch<{
      items: Array<{
        id: string;
        title: string;
        source_type: string;
        status: string;
        created_at: string;
        created_by: string;
        product_suite?: string;
        product_concept?: string;
        tags: string[];
        chunk_count?: number;
        error_message?: string;
      }>;
    }>(`/v1/brain/documents${queryString ? `?${queryString}` : ''}`);
  },

  getDocument: async (docId: string) => {
    return apiFetch<BrainDocument>(`/v1/brain/documents/${docId}`);
  },
};

/**
 * Notifications API
 */
export const notificationsApi = {
  list: async () => {
    return apiFetch<{ items: any[] }>('/v1/notifications');
  },

  markRead: async (id: string) => {
    return apiFetch<any>(`/v1/notifications/${id}/read`, {
      method: 'POST',
    });
  },
};

/**
 * Subscriptions API
 */
export const subscriptionsApi = {
  list: async () => {
    return apiFetch<{ items: any[] }>('/v1/subscriptions');
  },

  create: async (subscription: {
    product_suite?: string;
    product_concept?: string;
    tags?: string[];
  }) => {
    return apiFetch<any>('/v1/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription),
    });
  },

  delete: async (id: string) => {
    return apiFetch<{ deleted: boolean }>(`/v1/subscriptions/${id}`, {
      method: 'DELETE',
    });
  },
};

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

