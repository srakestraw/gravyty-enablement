/**
 * Content Hub Subscription DynamoDB Repository
 * 
 * DynamoDB implementation of ContentHubSubscriptionRepository using content_registry table (single-table design)
 */

import { QueryCommand, GetCommand, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { Subscription } from '@gravyty/domain';
import type { ContentHubSubscriptionRepository } from '../../repositories/contentHubSubscriptionRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoContentHubSubscriptionRepo implements ContentHubSubscriptionRepository {
  async create(subscription: Subscription): Promise<Subscription> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: subscription.subscription_id,
        // Entity type discriminator
        entity_type: 'SUBSCRIPTION',
        // Subscription fields
        ...subscription,
        // GSI attributes
        'target_type#target_id': `${subscription.target_type}#${subscription.target_id}`,
        'user_id#subscription_id': `${subscription.user_id}#${subscription.subscription_id}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return subscription;
  }

  async get(subscriptionId: string, userId: string): Promise<Subscription | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: subscriptionId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'SUBSCRIPTION' || Item.user_id !== userId) {
      return null;
    }
    
    return Item as Subscription;
  }

  async listByUser(userId: string, options?: {
    target_type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Subscription[]; next_cursor?: string }> {
    const { target_type, limit = 50, cursor } = options || {};
    
    // Query by user_id using GSI (if exists) or scan with filter
    // For now, use scan with filter (can be optimized with GSI later)
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #user_id = :user_id' + 
        (target_type ? ' AND #target_type = :target_type' : ''),
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#user_id': 'user_id',
        ...(target_type && { '#target_type': 'target_type' }),
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SUBSCRIPTION',
        ':user_id': userId,
        ...(target_type && { ':target_type': target_type }),
      },
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    
    const subscriptions = Items.filter((item: any) => item.entity_type === 'SUBSCRIPTION') as Subscription[];
    
    return {
      items: subscriptions,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async listByTarget(targetType: string, targetId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Subscription[]; next_cursor?: string }> {
    const { limit = 50, cursor } = options || {};
    
    // Query by target_type#target_id using GSI (if exists) or scan with filter
    // For now, use scan with filter (can be optimized with GSI later)
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #target_type = :target_type AND #target_id = :target_id',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#target_type': 'target_type',
        '#target_id': 'target_id',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SUBSCRIPTION',
        ':target_type': targetType,
        ':target_id': targetId,
      },
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    
    const subscriptions = Items.filter((item: any) => item.entity_type === 'SUBSCRIPTION') as Subscription[];
    
    return {
      items: subscriptions,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async findByUserAndTarget(userId: string, targetType: string, targetId: string): Promise<Subscription | null> {
    // Scan with filter to find matching subscription
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #user_id = :user_id AND #target_type = :target_type AND #target_id = :target_id',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#user_id': 'user_id',
        '#target_type': 'target_type',
        '#target_id': 'target_id',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SUBSCRIPTION',
        ':user_id': userId,
        ':target_type': targetType,
        ':target_id': targetId,
      },
      Limit: 1,
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    
    if (Items.length === 0) {
      return null;
    }
    
    return Items[0] as Subscription;
  }

  async delete(subscriptionId: string, userId: string): Promise<void> {
    // Verify ownership before deleting
    const subscription = await this.get(subscriptionId, userId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found or access denied`);
    }
    
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: subscriptionId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

// Export singleton instance
export const contentHubSubscriptionRepo = new DynamoContentHubSubscriptionRepo();

