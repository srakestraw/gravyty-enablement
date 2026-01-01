/**
 * Content Hub - Lifecycle Domain Logic
 * 
 * Pure functions for asset version lifecycle transitions.
 */

import { AssetVersion, AssetVersionStatus } from './assetVersion.js';
import { Asset } from './asset.js';

/**
 * Schedule a version for future publishing
 */
export function scheduleVersion(
  version: AssetVersion,
  publishAt: string // ISO datetime
): AssetVersion {
  if (version.status !== 'draft') {
    throw new Error(`Cannot schedule version with status ${version.status}. Only draft versions can be scheduled.`);
  }
  
  return {
    ...version,
    status: 'scheduled',
    publish_at: publishAt,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Publish a version immediately
 */
export function publishVersion(
  version: AssetVersion,
  publishedBy: string,
  changeLog: string
): { version: AssetVersion; asset: Partial<Asset> } {
  if (version.status !== 'draft' && version.status !== 'scheduled') {
    throw new Error(`Cannot publish version with status ${version.status}. Only draft or scheduled versions can be published.`);
  }
  
  const now = new Date().toISOString();
  
  const publishedVersion: AssetVersion = {
    ...version,
    status: 'published',
    published_by: publishedBy,
    published_at: now,
    change_log: changeLog,
    publish_at: undefined, // Clear scheduled time
    updated_at: now,
  };
  
  // Return updated asset to set currentPublishedVersionId
  const assetUpdate: Partial<Asset> = {
    current_published_version_id: version.version_id,
    updated_at: now,
    updated_by: publishedBy,
  };
  
  return {
    version: publishedVersion,
    asset: assetUpdate,
  };
}

/**
 * Expire a version
 */
export function expireVersion(version: AssetVersion): AssetVersion {
  if (version.status !== 'published') {
    throw new Error(`Cannot expire version with status ${version.status}. Only published versions can be expired.`);
  }
  
  return {
    ...version,
    status: 'expired',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Archive a version
 */
export function archiveVersion(version: AssetVersion): AssetVersion {
  const allowedStatuses: AssetVersionStatus[] = ['published', 'deprecated', 'expired'];
  
  if (!allowedStatuses.includes(version.status)) {
    throw new Error(`Cannot archive version with status ${version.status}.`);
  }
  
  return {
    ...version,
    status: 'archived',
    updated_at: new Date().toISOString(),
  };
}

/**
 * Deprecate a version (typically replaced by newer version)
 */
export function deprecateVersion(version: AssetVersion): AssetVersion {
  if (version.status !== 'published') {
    throw new Error(`Cannot deprecate version with status ${version.status}. Only published versions can be deprecated.`);
  }
  
  return {
    ...version,
    status: 'deprecated',
    updated_at: new Date().toISOString(),
  };
}

