/**
 * Content Hub Lifecycle API Handlers
 * 
 * Handlers for version lifecycle management (publish, schedule, expire, archive)
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { publishVersion, scheduleVersion as scheduleVersionFn, expireVersion as expireVersionFn } from '@gravyty/domain';
// archiveVersion temporarily disabled
// import { archiveVersion as archiveVersionFn } from '@gravyty/domain';
import type { Asset, AssetVersion } from '@gravyty/domain';
import { notifySubscribersNewVersion } from '../lib/contentHubNotifications';

/**
 * POST /v1/versions/:id/publish
 * Publish a version immediately
 */
export async function publishVersionHandler(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const versionId = req.params.id;
  const userId = req.user?.user_id || 'unknown';
  
  try {
    const PublishSchema = z.object({
      change_log: z.string().optional(),
    });
    
    const parsed = PublishSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        },
        request_id: requestId,
      };
      res.status(400).json(response);
      return;
    }
    
    // Get version
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Get asset
    const asset = await assetRepo.get(version.asset_id);
    if (!asset) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Asset not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Enforce publish requirements: required metadata
    if (!asset.title || !asset.asset_type || !asset.owner_id) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Required metadata missing: title, asset_type, and owner_id are required to publish.' },
        request_id: requestId,
      });
      return;
    }
    
    // Use domain logic to publish
    const { version: publishedVersion, asset: assetUpdate } = publishVersion(
      version,
      userId,
      parsed.data.change_log || ''
    );
    
    // Update version
    await assetVersionRepo.update(versionId, publishedVersion);
    
    // Update asset
    await assetRepo.update(version.asset_id, assetUpdate);
    
    // Notify subscribers of new version (async, don't wait)
    const updatedAsset = await assetRepo.get(version.asset_id) as Asset;
    notifySubscribersNewVersion(updatedAsset, publishedVersion).catch(err => {
      console.error('[publishVersionHandler] Error notifying subscribers:', err);
    });
    
    const response: ApiSuccessResponse<{ version: AssetVersion; asset: Asset }> = {
      data: {
        version: publishedVersion,
        asset: updatedAsset,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error publishing version:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish version',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * POST /v1/versions/:id/schedule
 * Schedule a version for future publishing
 */
export async function scheduleVersion(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const versionId = req.params.id;
  
  try {
    const ScheduleSchema = z.object({
      publish_at: z.string().datetime('Invalid datetime format'),
    });
    
    const parsed = ScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        },
        request_id: requestId,
      };
      res.status(400).json(response);
      return;
    }
    
    // Get version
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Check if another version is already scheduled for this asset
    const scheduledVersions = await assetVersionRepo.getScheduledToPublish(new Date(Date.now() + 86400000).toISOString()); // Check next 24 hours
    const hasScheduled = scheduledVersions.some(v => v.asset_id === version.asset_id && v.version_id !== versionId);
    
    if (hasScheduled) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Only one version can be scheduled per asset at a time' },
        request_id: requestId,
      });
      return;
    }
    
    // Use domain logic to schedule
    const scheduledVersion = scheduleVersionFn(version, parsed.data.publish_at);
    
    // Update version
    await assetVersionRepo.update(versionId, scheduledVersion);
    
    const response: ApiSuccessResponse<{ version: AssetVersion }> = {
      data: { version: scheduledVersion },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error scheduling version:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to schedule version',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * POST /v1/versions/:id/expire
 * Expire a version immediately
 */
export async function expireVersion(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const versionId = req.params.id;
  
  try {
    // Get version
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Use domain logic to expire
    const expiredVersion = expireVersionFn(version);
    
    // Update version
    await assetVersionRepo.update(versionId, expiredVersion);
    
    // If this was the current published version, update asset
    const asset = await assetRepo.get(version.asset_id);
    if (asset && asset.current_published_version_id === versionId) {
      // Find next latest published version
      const latestPublished = await assetVersionRepo.getLatestPublished(version.asset_id);
      await assetRepo.update(version.asset_id, {
        current_published_version_id: latestPublished?.version_id,
      });
    }
    
    const response: ApiSuccessResponse<{ version: AssetVersion }> = {
      data: { version: expiredVersion },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error expiring version:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to expire version',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * PATCH /v1/versions/:id/expire-at
 * Set expiration date/time for a version
 */
export async function setExpireAt(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const versionId = req.params.id;
  
  try {
    const SetExpireAtSchema = z.object({
      expire_at: z.string().datetime('Invalid datetime format').optional().nullable(),
    });
    
    const parsed = SetExpireAtSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        },
        request_id: requestId,
      };
      res.status(400).json(response);
      return;
    }
    
    // Get version
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Update expire_at
    const updatedVersion = await assetVersionRepo.update(versionId, {
      expire_at: parsed.data.expire_at || undefined,
      updated_at: new Date().toISOString(),
    });
    
    const response: ApiSuccessResponse<{ version: AssetVersion }> = {
      data: { version: updatedVersion },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error setting expire_at:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set expire_at',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * POST /v1/versions/:id/archive
 * Archive a version
 */
// Temporarily disabled until archiveVersion is exported from domain
export async function archiveVersion(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const versionId = req.params.id;
  
  try {
    // Get version
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Use domain logic to archive
    const archivedVersion = archiveVersionFn(version);
    
    // Update version
    await assetVersionRepo.update(versionId, archivedVersion);
    
    const response: ApiSuccessResponse<{ version: AssetVersion }> = {
      data: { version: archivedVersion },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error archiving version:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to archive version',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

