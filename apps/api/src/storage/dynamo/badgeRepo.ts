/**
 * Badge Data Access Layer
 * 
 * Repository for accessing badge data.
 * Currently uses the metadata table (group_key='badge') for backward compatibility.
 * Future: Can be migrated to a dedicated badges table.
 */

import {
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import { v4 as uuidv4 } from 'uuid';
import {
  Badge,
  CreateBadge,
  UpdateBadge,
} from '@gravyty/domain';
import { METADATA_TABLE } from './metadataRepo';

/**
 * Badge Repository
 * 
 * Manages badges using the metadata table with group_key='badge'
 */
export class BadgeRepo {
  /**
   * List badges
   */
  async listBadges(params: {
    query?: string;
    include_archived?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: Badge[]; next_cursor?: string }> {
    const limit = Math.min(params.limit || 50, 200);

    const command = new QueryCommand({
      TableName: METADATA_TABLE,
      IndexName: 'GroupKeyIndex',
      KeyConditionExpression: '#group_key = :group_key',
      ExpressionAttributeNames: {
        '#group_key': 'group_key',
      },
      ExpressionAttributeValues: {
        ':group_key': 'badge',
      },
      ScanIndexForward: true,
      Limit: limit * 2,
      ...(params.cursor && {
        ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
      }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    let badges = (Items as any[])
      .filter((item) => !item.deleted_at) // Exclude soft-deleted badges
      .map(this.metadataOptionToBadge);

    // Filter archived unless explicitly requested
    if (!params.include_archived) {
      badges = badges.filter((b) => !b.archived_at && b.status !== 'archived');
    }

    // Apply query filter
    if (params.query) {
      const lowerQuery = params.query.toLowerCase();
      badges = badges.filter(
        (b) =>
          b.name.toLowerCase().includes(lowerQuery) ||
          b.description?.toLowerCase().includes(lowerQuery)
      );
    }

    badges = badges.slice(0, limit);

    return {
      items: badges,
      ...(LastEvaluatedKey && { next_cursor: Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64') }),
    };
  }

  /**
   * Get badge by ID
   */
  async getBadge(badgeId: string): Promise<Badge | null> {
    const command = new GetCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: badgeId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item || Item.deleted_at) return null;
    
    // Verify it's a badge (group_key should be 'badge')
    if (Item.group_key !== 'badge') {
      return null;
    }

    return this.metadataOptionToBadge(Item);
  }

  /**
   * Create badge
   */
  async createBadge(data: CreateBadge, userId: string): Promise<Badge> {
    const now = new Date().toISOString();
    const badgeId = `badge_${uuidv4()}`;
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Store badge-specific fields in a JSON string in short_description
    // Format: JSON string with badge data including description
    const badgeDataJson = JSON.stringify({
      description: data.description,
      icon_type: data.icon_type || 'mui',
      icon_key: data.icon_key || null,
      icon_color: data.icon_color || null,
      icon_url: data.icon_url, // Legacy, deprecated
      color: data.color,
      awarding_rules: data.awarding_rules,
      expiration_policy: data.expiration_policy,
    });

    const sortOrder = 0;
    const sortKey = `${String(sortOrder).padStart(10, '0')}#${data.name}`;

    const metadataOption = {
      option_id: badgeId,
      group_key: 'badge',
      label: data.name,
      slug,
      sort_order: sortOrder,
      sort_order_label: sortKey,
      status: 'active',
      short_description: badgeDataJson,
      color: data.color, // Also store color directly for backward compatibility
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
    };

    const command = new PutCommand({
      TableName: METADATA_TABLE,
      Item: metadataOption,
    });

    await dynamoDocClient.send(command);

    // Return badge object
    return {
      badge_id: badgeId,
      name: data.name,
      description: data.description,
      icon_type: (data.icon_type || 'mui') as 'mui',
      icon_key: data.icon_key || null,
      icon_color: data.icon_color || null,
      icon_url: data.icon_url, // Legacy, deprecated
      color: data.color,
      awarding_rules: data.awarding_rules,
      expiration_policy: data.expiration_policy,
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
    };
  }

  /**
   * Update badge
   */
  async updateBadge(
    badgeId: string,
    data: UpdateBadge,
    userId: string
  ): Promise<Badge> {
    const existing = await this.getBadge(badgeId);
    if (!existing) {
      throw new Error('Badge not found');
    }

    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Update name (label)
    if (data.name !== undefined) {
      updateExpressions.push('#label = :name');
      expressionAttributeNames['#label'] = 'label';
      expressionAttributeValues[':name'] = data.name;
      
      // Update slug
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      updateExpressions.push('slug = :slug');
      expressionAttributeValues[':slug'] = slug;
      
      // Update sort_order_label
      const sortOrder = existing.sort_order || 0;
      const sortKey = `${String(sortOrder).padStart(10, '0')}#${data.name}`;
      updateExpressions.push('sort_order_label = :sort_key');
      expressionAttributeValues[':sort_key'] = sortKey;
    }

    // Update badge-specific data in short_description JSON
    let badgeDataNeedsUpdate = false;
    const badgeData: any = {};

    // Parse existing badge data from short_description
    let existingBadgeData = {};
    try {
      const getCommand = new GetCommand({
        TableName: METADATA_TABLE,
        Key: {
          option_id: badgeId,
        },
      });
      const { Item: existingMetadata } = await dynamoDocClient.send(getCommand);
      if (existingMetadata?.short_description) {
        existingBadgeData = JSON.parse(existingMetadata.short_description);
      }
    } catch (e) {
      // Ignore parse errors
    }

    if (data.description !== undefined) {
      badgeData.description = data.description === null ? undefined : data.description;
      badgeDataNeedsUpdate = true;
    }
    if (data.icon_type !== undefined) {
      badgeData.icon_type = data.icon_type || 'mui';
      badgeDataNeedsUpdate = true;
    }
    if (data.icon_key !== undefined) {
      badgeData.icon_key = data.icon_key === null ? null : data.icon_key;
      badgeDataNeedsUpdate = true;
    }
    if (data.icon_color !== undefined) {
      badgeData.icon_color = data.icon_color === null ? null : data.icon_color;
      badgeDataNeedsUpdate = true;
    }
    if (data.icon_url !== undefined) {
      badgeData.icon_url = data.icon_url === null ? undefined : data.icon_url;
      badgeDataNeedsUpdate = true;
    }
    if (data.color !== undefined) {
      badgeData.color = data.color === null ? undefined : data.color;
      badgeDataNeedsUpdate = true;
    }
    if (data.awarding_rules !== undefined) {
      badgeData.awarding_rules = data.awarding_rules === null ? undefined : data.awarding_rules;
      badgeDataNeedsUpdate = true;
    }
    if (data.expiration_policy !== undefined) {
      badgeData.expiration_policy = data.expiration_policy === null ? undefined : data.expiration_policy;
      badgeDataNeedsUpdate = true;
    }

    if (badgeDataNeedsUpdate) {
      const mergedBadgeData = { ...existingBadgeData, ...badgeData };
      // Remove undefined values
      Object.keys(mergedBadgeData).forEach(key => {
        if (mergedBadgeData[key] === undefined) {
          delete mergedBadgeData[key];
        }
      });
      updateExpressions.push('short_description = :badge_data');
      expressionAttributeValues[':badge_data'] = JSON.stringify(mergedBadgeData);
    }

    // Update archived_at
    if (data.archived_at !== undefined) {
      if (data.archived_at === null) {
        updateExpressions.push('archived_at = :archived_at');
        expressionAttributeValues[':archived_at'] = null;
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = 'active';
      } else {
        updateExpressions.push('archived_at = :archived_at');
        expressionAttributeValues[':archived_at'] = data.archived_at;
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = 'archived';
      }
    }

    // Always update timestamps
    updateExpressions.push('updated_at = :updated_at');
    updateExpressions.push('updated_by = :updated_by');
    expressionAttributeValues[':updated_at'] = now;
    expressionAttributeValues[':updated_by'] = userId;

    if (updateExpressions.length === 0) {
      return existing;
    }

    const command = new UpdateCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: badgeId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoDocClient.send(command);

    // Return updated badge
    return this.getBadge(badgeId) as Promise<Badge>;
  }

  /**
   * Delete badge (soft delete)
   */
  async deleteBadge(badgeId: string, userId: string): Promise<void> {
    const existing = await this.getBadge(badgeId);
    if (!existing) {
      throw new Error(`Badge ${badgeId} not found`);
    }

    const now = new Date().toISOString();
    const command = new UpdateCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: badgeId,
      },
      UpdateExpression: 'SET #deleted_at = :deleted_at, #updated_at = :updated_at, #updated_by = :updated_by',
      ExpressionAttributeNames: {
        '#deleted_at': 'deleted_at',
        '#updated_at': 'updated_at',
        '#updated_by': 'updated_by',
      },
      ExpressionAttributeValues: {
        ':deleted_at': now,
        ':updated_at': now,
        ':updated_by': userId,
      },
    });

    await dynamoDocClient.send(command);
  }

  /**
   * Convert metadata option to badge
   */
  private metadataOptionToBadge(item: any): Badge {
    let badgeData: any = {};
    try {
      if (item.short_description && typeof item.short_description === 'string' && item.short_description.startsWith('{')) {
        badgeData = JSON.parse(item.short_description);
      }
    } catch (e) {
      // Ignore parse errors
    }

    return {
      badge_id: item.option_id,
      name: item.label,
      description: badgeData.description || (typeof item.short_description === 'string' && !item.short_description.startsWith('{') ? item.short_description : undefined),
      icon_type: badgeData.icon_type || 'mui',
      icon_key: badgeData.icon_key !== undefined ? badgeData.icon_key : null,
      icon_color: badgeData.icon_color !== undefined ? badgeData.icon_color : null,
      icon_url: badgeData.icon_url, // Legacy, deprecated
      color: badgeData.color || item.color,
      awarding_rules: badgeData.awarding_rules,
      expiration_policy: badgeData.expiration_policy,
      archived_at: item.archived_at || (item.status === 'archived' ? item.updated_at : undefined),
      created_at: item.created_at,
      created_by: item.created_by,
      updated_at: item.updated_at,
      updated_by: item.updated_by,
    } as Badge;
  }
}

export const badgeRepo = new BadgeRepo();

