/**
 * Public Share Link Handlers
 * 
 * Handlers for public (unauthenticated) share link endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { ShareLink, ShareEvent, Asset, AssetVersion } from '@gravyty/domain';
import { ShareEventTypeSchema } from '@gravyty/domain';

import { shareLinkRepo, shareRecipientRepo, shareEventRepo } from '../storage/dynamo/shareLinkRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../aws/s3Client';

const CONTENT_BUCKET = process.env.ENABLEMENT_CONTENT_BUCKET || 'enablement-content';

/**
 * Validate share link and check expiration/revocation
 */
async function validateShareLink(token: string): Promise<{ shareLink: ShareLink; error?: string }> {
  const shareLink = await shareLinkRepo.getByToken(token);
  
  if (!shareLink) {
    return { shareLink: null as any, error: 'Share link not found' };
  }
  
  // Check if revoked
  if (shareLink.status === 'revoked') {
    return { shareLink, error: 'Share link has been revoked' };
  }
  
  // Check if expired
  if (shareLink.status === 'expired') {
    return { shareLink, error: 'Share link has expired' };
  }
  
  // Check expiration date
  if (shareLink.expires_at) {
    const expiresAt = new Date(shareLink.expires_at);
    if (expiresAt < new Date()) {
      // Auto-expire
      await shareLinkRepo.update(shareLink.share_link_id, { status: 'expired' });
      return { shareLink, error: 'Share link has expired' };
    }
  }
  
  // Check if asset expired (if expire_with_asset is true)
  if (shareLink.expire_with_asset) {
    const asset = await assetRepo.get(shareLink.asset_id);
    if (asset) {
      const publishedVersion = asset.current_published_version_id
        ? await assetVersionRepo.get(asset.current_published_version_id)
        : null;
      
      if (publishedVersion && publishedVersion.status === 'expired') {
        await shareLinkRepo.update(shareLink.share_link_id, { status: 'expired' });
        return { shareLink, error: 'Share link has expired with asset' };
      }
    }
  }
  
  return { shareLink };
}

/**
 * Resolve version for canonical share links
 */
async function resolveVersion(shareLink: ShareLink): Promise<AssetVersion | null> {
  if (shareLink.version_id) {
    // Version-pinned link
    return await assetVersionRepo.get(shareLink.version_id);
  } else {
    // Canonical link - resolve to latest published version
    const asset = await assetRepo.get(shareLink.asset_id);
    if (!asset || !asset.current_published_version_id) {
      return null;
    }
    return await assetVersionRepo.get(asset.current_published_version_id);
  }
}

/**
 * GET /s/:token
 * Get share link landing page data (public)
 */
