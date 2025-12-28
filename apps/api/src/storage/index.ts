/**
 * Storage Repository Interfaces
 * 
 * Abstraction layer for storage backends (stub, DynamoDB, etc.)
 */

import type { ContentItem, Notification, Subscription, ActivityEvent } from '@gravyty/domain';

export interface ContentRepo {
  list(params: {
    query?: string;
    product_suite?: string;
    product_concept?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ContentItem[]; next_cursor?: string }>;

  get(id: string): Promise<ContentItem | null>;

  create(item: ContentItem): Promise<ContentItem>;

  update(id: string, updates: Partial<ContentItem>): Promise<ContentItem>;

  delete(id: string): Promise<void>;
}

export interface NotificationRepo {
  list(userId: string): Promise<Notification[]>;

  get(id: string, userId: string): Promise<Notification | null>;

  create(notification: Notification): Promise<Notification>;

  markRead(id: string, userId: string): Promise<Notification>;

  delete(id: string, userId: string): Promise<void>;
}

export interface SubscriptionRepo {
  list(userId: string): Promise<Subscription[]>;

  get(id: string, userId: string): Promise<Subscription | null>;

  create(subscription: Subscription): Promise<Subscription>;

  delete(id: string, userId: string): Promise<void>;
}

export interface EventRepo {
  create(event: ActivityEvent): Promise<void>;

  list(limit?: number): Promise<ActivityEvent[]>;
}




