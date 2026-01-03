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
      short_description: z.string().optional(),
      description: z.string().optional(),
      description_rich_text: z.string().optional(), // Rich text description for non-text content
      body_rich_text: z.string().optional(), // Rich text body for text_content type
      asset_type: z.enum(['deck', 'doc', 'document', 'text_content', 'image', 'video', 'logo', 'worksheet', 'link']),
      owner_id: z.string().optional(), // Defaults to current user
      metadata_node_ids: z.array(z.string()).default([]),
      audience_ids: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
      source_type: z.enum(['UPLOAD', 'LINK', 'GOOGLE_DRIVE', 'RICHTEXT']).optional(), // Optional, inferred from attachments
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
    
    // Normalize source_ref for LINK type: support both single URL and multiple URLs
    let normalizedSourceRef = parsed.data.source_ref;
    if (parsed.data.source_type === 'LINK' && parsed.data.source_ref) {
      // If it has 'url' (single), convert to 'urls' array for consistency
      if ('url' in parsed.data.source_ref && typeof parsed.data.source_ref.url === 'string') {
        normalizedSourceRef = {
          urls: [parsed.data.source_ref.url],
          ...(parsed.data.source_ref.preview && { previews: [parsed.data.source_ref.preview] }),
        };
      }
      // If it has 'urls' array, keep it as is
      // Otherwise, keep the original source_ref
    }
    
    // Determine source_type based on asset_type and content
    let inferredSourceType: AssetSourceType = parsed.data.source_type || 'UPLOAD';
    if (parsed.data.asset_type === 'text_content' || parsed.data.asset_type === 'document') {
      inferredSourceType = 'RICHTEXT';
    } else if (parsed.data.source_type) {
      inferredSourceType = parsed.data.source_type;
    }
    
    const asset: Asset = {
      asset_id: assetId,
      title: parsed.data.title,
      short_description: parsed.data.short_description,
      description: parsed.data.description,
      description_rich_text: parsed.data.description_rich_text,
      body_rich_text: parsed.data.body_rich_text,
      asset_type: parsed.data.asset_type,
      owner_id: parsed.data.owner_id || userId,
      metadata_node_ids: parsed.data.metadata_node_ids,
      audience_ids: parsed.data.audience_ids || [],
      keywords: parsed.data.keywords || [],
      source_type: inferredSourceType,
      source_ref: normalizedSourceRef,
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
    
    // For text_content type or RICHTEXT source, create an initial draft version with rich text
    let initialVersion: AssetVersion | undefined;
    if (inferredSourceType === 'RICHTEXT' || parsed.data.asset_type === 'text_content' || parsed.data.asset_type === 'document') {
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
        content_html: parsed.data.body_rich_text || parsed.data.description_rich_text || '',
      };
      await assetVersionRepo.create(initialVersion);
    } else if (inferredSourceType === 'LINK' || inferredSourceType === 'GOOGLE_DRIVE') {
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
      short_description: z.string().optional(),
      description: z.string().optional(),
      asset_type: z.enum(['deck', 'doc', 'document', 'image', 'video', 'logo', 'worksheet', 'link']).optional(),
      owner_id: z.string().optional(),
      metadata_node_ids: z.array(z.string()).optional(),
      audience_ids: z.array(z.string()).optional(),
      keywords: z.array(z.string()).optional(),
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
    // Support both single file and multiple files
    const SingleFileSchema = z.object({
      filename: z.string().min(1),
      content_type: z.string(),
      size_bytes: z.number().int().min(0).optional(),
    });
    
    const MultipleFilesSchema = z.object({
      files: z.array(z.object({
        filename: z.string().min(1),
        content_type: z.string(),
        size_bytes: z.number().int().min(0).optional(),
      })).min(1),
    });
    
    const UnionSchema = z.union([SingleFileSchema, MultipleFilesSchema]);
    const parsed = UnionSchema.safeParse(req.body);
    
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
    
    const now = new Date().toISOString();
    const versionId = `version_${uuidv4()}`;
    
    // Handle single file (backward compatible)
    if ('filename' in parsed.data) {
      const s3Key = generateAssetVersionKey(assetId, versionId, parsed.data.filename);
      
      const version: AssetVersion = {
        version_id: versionId,
        asset_id: assetId,
        version_number: nextVersionNumber,
        status: 'draft',
        mime_type: parsed.data.content_type,
        size_bytes: parsed.data.size_bytes,
        storage_key: s3Key, // Keep for backward compatibility
        storage_keys: [s3Key],
        file_metadata: [{
          storage_key: s3Key,
          filename: parsed.data.filename,
          mime_type: parsed.data.content_type,
          size_bytes: parsed.data.size_bytes,
        }],
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
      return;
    }
    
    // Handle multiple files
    const files = parsed.data.files;
    const fileMetadata: Array<{
      storage_key: string;
      filename: string;
      mime_type?: string;
      size_bytes?: number;
    }> = [];
    const uploadUrls: Array<{
      filename: string;
      upload_url: string;
      s3_key: string;
    }> = [];
    
    for (const file of files) {
      const s3Key = generateAssetVersionKey(assetId, versionId, file.filename);
      fileMetadata.push({
        storage_key: s3Key,
        filename: file.filename,
        mime_type: file.content_type,
        size_bytes: file.size_bytes,
      });
      
      // Generate presigned PUT URL (5 minutes expiry)
      const putCommand = new PutObjectCommand({
        Bucket: CONTENT_BUCKET,
        Key: s3Key,
        ContentType: file.content_type,
      });
      
      const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 300 });
      uploadUrls.push({
        filename: file.filename,
        upload_url: uploadUrl,
        s3_key: s3Key,
      });
    }
    
    const version: AssetVersion = {
      version_id: versionId,
      asset_id: assetId,
      version_number: nextVersionNumber,
      status: 'draft',
      storage_keys: fileMetadata.map(fm => fm.storage_key),
      file_metadata: fileMetadata,
      created_at: now,
      created_by: userId,
      updated_at: now,
      entity_type: 'ASSET_VERSION',
      'asset_id#version_number': `${assetId}#${nextVersionNumber}`,
    };
    
    await assetVersionRepo.create(version);
    
    const response: ApiSuccessResponse<{
      version_id: string;
      uploads: Array<{
        filename: string;
        upload_url: string;
        s3_bucket: string;
        s3_key: string;
        expires_in_seconds: number;
      }>;
    }> = {
      data: {
        version_id: versionId,
        uploads: uploadUrls.map(u => ({
          filename: u.filename,
          upload_url: u.upload_url,
          s3_bucket: CONTENT_BUCKET,
          s3_key: u.s3_key,
          expires_in_seconds: 300,
        })),
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
    // Support both single file and multiple files
    const SingleFileSchema = z.object({
      version_id: z.string(),
      storage_key: z.string(),
      checksum: z.string().optional(),
      size_bytes: z.number().int().min(0),
    });
    
    const MultipleFilesSchema = z.object({
      version_id: z.string(),
      files: z.array(z.object({
        storage_key: z.string(),
        filename: z.string().optional(),
        checksum: z.string().optional(),
        size_bytes: z.number().int().min(0),
      })).min(1),
    });
    
    const UnionSchema = z.union([SingleFileSchema, MultipleFilesSchema]);
    const parsed = UnionSchema.safeParse(req.body);
    
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
    
    // Handle single file (backward compatible)
    if ('storage_key' in parsed.data) {
      const updateData: Partial<AssetVersion> = {
        storage_key: parsed.data.storage_key, // Keep for backward compatibility
        checksum: parsed.data.checksum,
        size_bytes: parsed.data.size_bytes,
      };
      
      // Update storage_keys and file_metadata if they exist
      if (version.storage_keys) {
        const existingIndex = version.storage_keys.indexOf(parsed.data.storage_key);
        if (existingIndex >= 0 && version.file_metadata) {
          updateData.storage_keys = version.storage_keys;
          updateData.file_metadata = [...version.file_metadata];
          if (updateData.file_metadata[existingIndex]) {
            updateData.file_metadata[existingIndex] = {
              ...updateData.file_metadata[existingIndex],
              checksum: parsed.data.checksum,
              size_bytes: parsed.data.size_bytes,
            };
          }
        } else {
          updateData.storage_keys = [...(version.storage_keys || []), parsed.data.storage_key];
          updateData.file_metadata = [
            ...(version.file_metadata || []),
            {
              storage_key: parsed.data.storage_key,
              mime_type: version.mime_type,
              size_bytes: parsed.data.size_bytes,
              checksum: parsed.data.checksum,
            },
          ];
        }
      } else {
        updateData.storage_keys = [parsed.data.storage_key];
        updateData.file_metadata = [{
          storage_key: parsed.data.storage_key,
          mime_type: version.mime_type,
          size_bytes: parsed.data.size_bytes,
          checksum: parsed.data.checksum,
        }];
      }
      
      const updatedVersion = await assetVersionRepo.update(parsed.data.version_id, updateData);
      
      const response: ApiSuccessResponse<{ version: AssetVersion }> = {
        data: { version: updatedVersion },
        request_id: requestId,
      };
      res.json(response);
      return;
    }
    
    // Handle multiple files
    const files = parsed.data.files;
    const fileMetadata: Array<{
      storage_key: string;
      filename?: string;
      mime_type?: string;
      size_bytes?: number;
      checksum?: string;
    }> = [];
    
    // Merge with existing file_metadata if it exists
    const existingMetadata = version.file_metadata || [];
    const existingStorageKeys = new Set(existingMetadata.map(fm => fm.storage_key));
    
    for (const file of files) {
      const existingIndex = existingMetadata.findIndex(fm => fm.storage_key === file.storage_key);
      if (existingIndex >= 0) {
        // Update existing metadata
        fileMetadata.push({
          ...existingMetadata[existingIndex],
          checksum: file.checksum || existingMetadata[existingIndex].checksum,
          size_bytes: file.size_bytes,
          filename: file.filename || existingMetadata[existingIndex].filename,
        });
      } else {
        // Add new file metadata
        fileMetadata.push({
          storage_key: file.storage_key,
          filename: file.filename,
          size_bytes: file.size_bytes,
          checksum: file.checksum,
        });
      }
    }
    
    // Keep existing files that weren't updated
    for (const existing of existingMetadata) {
      if (!files.some(f => f.storage_key === existing.storage_key)) {
        fileMetadata.push(existing);
      }
    }
    
    const storageKeys = fileMetadata.map(fm => fm.storage_key);
    
    const updatedVersion = await assetVersionRepo.update(parsed.data.version_id, {
      storage_keys: storageKeys,
      file_metadata: fileMetadata,
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
 * POST /v1/assets/:id/versions/save-rich-text
 * Save rich text content to a version
 */
export async function saveRichTextContent(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  const userId = req.user?.user_id || 'unknown';
  
  try {
    const SaveRichTextSchema = z.object({
      version_id: z.string().optional(), // If not provided, create new version
      content_html: z.string(),
    });
    
    const parsed = SaveRichTextSchema.safeParse(req.body);
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
        error: { code: 'FORBIDDEN', message: 'Only asset owner or Contributor+ can save content' },
        request_id: requestId,
      });
      return;
    }
    
    let version: AssetVersion;
    const now = new Date().toISOString();
    
    if (parsed.data.version_id) {
      // Update existing version
      const existingVersion = await assetVersionRepo.get(parsed.data.version_id);
      if (!existingVersion || existingVersion.asset_id !== assetId) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Version not found' },
          request_id: requestId,
        });
        return;
      }
      
      version = await assetVersionRepo.update(parsed.data.version_id, {
        content_html: parsed.data.content_html,
        updated_at: now,
      });
    } else {
      // Create new version
      const existingVersions = await assetVersionRepo.listByAsset(assetId, { limit: 1 });
      const nextVersionNumber = existingVersions.items.length > 0
        ? Math.max(...existingVersions.items.map(v => v.version_number)) + 1
        : 1;
      
      const versionId = `version_${uuidv4()}`;
      version = {
        version_id: versionId,
        asset_id: assetId,
        version_number: nextVersionNumber,
        status: 'draft',
        content_html: parsed.data.content_html,
        created_at: now,
        created_by: userId,
        updated_at: now,
        entity_type: 'ASSET_VERSION',
        'asset_id#version_number': `${assetId}#${nextVersionNumber}`,
      };
      
      await assetVersionRepo.create(version);
    }
    
    const response: ApiSuccessResponse<{ version: AssetVersion }> = {
      data: { version },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error saving rich text content:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save rich text content',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/assets/keywords
 * Get all unique keywords from published assets (for autocomplete)
 */
export async function getAssetKeywords(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    // Get assets (limit to reasonable number for autocomplete suggestions)
    // We'll get keywords from up to 500 assets which should be sufficient
    let assets;
    try {
      assets = await assetRepo.list({ limit: 500 });
    } catch (listError) {
      console.error(`[${requestId}] Error listing assets for keywords:`, listError);
      // Return empty keywords array if we can't list assets
      const response: ApiSuccessResponse<{ keywords: string[] }> = {
        data: { keywords: [] },
        request_id: requestId,
      };
      res.json(response);
      return;
    }
    
    // Extract all keywords and deduplicate
    const keywordSet = new Set<string>();
    if (assets && assets.items) {
      for (const asset of assets.items) {
        if (asset.keywords && Array.isArray(asset.keywords) && asset.keywords.length > 0) {
          asset.keywords.forEach(kw => {
            if (kw && typeof kw === 'string' && kw.trim()) {
              keywordSet.add(kw.trim().toLowerCase());
            }
          });
        }
      }
    }
    
    const keywords = Array.from(keywordSet).sort();
    
    const response: ApiSuccessResponse<{ keywords: string[] }> = {
      data: { keywords },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting keywords:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get keywords',
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
    
    // Check if version has storage keys
    const storageKeys = version.storage_keys && version.storage_keys.length > 0 
      ? version.storage_keys 
      : (version.storage_key ? [version.storage_key] : []);
    
    if (storageKeys.length === 0) {
      res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Version has no file attached' },
        request_id: requestId,
      });
      return;
    }
    
    // Generate presigned GET URLs (1 hour expiry)
    const fileMetadata = version.file_metadata || [];
    const downloadUrls = await Promise.all(
      storageKeys.map(async (storageKey) => {
        const getCommand = new GetObjectCommand({
          Bucket: CONTENT_BUCKET,
          Key: storageKey,
        });
        const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
        const metadata = fileMetadata.find(fm => fm.storage_key === storageKey);
        return {
          storage_key: storageKey,
          filename: metadata?.filename || storageKey.split('/').pop() || 'file',
          download_url: downloadUrl,
        };
      })
    );
    
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
    
    // Return single file format for backward compatibility, or multiple files format
    if (downloadUrls.length === 1) {
      const response: ApiSuccessResponse<{
        download_url: string;
        expires_in_seconds: number;
      }> = {
        data: {
          download_url: downloadUrls[0].download_url,
          expires_in_seconds: 3600,
        },
        request_id: requestId,
      };
      res.json(response);
    } else {
      const response: ApiSuccessResponse<{
        files: Array<{
          storage_key: string;
          filename: string;
          download_url: string;
        }>;
        expires_in_seconds: number;
      }> = {
        data: {
          files: downloadUrls,
          expires_in_seconds: 3600,
        },
        request_id: requestId,
      };
      res.json(response);
    }
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

