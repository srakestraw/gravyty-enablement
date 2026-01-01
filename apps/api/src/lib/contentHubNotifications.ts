/**
 * Content Hub Notification Fanout (API Layer)
 * 
 * Helper functions to send notifications to subscribers when events occur
 * This wraps the jobs package notification functions with subscription fetching
 */

import { contentHubSubscriptionRepo } from '../storage/dynamo/contentHubSubscriptionRepo';
// Temporarily commented out until jobs package is fixed
// import { notifySubscribersNewVersion as notifyNewVersion, notifySubscribersExpired as notifyExpired } from '@gravyty/jobs';
import type { Asset, AssetVersion } from '@gravyty/domain';

/**
 * Send notifications to asset subscribers when a new version is published
 */
export async function notifySubscribersNewVersion(asset: Asset, version: AssetVersion): Promise<void> {
  try {
    // Get all subscriptions for this asset
    const subscriptions = await contentHubSubscriptionRepo.listByTarget('asset', asset.asset_id);
    
    // Temporarily disabled until jobs package is fixed
    // await notifyNewVersion(subscriptions.items, asset, version);
    console.log(`[notifySubscribersNewVersion] Would notify ${subscriptions.items.length} subscribers for asset ${asset.asset_id}`);
  } catch (err) {
    console.error('[notifySubscribersNewVersion] Error fetching subscriptions:', err);
    // Don't throw - notification failures shouldn't break publishing
  }
}

/**
 * Send notifications to asset subscribers when version expires
 */
export async function notifySubscribersExpired(asset: Asset, version: AssetVersion): Promise<void> {
  try {
    // Get all subscriptions for this asset
    const subscriptions = await contentHubSubscriptionRepo.listByTarget('asset', asset.asset_id);
    
    // Temporarily disabled until jobs package is fixed
    // await notifyExpired(subscriptions.items, asset, version);
    console.log(`[notifySubscribersExpired] Would notify ${subscriptions.items.length} subscribers for expired asset ${asset.asset_id}`);
  } catch (err) {
    console.error('[notifySubscribersExpired] Error fetching subscriptions:', err);
  }
}

