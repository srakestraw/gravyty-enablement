/**
 * Content Hub Notification Fanout
 *
 * Helper functions to send notifications to subscribers when events occur
 */
import type { Asset, AssetVersion, Subscription } from '@gravyty/domain';
/**
 * Send notifications to asset subscribers when a new version is published
 */
export declare function notifySubscribersNewVersion(subscriptions: Subscription[], asset: Asset, version: AssetVersion): Promise<void>;
/**
 * Send notifications to asset subscribers when version is expiring soon
 *
 * @param daysUntilExpiry - Number of days until expiry (e.g., 7 for "expiring in 7 days")
 */
export declare function notifySubscribersExpiringSoon(subscriptions: Subscription[], asset: Asset, version: AssetVersion, daysUntilExpiry?: number): Promise<void>;
/**
 * Send notifications to asset subscribers when version expires
 */
export declare function notifySubscribersExpired(subscriptions: Subscription[], asset: Asset, version: AssetVersion): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map