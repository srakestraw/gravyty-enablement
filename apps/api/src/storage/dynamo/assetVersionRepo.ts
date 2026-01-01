/**
 * Asset Version DynamoDB Repository
 * 
 * DynamoDB implementation of AssetVersionRepository using content_registry table (single-table design)
 */

import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { AssetVersion } from '@gravyty/domain';
import type { AssetVersionRepository } from '../../repositories/assetVersionRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoAssetVersionRepo implements AssetVersionRepository {
  async create(version: AssetVersion): Promise<AssetVersion> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key - use version_id as PK
        content_id: version.version_id, // Using content_id as PK for compatibility
        // Entity type discriminator
        entity_type: 'ASSET_VERSION',
        // Version fields
        ...version,
        // GSI attributes
        'asset_id#version_number': `${version.asset_id}#${version.version_number}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return version;
  }

  async get(versionId: string): Promise<AssetVersion | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: versionId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'ASSET_VERSION') {
      return null;
    }
    
    return Item as AssetVersion;
  }

  async getByAssetAndVersion(assetId: string, versionNumber: number): Promise<AssetVersion | null> {
    // Query ByAssetVersions GSI
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'ByAssetVersions',
      KeyConditionExpression: '#asset_id = :asset_id AND #version_number = :version_number',
      ExpressionAttributeNames: {
        '#asset_id': 'asset_id',
        '#version_number': 'version_number',
        '#entity_type': 'entity_type',
      },
      ExpressionAttributeValues: {
        ':asset_id': assetId,
        ':version_number': versionNumber,
        ':entity_type': 'ASSET_VERSION',
      },
      FilterExpression: '#entity_type = :entity_type',
      Limit: 1,
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.length > 0 ? (Items[0] as AssetVersion) : null;
  }

  async listByAsset(assetId: string, params?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: AssetVersion[]; next_cursor?: string }> {
    const limit = params?.limit || 50;
    
    // Query ByAssetVersions GSI
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'ByAssetVersions',
      KeyConditionExpression: '#asset_id = :asset_id',
      ExpressionAttributeNames: {
        '#asset_id': 'asset_id',
        '#entity_type': 'entity_type',
      },
      ExpressionAttributeValues: {
        ':asset_id': assetId,
        ':entity_type': 'ASSET_VERSION',
      },
      FilterExpression: '#entity_type = :entity_type',
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
      ...(params?.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) }),
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;
    
    return {
      items: Items as AssetVersion[],
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  async getLatestPublished(assetId: string): Promise<AssetVersion | null> {
    // Query ByAssetVersions GSI, filter for published, get first result
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'ByAssetVersions',
      KeyConditionExpression: '#asset_id = :asset_id',
      ExpressionAttributeNames: {
        '#asset_id': 'asset_id',
        '#entity_type': 'entity_type',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':asset_id': assetId,
        ':entity_type': 'ASSET_VERSION',
        ':status': 'published',
      },
      FilterExpression: '#entity_type = :entity_type AND #status = :status',
      ScanIndexForward: false, // Descending order
      Limit: 1,
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items.length > 0 ? (Items[0] as AssetVersion) : null;
  }

  async getScheduledToPublish(now: string): Promise<AssetVersion[]> {
    // Scan for scheduled versions with publish_at <= now
    // Note: This requires a scan, but scheduled versions should be relatively few
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #status = :status AND #publish_at <= :now',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#status': 'status',
        '#publish_at': 'publish_at',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'ASSET_VERSION',
        ':status': 'scheduled',
        ':now': now,
      },
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items as AssetVersion[];
  }

  async getPublishedToExpire(now: string): Promise<AssetVersion[]> {
    // Scan for published versions with expire_at <= now
    const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #status = :status AND #expire_at <= :now',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#status': 'status',
        '#expire_at': 'expire_at',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'ASSET_VERSION',
        ':status': 'published',
        ':now': now,
      },
    });
    
    const { Items = [] } = await dynamoDocClient.send(command);
    return Items as AssetVersion[];
  }

  async update(versionId: string, updates: Partial<AssetVersion>): Promise<AssetVersion> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    // Build update expression dynamically
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'version_id' || key === 'asset_id' || key === 'entity_type') return;
      
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
        content_id: versionId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    return Attributes as AssetVersion;
  }

  async delete(versionId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: versionId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

// Export singleton instance
export const assetVersionRepo = new DynamoAssetVersionRepo();

