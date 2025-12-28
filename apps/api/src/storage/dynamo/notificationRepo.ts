import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { Notification } from '@gravyty/domain';
import type { NotificationRepo } from '../index';

const TABLE_NAME = process.env.DDB_TABLE_NOTIFICATIONS || 'notifications';

export class DynamoNotificationRepo implements NotificationRepo {
  async list(userId: string): Promise<Notification[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Descending order (newest first)
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items as Notification[];
  }

  async get(id: string, userId: string): Promise<Notification | null> {
    // Need to query by user_id first, then filter by notification_id
    // For efficiency, we could add a GSI with notification_id as PK
    // For now, we'll query user_id and filter
    const notifications = await this.list(userId);
    return notifications.find(n => n.id === id) || null;
  }

  async create(notification: Notification): Promise<Notification> {
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

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.get(id, userId);
    if (!notification) {
      throw new Error(`Notification ${id} not found`);
    }

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: userId,
        'created_at#notification_id': `${notification.created_at}#${id}`,
      },
      UpdateExpression: 'SET #read = :read',
      ExpressionAttributeNames: {
        '#read': 'read',
      },
      ExpressionAttributeValues: {
        ':read': true,
      },
    });

    await dynamoDocClient.send(command);
    return { ...notification, read: true };
  }

  async delete(id: string, userId: string): Promise<void> {
    const notification = await this.get(id, userId);
    if (!notification) {
      return;
    }

    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: userId,
        'created_at#notification_id': `${notification.created_at}#${id}`,
      },
    });

    await dynamoDocClient.send(command);
  }
}

