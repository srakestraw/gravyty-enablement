/**
 * Content Hub API Handlers
 * 
 * Handlers for Content Hub endpoints (assets, versions, uploads, downloads)
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { Asset, AssetVersion, AssetType, AssetSourceType, MediaRef } from '@gravyty/domain';
import { MediaRefSchema } from '@gravyty/domain';

import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { contentHubSubscriptionRepo } from '../storage/dynamo/contentHubSubscriptionRepo';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../aws/s3Client';
import { generateAssetVersionKey } from '../storage/s3/keys';
import { publishVersion, scheduleVersion as scheduleVersionFn, expireVersion as expireVersionFn } from '@gravyty/domain';
// archiveVersion temporarily disabled

const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';
const CONTENT_BUCKET = process.env.ENABLEMENT_CONTENT_BUCKET || 'enablement-content';

// ============================================================================
// ASSETS
// ============================================================================

/**
 * POST /v1/assets
 * Create a new asset (metadata only, no file upload)
 */
export async function createAsset(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const CreateAssetSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      asset_type: z.enum(['deck', 'doc', 'image', 'video', 'logo', 'worksheet', 'link']),
      owner_id: z.string().optional(), // Defaults to current user
      metadata_node_ids: z.array(z.string()).default([]),
      source_type: z.enum(['UPLOAD', 'LINK', 'GOOGLE_DRIVE']),
      source_ref: z.record(z.unknown()).optional(),
      cover_image: MediaRefSchema.optional(),
    });
    
    const parsed = CreateAssetSchema.safeParse(req.body);
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
    
    const now = new Date().toISOString();
    const assetId = `asset_${uuidv4()}`;
    const userId = req.user?.user_id || 'unknown';
    
    const asset: Asset = {
      asset_id: assetId,
      title: parsed.data.title,
      description: parsed.data.description,
      asset_type: parsed.data.asset_type,
      owner_id: parsed.data.owner_id || userId,
      metadata_node_ids: parsed.data.metadata_node_ids,
      source_type: parsed.data.source_type,
      source_ref: parsed.data.source_ref,
      cover_image: parsed.data.cover_image,
      pinned: false,
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
      entity_type: 'ASSET',
    };
    
    // Save to DynamoDB
    const createdAsset = await assetRepo.create(asset);
    
    // For LINK and GOOGLE_DRIVE sources, create an initial draft version
    let initialVersion: AssetVersion | undefined;
    if (parsed.data.source_type === 'LINK' || parsed.data.source_type === 'GOOGLE_DRIVE') {
      const versionId = `version_${uuidv4()}`;
      initialVersion = {
        version_id: versionId,
        asset_id: assetId,
        version_number: 1,
        status: 'draft',
        created_at: now,
        created_by: userId,
        updated_at: now,
        entity_type: 'ASSET_VERSION',
        'asset_id#version_number': `${assetId}#1`,
      };
      await assetVersionRepo.create(initialVersion);
    }
    
    const response: ApiSuccessResponse<{ asset: Asset; version?: AssetVersion }> = {
      data: { 
        asset: createdAsset,
        ...(initialVersion && { version: initialVersion }),
      },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating asset:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create asset',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/assets
 * List assets with filters
 */
export async function listAssets(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const metadataNodeId = req.query.metadata_node_id as string | undefined;
    const assetType = req.query.asset_type as string | undefined;
    const status = req.query.status as string | undefined; // Filter by published version status
    const pinned = req.query.pinned === 'true' ? true : req.query.pinned === 'false' ? false : undefined;
    const ownerId = req.query.owner_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await assetRepo.list({
      metadataNodeId,
      assetType,
      status,
      pinned,
      ownerId,
      limit,
      cursor,
    });
    
    const response: ApiSuccessResponse<{ assets: Asset[]; next_cursor?: string }> = {
      data: {
        assets: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing assets:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list assets',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/assets/:id
 * Get asset detail
 */
export async function getAsset(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Asset not found' },
        request_id: requestId,
      });
      return;
    }
    
    const response: ApiSuccessResponse<{ asset: Asset }> = {
      data: { asset },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting asset:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get asset',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * PATCH /v1/assets/:id
 * Update asset metadata
 */
export async function updateAsset(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const UpdateAssetSchema = z.object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      asset_type: z.enum(['deck', 'doc', 'image', 'video', 'logo', 'worksheet', 'link']).optional(),
      owner_id: z.string().optional(),
      metadata_node_ids: z.array(z.string()).optional(),
      cover_image: MediaRefSchema.optional().nullable(),
    });
    
    const parsed = UpdateAssetSchema.safeParse(req.body);
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
    
    const userId = req.user?.user_id || 'unknown';
    // Convert null cover_image to undefined for type compatibility
    const { cover_image, ...restData } = parsed.data;
    const updates: Partial<Asset> = {
      ...restData,
      updated_by: userId,
      ...(cover_image !== null && { cover_image }), // Only include if not null
    };
    const asset = await assetRepo.update(assetId, updates);
    
    const response: ApiSuccessResponse<{ asset: Asset }> = {
      data: { asset },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating asset:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update asset',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

// ============================================================================
// VERSIONS
// ============================================================================

/**
 * POST /v1/assets/:id/versions/init-upload
 * Initialize upload: create draft version and get presigned PUT URL
 */
export async function initUpload(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  const userId = req.user?.user_id || 'unknown';
  
  try {
    const InitUploadSchema = z.object({
      filename: z.string().min(1),
      content_type: z.string(),
      size_bytes: z.number().int().min(0).optional(),
    });
    
    const parsed = InitUploadSchema.safeParse(req.body);
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
    
    // Verify asset exists
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Asset not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Check permission: owner or Contributor+
    if (asset.owner_id !== userId && req.user?.role === 'Viewer') {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only asset owner or Contributor+ can upload versions' },
        request_id: requestId,
      });
      return;
    }
    
    // Get next version number
    const existingVersions = await assetVersionRepo.listByAsset(assetId, { limit: 1 });
    const nextVersionNumber = existingVersions.items.length > 0
      ? Math.max(...existingVersions.items.map(v => v.version_number)) + 1
      : 1;
    
    // Create draft version
    const now = new Date().toISOString();
    const versionId = `version_${uuidv4()}`;
    const s3Key = generateAssetVersionKey(assetId, versionId, parsed.data.filename);
    
    const version: AssetVersion = {
      version_id: versionId,
      asset_id: assetId,
      version_number: nextVersionNumber,
      status: 'draft',
      mime_type: parsed.data.content_type,
      size_bytes: parsed.data.size_bytes,
      storage_key: s3Key,
      created_at: now,
      created_by: userId,
      updated_at: now,
      entity_type: 'ASSET_VERSION',
      'asset_id#version_number': `${assetId}#${nextVersionNumber}`,
    };
    
    await assetVersionRepo.create(version);
    
    // Generate presigned PUT URL (5 minutes expiry)
    const putCommand = new PutObjectCommand({
      Bucket: CONTENT_BUCKET,
      Key: s3Key,
      ContentType: parsed.data.content_type,
    });
    
    const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 300 });
    
    const response: ApiSuccessResponse<{
      version_id: string;
      upload_url: string;
      s3_bucket: string;
      s3_key: string;
      expires_in_seconds: number;
    }> = {
      data: {
        version_id: versionId,
        upload_url: uploadUrl,
        s3_bucket: CONTENT_BUCKET,
        s3_key: s3Key,
        expires_in_seconds: 300,
      },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error initializing upload:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to initialize upload',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * POST /v1/assets/:id/versions/complete-upload
 * Complete upload: finalize version metadata after file upload
 */
export async function completeUpload(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const CompleteUploadSchema = z.object({
      version_id: z.string(),
      storage_key: z.string(),
      checksum: z.string().optional(),
      size_bytes: z.number().int().min(0),
    });
    
    const parsed = CompleteUploadSchema.safeParse(req.body);
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
    
    // Verify version exists and belongs to asset
    const version = await assetVersionRepo.get(parsed.data.version_id);
    if (!version || version.asset_id !== assetId) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      });
      return;
    }
    
    // Update version with file metadata
    const updatedVersion = await assetVersionRepo.update(parsed.data.version_id, {
      storage_key: parsed.data.storage_key,
      checksum: parsed.data.checksum,
      size_bytes: parsed.data.size_bytes,
    });
    
    const response: ApiSuccessResponse<{ version: AssetVersion }> = {
      data: { version: updatedVersion },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error completing upload:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete upload',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/assets/:id/versions
 * List all versions for an asset
 */
export async function listVersions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await assetVersionRepo.listByAsset(assetId, { limit, cursor });
    
    const response: ApiSuccessResponse<{ versions: AssetVersion[]; next_cursor?: string }> = {
      data: {
        versions: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing versions:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list versions',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/versions/:id/download-url
 * Generate presigned download URL for a version
 */
export async function getDownloadUrl(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const versionId = req.params.id;
  const userId = req.user?.user_id || 'unknown';
  const userRole = req.user?.role || 'Viewer';
  
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
    
    // Get asset for RBAC check
    const asset = await assetRepo.get(version.asset_id);
    if (!asset) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Asset not found' },
        request_id: requestId,
      });
      return;
    }
    
    // RBAC checks
    if (version.status === 'draft') {
      // Only owner or Admin can download drafts
      if (asset.owner_id !== userId && userRole !== 'Admin') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only asset owner or Admin can download draft versions' },
          request_id: requestId,
        });
        return;
      }
    } else if (version.status === 'expired') {
      // Only Admin can download expired versions
      if (userRole !== 'Admin') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Expired versions can only be downloaded by Admin' },
          request_id: requestId,
        });
        return;
      }
    } else if (version.status !== 'published') {
      // Only published versions are downloadable by viewers
      if (userRole === 'Viewer') {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Only published versions can be downloaded' },
          request_id: requestId,
        });
        return;
      }
    }
    
    // Check if version has storage key
    if (!version.storage_key) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Version has no file attached' },
        request_id: requestId,
      });
      return;
    }
    
    // Generate presigned GET URL (1 hour expiry)
    const getCommand = new GetObjectCommand({
      Bucket: CONTENT_BUCKET,
      Key: version.storage_key,
    });
    
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    
    // Auto-subscribe on download (for published versions only)
    if (version.status === 'published') {
      try {
        const existing = await contentHubSubscriptionRepo.findByUserAndTarget(
          userId,
          'asset',
          asset.asset_id
        );
        if (!existing) {
          const subscriptionId = `sub_${uuidv4()}`;
          const now = new Date().toISOString();
          await contentHubSubscriptionRepo.create({
            subscription_id: subscriptionId,
            target_type: 'asset',
            target_id: asset.asset_id,
            user_id: userId,
            triggers: {
              newVersion: true,
              expiringSoon: true,
              expired: true,
              comments: false,
              mentions: true,
            },
            created_at: now,
            entity_type: 'SUBSCRIPTION',
            'target_type#target_id': `asset#${asset.asset_id}`,
            'user_id#subscription_id': `${userId}#${subscriptionId}`,
          });
        }
      } catch (err) {
        // Don't fail download if auto-subscribe fails
        console.error('[getDownloadUrl] Error auto-subscribing:', err);
      }
    }
    
    const response: ApiSuccessResponse<{
      download_url: string;
      expires_in_seconds: number;
    }> = {
      data: {
        download_url: downloadUrl,
        expires_in_seconds: 3600,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error generating download URL:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate download URL',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

