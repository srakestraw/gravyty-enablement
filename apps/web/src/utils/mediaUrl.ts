/**
 * Media URL Utilities
 * 
 * Helper functions for getting presigned URLs for media stored in S3
 */

import { lmsAdminApi } from '../api/lmsAdminClient';
import type { MediaRef } from '@gravyty/domain';

/**
 * Get presigned URL for a media reference
 * Caches the URL for the duration of its validity
 */
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getMediaDisplayUrl(mediaRef: MediaRef | null | undefined): Promise<string | null> {
  if (!mediaRef) return null;
  
  // If it's not an S3 URL (external URL), return as-is
  if (mediaRef.url && !mediaRef.url.includes('s3.amazonaws.com')) {
    return mediaRef.url;
  }
  
  // If no media_id, can't get presigned URL
  if (!mediaRef.media_id) {
    return mediaRef.url || null;
  }
  
  // Check cache
  const cached = urlCache.get(mediaRef.media_id);
  if (cached && cached.expiresAt > Date.now() + 60000) { // Refresh if less than 1 minute left
    return cached.url;
  }
  
  try {
    const response = await lmsAdminApi.getMediaUrl(mediaRef.media_id);
    if ('error' in response) {
      console.error('[getMediaDisplayUrl] Error getting presigned URL:', response.error);
      return mediaRef.url || null; // Fallback to original URL
    }
    
    const expiresAt = Date.now() + (response.data.expires_in_seconds * 1000);
    urlCache.set(mediaRef.media_id, { url: response.data.url, expiresAt });
    
    return response.data.url;
  } catch (error) {
    console.error('[getMediaDisplayUrl] Error:', error);
    return mediaRef.url || null; // Fallback to original URL
  }
}

/**
 * Clear URL cache (useful for testing or when media is updated)
 */
export function clearMediaUrlCache() {
  urlCache.clear();
}


