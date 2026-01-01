/**
 * Content Hub Share Links API Handlers
 * 
 * Handlers for share link endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { ShareLink, ShareRecipient } from '@gravyty/domain';
import { ShareLinkSchema, ShareLinkTargetTypeSchema, ShareLinkAccessModeSchema } from '@gravyty/domain';

import { shareLinkRepo, shareRecipientRepo } from '../storage/dynamo/shareLinkRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { generateShareToken, generateVerificationToken } from '../lib/shareLinkTokens';

/**
 * POST /v1/content-hub/share-links
 * Create a new share link
 */
export async function createShareLink(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    const CreateShareLinkSchema = z.object({
      target_type: ShareLinkTargetTypeSchema,
      asset_id: z.string(),
      version_id: z.string().optional(), // Nullable - null for canonical
      expires_at: z.string().optional(), // ISO datetime
      expire_with_asset: z.boolean().optional().default(false),
      access_mode: ShareLinkAccessModeSchema,
      allow_download: z.boolean().optional().default(true),
      allow_comments: z.boolean().optional().default(false),
      notify_on_new_version: z.boolean().optional().default(false),
      recipients: z.array(z.string().email()).optional(), // For email-verified mode
    });
    
    const parsed = CreateShareLinkSchema.safeParse(req.body);
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
    
    const {
      target_type,
      asset_id,
      version_id,
      expires_at,
      expire_with_asset,
      access_mode,
      allow_download,
      allow_comments,
      notify_on_new_version,
      recipients,
    } = parsed.data;
    
    // Verify asset exists
    const asset = await assetRepo.get(asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${asset_id} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Verify version exists if specified
    if (version_id) {
      const version = await assetVersionRepo.get(version_id);
      if (!version || version.asset_id !== asset_id) {
        const response: ApiErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: `Version ${version_id} not found for asset ${asset_id}`,
          },
        };
        return res.status(404).json(response);
      }
    }
    
    // Check permissions: Owner or Approver+ can create share links
    const userRole = req.user!.role;
    if (asset.owner_id !== userId && userRole !== 'Approver' && userRole !== 'Admin') {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only asset owners and Approvers can create share links',
        },
      };
      return res.status(403).json(response);
    }
    
    // Create share link
    const shareLinkId = `share_${uuidv4()}`;
    const token = generateShareToken();
    const now = new Date().toISOString();
    
    const shareLink: ShareLink = {
      share_link_id: shareLinkId,
      token,
      target_type,
      asset_id,
      version_id: version_id || undefined,
      status: 'active',
      expires_at: expires_at || undefined,
      expire_with_asset: expire_with_asset || false,
      access_mode,
      allow_download: allow_download !== false,
      allow_comments: allow_comments || false,
      notify_on_new_version: notify_on_new_version || false,
      created_at: now,
      created_by: userId,
      entity_type: 'SHARE_LINK',
      share_token: token,
    };
    
    const created = await shareLinkRepo.create(shareLink);
    
    // Create recipients if email-verified mode
    const createdRecipients: ShareRecipient[] = [];
    if (access_mode === 'emailVerify' && recipients && recipients.length > 0) {
      for (const email of recipients) {
        const recipientId = `recipient_${uuidv4()}`;
        const verificationToken = generateVerificationToken();
        
        const recipient: ShareRecipient = {
          recipient_id: recipientId,
          share_link_id: shareLinkId,
          email,
          verified: false,
          verification_token: verificationToken,
          created_at: now,
          entity_type: 'SHARE_RECIPIENT',
          'share_link_id#email': `${shareLinkId}#${email}`,
        };
        
        const createdRecipient = await shareRecipientRepo.create(recipient);
        createdRecipients.push(createdRecipient);
        
        // TODO: Send verification email (SES integration)
      }
    }
    
    const response: ApiSuccessResponse<{ share_link: ShareLink; recipients?: ShareRecipient[] }> = {
      data: {
        share_link: created,
        ...(createdRecipients.length > 0 && { recipients: createdRecipients }),
      },
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating share link:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create share link',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/content-hub/share-links
 * List share links (for owner/approver)
 */
export async function listShareLinks(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  
  try {
    const assetId = req.query.asset_id as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    let result: { items: ShareLink[]; next_cursor?: string };
    
    if (assetId) {
      // Verify asset exists and user has permission
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
      
      // Check permissions
      if (asset.owner_id !== userId && userRole !== 'Approver' && userRole !== 'Admin') {
        const response: ApiErrorResponse = {
          error: {
            code: 'FORBIDDEN',
            message: 'Only asset owners and Approvers can view share links',
          },
        };
        return res.status(403).json(response);
      }
      
      result = await shareLinkRepo.listByAsset(assetId, {
        createdBy: userRole === 'Admin' ? undefined : userId, // Admins see all, others see only their own
        status,
        limit,
        cursor,
      });
    } else {
      // List all share links created by user (or all if Admin)
      result = await shareLinkRepo.listByCreator(userId, {
        limit,
        cursor,
      });
    }
    
    const response: ApiSuccessResponse<{ items: ShareLink[]; next_cursor?: string }> = {
      data: result,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing share links:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list share links',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /v1/content-hub/share-links/:id/revoke
 * Revoke a share link
 */
export async function revokeShareLink(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const shareLinkId = req.params.id;
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  
  try {
    // Get share link
    const shareLink = await shareLinkRepo.get(shareLinkId);
    if (!shareLink) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Share link ${shareLinkId} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Get asset to check permissions
    const asset = await assetRepo.get(shareLink.asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${shareLink.asset_id} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    // Check permissions: Owner or Approver+ can revoke
    if (asset.owner_id !== userId && shareLink.created_by !== userId && userRole !== 'Approver' && userRole !== 'Admin') {
      const response: ApiErrorResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only asset owners, link creators, and Approvers can revoke share links',
        },
      };
      return res.status(403).json(response);
    }
    
    // Revoke share link
    const updated = await shareLinkRepo.update(shareLinkId, {
      status: 'revoked',
    });
    
    const response: ApiSuccessResponse<ShareLink> = {
      data: updated,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error revoking share link:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to revoke share link',
      },
    };
    return res.status(500).json(response);
  }
}

