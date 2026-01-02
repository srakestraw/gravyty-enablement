/**
 * Metadata Data Access Layer
 * 
 * Repository for accessing metadata DynamoDB table.
 * Implements data access methods for metadata options.
 */

import {
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type {
  MetadataOption,
  MetadataGroupKey,
  CreateMetadataOption,
  UpdateMetadataOption,
  MetadataOptionUsageResponse,
} from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';
import { LMS_COURSES_TABLE } from './lmsRepo';
import type { Course } from '@gravyty/domain';
import type { ContentItem } from '@gravyty/domain';

/**
 * Metadata Table Name (from environment variable)
 */
export const METADATA_TABLE = process.env.METADATA_TABLE || 'metadata';

/**
 * Content Registry Table Name (from environment variable)
 */
const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';

/**
 * Metadata Repository
 */
export class MetadataRepo {
  /**
   * List metadata options for a group
   * 
   * Supports query filtering and returns results sorted by sort_order then label.
   * Archived options are excluded unless explicitly requested.
   */
  async listOptions(params: {
    group_key: MetadataGroupKey;
    query?: string;
    include_archived?: boolean;
    parent_id?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: MetadataOption[]; next_cursor?: string }> {
    const limit = Math.min(params.limit || 50, 200); // Pagination guard

    // Use GroupKeyIndex GSI (PK=group_key, SK=sort_order_label)
    // Sort key format: zero-padded sort_order + label for proper sorting
    const command = new QueryCommand({
      TableName: METADATA_TABLE,
      IndexName: 'GroupKeyIndex',
      KeyConditionExpression: '#group_key = :group_key',
      ExpressionAttributeNames: {
        '#group_key': 'group_key',
      },
      ExpressionAttributeValues: {
        ':group_key': params.group_key,
      },
      ScanIndexForward: true, // Ascending order
      Limit: limit * 2, // Fetch more to account for filtering
      ...(params.cursor && {
        ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
      }),
    });

    const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
    let options = (Items as MetadataOption[]);

    // Filter by parent_id if provided
    // For hierarchical metadata (e.g., product filtered by product_suite), show options that:
    // 1. Match the parent_id exactly, OR
    // 2. Have no parent_id set (null/undefined) - for backward compatibility with existing data
    // Note: If no products match the parent_id AND no products have null/undefined parent_id,
    // we show all products to allow selection until data is properly configured
    if (params.parent_id !== undefined && params.parent_id !== null) {
      // Separate products into: matching parent_id, no parent_id, and others
      const matchingParentId = options.filter((opt) => opt.parent_id === params.parent_id);
      const noParentId = options.filter((opt) => opt.parent_id === null || opt.parent_id === undefined);
      const matchingOptions = [...matchingParentId, ...noParentId];
      
      // Always include products with no parent_id (backward compatibility)
      // If we have products matching the parent_id OR products with no parent_id, use them
      // Otherwise, if there are NO products with null/undefined parent_id AND no products match,
      // show all products (for backward compatibility during migration)
      if (matchingOptions.length > 0) {
        options = matchingOptions;
      } else {
        // No products match AND no products have null/undefined parent_id
        // This means all products have parent_id set but none match the selected Product Suite
        // Show all products to allow selection (data migration scenario)
        console.log(`[MetadataRepo] No products match parent_id ${params.parent_id} and no products have null parent_id. Showing all ${options.length} products for backward compatibility.`);
        // options already contains all products, so no change needed
      }
    }

    // Filter out soft-deleted items (deleted_at is set)
    options = options.filter((opt) => !opt.deleted_at);

    // Filter archived unless explicitly included
    if (!params.include_archived) {
      options = options.filter((opt) => !opt.archived_at);
    }

    // Apply query filter (case-insensitive search on label)
    if (params.query) {
      const lowerQuery = params.query.toLowerCase();
      options = options.filter((opt) =>
        opt.label.toLowerCase().includes(lowerQuery) ||
        opt.slug.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort by sort_order then label (already sorted by GSI, but re-sort after filtering)
    options.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.label.localeCompare(b.label);
    });

    // Limit results
    const limitedOptions = options.slice(0, limit);

    // Cursor: Only return cursor if we have more results AND we hit the limit
    const hasMoreResults = options.length > limit || (LastEvaluatedKey && limitedOptions.length === limit);
    const nextCursor = hasMoreResults && LastEvaluatedKey
      ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      items: limitedOptions,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  /**
   * Get metadata option by ID
   */
  async getOptionById(optionId: string): Promise<MetadataOption | null> {
    const command = new GetCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: optionId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    return (Item as MetadataOption) || null;
  }

  /**
   * Create a new metadata option
   */
  async createOption(
    data: CreateMetadataOption,
    userId: string
  ): Promise<MetadataOption> {
    const now = new Date().toISOString();
    const optionId = uuidv4();

    // Generate slug from label if not provided
    const slug = data.slug || this.generateSlug(data.label);

    // Validate parent_id if provided (must exist and match group)
    if (data.parent_id) {
      const parent = await this.getOptionById(data.parent_id);
      if (!parent) {
        throw new Error(`Parent option ${data.parent_id} not found`);
      }
      // Product is a child of Product Suite (product_suite is the parent)
      if (data.group_key === 'product' && parent.group_key !== 'product_suite') {
        throw new Error('Product parent must be a product suite');
      }
    }

    const sortOrder = data.sort_order ?? 0;
    // Create sort key: zero-padded sort_order (10 digits) + label for proper sorting
    const sortKey = `${String(sortOrder).padStart(10, '0')}#${data.label}`;

    const option: MetadataOption & { sort_order_label?: string } = {
      option_id: optionId,
      group_key: data.group_key,
      label: data.label,
      slug,
      sort_order: sortOrder,
      parent_id: data.parent_id,
      color: data.color,
      short_description: data.short_description,
      status: 'active',
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
      sort_order_label: sortKey, // For GSI sort key
    };

    const command = new PutCommand({
      TableName: METADATA_TABLE,
      Item: option,
    });

    await dynamoDocClient.send(command);
    return option;
  }

  /**
   * Update a metadata option
   */
  async updateOption(
    optionId: string,
    updates: UpdateMetadataOption,
    userId: string
  ): Promise<MetadataOption> {
    const existing = await this.getOptionById(optionId);
    if (!existing) {
      throw new Error(`Metadata option ${optionId} not found`);
    }

    const now = new Date().toISOString();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.label !== undefined) {
      updateExpressions.push('#label = :label');
      expressionAttributeNames['#label'] = 'label';
      expressionAttributeValues[':label'] = updates.label;
      // Update sort key when label changes
      const sortOrder = updates.sort_order !== undefined ? updates.sort_order : existing.sort_order;
      const sortKey = `${String(sortOrder).padStart(10, '0')}#${updates.label}`;
      updateExpressions.push('#sort_order_label = :sort_order_label');
      expressionAttributeNames['#sort_order_label'] = 'sort_order_label';
      expressionAttributeValues[':sort_order_label'] = sortKey;
    }

    if (updates.slug !== undefined) {
      updateExpressions.push('#slug = :slug');
      expressionAttributeNames['#slug'] = 'slug';
      expressionAttributeValues[':slug'] = updates.slug;
    }

    if (updates.sort_order !== undefined) {
      updateExpressions.push('#sort_order = :sort_order');
      expressionAttributeNames['#sort_order'] = 'sort_order';
      expressionAttributeValues[':sort_order'] = updates.sort_order;
      // Update sort key if sort_order changed
      const label = existing.label;
      const sortKey = `${String(updates.sort_order).padStart(10, '0')}#${label}`;
      updateExpressions.push('#sort_order_label = :sort_order_label');
      expressionAttributeNames['#sort_order_label'] = 'sort_order_label';
      expressionAttributeValues[':sort_order_label'] = sortKey;
    }

    if (updates.archived_at !== undefined) {
      updateExpressions.push('#archived_at = :archived_at');
      expressionAttributeNames['#archived_at'] = 'archived_at';
      expressionAttributeValues[':archived_at'] = updates.archived_at || null;
      // Also update status based on archived_at
      if (updates.archived_at) {
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = 'archived';
      } else {
        updateExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = 'active';
      }
    }

    if (updates.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = updates.status;
      // Sync archived_at with status for backward compatibility
      if (updates.status === 'archived' && !existing.archived_at) {
        updateExpressions.push('#archived_at = :archived_at');
        expressionAttributeNames['#archived_at'] = 'archived_at';
        expressionAttributeValues[':archived_at'] = now;
      } else if (updates.status === 'active' && existing.archived_at) {
        updateExpressions.push('#archived_at = :archived_at');
        expressionAttributeNames['#archived_at'] = 'archived_at';
        expressionAttributeValues[':archived_at'] = null;
      }
    }

    if (updates.deleted_at !== undefined) {
      updateExpressions.push('#deleted_at = :deleted_at');
      expressionAttributeNames['#deleted_at'] = 'deleted_at';
      expressionAttributeValues[':deleted_at'] = updates.deleted_at || null;
    }

    if (updates.color !== undefined) {
      updateExpressions.push('#color = :color');
      expressionAttributeNames['#color'] = 'color';
      expressionAttributeValues[':color'] = updates.color || null;
    }

    if (updates.short_description !== undefined) {
      updateExpressions.push('#short_description = :short_description');
      expressionAttributeNames['#short_description'] = 'short_description';
      expressionAttributeValues[':short_description'] = updates.short_description || null;
    }

    // Always update updated_at and updated_by
    updateExpressions.push('#updated_at = :updated_at');
    updateExpressions.push('#updated_by = :updated_by');
    expressionAttributeNames['#updated_at'] = 'updated_at';
    expressionAttributeNames['#updated_by'] = 'updated_by';
    expressionAttributeValues[':updated_at'] = now;
    expressionAttributeValues[':updated_by'] = userId;

    const command = new UpdateCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: optionId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const { Attributes } = await dynamoDocClient.send(command);
    return Attributes as MetadataOption;
  }

  /**
   * Get usage count for a metadata option
   * 
   * Checks how many Courses and Resources reference this option
   */
  async getUsageCount(optionId: string, groupKey: MetadataGroupKey): Promise<MetadataOptionUsageResponse> {
    let courseCount = 0;
    let resourceCount = 0;
    const sampleCourseIds: string[] = [];
    const sampleResourceIds: string[] = [];

    // Build filter expression for courses
    const courseFilter = this.buildUsageFilterExpression(groupKey, optionId, 'course');
    
    // Check Courses table
    let courseLastKey;
    do {
      const courseCommand = new ScanCommand({
        TableName: LMS_COURSES_TABLE,
        ...(courseFilter.filterExpression && {
          FilterExpression: courseFilter.filterExpression,
          ExpressionAttributeNames: courseFilter.attributeNames,
          ExpressionAttributeValues: courseFilter.attributeValues,
        }),
        ...(courseLastKey && { ExclusiveStartKey: courseLastKey }),
      });

      const courseResult = await dynamoDocClient.send(courseCommand);
      let courses = (courseResult.Items || []) as Course[];
      
      // For badge group, also check legacy badges array (can't filter in DynamoDB for nested arrays)
      if (groupKey === 'badge') {
        courses = courses.filter((c) => {
          // Check new badge_ids first
          if (c.badge_ids && c.badge_ids.includes(optionId)) {
            return true;
          }
          // Fallback to legacy badges
          return c.badges?.some((badge) => badge.badge_id === optionId);
        });
      } else if (groupKey === 'audience') {
        // Filter courses that have this audience_id in their audience_ids array
        courses = courses.filter((c) => {
          return c.audience_ids && c.audience_ids.includes(optionId);
        });
      }
      
      courseCount += courses.length;

      // Collect sample course IDs
      courses.forEach((course) => {
        if (sampleCourseIds.length < 10) {
          sampleCourseIds.push(course.course_id);
        }
      });

      courseLastKey = courseResult.LastEvaluatedKey;
    } while (courseLastKey);

    // Skip resource scanning for badges - badges only apply to courses, learning paths, and role playing
    // Not to content items/resources
    if (groupKey !== 'badge') {
      // Build filter expression for resources
      const resourceFilter = this.buildUsageFilterExpression(groupKey, optionId, 'resource');

      // Check Resources/Content table
      let resourceLastKey;
      do {
        const resourceCommand = new ScanCommand({
          TableName: CONTENT_TABLE,
          ...(resourceFilter.filterExpression && {
            FilterExpression: resourceFilter.filterExpression,
            ExpressionAttributeNames: resourceFilter.attributeNames,
            ExpressionAttributeValues: resourceFilter.attributeValues,
          }),
          ...(resourceLastKey && { ExclusiveStartKey: resourceLastKey }),
        });

        const resourceResult = await dynamoDocClient.send(resourceCommand);
        const resources = (resourceResult.Items || []) as ContentItem[];

        resourceCount += resources.length;

        // Collect sample resource IDs
        resources.forEach((resource) => {
          if (sampleResourceIds.length < 10) {
            sampleResourceIds.push(resource.content_id);
          }
        });

        resourceLastKey = resourceResult.LastEvaluatedKey;
      } while (resourceLastKey);
    }

    return {
      used_by_courses: courseCount,
      used_by_resources: resourceCount,
      ...(sampleCourseIds.length > 0 && { sample_course_ids: sampleCourseIds }),
      ...(sampleResourceIds.length > 0 && { sample_resource_ids: sampleResourceIds }),
    };
  }

  /**
   * Build filter expression for checking metadata option usage
   */
  private buildUsageFilterExpression(
    groupKey: MetadataGroupKey,
    optionId: string,
    type: 'course' | 'resource' = 'course'
  ): {
    filterExpression?: string;
    attributeNames: Record<string, string>;
    attributeValues: Record<string, any>;
  } {
    const attributeNames: Record<string, string> = {};
    const attributeValues: Record<string, any> = { ':optionId': optionId };

    if (groupKey === 'product') {
      attributeNames['#product_id'] = 'product_id';
      attributeNames['#legacy_product_suite_id'] = 'legacy_product_suite_id';
      return {
        filterExpression: '#product_id = :optionId OR #legacy_product_suite_id = :optionId',
        attributeNames,
        attributeValues,
      };
    } else if (groupKey === 'product_suite') {
      attributeNames['#product_suite_id'] = 'product_suite_id';
      attributeNames['#legacy_product_concept_id'] = 'legacy_product_concept_id';
      return {
        filterExpression: '#product_suite_id = :optionId OR #legacy_product_concept_id = :optionId',
        attributeNames,
        attributeValues,
      };
    } else if (groupKey === 'topic_tag') {
      attributeNames['#topic_tag_ids'] = 'topic_tag_ids';
      return {
        filterExpression: 'contains(#topic_tag_ids, :optionId)',
        attributeNames,
        attributeValues,
      };
    } else if (groupKey === 'badge') {
      // For badges, we'll filter in memory after scanning (DynamoDB can't easily filter nested arrays)
      // Return empty filter to scan all, then filter in memory
      return { attributeNames, attributeValues };
    } else if (groupKey === 'audience') {
      attributeNames['#audience_ids'] = 'audience_ids';
      return {
        filterExpression: 'contains(#audience_ids, :optionId)',
        attributeNames,
        attributeValues,
      };
    }
    
    return { attributeNames, attributeValues };
  }

  /**
   * Delete a metadata option (soft delete by setting deleted_at)
   */
  async deleteOption(optionId: string, userId: string): Promise<void> {
    const existing = await this.getOptionById(optionId);
    if (!existing) {
      throw new Error(`Metadata option ${optionId} not found`);
    }

    const now = new Date().toISOString();
    const command = new UpdateCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: optionId,
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
   * Hard delete a metadata option (permanent removal)
   * Only use when usage count is 0
   */
  async hardDeleteOption(optionId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: METADATA_TABLE,
      Key: {
        option_id: optionId,
      },
    });

    await dynamoDocClient.send(command);
  }

  /**
   * Generate URL-friendly slug from label
   */
  private generateSlug(label: string): string {
    return label
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }
}

// Export singleton instance
export const metadataRepo = new MetadataRepo();

