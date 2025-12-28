/**
 * Notification Creation Logic
 * 
 * Provides utilities for creating notifications with idempotency support
 */

import type { Notification } from '@gravyty/domain';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from './dynamoClient';

export interface CreateNotificationParams {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  contentId?: string;
  notificationId?: string; // Optional deterministic ID for idempotency
}

/**
 * Create a notification for a user
 * 
 * If notificationId is provided, checks for existing notification to ensure idempotency.
 * If a notification with the same ID already exists, returns the existing notification.
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification> {
  const {
    userId,
    type,
    title,
    message,
    contentId,
    notificationId,
  } = params;

  // Generate deterministic notification ID if not provided
  const id = notificationId || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();

  // Check if notification with this ID already exists (idempotency)
  if (notificationId) {
    try {
      const TABLE_NAME = process.env.DDB_TABLE_NOTIFICATIONS || 'notifications';
      // Query by user_id and filter by notification_id
      const queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'user_id = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      });
      
      const { Items = [] } = await dynamoDocClient.send(queryCommand);
      const existing = Items.find((item: any) => item.notification_id === id);
      
      if (existing) {
        return existing as Notification;
      }
    } catch (error) {
      // If query fails (e.g., notification doesn't exist), continue to create
      // This is expected behavior for idempotency checks
    }
  }

  const notification: Notification = {
    id,
    user_id: userId,
    type,
    title,
    message,
    read: false,
    created_at: createdAt,
    content_id: contentId,
  };

  // Create notification in DynamoDB
  const TABLE_NAME = process.env.DDB_TABLE_NOTIFICATIONS || 'notifications';
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      user_id: notification.user_id,
      'created_at#notification_id': `${notification.created_at}#${notification.id}`,
      notification_id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      created_at: notification.created_at,
      content_id: notification.content_id,
    },
  });

  await dynamoDocClient.send(command);
  return notification;
}

