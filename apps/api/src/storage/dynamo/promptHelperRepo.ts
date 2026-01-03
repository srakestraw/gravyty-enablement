/**
 * Prompt Helper DynamoDB Repository
 * 
 * DynamoDB implementation for prompt helpers with versioning and audit logging
 */

import {
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../../aws/dynamoClient';
import type {
  PromptHelper,
  PromptHelperVersion,
  PromptHelperAuditLog,
  CreatePromptHelper,
  UpdatePromptHelper,
  PromptHelperStatus,
  PromptHelperAppliesTo,
  PromptHelperContext,
} from '@gravyty/domain';
import { v4 as uuidv4 } from 'uuid';

/**
 * Table Names
 */
export const PROMPT_HELPERS_TABLE = process.env.PROMPT_HELPERS_TABLE || 'prompt_helpers';
export const PROMPT_HELPER_VERSIONS_TABLE = process.env.PROMPT_HELPER_VERSIONS_TABLE || 'prompt_helper_versions';
export const PROMPT_HELPER_AUDIT_LOG_TABLE = process.env.PROMPT_HELPER_AUDIT_LOG_TABLE || 'prompt_helper_audit_log';

/**
 * Prompt Helper Repository Interface
 */
export interface PromptHelperRepository {
  create(helper: CreatePromptHelper, userId: string): Promise<PromptHelper>;
  get(helperId: string): Promise<PromptHelper | null>;
  list(params: {
    status?: PromptHelperStatus;
    applies_to?: PromptHelperAppliesTo;
    provider_support?: 'openai' | 'gemini' | 'both';
    limit?: number;
    cursor?: string;
  }): Promise<{ items: PromptHelper[]; next_cursor?: string }>;
  update(helperId: string, updates: UpdatePromptHelper, userId: string): Promise<PromptHelper>;
  archive(helperId: string, userId: string): Promise<void>;
  delete(helperId: string, userId: string): Promise<void>;
  publish(helperId: string, userId: string): Promise<PromptHelperVersion>;
  getVersion(helperId: string, versionNumber: number): Promise<PromptHelperVersion | null>;
  listVersions(helperId: string): Promise<PromptHelperVersion[]>;
  setDefault(helperId: string, contexts: PromptHelperContext[], userId: string): Promise<void>;
  getDefault(context: PromptHelperContext): Promise<PromptHelper | null>;
  logAction(action: {
    helper_id: string;
    action: PromptHelperAuditLog['action'];
    actor_id: string;
    diff_summary?: any;
  }): Promise<void>;
  getAuditLog(helperId: string, limit?: number): Promise<PromptHelperAuditLog[]>;
}

/**
 * DynamoDB Prompt Helper Repository
 */
export class DynamoPromptHelperRepo implements PromptHelperRepository {
  async create(data: CreatePromptHelper, userId: string): Promise<PromptHelper> {
    const now = new Date().toISOString();
    const helperId = uuidv4();

    const helper: PromptHelper = {
      helper_id: helperId,
      name: data.name,
      description: data.description,
      applies_to: data.applies_to,
      composition_mode: data.composition_mode,
      prefix_text: data.prefix_text,
      template_text: data.template_text,
      suffix_text: data.suffix_text,
      negative_text: data.negative_text,
      rte_action_instructions: data.rte_action_instructions,
      provider_overrides: data.provider_overrides,
      allowed_variables: data.allowed_variables || [],
      status: data.status || 'draft',
      is_default_for: data.is_default_for || [],
      is_system: data.is_system || false,
      created_at: now,
      created_by: userId,
      updated_at: now,
      updated_by: userId,
    };

    const command = new PutCommand({
      TableName: PROMPT_HELPERS_TABLE,
      Item: {
        ...helper,
        // GSI attributes
        'status#updated_at': `${helper.status}#${helper.updated_at}`,
      },
    });

    await dynamoDocClient.send(command);

    // Log creation
    await this.logAction({
      helper_id: helperId,
      action: 'create',
      actor_id: userId,
    });

    return helper;
  }

  async get(helperId: string): Promise<PromptHelper | null> {
    const command = new GetCommand({
      TableName: PROMPT_HELPERS_TABLE,
      Key: {
        helper_id: helperId,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    if (!Item) return null;

    // Filter out deleted items
    if ((Item as any).deleted_at) {
      return null;
    }

    // Remove GSI attributes and deleted fields
    const { 'status#updated_at': _, deleted_at, deleted_by, ...helper } = Item as any;
    return helper as PromptHelper;
  }

  async list(params: {
    status?: PromptHelperStatus;
    applies_to?: PromptHelperAppliesTo;
    provider_support?: 'openai' | 'gemini' | 'both';
    limit?: number;
    cursor?: string;
  }): Promise<{ items: PromptHelper[]; next_cursor?: string }> {
    const limit = Math.min(params.limit || 50, 200);

    let items: PromptHelper[] = [];

    if (params.status) {
      // Query by status using GSI
      const command = new QueryCommand({
        TableName: PROMPT_HELPERS_TABLE,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': params.status,
        },
        ScanIndexForward: false, // Descending by updated_at
        Limit: limit * 2, // Fetch more for filtering
        ...(params.cursor && {
          ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
        }),
      });

      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      items = (Items as any[])
        .filter(item => !item.deleted_at) // Filter out deleted items
        .map(item => {
          const { 'status#updated_at': _, deleted_at, deleted_by, ...helper } = item;
          return helper;
        }) as PromptHelper[];
    } else {
      // Scan all (with limit)
      const command = new ScanCommand({
        TableName: PROMPT_HELPERS_TABLE,
        Limit: limit * 2,
        ...(params.cursor && {
          ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()),
        }),
      });

      const { Items = [], LastEvaluatedKey } = await dynamoDocClient.send(command);
      items = (Items as any[])
        .filter(item => !item.deleted_at) // Filter out deleted items
        .map(item => {
          const { 'status#updated_at': _, deleted_at, deleted_by, ...helper } = item;
          return helper;
        }) as PromptHelper[];
    }

    // Filter by applies_to
    if (params.applies_to) {
      items = items.filter(h => h.applies_to.includes(params.applies_to!));
    }

    // Filter by provider support
    if (params.provider_support) {
      items = items.filter(h => {
        const hasOpenAI = !h.provider_overrides || h.provider_overrides.openai !== undefined || !h.provider_overrides.gemini;
        const hasGemini = !h.provider_overrides || h.provider_overrides.gemini !== undefined || !h.provider_overrides.openai;
        
        if (params.provider_support === 'both') {
          return hasOpenAI && hasGemini;
        } else if (params.provider_support === 'openai') {
          return hasOpenAI;
        } else if (params.provider_support === 'gemini') {
          return hasGemini;
        }
        return true;
      });
    }

    // Sort by updated_at descending
    items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

    // Limit results
    const limitedItems = items.slice(0, limit);

    // Generate cursor
    const nextCursor = limitedItems.length === limit && items.length > limit
      ? Buffer.from(JSON.stringify({ helper_id: limitedItems[limit - 1].helper_id })).toString('base64')
      : undefined;

    return {
      items: limitedItems,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  async update(helperId: string, updates: UpdatePromptHelper, userId: string): Promise<PromptHelper> {
    const existing = await this.get(helperId);
    if (!existing) {
      throw new Error(`Prompt helper ${helperId} not found`);
    }

    if (existing.status !== 'draft') {
      throw new Error(`Cannot update prompt helper ${helperId}: only draft helpers can be updated`);
    }

    const now = new Date().toISOString();

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const nameKey = `#${key}`;
        const valueKey = `:${key}`;
        updateExpressions.push(`${nameKey} = ${valueKey}`);
        expressionAttributeNames[nameKey] = key;
        expressionAttributeValues[valueKey] = value;
      }
    });

    // Always update updated_at and updated_by
    updateExpressions.push('#updated_at = :updated_at');
    updateExpressions.push('#updated_by = :updated_by');
    expressionAttributeNames['#updated_at'] = 'updated_at';
    expressionAttributeNames['#updated_by'] = 'updated_by';
    expressionAttributeValues[':updated_at'] = now;
    expressionAttributeValues[':updated_by'] = userId;

    // Update GSI attribute if status changed
    if (updates.status) {
      updateExpressions.push('#status_updated_at = :status_updated_at');
      expressionAttributeNames['#status_updated_at'] = 'status#updated_at';
      expressionAttributeValues[':status_updated_at'] = `${updates.status}#${now}`;
    } else {
      // Update GSI attribute with existing status
      updateExpressions.push('#status_updated_at = :status_updated_at');
      expressionAttributeNames['#status_updated_at'] = 'status#updated_at';
      expressionAttributeValues[':status_updated_at'] = `${existing.status}#${now}`;
    }

    const command = new UpdateCommand({
      TableName: PROMPT_HELPERS_TABLE,
      Key: {
        helper_id: helperId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoDocClient.send(command);

    // Log update
    await this.logAction({
      helper_id: helperId,
      action: 'update',
      actor_id: userId,
      diff_summary: updates,
    });

    const updated = await this.get(helperId);
    if (!updated) {
      throw new Error('Failed to retrieve updated helper');
    }
    return updated;
  }

  async archive(helperId: string, userId: string): Promise<void> {
    const existing = await this.get(helperId);
    if (!existing) {
      throw new Error(`Prompt helper ${helperId} not found`);
    }

    // Clear defaults if set
    if (existing.is_default_for.length > 0) {
      await this.update(helperId, { is_default_for: [] }, userId);
    }

    await this.update(helperId, { status: 'archived' }, userId);

    // Log archive
    await this.logAction({
      helper_id: helperId,
      action: 'archive',
      actor_id: userId,
    });
  }

  async delete(helperId: string, userId: string): Promise<void> {
    const existing = await this.get(helperId);
    if (!existing) {
      throw new Error(`Prompt helper ${helperId} not found`);
    }

    const now = new Date().toISOString();

    // Soft delete: set deleted_at and deleted_by
    const command = new UpdateCommand({
      TableName: PROMPT_HELPERS_TABLE,
      Key: {
        helper_id: helperId,
      },
      UpdateExpression: 'SET #deleted_at = :deleted_at, #deleted_by = :deleted_by, #updated_at = :updated_at, #updated_by = :updated_by',
      ExpressionAttributeNames: {
        '#deleted_at': 'deleted_at',
        '#deleted_by': 'deleted_by',
        '#updated_at': 'updated_at',
        '#updated_by': 'updated_by',
      },
      ExpressionAttributeValues: {
        ':deleted_at': now,
        ':deleted_by': userId,
        ':updated_at': now,
        ':updated_by': userId,
      },
    });

    await dynamoDocClient.send(command);

    // Log delete action
    await this.logAction({
      helper_id: helperId,
      action: 'delete',
      actor_id: userId,
    });
  }

  async publish(helperId: string, userId: string): Promise<PromptHelperVersion> {
    const helper = await this.get(helperId);
    if (!helper) {
      throw new Error(`Prompt helper ${helperId} not found`);
    }

    // Get latest version number
    const versions = await this.listVersions(helperId);
    const nextVersion = versions.length > 0
      ? Math.max(...versions.map(v => v.version_number)) + 1
      : 1;

    // Create version snapshot
    const now = new Date().toISOString();
    const version: PromptHelperVersion = {
      helper_id: helperId,
      version_number: nextVersion,
      snapshot_json: JSON.stringify(helper),
      published_at: now,
      published_by: userId,
    };

    const command = new PutCommand({
      TableName: PROMPT_HELPER_VERSIONS_TABLE,
      Item: version,
    });

    await dynamoDocClient.send(command);

    // Update helper status to published
    await this.update(helperId, { status: 'published' }, userId);

    // Log publish
    await this.logAction({
      helper_id: helperId,
      action: 'publish',
      actor_id: userId,
      diff_summary: { version_number: nextVersion },
    });

    return version;
  }

  async getVersion(helperId: string, versionNumber: number): Promise<PromptHelperVersion | null> {
    const command = new GetCommand({
      TableName: PROMPT_HELPER_VERSIONS_TABLE,
      Key: {
        helper_id: helperId,
        version_number: versionNumber,
      },
    });

    const { Item } = await dynamoDocClient.send(command);
    return (Item as PromptHelperVersion) || null;
  }

  async listVersions(helperId: string): Promise<PromptHelperVersion[]> {
    const command = new QueryCommand({
      TableName: PROMPT_HELPER_VERSIONS_TABLE,
      KeyConditionExpression: 'helper_id = :helper_id',
      ExpressionAttributeValues: {
        ':helper_id': helperId,
      },
      ScanIndexForward: false, // Descending order (newest first)
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return Items as PromptHelperVersion[];
  }

  async setDefault(helperId: string, contexts: PromptHelperContext[], userId: string): Promise<void> {
    const helper = await this.get(helperId);
    if (!helper) {
      throw new Error(`Prompt helper ${helperId} not found`);
    }

    if (helper.status !== 'published') {
      throw new Error('Only published helpers can be set as default');
    }

    // Clear defaults for other helpers in these contexts
    const allHelpers = await this.list({ status: 'published' });
    for (const otherHelper of allHelpers.items) {
      if (otherHelper.helper_id !== helperId) {
        const remainingDefaults = otherHelper.is_default_for.filter(
          ctx => !contexts.includes(ctx)
        );
        if (remainingDefaults.length !== otherHelper.is_default_for.length) {
          await this.update(otherHelper.helper_id, { is_default_for: remainingDefaults }, userId);
        }
      }
    }

    // Set defaults for this helper
    const currentDefaults = helper.is_default_for || [];
    const newDefaults = [...new Set([...currentDefaults, ...contexts])];
    await this.update(helperId, { is_default_for: newDefaults }, userId);

    // Log set default
    for (const context of contexts) {
      await this.logAction({
        helper_id: helperId,
        action: 'set_default',
        actor_id: userId,
        diff_summary: { context },
      });
    }
  }

  async getDefault(context: PromptHelperContext): Promise<PromptHelper | null> {
    const helpers = await this.list({ status: 'published' });
    const defaultHelper = helpers.items.find(h => h.is_default_for.includes(context));
    return defaultHelper || null;
  }

  async logAction(action: {
    helper_id: string;
    action: PromptHelperAuditLog['action'];
    actor_id: string;
    diff_summary?: any;
  }): Promise<void> {
    const now = new Date().toISOString();
    const actionId = uuidv4();

    const logEntry: PromptHelperAuditLog = {
      helper_id: action.helper_id,
      timestamp: now,
      action_id: actionId,
      action: action.action,
      actor_id: action.actor_id,
      diff_summary_json: action.diff_summary ? JSON.stringify(action.diff_summary) : undefined,
    };

    const command = new PutCommand({
      TableName: PROMPT_HELPER_AUDIT_LOG_TABLE,
      Item: {
        ...logEntry,
        // Composite sort key: timestamp#action_id
        'timestamp#action_id': `${logEntry.timestamp}#${logEntry.action_id}`,
      },
    });

    await dynamoDocClient.send(command);
  }

  async getAuditLog(helperId: string, limit: number = 50): Promise<PromptHelperAuditLog[]> {
    const command = new QueryCommand({
      TableName: PROMPT_HELPER_AUDIT_LOG_TABLE,
      KeyConditionExpression: 'helper_id = :helper_id',
      ExpressionAttributeValues: {
        ':helper_id': helperId,
      },
      ScanIndexForward: false, // Descending order (newest first)
      Limit: limit,
    });

    const { Items = [] } = await dynamoDocClient.send(command);
    return (Items as any[]).map(item => {
      const { 'timestamp#action_id': _, ...log } = item;
      return log;
    }) as PromptHelperAuditLog[];
  }
}


