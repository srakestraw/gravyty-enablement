/**
 * Content Hub Flags API Handlers
 * 
 * Handlers for outdated flags and update requests
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { OutdatedFlag, UpdateRequest } from '@gravyty/domain';

import { outdatedFlagRepo, updateRequestRepo } from '../storage/dynamo/outdatedFlagRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { createNotification } from '@gravyty/jobs';

/**
 * POST /v1/content-hub/assets/:id/flags/outdated
 * Flag an asset as outdated
 */
export async function flagOutdated(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  const userId = req.user!.userId;
  
  try {
    const FlagOutdatedSchema = z.object({
      reason: z.string().optional(),
    });
    
    const parsed = FlagOutdatedSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
      };
      return res.status(400).json(response);
    }
    
    const { reason } = parsed.data;
    
    // Verify asset exists
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${assetId} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Create flag
    const flagId = `flag_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const flag: OutdatedFlag = {
      flag_id: flagId,
      asset_id: assetId,
      user_id: userId,
      reason,
      created_at: now,
      entity_type: 'OUTDATED_FLAG',
      'asset_id#created_at': `${assetId}#${now}`,
    };
    
    const created = await outdatedFlagRepo.createFlag(flag);
    
    // Notify asset owner if not the flagger
    if (asset.owner_id && asset.owner_id !== userId) {
      try {
        await createNotification({
          userId: asset.owner_id,
          type: 'warning',
          title: 'Asset flagged as outdated',
          message: `${req.user!.name || req.user!.email} flagged "${asset.title}" as outdated`,
          contentId: assetId,
          notificationId: `outdated_flag:${flagId}:${asset.owner_id}`,
        });
      } catch (err) {
        console.error('[Flags] Error creating owner notification:', err);
        // Don't fail the request if notifications fail
      }
    }
    
    const response: ApiSuccessResponse<OutdatedFlag> = {
      data: created,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error flagging asset as outdated:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to flag asset as outdated',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /v1/content-hub/assets/:id/requests/update
 * Request an update to an asset
 */
export async function requestUpdate(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  const userId = req.user!.userId;
  
  try {
    const RequestUpdateSchema = z.object({
      message: z.string().optional(),
    });
    
    const parsed = RequestUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
      };
      return res.status(400).json(response);
    }
    
    const { message } = parsed.data;
    
    // Verify asset exists
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${assetId} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Create request
    const requestId_ = `request_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const request: UpdateRequest = {
      request_id: requestId_,
      asset_id: assetId,
      user_id: userId,
      message,
      created_at: now,
      entity_type: 'UPDATE_REQUEST',
      'asset_id#created_at': `${assetId}#${now}`,
    };
    
    const created = await updateRequestRepo.createRequest(request);
    
    // Notify asset owner if not the requester
    if (asset.owner_id && asset.owner_id !== userId) {
      try {
        await createNotification({
          userId: asset.owner_id,
          type: 'info',
          title: 'Update requested',
          message: `${req.user!.name || req.user!.email} requested an update to "${asset.title}"`,
          contentId: assetId,
          notificationId: `update_request:${requestId_}:${asset.owner_id}`,
        });
      } catch (err) {
        console.error('[Flags] Error creating owner notification:', err);
        // Don't fail the request if notifications fail
      }
    }
    
    const response: ApiSuccessResponse<UpdateRequest> = {
      data: created,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error requesting update:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to request update',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/content-hub/assets/:id/flags
 * List outdated flags for an asset
 */
export async function listFlags(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await outdatedFlagRepo.listFlagsByAsset(assetId, {
      resolved,
      limit,
      cursor,
    });
    
    const response: ApiSuccessResponse<{ items: OutdatedFlag[]; next_cursor?: string }> = {
      data: result,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing flags:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list flags',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/content-hub/assets/:id/requests
 * List update requests for an asset
 */
export async function listRequests(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await updateRequestRepo.listRequestsByAsset(assetId, {
      resolved,
      limit,
      cursor,
    });
    
    const response: ApiSuccessResponse<{ items: UpdateRequest[]; next_cursor?: string }> = {
      data: result,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing requests:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list requests',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * PATCH /v1/content-hub/flags/:id/resolve
 * Resolve an outdated flag (Owner/Approver only)
 */
export async function resolveFlag(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const flagId = req.params.id;
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  
  try {
    // Get flag
    const flag = await outdatedFlagRepo.getFlag(flagId);
    if (!flag) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Flag ${flagId} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Get asset to check ownership
    const asset = await assetRepo.get(flag.asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${flag.asset_id} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Check permissions: Owner or Approver+
    if (asset.owner_id !== userId && userRole !== 'Approver' && userRole !== 'Admin') {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only asset owners and Approvers can resolve flags',
        },
      };
      return res.status(403).json(response);
    }
    
    // Resolve flag
    const now = new Date().toISOString();
    const updated = await outdatedFlagRepo.updateFlag(flagId, {
      resolved_at: now,
      resolved_by: userId,
    });
    
    const response: ApiSuccessResponse<OutdatedFlag> = {
      data: updated,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error resolving flag:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resolve flag',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * PATCH /v1/content-hub/requests/:id/resolve
 * Resolve an update request (Owner/Approver only)
 */
export async function resolveRequest(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const requestId_ = req.params.id;
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  
  try {
    // Get request
    const request = await updateRequestRepo.getRequest(requestId_);
    if (!request) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Request ${requestId_} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Get asset to check ownership
    const asset = await assetRepo.get(request.asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${request.asset_id} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Check permissions: Owner or Approver+
    if (asset.owner_id !== userId && userRole !== 'Approver' && userRole !== 'Admin') {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only asset owners and Approvers can resolve requests',
        },
      };
      return res.status(403).json(response);
    }
    
    // Resolve request
    const now = new Date().toISOString();
    const updated = await updateRequestRepo.updateRequest(requestId_, {
      resolved_at: now,
      resolved_by: userId,
    });
    
    const response: ApiSuccessResponse<UpdateRequest> = {
      data: updated,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error resolving request:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resolve request',
      },
    };
    return res.status(500).json(response);
  }
}

