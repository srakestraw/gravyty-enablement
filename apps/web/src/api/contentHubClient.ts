/**
 * Content Hub API Client
 * 
 * Client for Content Hub API endpoints
 */

import { apiFetch, ApiResponse } from '../lib/apiClient';
import type { Asset, AssetVersion, Comment, OutdatedFlag, UpdateRequest, Subscription, MediaRef } from '@gravyty/domain';

export interface CreateAssetRequest {
  title: string;
  short_description?: string;
  description?: string;
  description_rich_text?: string; // Rich text description for non-text content
  body_rich_text?: string; // Rich text body for text_content type
  cover_image?: MediaRef;
  asset_type: 'deck' | 'doc' | 'document' | 'text_content' | 'image' | 'video' | 'logo' | 'worksheet' | 'link';
  owner_id?: string;
  metadata_node_ids?: string[];
  audience_ids?: string[];
  keywords?: string[];
  source_type?: 'UPLOAD' | 'LINK' | 'GOOGLE_DRIVE' | 'RICHTEXT'; // Optional, inferred from attachments
  source_ref?: Record<string, unknown>; // For LINK: { url: string } or { urls: string[] }
}

export interface ListAssetsParams {
  metadata_node_id?: string;
  asset_type?: string;
  status?: string;
  pinned?: boolean;
  owner_id?: string;
  limit?: number;
  cursor?: string;
}

export interface ListAssetsResponse {
  assets: Asset[];
  next_cursor?: string;
}

export interface ListVersionsResponse {
  versions: AssetVersion[];
  next_cursor?: string;
}

export interface InitUploadRequest {
  filename?: string; // Single file (backward compatible)
  content_type?: string;
  size_bytes?: number;
  files?: Array<{ // Multiple files
    filename: string;
    content_type: string;
    size_bytes?: number;
  }>;
}

export interface InitUploadResponse {
  version_id: string;
  upload_url?: string; // Single file response (backward compatible)
  s3_bucket?: string;
  s3_key?: string;
  expires_in_seconds?: number;
  uploads?: Array<{ // Multiple files response
    filename: string;
    upload_url: string;
    s3_bucket: string;
    s3_key: string;
    expires_in_seconds: number;
  }>;
}

export interface CompleteUploadRequest {
  version_id: string;
  storage_key?: string; // Single file (backward compatible)
  checksum?: string;
  size_bytes?: number;
  files?: Array<{ // Multiple files
    storage_key: string;
    filename?: string;
    checksum?: string;
    size_bytes: number;
  }>;
}

export interface DownloadUrlResponse {
  download_url: string;
  expires_in_seconds: number;
  files?: Array<{
    storage_key: string;
    filename: string;
    download_url: string;
  }>;
}

export interface PublishVersionRequest {
  change_log: string;
}

export interface ScheduleVersionRequest {
  publish_at: string; // ISO datetime
}

/**
 * Create a new asset
 */
