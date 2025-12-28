/**
 * Scheduled Brain Document Expiry Job
 * 
 * Scans brain_documents for items with expires_at <= now and status != Expired,
 * then expires them (status change + notifications + OpenSearch deletion).
 */

import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';
import { defaultProvider } from '@aws-sdk/credential-providers';
import type { BrainDocument } from '@gravyty/domain';

const dynamoDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DOCUMENTS_TABLE = process.env.DDB_TABLE_BRAIN_DOCUMENTS || 'brain_documents';
const EVENTS_TABLE = process.env.DDB_TABLE_EVENTS || 'events';
const NOTIFICATIONS_TABLE = process.env.DDB_TABLE_NOTIFICATIONS || 'notifications';
const OPENSEARCH_INDEX_NAME = process.env.OPENSEARCH_INDEX_NAME || 'brain-chunks';
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT || '';

/**
 * Get OpenSearch client
 */
function getOpenSearchClient() {
  const endpoint = OPENSEARCH_ENDPOINT.replace(/^https?:\/\//, '');
  
  return new Client({
    node: `https://${endpoint}`,
    ...AwsSigv4Signer({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: defaultProvider(),
    }),
  });
}

/**
 * Find users who cited a brain document
 */
async function findUsersWhoCitedDocument(docId: string, daysBack: number = 30): Promise<string[]> {
  const userIds = new Set<string>();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const cutoffDateBucket = cutoffDate.toISOString().split('T')[0];

  try {
    const command = new ScanCommand({
      TableName: EVENTS_TABLE,
      FilterExpression: 'event_name = :eventName AND contains(metadata.doc_id, :docId) AND date_bucket >= :cutoffDate',
      ExpressionAttributeValues: {
        ':eventName': 'assistant_cited_source',
        ':docId': docId,
        ':cutoffDate': cutoffDateBucket,
      },
    });

    const response = await dynamoDocClient.send(command);
    
    for (const item of response.Items || []) {
      const metadata = item.metadata as any;
      if (metadata?.doc_id === docId && metadata?.user_id) {
        userIds.add(metadata.user_id);
      }
    }
  } catch (error) {
    console.warn(`Failed to find users who cited doc ${docId}:`, error);
  }

  return Array.from(userIds);
}

/**
 * Match subscriptions for brain document (similar to content matching)
 */
async function matchSubscriptionsForBrainDoc(doc: BrainDocument): Promise<string[]> {
  const userIds = new Set<string>();

  try {
    const subscriptionsCommand = new ScanCommand({
      TableName: process.env.DDB_TABLE_SUBSCRIPTIONS || 'subscriptions',
    });

    const subscriptionsResponse = await dynamoDocClient.send(subscriptionsCommand);
    
    for (const sub of subscriptionsResponse.Items || []) {
      const subscription = sub as any;
      
      // Match product_suite
      if (doc.product_suite && subscription.product_suite) {
        if (subscription.product_suite !== '*' && subscription.product_suite !== doc.product_suite) {
          continue;
        }
      } else if (subscription.product_suite && subscription.product_suite !== '*') {
        continue;
      }

      // Match product_concept
      if (doc.product_concept && subscription.product_concept) {
        if (subscription.product_concept !== '*' && subscription.product_concept !== doc.product_concept) {
          continue;
        }
      } else if (subscription.product_concept && subscription.product_concept !== '*') {
        continue;
      }

      // Match tags
      if (subscription.tags && Array.isArray(subscription.tags) && subscription.tags.length > 0) {
        const docTags = doc.tags || [];
        const hasOverlap = subscription.tags.some((tag: string) => docTags.includes(tag));
        if (!hasOverlap) {
          continue;
        }
      }

      userIds.add(subscription.user_id);
    }
  } catch (error) {
    console.warn('Failed to match subscriptions:', error);
  }

  return Array.from(userIds);
}

/**
 * Create notification
 */
async function createNotification(userId: string, docId: string, title: string): Promise<void> {
  const notificationId = `brain_expired:${docId}:${userId}`;
  const now = new Date().toISOString();

  try {
    // Check if notification already exists (idempotency)
    const existingCommand = new QueryCommand({
      TableName: NOTIFICATIONS_TABLE,
      KeyConditionExpression: 'user_id = :userId AND notification_id = :notifId',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':notifId': notificationId,
      },
    });

    const existing = await dynamoDocClient.send(existingCommand);
    if (existing.Items && existing.Items.length > 0) {
      return; // Already exists
    }

    // Create notification
    await dynamoDocClient.send(new PutCommand({
      TableName: NOTIFICATIONS_TABLE,
      Item: {
        user_id: userId,
        notification_id: notificationId,
        type: 'warning',
        title: 'Brain source expired',
        message: `The source "${title}" has expired and will no longer appear in assistant results.`,
        read: false,
        created_at: now,
      },
    }));
  } catch (error) {
    console.warn(`Failed to create notification for user ${userId}:`, error);
  }
}

