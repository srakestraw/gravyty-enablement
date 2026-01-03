/**
 * Outdated Flag Repository Interface
 * 
 * Abstraction layer for outdated flag and update request storage operations.
 */

import type { OutdatedFlag, UpdateRequest } from '@gravyty/domain';

export interface OutdatedFlagRepository {
  /**
   * Create a new outdated flag
   */
  createFlag(flag: OutdatedFlag): Promise<OutdatedFlag>;

  /**
   * Get flag by ID
   */
  getFlag(flagId: string): Promise<OutdatedFlag | null>;

  /**
   * List flags for an asset
   */
  listFlagsByAsset(assetId: string, options?: {
    resolved?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: OutdatedFlag[]; next_cursor?: string }>;

  /**
   * Update flag
   */
  updateFlag(flagId: string, updates: Partial<OutdatedFlag>): Promise<OutdatedFlag>;

  /**
   * Delete flag
   */
  deleteFlag(flagId: string): Promise<void>;
}

export interface UpdateRequestRepository {
  /**
   * Create a new update request
   */
  createRequest(request: UpdateRequest): Promise<UpdateRequest>;

  /**
   * Get request by ID
   */
  getRequest(requestId: string): Promise<UpdateRequest | null>;

  /**
   * List requests for an asset
   */
  listRequestsByAsset(assetId: string, options?: {
    resolved?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: UpdateRequest[]; next_cursor?: string }>;

  /**
   * Update request
   */
  updateRequest(requestId: string, updates: Partial<UpdateRequest>): Promise<UpdateRequest>;

  /**
   * Delete request
   */
  deleteRequest(requestId: string): Promise<void>;
}


