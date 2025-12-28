/**
 * Scheduled Content Expiry Job
 * 
 * Scans content_registry for items with expiry_date <= now and status != Expired,
 * then expires them (status change + notifications).
 */

import type { ContentItem } from '@gravyty/domain';
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from './dynamoClient';
import { matchSubscriptionsForContent, findDownloadersForContent } from './subscriptionMatching';
import { createNotification } from './notifications';

export interface ExpiryJobResult {
  scanned: number;
  expired: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
}

/**
 * Expire a single content item
 */
async function expireContentItem(item: ContentItem): Promise<void> {
  // Skip if already expired (idempotency)
  if (item.status === 'Expired') {
    return;
  }

  const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';
  const nowISO = new Date().toISOString();

  // Update content status in DynamoDB
  // Note: DynamoDB table uses 'content_id' as the partition key
  // Also update GSI keys for proper indexing
  const updateCommand = new UpdateCommand({
    TableName: CONTENT_TABLE,
    Key: {
      content_id: item.content_id,
    },
    UpdateExpression: 'SET #status = :status, last_updated = :lastUpdated, expiry_date = :expiryDate, #status_last_updated = :statusLastUpdated, #last_updated_content_id = :lastUpdatedContentId',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#status_last_updated': 'status#last_updated',
      '#last_updated_content_id': 'last_updated#content_id',
    },
    ExpressionAttributeValues: {
      ':status': 'Expired',
      ':lastUpdated': nowISO,
      ':expiryDate': nowISO,
      ':statusLastUpdated': `Expired#${nowISO}#${item.content_id}`,
      ':lastUpdatedContentId': `${nowISO}#${item.content_id}`,
    },
    ReturnValues: 'ALL_NEW',
  });

  const { Attributes } = await dynamoDocClient.send(updateCommand);
  // Map DynamoDB item back to ContentItem format
  const updatedItem: ContentItem = Attributes as ContentItem;

  // Trigger notifications
  try {
    // Find matching subscribers
    const matchingUserIds = await matchSubscriptionsForContent(updatedItem);
    
    // Find users who downloaded this content
    const downloaderIds = await findDownloadersForContent(updatedItem.content_id);
    
    // Combine and deduplicate user IDs
    const allUserIds = new Set([...matchingUserIds, ...downloaderIds]);
    
    // Create notification for each user
    const notificationPromises = Array.from(allUserIds).map(userId => {
      return createNotification({
        userId,
        type: 'warning',
        title: 'Content expired',
        message: `The content "${updatedItem.title}" has expired. Please check for updated versions.`,
        contentId: updatedItem.content_id,
        notificationId: `expired:${updatedItem.content_id}:${userId}`, // Deterministic ID for idempotency
      });
    });
    
    // Create notifications in parallel
    await Promise.all(notificationPromises);
  } catch (error) {
    console.error(`Error creating expiry notifications for content ${item.content_id}:`, error);
    // Don't throw - continue processing other items
  }
}

/**
 * Run the expiry job
 * 
 * @param options.now - Current time (defaults to now)
 * @returns Summary of job execution
 */
export async function runExpiryJob(options: { now?: Date } = {}): Promise<ExpiryJobResult> {
  const now = options.now || new Date();
  const nowISO = now.toISOString();
  
  const result: ExpiryJobResult = {
    scanned: 0,
    expired: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
  };

  const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';

  try {
    // Scan all content items
    // Note: For scale, consider adding a GSI on expiry_date or using a different approach
    let lastEvaluatedKey: Record<string, any> | undefined;
    
    do {
      const command = new ScanCommand({
        TableName: CONTENT_TABLE,
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
      });

      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      // Map DynamoDB items to ContentItem format
      const items = Items as ContentItem[];

      result.scanned += items.length;

      // Filter items that need to be expired
      const itemsToExpire = items.filter(item => {
        // Must have expiry_date
        if (!item.expiry_date) {
          return false;
        }

        // expiry_date must be <= now
        if (item.expiry_date > nowISO) {
          return false;
        }

        // Status must not already be Expired
        if (item.status === 'Expired') {
          return false;
        }

        return true;
      });

      // Process each item
      for (const item of itemsToExpire) {
        try {
          await expireContentItem(item);
          result.expired++;
        } catch (error) {
          result.errors++;
          const errorMsg = `Failed to expire content ${item.content_id}: ${error instanceof Error ? error.message : String(error)}`;
          result.errorDetails?.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Count skipped items (already expired or no expiry_date)
      result.skipped += items.length - itemsToExpire.length;

      lastEvaluatedKey = LastEvaluatedKey as Record<string, any> | undefined;
    } while (lastEvaluatedKey);

  } catch (error) {
    const errorMsg = `Expiry job failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errorDetails?.push(errorMsg);
    console.error(errorMsg);
    throw error;
  }

  return result;
}

