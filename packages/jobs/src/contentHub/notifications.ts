/**
 * Content Hub Notification Fanout
 * 
 * Helper functions to send notifications to subscribers when events occur
 */

import { createNotification } from '../notifications';
import type { Asset, AssetVersion, Subscription } from '@gravyty/domain';

/**
 * Send notifications to asset subscribers when a new version is published
 */
export async function notifySubscribersNewVersion(
  subscriptions: Subscription[],
  asset: Asset,
  version: AssetVersion
): Promise<void> {
  for (const subscription of subscriptions) {
    // Check if subscription has newVersion trigger enabled
    if (subscription.triggers?.newVersion !== false) {
      try {
        await createNotification({
          userId: subscription.user_id,
          type: 'info',
          title: 'New version published',
          message: `A new version of "${asset.title}" has been published (v${version.version_number})`,
          contentId: asset.asset_id,
          notificationId: `new_version:${version.version_id}:${subscription.user_id}`,
        });
      } catch (err) {
        console.error(`[notifySubscribersNewVersion] Failed to notify ${subscription.user_id}:`, err);
        // Continue with other subscribers
      }
    }
  }
}

/**
 * Send notifications to asset subscribers when version is expiring soon
 * 
 * @param daysUntilExpiry - Number of days until expiry (e.g., 7 for "expiring in 7 days")
 */
export async function notifySubscribersExpiringSoon(
  subscriptions: Subscription[],
  asset: Asset,
  version: AssetVersion,
  daysUntilExpiry: number = 7
): Promise<void> {
  for (const subscription of subscriptions) {
    // Check if subscription has expiringSoon trigger enabled
    if (subscription.triggers?.expiringSoon !== false) {
      try {
        await createNotification({
          userId: subscription.user_id,
          type: 'warning',
          title: 'Content expiring soon',
          message: `"${asset.title}" (v${version.version_number}) will expire in ${daysUntilExpiry} days`,
          contentId: asset.asset_id,
          notificationId: `expiring_soon:${version.version_id}:${subscription.user_id}`,
        });
      } catch (err) {
        console.error(`[notifySubscribersExpiringSoon] Failed to notify ${subscription.user_id}:`, err);
      }
    }
  }
}

/**
 * Send notifications to asset subscribers when version expires
 */
export async function notifySubscribersExpired(
  subscriptions: Subscription[],
  asset: Asset,
  version: AssetVersion
): Promise<void> {
  for (const subscription of subscriptions) {
    // Check if subscription has expired trigger enabled
    if (subscription.triggers?.expired !== false) {
      try {
        await createNotification({
          userId: subscription.user_id,
          type: 'warning',
          title: 'Content expired',
          message: `"${asset.title}" (v${version.version_number}) has expired`,
          contentId: asset.asset_id,
          notificationId: `expired:${version.version_id}:${subscription.user_id}`,
        });
      } catch (err) {
        console.error(`[notifySubscribersExpired] Failed to notify ${subscription.user_id}:`, err);
      }
    }
  }
}

