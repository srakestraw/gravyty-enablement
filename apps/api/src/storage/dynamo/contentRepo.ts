import { QueryCommand, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type { ContentItem, ContentStatus } from '@gravyty/domain';
import type { ContentRepo } from '../index';

const TABLE_NAME = process.env.DDB_TABLE_CONTENT || 'content_registry';

export class DynamoContentRepo implements ContentRepo {
  async list(params: {
    query?: string;
    product_suite?: string;
    product_concept?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ContentItem[]; next_cursor?: string }> {
    const limit = params.limit || 50;

    // Determine which GSI to use
    if (params.status) {
      // Use GSI1: by_status_updated
      return this.listByStatus(params.status, limit, params.cursor);
    } else if (params.product_suite && params.product_concept) {
      // Use GSI2: by_product
      return this.listByProduct(params.product_suite, params.product_concept, limit, params.cursor);
    } else {
      // Scan table (less efficient, but works for now)
      // TODO: Add pagination support for scan
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit,
        ...(params.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) }),
      });

      // Note: Query requires PK, so we'll use Scan for now
      // In production, consider adding a GSI for all content
      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      let items = (Items as ContentItem[]);
      const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;

      // Apply filters client-side (for now)
      if (params.query) {
        const lowerQuery = params.query.toLowerCase();
        items = items.filter(item =>
          item.title.toLowerCase().includes(lowerQuery) ||
          item.summary.toLowerCase().includes(lowerQuery) ||
          item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      }

      if (params.product_suite) {
        items = items.filter(item => item.product_suite === params.product_suite);
      }

      if (params.product_concept) {
        items = items.filter(item => item.product_concept === params.product_concept);
      }

      // Sort by last_updated descending
      items.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());

      return {
        items,
        ...(nextCursor && { next_cursor: nextCursor }),
      };
    }
  }

  private async listByStatus(
    status: string,
    limit: number,
    cursor?: string
  ): Promise<{ items: ContentItem[]; next_cursor?: string }> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'by_status_updated',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
      ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;

    return {
      items: Items as ContentItem[],
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  private async listByProduct(
    productSuite: string,
    productConcept: string,
    limit: number,
    cursor?: string
  ): Promise<{ items: ContentItem[]; next_cursor?: string }> {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'by_product',
      KeyConditionExpression: '#product = :product',
      ExpressionAttributeNames: {
        '#product': 'product_suite#product_concept',
      },
      ExpressionAttributeValues: {
        ':product': `${productSuite}#${productConcept}`,
      },
      ScanIndexForward: false,
      Limit: limit,
      ...(cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(cursor, 'base64').toString()) }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    const nextCursor = LastEvaluatedKey ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') : undefined;

    return {
      items: Items as ContentItem[],
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  async get(id: string): Promise<ContentItem | null> {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { content_id: id },
    });

    const { Item } = await dynamoDocClient.send(command);
    return (Item as ContentItem) || null;
  }

  async create(item: ContentItem): Promise<ContentItem> {
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        content_id: item.content_id,
        status: item.status,
        title: item.title,
        summary: item.summary,
        product_suite: item.product_suite,
        product_concept: item.product_concept,
        audience_role: item.audience_role,
        lifecycle_stage: item.lifecycle_stage,
        owner_user_id: item.owner_user_id,
        tags: item.tags,
        version: item.version,
        last_updated: item.last_updated,
        review_due_date: item.review_due_date,
      effective_date: item.effective_date,
      expiry_date: item.expiry_date,
      expiry_policy: item.expiry_policy,
      s3_uri: item.s3_uri,
      // File metadata
      file_name: item.file_name,
      content_type: item.content_type,
      size_bytes: item.size_bytes,
      s3_bucket: item.s3_bucket,
      s3_key: item.s3_key,
      uploaded_at: item.uploaded_at,
      // GSI keys
        'status#last_updated': `${item.status}#${item.last_updated}#${item.content_id}`,
        'product_suite#product_concept': item.product_suite && item.product_concept
          ? `${item.product_suite}#${item.product_concept}`
          : null,
        'last_updated#content_id': `${item.last_updated}#${item.content_id}`,
      },
    });

    await dynamoDocClient.send(command);
    return item;
  }

  async update(id: string, updates: Partial<ContentItem>): Promise<ContentItem> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Content item ${id} not found`);
    }

    const updated: ContentItem = {
      ...existing,
      ...updates,
      content_id: id,
      last_updated: new Date().toISOString(),
    };

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'content_id' && value !== undefined) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      }
    });

    // Always update last_updated
    updateExpressions.push('#last_updated = :last_updated');
    expressionAttributeNames['#last_updated'] = 'last_updated';
    expressionAttributeValues[':last_updated'] = updated.last_updated;

    // Update GSI keys if status changed
    if (updates.status) {
      updateExpressions.push('#status_last_updated = :status_last_updated');
      expressionAttributeNames['#status_last_updated'] = 'status#last_updated';
      expressionAttributeValues[':status_last_updated'] = `${updated.status}#${updated.last_updated}#${updated.content_id}`;
    }

    // Update last_updated#content_id for GSI2
    updateExpressions.push('#last_updated_content_id = :last_updated_content_id');
    expressionAttributeNames['#last_updated_content_id'] = 'last_updated#content_id';
    expressionAttributeValues[':last_updated_content_id'] = `${updated.last_updated}#${updated.content_id}`;

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { content_id: id },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoDocClient.send(command);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { content_id: id },
    });

    await dynamoDocClient.send(command);
  }
}