export async function createAsset(data: CreateAssetRequest): Promise<ApiResponse<{ asset: Asset; version?: AssetVersion }>> {
  return apiFetch<{ asset: Asset; version?: AssetVersion }>('/v1/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * List assets with filters
 */
export async function listAssets(params?: ListAssetsParams): Promise<ApiResponse<ListAssetsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.metadata_node_id) queryParams.append('metadata_node_id', params.metadata_node_id);
  if (params?.asset_type) queryParams.append('asset_type', params.asset_type);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.pinned !== undefined) queryParams.append('pinned', params.pinned.toString());
  if (params?.owner_id) queryParams.append('owner_id', params.owner_id);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.cursor) queryParams.append('cursor', params.cursor);
  
  const queryString = queryParams.toString();
  return apiFetch<ListAssetsResponse>(`/v1/assets${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get asset by ID
 */
export async function getAsset(assetId: string): Promise<ApiResponse<{ asset: Asset }>> {
  return apiFetch<{ asset: Asset }>(`/v1/assets/${assetId}`);
}

/**
 * Update asset
 */
export async function updateAsset(
  assetId: string,
  updates: Partial<CreateAssetRequest>
): Promise<ApiResponse<{ asset: Asset }>> {
  return apiFetch<{ asset: Asset }>(`/v1/assets/${assetId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/**
 * Initialize upload: create draft version and get presigned URL
 */
export async function initUpload(
  assetId: string,
  data: InitUploadRequest
): Promise<ApiResponse<InitUploadResponse>> {
  return apiFetch<InitUploadResponse>(`/v1/assets/${assetId}/versions/init-upload`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Complete upload: finalize version metadata
 */
export async function completeUpload(
  assetId: string,
  data: CompleteUploadRequest
): Promise<ApiResponse<{ version: AssetVersion }>> {
  return apiFetch<{ version: AssetVersion }>(`/v1/assets/${assetId}/versions/complete-upload`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface SaveRichTextContentRequest {
  version_id?: string;
  content_html: string;
}

/**
 * Save rich text content to a version
 */
export async function saveRichTextContent(
  assetId: string,
  data: SaveRichTextContentRequest
): Promise<ApiResponse<{ version: AssetVersion }>> {
  return apiFetch<{ version: AssetVersion }>(`/v1/assets/${assetId}/versions/save-rich-text`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all unique keywords from published assets (for autocomplete)
 */
export async function getAssetKeywords(): Promise<ApiResponse<{ keywords: string[] }>> {
  return apiFetch<{ keywords: string[] }>('/v1/assets/keywords', {
    method: 'GET',
  });
}

/**
 * List versions for an asset
 */
export async function listVersions(assetId: string): Promise<ApiResponse<ListVersionsResponse>> {
  return apiFetch<ListVersionsResponse>(`/v1/assets/${assetId}/versions`);
}

/**
 * Get presigned download URL for a version
 */
export async function getDownloadUrl(versionId: string): Promise<ApiResponse<DownloadUrlResponse>> {
  return apiFetch<DownloadUrlResponse>(`/v1/versions/${versionId}/download-url`);
}

/**
 * Download a specific attachment
 * Opens download URL in new window (server redirects to presigned URL)
 */
export async function downloadAttachment(assetId: string, attachmentId: string): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('token') || '';
  
  // Open URL directly - server will redirect to presigned URL
  const url = `${apiUrl}/v1/assets/${assetId}/attachments/${attachmentId}/download`;
  window.open(url, '_blank');
}

/**
 * Download all attachments as ZIP
 * Fetches ZIP blob and triggers download
 */
export async function downloadAllAttachments(assetId: string): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('token') || '';
  
  const response = await fetch(`${apiUrl}/v1/assets/${assetId}/download`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    let errorMessage = 'Failed to download attachments';
    try {
      const error = await response.json();
      errorMessage = error.error?.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorMessage);
  }
  
  // Get filename from Content-Disposition header
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `${assetId}.zip`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="(.+)"/);
    if (match) {
      filename = match[1];
    }
  }
  
  // Download blob
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Publish a version immediately
 */
export async function publishVersion(versionId: string, data: PublishVersionRequest): Promise<ApiResponse<{ version: AssetVersion; asset: Asset }>> {
  return apiFetch<{ version: AssetVersion; asset: Asset }>(`/v1/versions/${versionId}/publish`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Schedule a version for future publishing
 */
export async function scheduleVersion(versionId: string, data: ScheduleVersionRequest): Promise<ApiResponse<{ version: AssetVersion }>> {
  return apiFetch<{ version: AssetVersion }>(`/v1/versions/${versionId}/schedule`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Set expiration date/time for a version
 */
export async function setExpireAt(versionId: string, expireAt: string | null): Promise<ApiResponse<{ version: AssetVersion }>> {
  return apiFetch<{ version: AssetVersion }>(`/v1/versions/${versionId}/expire-at`, {
    method: 'PATCH',
    body: JSON.stringify({ expire_at: expireAt }),
  });
}

/**
 * Expire a version immediately
 */
export async function expireVersion(versionId: string): Promise<ApiResponse<{ version: AssetVersion }>> {
  return apiFetch<{ version: AssetVersion }>(`/v1/versions/${versionId}/expire`, {
    method: 'POST',
  });
}

/**
 * Archive a version
 */
export async function archiveVersion(versionId: string): Promise<ApiResponse<{ version: AssetVersion }>> {
  return apiFetch<{ version: AssetVersion }>(`/v1/versions/${versionId}/archive`, {
    method: 'POST',
  });
}

/**
 * Pin an asset
 */
export async function pinAsset(assetId: string): Promise<ApiResponse<{ asset: Asset }>> {
  return apiFetch<{ asset: Asset }>(`/v1/assets/${assetId}/pin`, {
    method: 'POST',
  });
}

/**
 * Unpin an asset
 */
export async function unpinAsset(assetId: string): Promise<ApiResponse<{ asset: Asset }>> {
  return apiFetch<{ asset: Asset }>(`/v1/assets/${assetId}/pin`, {
    method: 'DELETE',
  });
}

// ============================================================================
// COMMENTS
// ============================================================================

export interface CreateCommentRequest {
  body: string;
  version_id?: string;
  parent_comment_id?: string;
}

export interface ListCommentsResponse {
  items: Comment[];
  next_cursor?: string;
}

/**
 * Create a comment on an asset
 */
export async function createComment(
  assetId: string,
  request: CreateCommentRequest
): Promise<ApiResponse<Comment>> {
  return apiFetch<Comment>(`/v1/assets/${assetId}/comments`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List comments for an asset
 */
export async function listComments(
  assetId: string,
  params?: {
    version_id?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<ApiResponse<ListCommentsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.version_id) queryParams.append('version_id', params.version_id);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const endpoint = `/v1/assets/${assetId}/comments${queryString ? `?${queryString}` : ''}`;
  return apiFetch<ListCommentsResponse>(endpoint);
}

/**
 * Resolve a comment thread
 */
export async function resolveComment(commentId: string): Promise<ApiResponse<Comment>> {
  return apiFetch<Comment>(`/v1/comments/${commentId}/resolve`, {
    method: 'PATCH',
  });
}

// ============================================================================
// FLAGS AND REQUESTS
// ============================================================================

export interface FlagOutdatedRequest {
  reason?: string;
}

export interface RequestUpdateRequest {
  message?: string;
}

export interface ListFlagsResponse {
  items: OutdatedFlag[];
  next_cursor?: string;
}

export interface ListRequestsResponse {
  items: UpdateRequest[];
  next_cursor?: string;
}

/**
 * Flag an asset as outdated
 */
export async function flagOutdated(
  assetId: string,
  request: FlagOutdatedRequest
): Promise<ApiResponse<OutdatedFlag>> {
  return apiFetch<OutdatedFlag>(`/v1/assets/${assetId}/flags/outdated`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List outdated flags for an asset
 */
export async function listFlags(
  assetId: string,
  params?: {
    resolved?: boolean;
    limit?: number;
    cursor?: string;
  }
): Promise<ApiResponse<ListFlagsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.resolved !== undefined) queryParams.append('resolved', params.resolved.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const endpoint = `/v1/assets/${assetId}/flags${queryString ? `?${queryString}` : ''}`;
  return apiFetch<ListFlagsResponse>(endpoint);
}

/**
 * Resolve an outdated flag
 */
export async function resolveFlag(flagId: string): Promise<ApiResponse<OutdatedFlag>> {
  return apiFetch<OutdatedFlag>(`/v1/flags/${flagId}/resolve`, {
    method: 'PATCH',
  });
}

/**
 * Request an update to an asset
 */
export async function requestUpdate(
  assetId: string,
  request: RequestUpdateRequest
): Promise<ApiResponse<UpdateRequest>> {
  return apiFetch<UpdateRequest>(`/v1/assets/${assetId}/requests/update`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List update requests for an asset
 */
export async function listRequests(
  assetId: string,
  params?: {
    resolved?: boolean;
    limit?: number;
    cursor?: string;
  }
): Promise<ApiResponse<ListRequestsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.resolved !== undefined) queryParams.append('resolved', params.resolved.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const endpoint = `/v1/assets/${assetId}/requests${queryString ? `?${queryString}` : ''}`;
  return apiFetch<ListRequestsResponse>(endpoint);
}

/**
 * Resolve an update request
 */
export async function resolveRequest(requestId: string): Promise<ApiResponse<UpdateRequest>> {
  return apiFetch<UpdateRequest>(`/v1/requests/${requestId}/resolve`, {
    method: 'PATCH',
  });
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export interface CreateSubscriptionRequest {
  target_type: 'asset' | 'metadata' | 'collection' | 'savedSearch';
  target_id: string;
  triggers?: {
    newVersion?: boolean;
    expiringSoon?: boolean;
    expired?: boolean;
    comments?: boolean;
    mentions?: boolean;
  };
}

export interface ListSubscriptionsResponse {
  items: Subscription[];
  next_cursor?: string;
}

export interface CheckSubscriptionResponse {
  subscribed: boolean;
  subscription?: Subscription;
}

/**
 * Create a subscription
 */
export async function createSubscription(
  request: CreateSubscriptionRequest
): Promise<ApiResponse<Subscription>> {
  return apiFetch<Subscription>('/v1/subscriptions', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * List subscriptions for the current user
 */
export async function listSubscriptions(
  params?: {
    target_type?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<ApiResponse<ListSubscriptionsResponse>> {
  const queryParams = new URLSearchParams();
  if (params?.target_type) queryParams.append('target_type', params.target_type);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.cursor) queryParams.append('cursor', params.cursor);

  const queryString = queryParams.toString();
  const endpoint = `/v1/subscriptions${queryString ? `?${queryString}` : ''}`;
  return apiFetch<ListSubscriptionsResponse>(endpoint);
}

/**
 * Check if user is subscribed to a target
 */
export async function checkSubscription(
  targetType: string,
  targetId: string
): Promise<ApiResponse<CheckSubscriptionResponse>> {
  const queryParams = new URLSearchParams();
  queryParams.append('target_type', targetType);
  queryParams.append('target_id', targetId);

  return apiFetch<CheckSubscriptionResponse>(`/v1/subscriptions/check?${queryParams.toString()}`);
}

/**
 * Delete a subscription
 */
export async function deleteSubscription(subscriptionId: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/v1/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  });
}

