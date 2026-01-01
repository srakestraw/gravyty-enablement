/**
 * Share Link DynamoDB Repository
 * 
 * DynamoDB implementation of ShareLinkRepository using content_registry table (single-table design)
 */

import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { ShareLink, ShareRecipient, ShareEvent } from '@gravyty/domain';
import type { ShareLinkRepository, ShareRecipientRepository, ShareEventRepository } from '../../repositories/shareLinkRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoShareLinkRepo implements ShareLinkRepository {
  async create(shareLink: ShareLink): Promise<ShareLink> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: shareLink.share_link_id,
        // Entity type discriminator
        entity_type: 'SHARE_LINK',
        // Share link fields
        ...shareLink,
        // GSI attributes
        share_token: shareLink.token, // For ByShareToken GSI lookup
        'asset_id#created_at': `${shareLink.asset_id}#${shareLink.created_at}`,
        'created_by#created_at': `${shareLink.created_by}#${shareLink.created_at}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return shareLink;
  }

  async get(shareLinkId: string): Promise<ShareLink | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: shareLinkId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'SHARE_LINK') {
      return null;
    }
    
    return Item as ShareLink;
  }

  async getByToken(token: string): Promise<ShareLink | null> {
    // Query by token using GSI (if exists) or scan with filter
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #token = :token',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#token': 'token',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SHARE_LINK',
        ':token': token,
      },
      Limit: 1,
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    if (Items.length === 0) {
      return null;
    }
    
    return Items[0] as ShareLink;
  }

  async listByAsset(assetId: string, options?: {
    createdBy?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ShareLink[]; next_cursor?: string }> {
    const { createdBy, status, limit = 50, cursor } = options || {};
    
    // Scan with filter (can be optimized with GSI)
    const filterExpressions: string[] = ['#entity_type = :entity_type', '#asset_id = :asset_id'];
    const expressionAttributeValues: Record<string, any> = {
      ':entity_type': 'SHARE_LINK',
      ':asset_id': assetId,
    };
    
    if (createdBy) {
      filterExpressions.push('#created_by = :created_by');
      expressionAttributeValues[':created_by'] = createdBy;
    }
    
    if (status) {
      filterExpressions.push('#status = :status');
      expressionAttributeValues[':status'] = status;
    }
    
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#asset_id': 'asset_id',
        ...(createdBy && { '#created_by': 'created_by' }),
        ...(status && { '#status': 'status' }),
      },
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const shareLinks = Items.filter((item: any) => item.entity_type === 'SHARE_LINK') as ShareLink[];
    
    return {
      items: shareLinks,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async listByCreator(userId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ShareLink[]; next_cursor?: string }> {
    const { limit = 50, cursor } = options || {};
    
    // Scan with filter (can be optimized with GSI)
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #created_by = :created_by',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#created_by': 'created_by',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SHARE_LINK',
        ':created_by': userId,
      },
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const shareLinks = Items.filter((item: any) => item.entity_type === 'SHARE_LINK') as ShareLink[];
    
    return {
      items: shareLinks,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async update(shareLinkId: string, updates: Partial<ShareLink>): Promise<ShareLink> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'share_link_id' || key === 'entity_type' || key === 'token') return; // Don't update PK, entity_type, or token
      
      const nameKey = `#${key}`;
      const valueKey = `:${key}`;
      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
    });
    
    if (updateExpressions.length === 0) {
      const existing = await this.get(shareLinkId);
      if (!existing) {
        throw new Error(`Share link ${shareLinkId} not found`);
      }
      return existing;
    }
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: shareLinkId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    if (!Attributes || Attributes.entity_type !== 'SHARE_LINK') {
      throw new Error(`Share link ${shareLinkId} not found`);
    }
    
    return Attributes as ShareLink;
  }

  async delete(shareLinkId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: shareLinkId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

export class DynamoShareRecipientRepo implements ShareRecipientRepository {
  async create(recipient: ShareRecipient): Promise<ShareRecipient> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        content_id: recipient.recipient_id,
        entity_type: 'SHARE_RECIPIENT',
        ...recipient,
        'share_link_id#email': `${recipient.share_link_id}#${recipient.email}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return recipient;
  }

  async get(recipientId: string): Promise<ShareRecipient | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: recipientId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'SHARE_RECIPIENT') {
      return null;
    }
    
    return Item as ShareRecipient;
  }

  async listByShareLink(shareLinkId: string): Promise<ShareRecipient[]> {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #share_link_id = :share_link_id',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#share_link_id': 'share_link_id',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SHARE_RECIPIENT',
        ':share_link_id': shareLinkId,
      },
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.filter((item: any) => item.entity_type === 'SHARE_RECIPIENT') as ShareRecipient[];
  }

  async findByEmailAndShareLink(email: string, shareLinkId: string): Promise<ShareRecipient | null> {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #share_link_id = :share_link_id AND #email = :email',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#share_link_id': 'share_link_id',
        '#email': 'email',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'SHARE_RECIPIENT',
        ':share_link_id': shareLinkId,
        ':email': email,
      },
      Limit: 1,
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    if (Items.length === 0) {
      return null;
    }
    
    return Items[0] as ShareRecipient;
  }

  async update(recipientId: string, updates: Partial<ShareRecipient>): Promise<ShareRecipient> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'recipient_id' || key === 'entity_type') return;
      
      const nameKey = `#${key}`;
      const valueKey = `:${key}`;
      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
    });
    
    if (updateExpressions.length === 0) {
      const existing = await this.get(recipientId);
      if (!existing) {
        throw new Error(`Recipient ${recipientId} not found`);
      }
      return existing;
    }
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: recipientId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    if (!Attributes || Attributes.entity_type !== 'SHARE_RECIPIENT') {
      throw new Error(`Recipient ${recipientId} not found`);
    }
    
    return Attributes as ShareRecipient;
  }

  async delete(recipientId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: recipientId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

export class DynamoShareEventRepo implements ShareEventRepository {
  async create(event: ShareEvent): Promise<ShareEvent> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        content_id: event.event_id,
        entity_type: 'SHARE_EVENT',
        ...event,
        'share_link_id#created_at': `${event.share_link_id}#${event.created_at}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return event;
  }

  async listByShareLink(shareLinkId: string, options?: {
    event_type?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ShareEvent[]; next_cursor?: string }> {
    const { event_type, limit = 50, cursor } = options || {};
    
    const filterExpressions: string[] = ['#entity_type = :entity_type', '#share_link_id = :share_link_id'];
    const expressionAttributeValues: Record<string, any> = {
      ':entity_type': 'SHARE_EVENT',
      ':share_link_id': shareLinkId,
    };
    
    if (event_type) {
      filterExpressions.push('#event_type = :event_type');
      expressionAttributeValues[':event_type'] = event_type;
    }
    
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#share_link_id': 'share_link_id',
        ...(event_type && { '#event_type': 'event_type' }),
      },
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
      ScanIndexForward: false, // Newest first
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const events = Items.filter((item: any) => item.entity_type === 'SHARE_EVENT') as ShareEvent[];
    
    return {
      items: events,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }
}

// Export singleton instances
export const shareLinkRepo = new DynamoShareLinkRepo();
export const shareRecipientRepo = new DynamoShareRecipientRepo();
export const shareEventRepo = new DynamoShareEventRepo();

