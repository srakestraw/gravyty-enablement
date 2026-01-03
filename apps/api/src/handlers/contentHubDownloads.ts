/**
 * Content Hub Download Handlers
 * 
 * Handlers for downloading content assets and attachments
 */

import { Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../aws/s3Client';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { storageRepos } from '../server';
import { v4 as uuidv4 } from 'uuid';

const CONTENT_BUCKET = process.env.ENABLEMENT_CONTENT_BUCKET || 'enablement-content';

/**
 * Check if user can download asset/version
 */
async function checkDownloadPermission(
  asset: any,
  version: any,
  userId: string | undefined,
  userRole: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Draft: only owner or Admin
  if (version.status === 'draft') {
    if (asset.owner_id !== userId && userRole !== 'Admin') {
      return { allowed: false, reason: 'Only asset owner or Admin can download draft versions' };
    }
  }
  // Expired: only Admin
  else if (version.status === 'expired') {
    if (userRole !== 'Admin') {
      return { allowed: false, reason: 'Expired versions can only be downloaded by Admin' };
    }
  }
  // Published: Viewer+ can download
  else if (version.status === 'published') {
    // Allowed for Viewer+
  }
  // Other statuses: only Approver+
  else {
    if (userRole === 'Viewer') {
      return { allowed: false, reason: 'Only published versions can be downloaded' };
    }
  }
  
  return { allowed: true };
}

/**
 * Emit download activity event
 */
async function emitDownloadEvent(
  eventName: string,
  assetId: string,
  userId: string | undefined,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await storageRepos.event.create({
      event_name: eventName,
      user_id: userId,
      content_id: assetId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail download if event logging fails
    console.error('Failed to emit download event:', error);
  }
}

/**
 * GET /v1/assets/:assetId/attachments/:attachmentId/download
 * Download a specific attachment by storage key
 */
export async function downloadAttachment(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.assetId;
  const attachmentId = req.params.attachmentId; // This is actually the storage_key or index
  const userId = req.user?.user_id;
  const userRole = req.user?.role || 'Viewer';
  
  try {
    // Get asset
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'Asset not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Get published version (or latest version if user has permission)
    const versionId = asset.current_published_version_id;
    if (!versionId) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'No published version available' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Check permissions
    const permission = await checkDownloadPermission(asset, version, userId, userRole);
    if (!permission.allowed) {
      await emitDownloadEvent('ACCESS_DENIED', assetId, userId, {
        reasonDenied: permission.reason,
        attachmentId,
      });
      
      const response: ApiErrorResponse = {
        error: { code: 'FORBIDDEN', message: permission.reason },
        request_id: requestId,
      };
      res.status(403).json(response);
      return;
    }
    
    // Find attachment by storage_key (attachmentId is the storage_key)
    const fileMetadata = version.file_metadata || [];
    const attachment = fileMetadata.find(fm => fm.storage_key === attachmentId);
    
    if (!attachment) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'Attachment not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Generate presigned download URL
    const getCommand = new GetObjectCommand({
      Bucket: CONTENT_BUCKET,
      Key: attachment.storage_key,
    });
    
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    
    // Emit download event
    await emitDownloadEvent('ATTACHMENT_DOWNLOADED', assetId, userId, {
      attachmentId: attachment.storage_key,
      downloadType: 'single',
      source: 'IN_APP',
      actorType: userRole,
    });
    
    // Redirect to download URL
    res.redirect(downloadUrl);
  } catch (error) {
    console.error(`[${requestId}] Error downloading attachment:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to download attachment',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

/**
 * GET /v1/assets/:assetId/download
 * Download all attachments as ZIP
 */
export async function downloadAllAttachments(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string;
  const assetId = req.params.assetId;
  const userId = req.user?.user_id;
  const userRole = req.user?.role || 'Viewer';
  
  try {
    // Get asset
    const asset = await assetRepo.get(assetId);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'Asset not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Get published version
    const versionId = asset.current_published_version_id;
    if (!versionId) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'No published version available' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    const version = await assetVersionRepo.get(versionId);
    if (!version) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: 'Version not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Check permissions
    const permission = await checkDownloadPermission(asset, version, userId, userRole);
    if (!permission.allowed) {
      await emitDownloadEvent('ACCESS_DENIED', assetId, userId, {
        reasonDenied: permission.reason,
        downloadType: 'zip',
      });
      
      const response: ApiErrorResponse = {
        error: { code: 'FORBIDDEN', message: permission.reason },
        request_id: requestId,
      };
      res.status(403).json(response);
      return;
    }
    
    // Get file attachments (exclude links)
    const fileMetadata = version.file_metadata || [];
    const fileAttachments = fileMetadata.filter(fm => fm.storage_key);
    
    if (fileAttachments.length === 0) {
      const response: ApiErrorResponse = {
        error: { code: 'BAD_REQUEST', message: 'No file attachments available' },
        request_id: requestId,
      };
      res.status(400).json(response);
      return;
    }
    
    // If only one file, redirect to single download
    if (fileAttachments.length === 1) {
      return downloadAttachment(
        { ...req, params: { ...req.params, attachmentId: fileAttachments[0].storage_key } } as AuthenticatedRequest,
        res
      );
    }
    
    // Check ZIP limits (25 items or 250MB)
    const MAX_ITEMS = 25;
    const MAX_SIZE_MB = 250;
    const totalSizeBytes = fileAttachments.reduce((sum, fm) => sum + (fm.size_bytes || 0), 0);
    const totalSizeMB = totalSizeBytes / (1024 * 1024);
    
    if (fileAttachments.length > MAX_ITEMS || totalSizeMB > MAX_SIZE_MB) {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'This content has too many or too-large files to download as one ZIP. Download items individually.',
        },
        request_id: requestId,
      };
      res.status(400).json(response);
      return;
    }
    
    // Generate ZIP on-demand using streaming
    // For MVP, we'll generate presigned URLs for all files and let client handle ZIP creation
    // Or we can use a server-side ZIP library like archiver
    const { default: archiver } = await import('archiver');
    const { Readable } = await import('stream');
    
    // Set headers for ZIP download
    const slug = asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const zipFilename = `${slug}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    
    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      console.error(`[${requestId}] Archive error:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create ZIP archive' },
          request_id: requestId,
        });
      }
    });
    
    archive.pipe(res);
    
    // Add files to ZIP
    for (const attachment of fileAttachments) {
      try {
        const getCommand = new GetObjectCommand({
          Bucket: CONTENT_BUCKET,
          Key: attachment.storage_key,
        });
        
        const s3Response = await s3Client.send(getCommand);
        const filename = attachment.filename || attachment.storage_key.split('/').pop() || 'file';
        
        // Ensure unique filenames in ZIP
        let uniqueFilename = filename;
        let counter = 1;
        while (archive.pointer() > 0 && archive.files[uniqueFilename]) {
          const ext = filename.split('.').pop();
          const base = filename.substring(0, filename.lastIndexOf('.'));
          uniqueFilename = `${base}_${counter}.${ext}`;
          counter++;
        }
        
        if (s3Response.Body) {
          archive.append(s3Response.Body as Readable, { name: uniqueFilename });
        }
      } catch (error) {
        console.error(`[${requestId}] Error adding file to ZIP:`, attachment.storage_key, error);
        // Continue with other files
      }
    }
    
    // Finalize archive
    await archive.finalize();
    
    // Emit download event
    await emitDownloadEvent('ATTACHMENT_DOWNLOADED', assetId, userId, {
      downloadType: 'zip',
      includedCount: fileAttachments.length,
      skippedLinksCount: fileMetadata.length - fileAttachments.length,
      source: 'IN_APP',
      actorType: userRole,
    });
  } catch (error) {
    console.error(`[${requestId}] Error downloading all attachments:`, error);
    if (!res.headersSent) {
      const response: ApiErrorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to download attachments',
        },
        request_id: requestId,
      };
      res.status(500).json(response);
    }
  }
}

