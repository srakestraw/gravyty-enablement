/**
 * Comment Repository Interface
 * 
 * Abstraction layer for comment storage operations.
 */

import type { Comment } from '@gravyty/domain';

export interface CommentRepository {
  /**
   * Create a new comment
   */
  create(comment: Comment): Promise<Comment>;

  /**
   * Get comment by ID
   */
  get(commentId: string): Promise<Comment | null>;

  /**
   * List comments for an asset
   */
  listByAsset(assetId: string, options?: {
    versionId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Comment[]; next_cursor?: string }>;

  /**
   * Update comment
   */
  update(commentId: string, updates: Partial<Comment>): Promise<Comment>;

  /**
   * Delete comment
   */
  delete(commentId: string): Promise<void>;
}


