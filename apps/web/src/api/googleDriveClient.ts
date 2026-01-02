/**
 * Google Drive Integration API Client
 * 
 * Client for Google Drive integration endpoints
 */

import { apiFetch } from '../lib/apiClient';
import type { ApiResponse } from '../lib/apiClient';

export interface GoogleDriveConnectionStatus {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'error';
}

export interface GoogleDriveFile {
  file_id: string;
  name: string;
  mime_type: string;
  size_bytes?: number;
  modified_time: string;
  web_view_link?: string;
  web_content_link?: string;
}

export interface BrowseGoogleDriveResponse {
  items: GoogleDriveFile[];
  next_page_token?: string;
}

export interface ImportFromDriveRequest {
  file_id: string;
  title?: string;
  description?: string;
  asset_type?: string;
  metadata_node_ids?: string[];
}

export interface AssetSyncStatus {
  drive_file_id: string;
  drive_file_name: string;
  last_synced_at?: string;
  last_sync_status: 'synced' | 'pending' | 'syncing' | 'error' | 'source_unavailable';
  last_sync_error?: string;
  last_modified_time: string;
}

/**
 * Connect to Google Drive (start OAuth flow)
 */
export async function connectGoogleDrive(redirectUri?: string): Promise<ApiResponse<{ auth_url: string; state: string }>> {
  return apiFetch<{ auth_url: string; state: string }>('/v1/integrations/google-drive/connect', {
    method: 'POST',
    body: JSON.stringify({ redirect_uri: redirectUri }),
  });
}

/**
 * Handle OAuth callback
 */
export async function googleDriveCallback(code: string, state: string, redirectUri?: string): Promise<ApiResponse<{ connected: boolean; expires_at: string }>> {
  return apiFetch<{ connected: boolean; expires_at: string }>('/v1/integrations/google-drive/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state, redirect_uri: redirectUri }),
  });
}

/**
 * Get Google Drive connection status
 */
export async function getGoogleDriveStatus(): Promise<ApiResponse<GoogleDriveConnectionStatus>> {
  return apiFetch<GoogleDriveConnectionStatus>('/v1/integrations/google-drive/status');
}

/**
 * Disconnect Google Drive
 */
export async function disconnectGoogleDrive(): Promise<ApiResponse<{ disconnected: boolean }>> {
  return apiFetch<{ disconnected: boolean }>('/v1/integrations/google-drive/disconnect', {
    method: 'POST',
  });
}

/**
 * Browse Google Drive files
 */
export async function browseGoogleDrive(params?: {
  folder_id?: string;
  page_token?: string;
}): Promise<ApiResponse<BrowseGoogleDriveResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.folder_id) queryParams.append('folder_id', params.folder_id);
  if (params?.page_token) queryParams.append('page_token', params.page_token);

  const queryString = queryParams.toString();
  const endpoint = `/v1/integrations/google-drive/browse${queryString ? `?${queryString}` : ''}`;
  return apiFetch<BrowseGoogleDriveResponse>(endpoint);
}

/**
 * Import file from Google Drive as asset
 */
export async function importFromGoogleDrive(request: ImportFromDriveRequest): Promise<ApiResponse<{ asset: any; version: any }>> {
  return apiFetch<{ asset: any; version: any }>('/v1/assets/import/google-drive', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Sync asset from Google Drive
 */
export async function syncAssetFromDrive(assetId: string): Promise<ApiResponse<{ version: any; synced: boolean }>> {
  return apiFetch<{ version: any; synced: boolean }>(`/v1/assets/${assetId}/sync`, {
    method: 'POST',
  });
}

/**
 * Get asset sync status
 */
export async function getAssetSyncStatus(assetId: string): Promise<ApiResponse<AssetSyncStatus>> {
  return apiFetch<AssetSyncStatus>(`/v1/assets/${assetId}/sync-status`);
}

