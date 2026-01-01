/**
 * Asset DynamoDB Repository
 * 
 * DynamoDB implementation of AssetRepository using content_registry table (single-table design)
 */

import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { Asset } from '@gravyty/domain';
import type { AssetRepository } from '../../repositories/assetRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoAssetRepo implements AssetRepository {
  async create(asset: Asset): Promise<Asset> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: asset.asset_id, // Using content_id as PK for compatibility
        // Entity type discriminator
        entity_type: 'ASSET',
        // Asset fields
        ...asset,
        // GSI attributes
        'taxonomy_node_id#status': asset.taxonomy_node_ids.length > 0 
          ? `${asset.taxonomy_node_ids[0]}#published` 
          : undefined,
        'updated_at#asset_id': `${asset.updated_at}#${asset.asset_id}`,
        'owner_id#updated_at': `${asset.owner_id}#${asset.updated_at}`,
        'pinned#updated_at': `${asset.pinned ? 'true' : 'false'}#${asset.updated_at}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return asset;
  }

  async get(assetId: string): Promise<Asset | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: assetId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'ASSET') {
      return null;
    }
    
    return Item as Asset;
  }

  async list(params: {
    taxonomyNodeId?: string;
    assetType?: string;
    status?: string;
    pinned?: boolean;
    ownerId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Asset[]; next_cursor?: string }> {
    const limit = params.limit || 50;
    
    // Use appropriate GSI based on filters
    if (params.taxonomyNodeId && params.status) {
      // Use ByTaxonomyStatusUpdated GSI
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'ByTaxonomyStatusUpdated',
        KeyConditionExpression: '#gsi_pk = :gsi_pk',
        ExpressionAttributeNames: {
          '#gsi_pk': 'taxonomy_node_id#status',
          '#entity_type': 'entity_type',
        },
        ExpressionAttributeValues: {
          ':gsi_pk': `${params.taxonomyNodeId}#${params.status}`,
          ':entity_type': 'ASSET',
        },
        FilterExpression: '#entity_type = :entity_type',
        ScanIndexForward: false, // Descending order
        Limit: limit,
        ...(params.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) }),
      });
      
      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;
      
      return {
        items: Items as Asset[],
        ...(nextCursor && { next_cursor: nextCursor }),
      };
    } else if (params.pinned !== undefined) {
      // Use ByPinnedUpdated GSI
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'ByPinnedUpdated',
        KeyConditionExpression: '#gsi_pk = :gsi_pk',
        ExpressionAttributeNames: {
          '#gsi_pk': 'pinned',
          '#entity_type': 'entity_type',
        },
        ExpressionAttributeValues: {
          ':gsi_pk': params.pinned ? 'true' : 'false',
          ':entity_type': 'ASSET',
        },
        FilterExpression: '#entity_type = :entity_type',
        ScanIndexForward: false,
        Limit: limit,
        ...(params.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) }),
      });
      
      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;
      
      return {
        items: Items as Asset[],
        ...(nextCursor && { next_cursor: nextCursor }),
      };
    } else if (params.ownerId) {
      // Use ByOwnerUpdated GSI
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'ByOwnerUpdated',
        KeyConditionExpression: '#gsi_pk = :gsi_pk',
        ExpressionAttributeNames: {
          '#gsi_pk': 'owner_id',
          '#entity_type': 'entity_type',
        },
        ExpressionAttributeValues: {
          ':gsi_pk': params.ownerId,
          ':entity_type': 'ASSET',
        },
        FilterExpression: '#entity_type = :entity_type',
        ScanIndexForward: false,
        Limit: limit,
        ...(params.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) }),
      });
      
      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;
      
      return {
        items: Items as Asset[],
        ...(nextCursor && { next_cursor: nextCursor }),
      };
    }
    
    // Fallback: scan with entity_type filter (less efficient)
    // TODO: Consider adding a GSI for all assets
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'ASSET',
      },
      Limit: limit,
      ...(params.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) }),
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    let items = Items as Asset[];
    
    // Apply additional filters client-side
    if (params.assetType) {
      items = items.filter(item => item.asset_type === params.assetType);
    }
    
    const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;
    
    return {
      items,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  async update(assetId: string, updates: Partial<Asset>): Promise<Asset> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'asset_id' || key === 'entity_type') return; // Don't update PK or entity_type
      
      const nameKey = `#${key}`;
      const valueKey = `:${key}`;
      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
    });
    
    // Always update updated_at
    updateExpressions.push('#updated_at = :updated_at');
    expressionAttributeNames['#updated_at'] = 'updated_at';
    expressionAttributeValues[':updated_at'] = now;
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: assetId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    return Attributes as Asset;
  }

  async delete(assetId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: assetId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

// Export singleton instance
export const assetRepo = new DynamoAssetRepo();