export async function getShareLinkLanding(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const token = req.params.token;
  
  try {
    // Validate share link
    const { shareLink, error } = await validateShareLink(token);
    if (error || !shareLink) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: error || 'Share link not found',
        },
      };
      return res.status(404).json(response);
    }
    
    // Get asset
    const asset = await assetRepo.get(shareLink.asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Asset not found',
        },
      };
      return res.status(404).json(response);
    }
    
    // Resolve version
    const version = await resolveVersion(shareLink);
    if (!version) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'No published version available',
        },
      };
      return res.status(404).json(response);
    }
    
    // Check if version is published
    if (version.status !== 'published') {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_AVAILABLE',
          message: 'Version is not available',
        },
      };
      return res.status(404).json(response);
    }
    
    // Track view event
    const eventId = `event_${uuidv4()}`;
    const now = new Date().toISOString();
    const event: ShareEvent = {
      event_id: eventId,
      share_link_id: shareLink.share_link_id,
      event_type: 'view',
      resolved_version_id: version.version_id,
      ip_address: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      created_at: now,
      entity_type: 'SHARE_EVENT',
      'share_link_id#created_at': `${shareLink.share_link_id}#${now}`,
    };
    
    await shareEventRepo.create(event).catch(err => {
      console.error('[getShareLinkLanding] Error tracking event:', err);
      // Don't fail the request if tracking fails
    });
    
    // Update last access time
    await shareLinkRepo.update(shareLink.share_link_id, {
      last_access_at: now,
    }).catch(err => {
      console.error('[getShareLinkLanding] Error updating last access:', err);
    });
    
    // Check for newer version (for canonical links)
    let newerVersionAvailable = false;
    if (!shareLink.version_id && asset.current_published_version_id) {
      const currentVersion = await assetVersionRepo.get(asset.current_published_version_id);
      if (currentVersion && currentVersion.version_number > version.version_number) {
        newerVersionAvailable = true;
      }
    }
    
    const response: ApiSuccessResponse<{
      share_link: ShareLink;
      asset: Asset;
      version: AssetVersion;
      newer_version_available: boolean;
    }> = {
      data: {
        share_link: shareLink,
        asset,
        version,
        newer_version_available: newerVersionAvailable,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting share link landing:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get share link',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /s/:token/events
 * Track share link event (view, download)
 */
export async function trackShareEvent(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const token = req.params.token;
  
  try {
    const TrackEventSchema = z.object({
      event_type: ShareEventTypeSchema,
    });
    
    const parsed = TrackEventSchema.safeParse(req.body);
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
    
    // Validate share link
    const { shareLink, error } = await validateShareLink(token);
    if (error || !shareLink) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: error || 'Share link not found',
        },
      };
      return res.status(404).json(response);
    }
    
    // Resolve version for canonical links
    const version = await resolveVersion(shareLink);
    if (!version) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Version not found',
        },
      };
      return res.status(404).json(response);
    }
    
    // Create event
    const eventId = `event_${uuidv4()}`;
    const now = new Date().toISOString();
    const event: ShareEvent = {
      event_id: eventId,
      share_link_id: shareLink.share_link_id,
      event_type: parsed.data.event_type,
      resolved_version_id: version.version_id,
      ip_address: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      created_at: now,
      entity_type: 'SHARE_EVENT',
      'share_link_id#created_at': `${shareLink.share_link_id}#${now}`,
    };
    
    await shareEventRepo.create(event);
    
    // If download event and download is allowed, generate presigned URL
    let downloadUrl: string | undefined;
    if (parsed.data.event_type === 'download' && shareLink.allow_download && version.storage_key) {
      const getCommand = new GetObjectCommand({
        Bucket: CONTENT_BUCKET,
        Key: version.storage_key,
      });
      downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    }
    
    const response: ApiSuccessResponse<{ event_id: string; download_url?: string }> = {
      data: {
        event_id: eventId,
        ...(downloadUrl && { download_url: downloadUrl }),
      },
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error tracking share event:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to track event',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /s/:token/verify
 * Verify email for email-verified share links
 */
export async function verifyEmail(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const token = req.params.token;
  
  try {
    const VerifyEmailSchema = z.object({
      email: z.string().email(),
      verification_token: z.string(),
    });
    
    const parsed = VerifyEmailSchema.safeParse(req.body);
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
    
    // Validate share link
    const { shareLink, error } = await validateShareLink(token);
    if (error || !shareLink) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: error || 'Share link not found',
        },
      };
      return res.status(404).json(response);
    }
    
    // Check if email-verified mode
    if (shareLink.access_mode !== 'emailVerify') {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Share link does not require email verification',
        },
      };
      return res.status(400).json(response);
    }
    
    // Find recipient
    const recipient = await shareRecipientRepo.findByEmailAndShareLink(parsed.data.email, shareLink.share_link_id);
    if (!recipient) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Email not found for this share link',
        },
      };
      return res.status(404).json(response);
    }
    
    // Verify token
    if (recipient.verification_token !== parsed.data.verification_token) {
      const response: ApiErrorResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid verification token',
        },
      };
      return res.status(401).json(response);
    }
    
    // Mark as verified
    const now = new Date().toISOString();
    await shareRecipientRepo.update(recipient.recipient_id, {
      verified: true,
      verified_at: now,
    });
    
    // Track verification event
    const eventId = `event_${uuidv4()}`;
    const event: ShareEvent = {
      event_id: eventId,
      share_link_id: shareLink.share_link_id,
      event_type: 'verify',
      ip_address: req.ip || req.headers['x-forwarded-for'] as string || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      recipient_email: parsed.data.email,
      created_at: now,
      entity_type: 'SHARE_EVENT',
      'share_link_id#created_at': `${shareLink.share_link_id}#${now}`,
    };
    
    await shareEventRepo.create(event);
    
    const response: ApiSuccessResponse<{ verified: boolean }> = {
      data: { verified: true },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error verifying email:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to verify email',
      },
    };
    return res.status(500).json(response);
  }
}

