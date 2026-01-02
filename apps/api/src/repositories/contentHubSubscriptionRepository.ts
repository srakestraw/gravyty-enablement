/**
 * Content Hub Subscription Repository Interface
 * 
 * Abstraction layer for Content Hub subscription storage operations.
 */

import type { Subscription } from '@gravyty/domain';

export interface ContentHubSubscriptionRepository {
  /**
   * Create a new subscription
   */
  create(subscription: Subscription): Promise<Subscription>;

  /**
   * Get subscription by ID
   */
  get(subscriptionId: string, userId: string): Promise<Subscription | null>;

  /**
   * List subscriptions for a user
   */
  listByUser(userId: string, options?: {
    target_type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Subscription[]; next_cursor?: string }>;

  /**
   * List subscriptions for a target (asset, metadata, etc.)
   */
  listByTarget(targetType: string, targetId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Subscription[]; next_cursor?: string }>;

  /**
   * Find subscription by user and target
   */
  findByUserAndTarget(userId: string, targetType: string, targetId: string): Promise<Subscription | null>;

  /**
   * Delete subscription
   */
  delete(subscriptionId: string, userId: string): Promise<void>;
}

