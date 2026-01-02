/**
 * Badge API Handlers
 * 
 * Handlers for badge management endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { badgeRepo } from '../storage/dynamo/badgeRepo';
import { CreateBadgeSchema, UpdateBadgeSchema } from '@gravyty/domain';
import type { CreateBadge, UpdateBadge } from '@gravyty/domain';
import { validateBadgeIcon } from '../validators/badgeIconKeys';

/**
 * GET /v1/admin/badges
 * List badges
 */
export async function listBadges(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const query = req.query.query as string | undefined;
    const includeArchived = req.query.include_archived === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    const result = await badgeRepo.listBadges({
      query,
      include_archived: includeArchived,
      limit,
      cursor,
    });

    const response: ApiSuccessResponse<{ badges: typeof result.items; next_cursor?: string }> = {
      data: {
        badges: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing badges:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list badges',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/admin/badges/:badgeId
 * Get badge by ID
 */
export async function getBadge(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const badgeId = req.params.badgeId;
    const badge = await badgeRepo.getBadge(badgeId);

    if (!badge) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Badge not found',
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<{ badge: typeof badge }> = {
      data: { badge },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting badge:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get badge',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/badges
 * Create a new badge
 */
export async function createBadge(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const parsed = CreateBadgeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    // Validate icon configuration
    const iconValidation = validateBadgeIcon({
      icon_type: parsed.data.icon_type,
      icon_key: parsed.data.icon_key,
    });
    if (!iconValidation.valid) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: iconValidation.error,
        },
        request_id: requestId,
      });
      return;
    }

    const badge = await badgeRepo.createBadge(parsed.data, userId);

    const response: ApiSuccessResponse<{ badge: typeof badge }> = {
      data: { badge },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating badge:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create badge',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/admin/badges/:badgeId
 * Update a badge
 */
export async function updateBadge(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const badgeId = req.params.badgeId;
    const parsed = UpdateBadgeSchema.safeParse(req.body);
    
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    // Validate icon configuration
    const iconValidation = validateBadgeIcon({
      icon_type: parsed.data.icon_type,
      icon_key: parsed.data.icon_key,
    });
    if (!iconValidation.valid) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: iconValidation.error,
        },
        request_id: requestId,
      });
      return;
    }

    const badge = await badgeRepo.updateBadge(badgeId, parsed.data, userId);

    const response: ApiSuccessResponse<{ badge: typeof badge }> = {
      data: { badge },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating badge:`, error);
    if (error instanceof Error && error.message === 'Badge not found') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Badge not found',
        },
        request_id: requestId,
      });
      return;
    }
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update badge',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/admin/badges/:badgeId/awards
 * List badge awards for a badge
 */
export async function listBadgeAwards(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const badgeId = req.params.badgeId;
    // TODO: Implement badge awards listing
    const response: ApiSuccessResponse<{ awards: any[] }> = {
      data: { awards: [] },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing badge awards:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list badge awards',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/badges/:badgeId/award
 * Manually award badge to user
 */
export async function awardBadgeToUser(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const badgeId = req.params.badgeId;
    // TODO: Implement badge awarding
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Badge awarding not yet implemented',
      },
      request_id: requestId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error awarding badge:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to award badge',
      },
      request_id: requestId,
    });
  }
}

/**
 * DELETE /v1/admin/badges/:badgeId
 * Delete a badge (soft delete)
 */
export async function deleteBadge(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const badgeId = req.params.badgeId;
    const force = req.query.force === 'true'; // Force delete even if in use

    // Check if badge exists
    const badge = await badgeRepo.getBadge(badgeId);
    if (!badge) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Badge not found',
        },
        request_id: requestId,
      });
      return;
    }

    // Check usage (badges can be referenced in courses via badge_ids)
    // For now, we'll allow deletion but could add usage checking later
    // TODO: Implement badge usage checking similar to metadata options

    // Soft delete (set deleted_at)
    await badgeRepo.deleteBadge(badgeId, userId);

    const response: ApiSuccessResponse<{ message: string }> = {
      data: { message: 'Badge deleted successfully' },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error deleting badge:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete badge',
      },
      request_id: requestId,
    });
  }
}

