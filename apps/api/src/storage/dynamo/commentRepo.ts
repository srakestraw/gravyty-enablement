/**
 * Comment DynamoDB Repository
 * 
 * DynamoDB implementation of CommentRepository using content_registry table (single-table design)
 */

import { QueryCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { Comment } from '@gravyty/domain';
import type { CommentRepository } from '../../repositories/commentRepository';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoCommentRepo implements CommentRepository {
  async create(comment: Comment): Promise<Comment> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        // Primary key
        content_id: comment.comment_id,
        // Entity type discriminator
        entity_type: 'COMMENT',
        // Comment fields
        ...comment,
        // GSI attributes
        'asset_id#created_at': `${comment.asset_id}#${comment.created_at}`,
      },
    });
    
    await dynamoDocClient.send(command);
    return comment;
  }

  async get(commentId: string): Promise<Comment | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: commentId,
      },
    });
    
    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.entity_type !== 'COMMENT') {
      return null;
    }
    
    return Item as Comment;
  }

  async listByAsset(assetId: string, options?: {
    versionId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Comment[]; next_cursor?: string }> {
    const { versionId, limit = 50, cursor } = options || {};
    
    // Query by asset_id using GSI
    const expressionAttributeValues: Record<string, any> = {
      ':assetId': assetId,
    };
    
    if (versionId) {
      expressionAttributeValues[':versionId'] = versionId;
    }
    
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'asset_id-created_at-index', // Assuming this GSI exists
      KeyConditionExpression: 'asset_id = :assetId',
      FilterExpression: versionId 
        ? '#entity_type = :entity_type AND (version_id = :versionId OR attribute_not_exists(version_id))'
        : '#entity_type = :entity_type',
      ExpressionAttributeNames: {
        '#entity_type': 'entity_type',
      },
      ExpressionAttributeValues: {
        ...expressionAttributeValues,
        ':entity_type': 'COMMENT',
      },
      Limit: limit,
      ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
      ScanIndexForward: false, // Newest first
    });
    
    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    
    // Filter by entity_type (already filtered in query, but double-check)
    const comments = Items.filter((item: any) => item.entity_type === 'COMMENT') as Comment[];
    
    return {
      items: comments,
      next_cursor: LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined,
    };
  }

  async update(commentId: string, updates: Partial<Comment>): Promise<Comment> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    
    if (updates.body !== undefined) {
      updateExpressions.push('#body = :body');
      expressionAttributeNames['#body'] = 'body';
      expressionAttributeValues[':body'] = updates.body;
    }
    
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
    
    if (updates.updated_at !== undefined) {
      updateExpressions.push('#updated_at = :updated_at');
      expressionAttributeNames['#updated_at'] = 'updated_at';
      expressionAttributeValues[':updated_at'] = updates.updated_at;
    }
    
    if (updateExpressions.length === 0) {
      const existing = await this.get(commentId);
      if (!existing) {
        throw new Error(`Comment ${commentId} not found`);
      }
      return existing;
    }
    
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: commentId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });
    
    const { Attributes } = await dynamoDocClient.send(command);
    if (!Attributes || Attributes.entity_type !== 'COMMENT') {
      throw new Error(`Comment ${commentId} not found`);
    }
    
    return Attributes as Comment;
  }

  async delete(commentId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        content_id: commentId,
      },
    });
    
    await dynamoDocClient.send(command);
  }
}

// Export singleton instance
export const commentRepo = new DynamoCommentRepo();

