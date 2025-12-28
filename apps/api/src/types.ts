/**
 * API Response Types
 */

import type { Request } from 'express';

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
 * Request with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    role: string;
    user_id?: string;
    email?: string;
  };
}

