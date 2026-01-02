/**
 * Content Hub Comments API Handlers
 * 
 * Handlers for comment endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { Comment } from '@gravyty/domain';

import { commentRepo } from '../storage/dynamo/commentRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { contentHubSubscriptionRepo } from '../storage/dynamo/contentHubSubscriptionRepo';
import { createNotification } from '@gravyty/jobs';
import { listUsers } from '../aws/cognitoClient';

/**
 * Extract @mentions from comment body
 */
function extractMentions(body: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(body)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * POST /v1/content-hub/assets/:id/comments
 * Create a new comment on an asset
 */
export async function createComment(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  const userId = req.user!.user_id;
  
  try {
    const CreateCommentSchema = z.object({
      body: z.string().min(1),
      version_id: z.string().optional(),
      parent_comment_id: z.string().optional(),
    });
    
    const parsed = CreateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }
    
    const { body, version_id, parent_comment_id } = parsed.data;
    
    // Verify asset exists
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${assetId} not found`,
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }
    
    // Create comment
    const commentId = `comment_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const comment: Comment = {
      comment_id: commentId,
      asset_id: assetId,
      version_id: version_id || undefined,
      user_id: userId!,
      body,
      parent_comment_id: parent_comment_id || undefined,
      created_at: now,
      entity_type: 'COMMENT',
      'asset_id#created_at': `${assetId}#${now}`,
    };
    
    const created = await commentRepo.create(comment);
    
    // Auto-subscribe on comment (optional - can be disabled via feature flag)
    const AUTO_SUBSCRIBE_ON_COMMENT = process.env.AUTO_SUBSCRIBE_ON_COMMENT !== 'false';
    if (AUTO_SUBSCRIBE_ON_COMMENT) {
      try {
        const existing = await contentHubSubscriptionRepo.findByUserAndTarget(
          userId,
          'asset',
          assetId
        );
        if (!existing) {
          const subscriptionId = `sub_${uuidv4()}`;
          const now = new Date().toISOString();
          await contentHubSubscriptionRepo.create({
            subscription_id: subscriptionId,
            target_type: 'asset',
            target_id: assetId,
            user_id: userId,
            triggers: {
              newVersion: true,
              expiringSoon: true,
              expired: true,
              comments: true, // Subscribe to comments since they commented
              mentions: true,
            },
            created_at: now,
            entity_type: 'SUBSCRIPTION',
            'target_type#target_id': `asset#${assetId}`,
            'user_id#subscription_id': `${userId}#${subscriptionId}`,
          });
        }
      } catch (err) {
        // Don't fail comment creation if auto-subscribe fails
        console.error('[createComment] Error auto-subscribing:', err);
      }
    }
    
    // Extract mentions and create notifications
    const mentions = extractMentions(body);
    if (mentions.length > 0) {
      try {
        // Try to find users by username/email
        const usersResult = await listUsers({ query: mentions[0], limit: 100 });
        const mentionedUsers = usersResult.users.filter(u => 
          mentions.some(m => u.username.toLowerCase().includes(m.toLowerCase()) || u.email.toLowerCase().includes(m.toLowerCase()))
        );
        
        for (const user of mentionedUsers) {
          await createNotification({
            userId: user.username,
            type: 'info',
            title: 'You were mentioned in a comment',
            message: `${req.user!.email || 'Someone'} mentioned you in a comment on "${asset.title}"`,
            contentId: assetId,
            notificationId: `mention:${commentId}:${user.username || ''}`,
          });
        }
      } catch (err) {
        console.error('[Comments] Error creating mention notifications:', err);
        // Don't fail the request if notifications fail
      }
    }
    
    // Notify asset owner if not the commenter
    if (asset.owner_id && asset.owner_id !== userId) {
      try {
        await createNotification({
          userId: asset.owner_id,
          type: 'info',
          title: 'New comment on your asset',
          message: `${req.user!.email || 'Someone'} commented on "${asset.title}"`,
          contentId: assetId,
          notificationId: `comment:${commentId}:${asset.owner_id}`,
        });
      } catch (err) {
        console.error('[Comments] Error creating owner notification:', err);
        // Don't fail the request if notifications fail
      }
    }
    
    const response: ApiSuccessResponse<Comment> = {
      data: created,
      request_id: requestId,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating comment:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create comment',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/content-hub/assets/:id/comments
 * List comments for an asset
 */
export async function listComments(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const versionId = req.query.version_id as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await commentRepo.listByAsset(assetId, {
      versionId,
      limit,
      cursor,
    });
    
    const response: ApiSuccessResponse<{ items: Comment[]; next_cursor?: string }> = {
      data: result,
      request_id: requestId,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing comments:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list comments',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

/**
 * PATCH /v1/content-hub/comments/:id/resolve
 * Resolve a comment thread (Owner/Approver only)
 */
export async function resolveComment(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const commentId = req.params.id;
  const userId = req.user!.user_id;
  const userRole = req.user!.role;
  
  try {
    // Get comment
    const comment = await commentRepo.get(commentId);
    if (!comment) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Comment ${commentId} not found`,
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }
    
    // Get asset to check ownership
    const asset = await assetRepo.get(comment.asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${comment.asset_id} not found`,
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }
    
    // Check permissions: Owner or Approver+
    if (asset.owner_id !== userId && userRole !== 'Approver' && userRole !== 'Admin') {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only asset owners and Approvers can resolve comments',
        },
        request_id: requestId,
      };
      return res.status(403).json(response);
    }
    
    // Resolve comment
    const now = new Date().toISOString();
    const updated = await commentRepo.update(commentId, {
      resolved_at: now,
      resolved_by: userId,
      updated_at: now,
    });
    
    const response: ApiSuccessResponse<Comment> = {
      data: updated,
      request_id: requestId,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error resolving comment:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to resolve comment',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

