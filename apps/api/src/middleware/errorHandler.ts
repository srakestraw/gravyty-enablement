import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '../types';

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] as string || 'unknown';

  // Log error
  console.error(`[${requestId}] Error:`, err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    };
    res.status(400).json(errorResponse);
    return;
  }

  // Handle other errors
  const errorResponse: ApiErrorResponse = {
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
    request_id: requestId,
  };

  res.status(500).json(errorResponse);
}




