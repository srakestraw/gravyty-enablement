import { QueryCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { Subscription } from '@gravyty/domain';
import type { SubscriptionRepo } from '../index';

const TABLE_NAME = process.env.DDB_TABLE_SUBSCRIPTIONS || 'subscriptions';

export class DynamoSubscriptionRepo implements SubscriptionRepo {
  async list(userId: string): Promise<Subscription[]> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Descending order (newest first)
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items as Subscription[];
  }

  async get(id: string, userId: string): Promise<Subscription | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: userId,
        subscription_id: id,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    return (Item as Subscription) || null;
  }

  async create(subscription: Subscription): Promise<Subscription> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        product_suite: subscription.product_suite,
        product_concept: subscription.product_concept,
        tags: subscription.tags,
        created_at: subscription.created_at,
      },
    });

    await dynamoDocClient.send(command);
    return subscription;
  }

  async delete(id: string, userId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: userId,
        subscription_id: id,
      },
    });

    await dynamoDocClient.send(command);
  }
}

