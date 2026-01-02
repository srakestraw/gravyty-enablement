/**
 * Course Asset DynamoDB Repository
 * 
 * DynamoDB implementation of CourseAssetRepository using content_registry table (single-table design)
 */

import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { CourseAsset } from '@gravyty/domain';
import type { CourseAssetRepository } from '../../repositories/courseAssetRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoCourseAssetRepo implements CourseAssetRepository {
  async create(courseAsset: CourseAsset): Promise<CourseAsset> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: courseAsset.course_asset_id,
        // Entity type discriminator
        entity_type: 'COURSE_ASSET',
        // Course asset fields
        ...courseAsset,
        // GSI attributes
        'course_id#sort_order': `${courseAsset.course_id}#${courseAsset.sort_order}`,
        'asset_id#course_id': `${courseAsset.asset_id}#${courseAsset.course_id}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return courseAsset;
  }

  async get(courseAssetId: string): Promise<CourseAsset | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: courseAssetId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'COURSE_ASSET') {
      return null;
    }
    
    return Item as CourseAsset;
  }

  async listByCourse(courseId: string, options?: {
    moduleId?: string;
    lessonId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: CourseAsset[]; next_cursor?: string }> {
    const { moduleId, lessonId, limit = 50, cursor } = options || {};
    
    try {
      // Scan with filter (can be optimized with GSI)
      const filterExpressions: string[] = ['#entity_type = :entity_type', '#course_id = :course_id'];
      const expressionAttributeValues: Record<string, any> = {
        ':entity_type': 'COURSE_ASSET',
        ':course_id': courseId,
      };
      
      if (moduleId) {
        filterExpressions.push('#module_id = :module_id');
        expressionAttributeValues[':module_id'] = moduleId;
      }
      
      if (lessonId) {
        filterExpressions.push('#lesson_id = :lesson_id');
        expressionAttributeValues[':lesson_id'] = lessonId;
      }
      
      let exclusiveStartKey;
      if (cursor) {
        try {
          exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64').toString());
        } catch (err) {
          // Invalid cursor - ignore and start from beginning
          console.warn(`Invalid cursor provided to listByCourse: ${cursor}`, err);
        }
      }
      
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: {
          '#entity_type': 'entity_type',
          '#course_id': 'course_id',
          ...(moduleId && { '#module_id': 'module_id' }),
          ...(lessonId && { '#lesson_id': 'lesson_id' }),
        },
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      });
      
      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      const courseAssets = Items.filter((item: any) => item.entity_type === 'COURSE_ASSET') as CourseAsset[];
      
      // Sort by sort_order
      courseAssets.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
      return {
        items: courseAssets,
        next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
      };
    } catch (error) {
      // If DynamoDB operation fails (table doesn't exist, connection issue, etc.), return empty list
      console.error(`Error listing course assets for course ${courseId}:`, error);
      // Re-throw to let the handler decide how to handle it
      throw error;
    }
  }

  async listByAsset(assetId: string, options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{ items: CourseAsset[]; next_cursor?: string }> {
    const { limit = 50, cursor } = options || {};
    
    // Scan with filter (can be optimized with GSI)
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#entity_type = :entity_type AND #asset_id = :asset_id',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
        '#asset_id': 'asset_id',
      },
      ExpressionAttributeValues: {
        ':entity_type': 'COURSE_ASSET',
        ':asset_id': assetId,
      },
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const courseAssets = Items.filter((item: any) => item.entity_type === 'COURSE_ASSET') as CourseAsset[];
    
    return {
      items: courseAssets,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async update(courseAssetId: string, updates: Partial<CourseAsset>): Promise<CourseAsset> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'course_asset_id' || key === 'entity_type' || key === 'course_id' || key === 'asset_id') {
        return; // Don't update PK or immutable fields
      }
      
      const nameKey = `#${key}`;
      const valueKey = `:${key}`;
      updateExpressions.push(`${nameKey} = ${valueKey}`);
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
    });
    
    if (updateExpressions.length === 0) {
      const existing = await this.get(courseAssetId);
      if (!existing) {
        throw new Error(`Course asset ${courseAssetId} not found`);
      }
      return existing;
    }
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: courseAssetId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    if (!Attributes || Attributes.entity_type !== 'COURSE_ASSET') {
      throw new Error(`Course asset ${courseAssetId} not found`);
    }
    
    return Attributes as CourseAsset;
  }

  async delete(courseAssetId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: courseAssetId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

// Export singleton instance
export const courseAssetRepo = new DynamoCourseAssetRepo();

