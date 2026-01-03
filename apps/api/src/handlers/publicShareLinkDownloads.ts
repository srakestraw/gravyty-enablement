/**
 * Public Share Link Download Handlers
 * 
 * Handlers for downloading content via share links (token-based)
 */

import { Request, Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse } from '../types';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../aws/s3Client';
import { shareLinkRepo, shareEventRepo } from '../storage/dynamo/shareLinkRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';
import { storageRepos } from '../server';
import { v4 as uuidv4 } from 'uuid';

const CONTENT_BUCKET = process.env.ENABLEMENT_CONTENT_BUCKET || 'enablement-content';

/**
 * Validate share link and check download permission
 */
async function validateShareLinkForDownload(token: string): Promise<{
  shareLink: any;
  asset: any;
  version: any;
  error?: string;
}> {
  const shareLink = await shareLinkRepo.getByToken(token);
  
  if (!shareLink) {
    return { shareLink: null, asset: null, version: null, error: 'Share link not found' };
  }
  
  // Check if revoked
  if (shareLink.status === 'revoked') {
    return { shareLink, asset: null, version: null, error: 'Share link has been revoked' };
  }
  
  // Check if expired
  if (shareLink.status === 'expired') {
    return { shareLink, asset: null, version: null, error: 'Share link has expired' };
  }
  
  // Check expiration date
  if (shareLink.expires_at) {
    const expiresAt = new Date(shareLink.expires_at);
    if (expiresAt < new Date()) {
      await shareLinkRepo.update(shareLink.share_link_id, { status: 'expired' });
      return { shareLink, asset: null, version: null, error: 'Share link has expired' };
    }
  }
  
  // Check if downloads are allowed
  if (!shareLink.allow_download) {
    return { shareLink, asset: null, version: null, error: 'Downloads are disabled for this share link' };
  }
  
  // Get asset
  const asset = await assetRepo.get(shareLink.asset_id);
  if (!asset) {
    return { shareLink, asset: null, version: null, error: 'Asset not found' };
  }
  
  // Resolve version
  let version: any = null;
  if (shareLink.version_id) {
    version = await assetVersionRepo.get(shareLink.version_id);
  } else if (asset.current_published_version_id) {
    version = await assetVersionRepo.get(asset.current_published_version_id);
  }
  
  if (!version || version.status !== 'published') {
    return { shareLink, asset, version: null, error: 'No published version available' };
  }
  
  return { shareLink, asset, version };
}

/**
 * Emit share download event
 */
async function emitShareDownloadEvent(
  eventName: string,
  shareLinkId: string,
  assetId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    // Create share event
    const eventId = `event_${uuidv4()}`;
    const now = new Date().toISOString();
    await shareEventRepo.create({
      event_id: eventId,
      share_link_id: shareLinkId,
      event_type: 'download',
      resolved_version_id: metadata.versionId as string,
      ip_address: metadata.ipAddress as string,
      user_agent: metadata.userAgent as string,
      created_at: now,
      entity_type: 'SHARE_EVENT',
      'share_link_id#created_at': `${shareLinkId}#${now}`,
    });
    
    // Also emit activity event
    await storageRepos.event.create({
      event_name: eventName,
      content_id: assetId,
      metadata: {
        ...metadata,
        shareLinkId,
        source: 'SHARE_LINK',
      },
      timestamp: now,
    });
  } catch (error) {
    console.error('Failed to emit share download event:', error);
  }
}

/**
 * GET /s/:token/attachments/:attachmentId/download
 * Download attachment via share link
 */
export async function downloadAttachmentByToken(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string;
  const token = req.params.token;
  const attachmentId = req.params.attachmentId; // storage_key
  
  try {
    // Validate share link
    const { shareLink, asset, version, error } = await validateShareLinkForDownload(token);
    if (error || !shareLink || !asset || !version) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: error || 'Share link not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Find attachment
    const fileMetadata = version.file_metadata || [];
    const attachment = fileMetadata.find((fm: any) => fm.storage_key === attachmentId);
    
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
    await emitShareDownloadEvent('ATTACHMENT_DOWNLOADED', shareLink.share_link_id, asset.asset_id, {
      attachmentId: attachment.storage_key,
      downloadType: 'single',
      versionId: version.version_id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    });
    
    // Redirect to download URL
    res.redirect(downloadUrl);
  } catch (error) {
    console.error(`[${requestId}] Error downloading attachment via share link:`, error);
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
 * GET /s/:token/download
 * Download all attachments as ZIP via share link
 */
export async function downloadAllByToken(
  req: Request,
  res: Response
): Promise<void> {
  const requestId = req.headers['x-request-id'] as string;
  const token = req.params.token;
  
  try {
    // Validate share link
    const { shareLink, asset, version, error } = await validateShareLinkForDownload(token);
    if (error || !shareLink || !asset || !version) {
      const response: ApiErrorResponse = {
        error: { code: 'NOT_FOUND', message: error || 'Share link not found' },
        request_id: requestId,
      };
      res.status(404).json(response);
      return;
    }
    
    // Get file attachments
    const fileMetadata = version.file_metadata || [];
    const fileAttachments = fileMetadata.filter((fm: any) => fm.storage_key);
    
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
      return downloadAttachmentByToken(
        { ...req, params: { ...req.params, attachmentId: fileAttachments[0].storage_key } } as Request,
        res
      );
    }
    
    // Check ZIP limits
    const MAX_ITEMS = 25;
    const MAX_SIZE_MB = 250;
    const totalSizeBytes = fileAttachments.reduce((sum: number, fm: any) => sum + (fm.size_bytes || 0), 0);
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
    
    // Generate ZIP
    const { default: archiver } = await import('archiver');
    const { Readable } = await import('stream');
    
    const slug = asset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const zipFilename = `${slug}.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    
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
        
        let uniqueFilename = filename;
        let counter = 1;
        while (archive.pointer() > 0 && (archive as any).files[uniqueFilename]) {
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
      }
    }
    
    await archive.finalize();
    
    // Emit download event
    await emitShareDownloadEvent('ATTACHMENT_DOWNLOADED', shareLink.share_link_id, asset.asset_id, {
      downloadType: 'zip',
      includedCount: fileAttachments.length,
      skippedLinksCount: fileMetadata.length - fileAttachments.length,
      versionId: version.version_id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    console.error(`[${requestId}] Error downloading all attachments via share link:`, error);
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

