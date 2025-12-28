/**
 * Subscription Matching Logic
 *
 * Implements subscription matching rules to find users who should be notified
 * when content is approved or expired.
 */
import type { ContentItem, Subscription } from '@gravyty/domain';
/**
 * Check if a subscription matches a content item
 *
 * Matching rules:
 * 1. product_suite matches OR subscription.product_suite === "*"
 * 2. product_concept matches OR subscription.product_concept === "*"
 * 3. If subscription.tags is non-empty, at least one tag overlaps contentItem.tags
 */
export declare function subscriptionMatchesContent(subscription: Subscription, contentItem: ContentItem): boolean;
/**
 * Find all user IDs that have subscriptions matching a content item
 */
export declare function matchSubscriptionsForContent(contentItem: ContentItem): Promise<string[]>;
/**
 * Find all user IDs who downloaded a specific content item
 */
export declare function findDownloadersForContent(contentId: string): Promise<string[]>;
//# sourceMappingURL=subscriptionMatching.d.ts.map