/**
 * Expire a single brain document
 */
async function expireBrainDocument(doc: BrainDocument): Promise<void> {
  // Skip if already expired (idempotency)
  if (doc.status === 'Expired') {
    return;
  }

  const now = new Date().toISOString();
  const docId = doc.id || (doc as any).doc_id;

  // Update document status
  await dynamoDocClient.send(new UpdateCommand({
    TableName: DOCUMENTS_TABLE,
    Key: { doc_id: docId },
    UpdateExpression: 'SET #status = :status, expired_at = :expiredAt, expired_by = :expiredBy',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'Expired',
      ':expiredAt': now,
      ':expiredBy': 'system',
    },
  }));

  // Delete vectors from OpenSearch
  try {
    const osClient = getOpenSearchClient();
    await osClient.deleteByQuery({
      index: OPENSEARCH_INDEX_NAME,
      body: {
        query: {
          term: { doc_id: docId },
        },
      },
    });
    console.log(`[${docId}] Deleted vectors from OpenSearch`);
  } catch (error) {
    console.warn(`[${docId}] Failed to delete vectors:`, error);
    // Continue even if deletion fails
  }

  // Find users to notify
  const matchingSubscribers = await matchSubscriptionsForBrainDoc(doc);
  const citedUsers = await findUsersWhoCitedDocument(docId, 30);
  const allUserIds = new Set([...matchingSubscribers, ...citedUsers]);

  // Create notifications
  await Promise.all(
    Array.from(allUserIds).map(userId =>
      createNotification(userId, docId, doc.title)
    )
  );

  console.log(`[${docId}] Expired and notified ${allUserIds.size} users`);
}

export interface ExpiryJobResult {
  scanned: number;
  expired: number;
  skipped: number;
  errors: number;
  errorDetails?: string[];
}

/**
 * Run expiry job
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

  try {
    // Scan all documents (in production, consider pagination)
    const scanCommand = new ScanCommand({
      TableName: DOCUMENTS_TABLE,
    });

    const scanResponse = await dynamoDocClient.send(scanCommand);
    const documents = (scanResponse.Items || []) as BrainDocument[];

    result.scanned = documents.length;

    for (const doc of documents) {
      try {
        // Check if document should be expired
        if (doc.status === 'Expired') {
          result.skipped++;
          continue;
        }

        if (!doc.expires_at) {
          result.skipped++;
          continue;
        }

        const expiresAt = new Date(doc.expires_at);
        if (expiresAt > now) {
          result.skipped++;
          continue;
        }

        // Expire the document
        await expireBrainDocument(doc);
        result.expired++;
      } catch (error) {
        result.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errorDetails?.push(`Doc ${doc.id}: ${errorMsg}`);
        console.error(`Failed to expire doc ${doc.id}:`, error);
      }
    }
  } catch (error) {
    result.errors++;
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.errorDetails?.push(`Scan failed: ${errorMsg}`);
    console.error('Failed to scan documents:', error);
  }

  return result;
}

export const handler: Handler = async (event) => {
  console.log('Brain expiry job started:', JSON.stringify(event, null, 2));

  const result = await runExpiryJob();

  console.log('Brain expiry job completed:', JSON.stringify(result, null, 2));

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};

