/**
 * Asset Version Repository Interface
 * 
 * Abstraction layer for asset version storage operations.
 */

import type { AssetVersion } from '@gravyty/domain';

export interface AssetVersionRepository {
  /**
   * Create a new asset version
   */
  create(version: AssetVersion): Promise<AssetVersion>;

  /**
   * Get version by ID
   */
  get(versionId: string): Promise<AssetVersion | null>;

  /**
   * Get version by asset ID and version number
   */
  getByAssetAndVersion(assetId: string, versionNumber: number): Promise<AssetVersion | null>;

  /**
   * List all versions for an asset
   */
  listByAsset(assetId: string, params?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: AssetVersion[]; next_cursor?: string }>;

  /**
   * Get latest published version for an asset
   */
  getLatestPublished(assetId: string): Promise<AssetVersion | null>;

  /**
   * Get scheduled versions ready to publish
   */
  getScheduledToPublish(now: string): Promise<AssetVersion[]>;

  /**
   * Get published versions ready to expire
   */
  getPublishedToExpire(now: string): Promise<AssetVersion[]>;

  /**
   * Update version
   */
  update(versionId: string, updates: Partial<AssetVersion>): Promise<AssetVersion>;

  /**
   * Delete version (soft delete or hard delete)
   */
  delete(versionId: string): Promise<void>;
}


