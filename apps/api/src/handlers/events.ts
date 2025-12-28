import { Request, Response } from 'express';
import { ActivityEvent, ActivityEventSchema } from '@gravyty/domain';
import { ApiSuccessResponse } from '../types';
import { storageRepos } from '../server';

/**
 * POST /v1/events
 * Store activity event
 */
export async function createEvent(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  const parsed = ActivityEventSchema.safeParse({
    ...req.body,
    timestamp: req.body.timestamp || new Date().toISOString(),
  });

  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
      request_id: requestId,
    });
    return;
  }

  const event = parsed.data;

  try {
    await storageRepos.event.create(event);

    // Log event
    console.log(`[${requestId}] Event:`, event.event_name, event);

    const response: ApiSuccessResponse<{ received: boolean }> = {
      data: { received: true },
      request_id: requestId,
    };

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to store event',
      },
      request_id: requestId,
    });
  }
}

