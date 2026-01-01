/**
 * Outdated Flag DynamoDB Repository
 * 
 * DynamoDB implementation of OutdatedFlagRepository and UpdateRequestRepository using content_registry table
 */

import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { OutdatedFlag, UpdateRequest } from '@gravyty/domain';
import type { OutdatedFlagRepository, UpdateRequestRepository } from '../../repositories/outdatedFlagRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoOutdatedFlagRepo implements OutdatedFlagRepository {
  async createFlag(flag: OutdatedFlag): Promise<OutdatedFlag> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: flag.flag_id,
        // Entity type discriminator
        entity_type: 'OUTDATED_FLAG',
        // Flag fields
        ...flag,
        // GSI attributes
        'asset_id#created_at': `${flag.asset_id}#${flag.created_at}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return flag;
  }

  async getFlag(flagId: string): Promise<OutdatedFlag | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: flagId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'OUTDATED_FLAG') {
      return null;
    }
    
    return Item as OutdatedFlag;
  }

  async listFlagsByAsset(assetId: string, options?: {
    resolved?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: OutdatedFlag[]; next_cursor?: string }> {
    const { resolved, limit = 50, cursor } = options || {};
    
    // Query by asset_id using GSI
    const filterExpressions: string[] = ['#entity_type = :entity_type'];
    const expressionAttributeValues: Record<string, any> = {
      ':assetId': assetId,
      ':entity_type': 'OUTDATED_FLAG',
    };
    
    if (resolved !== undefined) {
      if (resolved) {
        filterExpressions.push('attribute_exists(resolved_at)');
      } else {
        filterExpressions.push('attribute_not_exists(resolved_at)');
      }
    }
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'asset_id-created_at-index', // Assuming this GSI exists
      KeyConditionExpression: 'asset_id = :assetId',
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
      },
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
      ScanIndexForward: false, // Newest first
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    
    // Filter by entity_type (already filtered in query, but double-check)
    const flags = Items.filter((item: any) => item.entity_type === 'OUTDATED_FLAG') as OutdatedFlag[];
    
    return {
      items: flags,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async updateFlag(flagId: string, updates: Partial<OutdatedFlag>): Promise<OutdatedFlag> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    if (updates.resolved_at !== undefined) {
      updateExpressions.push('#resolved_at = :resolved_at');
      expressionAttributeNames['#resolved_at'] = 'resolved_at';
      expressionAttributeValues[':resolved_at'] = updates.resolved_at;
    }
    
    if (updates.resolved_by !== undefined) {
      updateExpressions.push('#resolved_by = :resolved_by');
      expressionAttributeNames['#resolved_by'] = 'resolved_by';
      expressionAttributeValues[':resolved_by'] = updates.resolved_by;
    }
    
    if (updateExpressions.length === 0) {
      const existing = await this.getFlag(flagId);
      if (!existing) {
        throw new Error(`Flag ${flagId} not found`);
      }
      return existing;
    }
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: flagId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    if (!Attributes || Attributes.entity_type !== 'OUTDATED_FLAG') {
      throw new Error(`Flag ${flagId} not found`);
    }
    
    return Attributes as OutdatedFlag;
  }

  async deleteFlag(flagId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: flagId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

export class DynamoUpdateRequestRepo implements UpdateRequestRepository {
  async createRequest(request: UpdateRequest): Promise<UpdateRequest> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: request.request_id,
        // Entity type discriminator
        entity_type: 'UPDATE_REQUEST',
        // Request fields
        ...request,
        // GSI attributes
        'asset_id#created_at': `${request.asset_id}#${request.created_at}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return request;
  }

  async getRequest(requestId: string): Promise<UpdateRequest | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: requestId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'UPDATE_REQUEST') {
      return null;
    }
    
    return Item as UpdateRequest;
  }

  async listRequestsByAsset(assetId: string, options?: {
    resolved?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: UpdateRequest[]; next_cursor?: string }> {
    const { resolved, limit = 50, cursor } = options || {};
    
    // Query by asset_id using GSI
    const filterExpressions: string[] = ['#entity_type = :entity_type'];
    const expressionAttributeValues: Record<string, any> = {
      ':assetId': assetId,
      ':entity_type': 'UPDATE_REQUEST',
    };
    
    if (resolved !== undefined) {
      if (resolved) {
        filterExpressions.push('attribute_exists(resolved_at)');
      } else {
        filterExpressions.push('attribute_not_exists(resolved_at)');
      }
    }
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'asset_id-created_at-index', // Assuming this GSI exists
      KeyConditionExpression: 'asset_id = :assetId',
      FilterExpression: filterExpressions.join(' AND '),
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
      },
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
      ScanIndexForward: false, // Newest first
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    
    // Filter by entity_type (already filtered in query, but double-check)
    const requests = Items.filter((item: any) => item.entity_type === 'UPDATE_REQUEST') as UpdateRequest[];
    
    return {
      items: requests,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async updateRequest(requestId: string, updates: Partial<UpdateRequest>): Promise<UpdateRequest> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    if (updates.resolved_at !== undefined) {
      updateExpressions.push('#resolved_at = :resolved_at');
      expressionAttributeNames['#resolved_at'] = 'resolved_at';
      expressionAttributeValues[':resolved_at'] = updates.resolved_at;
    }
    
    if (updates.resolved_by !== undefined) {
      updateExpressions.push('#resolved_by = :resolved_by');
      expressionAttributeNames['#resolved_by'] = 'resolved_by';
      expressionAttributeValues[':resolved_by'] = updates.resolved_by;
    }
    
    if (updateExpressions.length === 0) {
      const existing = await this.getRequest(requestId);
      if (!existing) {
        throw new Error(`Request ${requestId} not found`);
      }
      return existing;
    }
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: requestId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    if (!Attributes || Attributes.entity_type !== 'UPDATE_REQUEST') {
      throw new Error(`Request ${requestId} not found`);
    }
    
    return Attributes as UpdateRequest;
  }

  async deleteRequest(requestId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: requestId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

// Export singleton instances
export const outdatedFlagRepo = new DynamoOutdatedFlagRepo();
export const updateRequestRepo = new DynamoUpdateRequestRepo();

