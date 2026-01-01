/**
 * Share Link Repository Interface
 * 
 * Abstraction layer for share link storage operations.
 */

import type { ShareLink, ShareRecipient, ShareEvent } from '@gravyty/domain';

export interface ShareLinkRepository {
  /**
   * Create a new share link
   */
  create(shareLink: ShareLink): Promise<ShareLink>;

  /**
   * Get share link by ID
   */
  get(shareLinkId: string): Promise<ShareLink | null>;

  /**
   * Get share link by token
   */
  getByToken(token: string): Promise<ShareLink | null>;

  /**
   * List share links for an asset
   */
  listByAsset(assetId: string, options?: {
    createdBy?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ShareLink[]; next_cursor?: string }>;

  /**
   * List share links created by a user
   */
  listByCreator(userId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ShareLink[]; next_cursor?: string }>;

  /**
   * Update share link
   */
  update(shareLinkId: string, updates: Partial<ShareLink>): Promise<ShareLink>;

  /**
   * Delete share link
   */
  delete(shareLinkId: string): Promise<void>;
}

export interface ShareRecipientRepository {
  /**
   * Create a new recipient
   */
  create(recipient: ShareRecipient): Promise<ShareRecipient>;

  /**
   * Get recipient by ID
   */
  get(recipientId: string): Promise<ShareRecipient | null>;

  /**
   * List recipients for a share link
   */
  listByShareLink(shareLinkId: string): Promise<ShareRecipient[]>;

  /**
   * Find recipient by email and share link
   */
  findByEmailAndShareLink(email: string, shareLinkId: string): Promise<ShareRecipient | null>;

  /**
   * Update recipient
   */
  update(recipientId: string, updates: Partial<ShareRecipient>): Promise<ShareRecipient>;

  /**
   * Delete recipient
   */
  delete(recipientId: string): Promise<void>;
}

export interface ShareEventRepository {
  /**
   * Create a new share event
   */
  create(event: ShareEvent): Promise<ShareEvent>;

  /**
   * List events for a share link
   */
  listByShareLink(shareLinkId: string, options?: {
    event_type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ShareEvent[]; next_cursor?: string }>;
}

