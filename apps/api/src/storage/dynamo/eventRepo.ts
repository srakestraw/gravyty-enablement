import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { ActivityEvent } from '@gravyty/domain';
import type { EventRepo } from '../index';

const TABLE_NAME = process.env.DDB_TABLE_EVENTS || 'events';

export class DynamoEventRepo implements EventRepo {
  async create(event: ActivityEvent): Promise<void> {
    const timestamp = event.timestamp || new Date().toISOString();
    const dateBucket = timestamp.split('T')[0]; // YYYY-MM-DD
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        date_bucket: dateBucket,
        'ts#event_id': `${timestamp}#${eventId}`,
        event_id: eventId,
        event_name: event.event_name,
        user_id: event.user_id,
        content_id: event.content_id,
        metadata: event.metadata,
        timestamp: timestamp,
      },
    });

    await dynamoDocClient.send(command);
  }

  async list(limit: number = 100): Promise<ActivityEvent[]> {
    // Query today's events
    const today = new Date().toISOString().split('T')[0];
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'date_bucket = :date',
      ExpressionAttributeValues: {
        ':date': today,
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.map(item => ({
      event_name: item.event_name,
      user_id: item.user_id,
      content_id: item.content_id,
      metadata: item.metadata,
      timestamp: item.timestamp,
    })) as ActivityEvent[];
  }
}

