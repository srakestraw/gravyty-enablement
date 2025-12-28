/**
 * Subscription Matching Logic
 *
 * Implements subscription matching rules to find users who should be notified
 * when content is approved or expired.
 */
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from './dynamoClient';
/**
 * Normalize tags for comparison
 * - Filters out empty strings
 * - Returns sorted array for consistent comparison
 */
function normalizeTags(tags) {
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
export function subscriptionMatchesContent(subscription, contentItem) {
    // Rule 1: Product suite match
    const productSuiteMatch = subscription.product_suite === '*' ||
        subscription.product_suite === contentItem.product_suite ||
        (!subscription.product_suite && !contentItem.product_suite);
    if (!productSuiteMatch) {
        return false;
    }
    // Rule 2: Product concept match
    const productConceptMatch = subscription.product_concept === '*' ||
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
 */
export async function matchSubscriptionsForContent(contentItem) {
    const matchingUserIds = new Set();
    const TABLE_NAME = process.env.DDB_TABLE_SUBSCRIPTIONS || 'subscriptions';
    try {
        const command = new ScanCommand({
            TableName: TABLE_NAME,
        });
        const { Items = [] } = await dynamoDocClient.send(command);
        const subscriptions = Items;
        // Filter subscriptions that match the content
        for (const subscription of subscriptions) {
            if (subscriptionMatchesContent(subscription, contentItem)) {
                matchingUserIds.add(subscription.user_id);
            }
        }
    }
    catch (error) {
        console.warn('Failed to scan subscriptions table:', error);
        return [];
    }
    return Array.from(matchingUserIds);
}
/**
 * Find all user IDs who downloaded a specific content item
 */
export async function findDownloadersForContent(contentId) {
    const downloaderIds = new Set();
    const TABLE_NAME = process.env.DDB_TABLE_EVENTS || 'events';
    try {
        // Query events by date bucket (last 30 days)
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
    }
    catch (error) {
        console.warn('Failed to query download events:', error);
        return [];
    }
    return Array.from(downloaderIds);
}
//# sourceMappingURL=subscriptionMatching.js.map