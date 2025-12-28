/**
 * Subscription Matching Library
 * 
 * Implements subscription matching rules to find users who should be notified
 * when content is approved or expired.
 */

import type { ContentItem, Subscription } from '@gravyty/domain';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../aws/dynamoClient';

/**
 * Normalize tags for comparison
 * - Converts to lowercase for case-insensitive matching (optional)
 * - Filters out empty strings
 * - Returns sorted array for consistent comparison
 */
function normalizeTags(tags: string[] | undefined | null): string[] {
  if (!tags || tags.length === 0) {
    return [];
  }
  return tags
    .filter(tag => tag && tag.trim().length > 0)
    .map(tag => tag.trim())
    .sort();
}

/**
 * Check if a subscription matches a content item
 * 
 * Matching rules:
 * 1. product_suite matches OR subscription.product_suite === "*"
 * 2. product_concept matches OR subscription.product_concept === "*"
 * 3. If subscription.tags is non-empty, at least one tag overlaps contentItem.tags
 */
export function subscriptionMatchesContent(
  subscription: Subscription,
  contentItem: ContentItem
): boolean {
  // Rule 1: Product suite match
  const productSuiteMatch =
    subscription.product_suite === '*' ||
    subscription.product_suite === contentItem.product_suite ||
    (!subscription.product_suite && !contentItem.product_suite);

  if (!productSuiteMatch) {
    return false;
  }

  // Rule 2: Product concept match
  const productConceptMatch =
    subscription.product_concept === '*' ||
    subscription.product_concept === contentItem.product_concept ||
    (!subscription.product_concept && !contentItem.product_concept);

  if (!productConceptMatch) {
    return false;
  }

  // Rule 3: Tag overlap (if subscription has tags)
  const subscriptionTags = normalizeTags(subscription.tags);
  const contentTags = normalizeTags(contentItem.tags);

  // If subscription has no tags, skip tag matching (matches all)
  if (subscriptionTags.length === 0) {
    return true;
  }

  // If subscription has tags, at least one must overlap
  const hasTagOverlap = subscriptionTags.some(tag => contentTags.includes(tag));
  return hasTagOverlap;
}

/**
 * Find all user IDs that have subscriptions matching a content item
 * 
 * @param contentItem The content item to match against
 * @returns Array of unique user IDs with matching subscriptions
 * 
 * Note: For MVP, this scans all subscriptions. For scale, consider:
 * - Adding a GSI on product_suite#product_concept -> user_id
 * - Caching subscription data
 * - Filtering at DB level
 */
export async function matchSubscriptionsForContent(
  contentItem: ContentItem
): Promise<string[]> {
  const matchingUserIds = new Set<string>();
  const storageBackend = process.env.STORAGE_BACKEND || 'stub';
  
  if (storageBackend === 'aws') {
    // Use DynamoDB scan for AWS backend
    const TABLE_NAME = process.env.DDB_TABLE_SUBSCRIPTIONS || 'subscriptions';
    
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
      });
      
      const { Items = [] } = await dynamoDocClient.send(command);
      const subscriptions = Items as Subscription[];
      
      // Filter subscriptions that match the content
      for (const subscription of subscriptions) {
        if (subscriptionMatchesContent(subscription, contentItem)) {
          matchingUserIds.add(subscription.user_id);
        }
      }
    } catch (error) {
      console.warn('Failed to scan subscriptions table:', error);
      return [];
    }
  } else {
    // Stub backend: For local dev without DynamoDB, subscription matching is not supported
    // Users should use AWS backend for production notification features
    console.warn('Subscription matching requires AWS backend. Stub mode returns empty matches.');
    return [];
  }
  
  return Array.from(matchingUserIds);
}

/**
 * Find all user IDs who downloaded a specific content item
 * 
 * @param contentId The content ID to find downloaders for
 * @returns Array of unique user IDs who downloaded the content
 */
export async function findDownloadersForContent(contentId: string): Promise<string[]> {
  const downloaderIds = new Set<string>();
  const storageBackend = process.env.STORAGE_BACKEND || 'stub';
  
  if (storageBackend === 'aws') {
    // Query events table for download events
    const TABLE_NAME = process.env.DDB_TABLE_EVENTS || 'events';
    
    try {
      // Query events by date bucket (today and recent days)
      // For MVP, we'll query the last 30 days
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateBucket = date.toISOString().split('T')[0];
        
        const command = new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'date_bucket = :date',
          FilterExpression: 'event_name = :eventName AND content_id = :contentId',
          ExpressionAttributeValues: {
            ':date': dateBucket,
            ':eventName': 'download',
            ':contentId': contentId,
          },
        });
        
        const { Items = [] } = await dynamoDocClient.send(command);
        for (const item of Items) {
          if (item.user_id) {
            downloaderIds.add(item.user_id);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to query download events:', error);
      return [];
    }
  } else {
    // Stub backend: Not supported
    console.warn('Finding downloaders requires AWS backend. Stub mode returns empty list.');
    return [];
  }
  
  return Array.from(downloaderIds);
}

