/**
 * Google Drive Asset Import Handlers
 * 
 * Handlers for importing assets from Google Drive
 */

import { Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { createDriveClient } from '../lib/googleDriveOAuth';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { generateAssetVersionKey } from '../storage/s3/keys';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../aws/s3Client';
import { v4 as uuidv4 } from 'uuid';
import type { Asset, AssetVersion, AssetSyncMetadata } from '@gravyty/domain';

/**
 * POST /v1/assets/import/google-drive
 * Import a Google Drive file as a new asset
 */
export async function importFromGoogleDrive(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    const { file_id, title, description, asset_type, taxonomy_ids } = req.body;
    
    if (!file_id) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'file_id is required',
        },
      };
      return res.status(400).json(response);
    }
    
    // Get file metadata from Google Drive
    const drive = await createDriveClient();
    const fileResponse = await drive.files.get({
      fileId: file_id,
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink',
    });
    
    const file = fileResponse.data;
    if (!file.id || !file.name) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'File not found in Google Drive',
        },
      };
      return res.status(404).json(response);
    }
    
    // Create asset
    const assetId = `asset_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const syncMetadata: AssetSyncMetadata = {
      drive_file_id: file.id,
      drive_file_name: file.name,
      last_synced_at: now,
      last_sync_status: 'synced',
      last_modified_time: file.modifiedTime || now,
    };
    
    const asset: Asset = {
      asset_id: assetId,
      title: title || file.name,
      description: description || undefined,
      asset_type: asset_type || 'document',
      source_type: 'GOOGLE_DRIVE',
      source_ref: syncMetadata as any,
      owner_id: userId,
      taxonomy_ids: taxonomy_ids || [],
      pinned: false,
      created_at: now,
      updated_at: now,
      entity_type: 'ASSET',
    };
    
    await assetRepo.create(asset);
    
    // Create initial draft version
    const versionId = `version_${uuidv4()}`;
    const version: AssetVersion = {
      version_id: versionId,
      asset_id: assetId,
      version_number: 1,
      status: 'draft',
      file_key: generateAssetVersionKey(assetId, versionId, file.name),
      file_size_bytes: file.size ? parseInt(file.size, 10) : undefined,
      mime_type: file.mimeType || 'application/octet-stream',
      created_at: now,
      created_by: userId,
      entity_type: 'ASSET_VERSION',
    };
    
    await assetVersionRepo.create(version);
    
    // Download file from Drive and upload to S3
    // This is a simplified version - in production, you might want to do this async
    try {
      const fileResponse = await drive.files.get(
        { fileId: file_id, alt: 'media' },
        { responseType: 'stream' }
      );
      
      // Upload to S3 (simplified - in production use multipart upload for large files)
      
      // Read stream into buffer (for small files - use streaming for large files)
      const chunks: Buffer[] = [];
      for await (const chunk of fileResponse.data) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      const putCommand = new PutObjectCommand({
        Bucket: process.env.ENABLEMENT_CONTENT_BUCKET || 'enablement-content',
        Key: version.file_key,
        Body: buffer,
        ContentType: version.mime_type,
      });
      
      await s3Client.send(putCommand);
      
      // Update version status to indicate file is uploaded
      await assetVersionRepo.update(versionId, {
        status: 'draft',
      });
    } catch (uploadError) {
      console.error(`[${requestId}] Error uploading file from Drive to S3:`, uploadError);
      // Continue anyway - file can be synced later
    }
    
    const response: ApiSuccessResponse<{ asset: Asset; version: AssetVersion }> = {
      data: {
        asset,
        version,
      },
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error importing from Google Drive:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to import from Google Drive',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /v1/assets/:id/sync
 * Manually sync an asset from Google Drive
 */
export async function syncAssetFromDrive(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const asset = await assetRepo.get(assetId);
    if (!asset || asset.source_type !== 'GOOGLE_DRIVE') {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Asset is not a Google Drive asset',
        },
      };
      return res.status(400).json(response);
    }
    
    const syncMetadata = asset.source_ref as AssetSyncMetadata;
    if (!syncMetadata?.drive_file_id) {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Asset does not have Drive file reference',
        },
      };
      return res.status(400).json(response);
    }
    
    // Get file metadata from Google Drive
    const drive = await createDriveClient();
    let file;
    try {
      const fileResponse = await drive.files.get({
        fileId: syncMetadata.drive_file_id,
        fields: 'id, name, mimeType, size, modifiedTime',
      });
      file = fileResponse.data;
    } catch (error: any) {
      if (error.code === 404 || error.code === 403) {
        // File deleted or access revoked
        await assetRepo.update(assetId, {
          source_ref: {
            ...syncMetadata,
            last_sync_status: 'source_unavailable',
            last_sync_error: 'File not found or access denied',
          } as any,
        });
        
        const response: ApiErrorResponse = {
          error: {
            code: 'SOURCE_UNAVAILABLE',
            message: 'Google Drive file not found or access denied',
          },
        };
        return res.status(404).json(response);
      }
      throw error;
    }
    
    if (!file.id || !file.modifiedTime) {
      const response: ApiErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Invalid file metadata from Google Drive',
        },
      };
      return res.status(500).json(response);
    }
    
    // Check if file has changed
    const driveModifiedTime = new Date(file.modifiedTime).getTime();
    const lastSyncedTime = syncMetadata.last_modified_time
      ? new Date(syncMetadata.last_modified_time).getTime()
      : 0;
    
    if (driveModifiedTime <= lastSyncedTime) {
      // No changes
      const response: ApiSuccessResponse<{ synced: boolean; message: string }> = {
        data: {
          synced: false,
          message: 'File has not changed since last sync',
        },
      };
      return res.status(200).json(response);
    }
    
    // File has changed - create new draft version
    const versionId = `version_${uuidv4()}`;
    const now = new Date().toISOString();
    
    // Get latest version number
    const versions = await assetVersionRepo.listByAsset(assetId);
    const latestVersion = versions.items[0];
    const nextVersionNumber = latestVersion ? latestVersion.version_number + 1 : 1;
    
    const newVersion: AssetVersion = {
      version_id: versionId,
      asset_id: assetId,
      version_number: nextVersionNumber,
      status: 'draft',
      file_key: generateAssetVersionKey(assetId, versionId, file.name || syncMetadata.drive_file_name),
      file_size_bytes: file.size ? parseInt(file.size, 10) : undefined,
      mime_type: file.mimeType || 'application/octet-stream',
      created_at: now,
      created_by: asset.owner_id,
      entity_type: 'ASSET_VERSION',
    };
    
    await assetVersionRepo.create(newVersion);
    
    // Download and upload file (simplified)
    try {
      const fileResponse = await drive.files.get(
        { fileId: syncMetadata.drive_file_id, alt: 'media' },
        { responseType: 'stream' }
      );
      
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { s3Client } = await import('../aws/s3Client');
      
      const chunks: Buffer[] = [];
      for await (const chunk of fileResponse.data) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      const putCommand = new PutObjectCommand({
        Bucket: process.env.ENABLEMENT_CONTENT_BUCKET || 'enablement-content',
        Key: newVersion.file_key,
        Body: buffer,
        ContentType: newVersion.mime_type,
      });
      
      await s3Client.send(putCommand);
    } catch (uploadError) {
      console.error(`[${requestId}] Error uploading synced file:`, uploadError);
      // Continue - file can be uploaded later
    }
    
    // Update sync metadata
    await assetRepo.update(assetId, {
      source_ref: {
        ...syncMetadata,
        last_synced_at: now,
        last_sync_status: 'synced',
        last_modified_time: file.modifiedTime,
      } as any,
    });
    
    // TODO: Notify asset owner about new draft version
    
    const response: ApiSuccessResponse<{ version: AssetVersion; synced: boolean }> = {
      data: {
        version: newVersion,
        synced: true,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error syncing asset from Drive:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to sync asset',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/assets/:id/sync-status
 * Get sync status for an asset
 */
export async function getAssetSyncStatus(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.id;
  
  try {
    const asset = await assetRepo.get(assetId);
    if (!asset || asset.source_type !== 'GOOGLE_DRIVE') {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Asset is not a Google Drive asset',
        },
      };
      return res.status(400).json(response);
    }
    
    const syncMetadata = asset.source_ref as AssetSyncMetadata;
    
    const response: ApiSuccessResponse<AssetSyncMetadata> = {
      data: syncMetadata || {
        drive_file_id: '',
        drive_file_name: '',
        last_sync_status: 'error',
        last_modified_time: new Date().toISOString(),
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting sync status:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get sync status',
      },
    };
    return res.status(500).json(response);
  }
}

