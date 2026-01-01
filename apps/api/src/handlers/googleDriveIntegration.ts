/**
 * Google Drive Integration API Handlers
 * 
 * Handlers for Google Drive OAuth and file operations
 */

import { Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import {
  generateAuthUrl,
  exchangeCodeForTokens,
  storeRefreshToken,
  getRefreshToken,
  refreshAccessToken,
  createDriveClient,
} from '../lib/googleDriveOAuth';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /v1/integrations/google-drive/connect
 * Start OAuth flow - returns authorization URL
 */
export async function connectGoogleDrive(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    // Generate state token for CSRF protection
    const state = `${userId}_${uuidv4()}`;
    
    // Get redirect URI from request or use default
    const redirectUri = req.body.redirect_uri || `${req.protocol}://${req.get('host')}/v1/integrations/google-drive/callback`;
    
    const authUrl = await generateAuthUrl(redirectUri, state);
    
    const response: ApiSuccessResponse<{ auth_url: string; state: string }> = {
      data: {
        auth_url: authUrl,
        state,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error generating Google Drive auth URL:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate authorization URL',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /v1/integrations/google-drive/callback
 * Handle OAuth callback and store tokens
 */
export async function googleDriveCallback(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    const { code, state, redirect_uri } = req.body;
    
    if (!code) {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Authorization code is required',
        },
      };
      return res.status(400).json(response);
    }
    
    // Verify state matches (CSRF protection)
    if (state && !state.startsWith(userId)) {
      const response: ApiErrorResponse = {
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid state parameter',
        },
      };
      return res.status(400).json(response);
    }
    
    const redirectUri = redirect_uri || `${req.protocol}://${req.get('host')}/v1/integrations/google-drive/callback`;
    
    const { accessToken, refreshToken, expiryDate } = await exchangeCodeForTokens(code, redirectUri);
    
    // Store refresh token (access token will be refreshed as needed)
    await storeRefreshToken(refreshToken);
    
    const response: ApiSuccessResponse<{ connected: boolean; expires_at: string }> = {
      data: {
        connected: true,
        expires_at: new Date(expiryDate).toISOString(),
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error handling Google Drive callback:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to complete OAuth flow',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/integrations/google-drive/status
 * Get connection status
 */
export async function getGoogleDriveStatus(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const refreshToken = await getRefreshToken();
    
    const response: ApiSuccessResponse<{ connected: boolean; status: string }> = {
      data: {
        connected: !!refreshToken,
        status: refreshToken ? 'connected' : 'disconnected',
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting Google Drive status:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get connection status',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * POST /v1/integrations/google-drive/disconnect
 * Disconnect Google Drive (remove tokens)
 */
export async function disconnectGoogleDrive(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    // Delete refresh token from SSM
    const { DeleteParameterCommand } = await import('@aws-sdk/client-ssm');
    const { ssmClient } = await import('../aws/ssmClient');
    
    const command = new DeleteParameterCommand({
      Name: '/enablement-portal/google-drive/refresh-token',
    });
    
    await ssmClient.send(command);
    
    const response: ApiSuccessResponse<{ disconnected: boolean }> = {
      data: {
        disconnected: true,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error disconnecting Google Drive:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to disconnect',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/integrations/google-drive/browse
 * Browse Google Drive files and folders
 */
export async function browseGoogleDrive(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const folderId = req.query.folder_id as string | undefined;
    const pageToken = req.query.page_token as string | undefined;
    
    const drive = await createDriveClient();
    
    const query = folderId
      ? `'${folderId}' in parents and trashed=false`
      : "trashed=false and mimeType='application/vnd.google-apps.folder'";
    
    const response = await drive.files.list({
      q: query,
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink)',
      pageToken: pageToken,
      orderBy: 'modifiedTime desc',
    });
    
    const files = (response.data.files || []).map(file => ({
      file_id: file.id!,
      name: file.name!,
      mime_type: file.mimeType!,
      size_bytes: file.size ? parseInt(file.size, 10) : undefined,
      modified_time: file.modifiedTime || new Date().toISOString(),
      web_view_link: file.webViewLink || undefined,
      web_content_link: file.webContentLink || undefined,
    }));
    
    const apiResponse: ApiSuccessResponse<{
      items: typeof files;
      next_page_token?: string;
    }> = {
      data: {
        items: files,
        ...(response.data.nextPageToken && { next_page_token: response.data.nextPageToken }),
      },
    };
    
    return res.status(200).json(apiResponse);
  } catch (error) {
    console.error(`[${requestId}] Error browsing Google Drive:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to browse Google Drive',
      },
    };
    return res.status(500).json(response);
  }
}

