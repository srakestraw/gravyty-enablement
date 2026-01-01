/**
 * Asset Repository Interface
 * 
 * Abstraction layer for asset storage operations.
 */

import type { Asset } from '@gravyty/domain';

export interface AssetRepository {
  /**
   * Create a new asset
   */
  create(asset: Asset): Promise<Asset>;

  /**
   * Get asset by ID
   */
  get(assetId: string): Promise<Asset | null>;

  /**
   * List assets with filters
   */
  list(params: {
    taxonomyNodeId?: string;
    assetType?: string;
    status?: string; // Filter by published version status
    pinned?: boolean;
    ownerId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Asset[]; next_cursor?: string }>;

  /**
   * Update asset
   */
  update(assetId: string, updates: Partial<Asset>): Promise<Asset>;

  /**
   * Delete asset (soft delete or hard delete)
   */
  delete(assetId: string): Promise<void>;
}

