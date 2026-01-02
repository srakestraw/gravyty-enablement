/**
 * Metadata API Handlers
 * 
 * Handlers for metadata management endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { metadataRepo } from '../storage/dynamo/metadataRepo';
import type {
  MetadataGroupKey,
  CreateMetadataOption,
  UpdateMetadataOption,
  MergeMetadataOption,
} from '@gravyty/domain';

/**
 * GET /v1/metadata/:groupKey/options
 * List metadata options for a group
 */
export async function listMetadataOptions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const groupKey = req.params.groupKey as MetadataGroupKey;
    const query = req.query.query as string | undefined;
    const includeArchived = req.query.include_archived === 'true';
    const parentId = req.query.parent_id as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    // Validate group key
    const validGroupKeys: MetadataGroupKey[] = ['product', 'product_suite', 'topic_tag', 'badge', 'audience'];
    if (!validGroupKeys.includes(groupKey)) {
      res.status(400).json({
        error: {
          code: 'INVALID_GROUP_KEY',
          message: `Invalid group key. Must be one of: ${validGroupKeys.join(', ')}`,
        },
        request_id: requestId,
      });
      return;
    }

    const result = await metadataRepo.listOptions({
      group_key: groupKey,
      query,
      include_archived: includeArchived,
      parent_id: parentId,
      limit,
      cursor,
    });

    const response: ApiSuccessResponse<{ options: typeof result.items; next_cursor?: string }> = {
      data: {
        options: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing metadata options:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list metadata options',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/metadata/:groupKey/options
 * Create a new metadata option
 * Requires: Admin role
 */
export async function createMetadataOption(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const groupKey = req.params.groupKey as MetadataGroupKey;

    // Validate group key
    const validGroupKeys: MetadataGroupKey[] = ['product', 'product_suite', 'topic_tag', 'badge', 'audience'];
    if (!validGroupKeys.includes(groupKey)) {
      res.status(400).json({
        error: {
          code: 'INVALID_GROUP_KEY',
          message: `Invalid group key. Must be one of: ${validGroupKeys.join(', ')}`,
        },
        request_id: requestId,
      });
      return;
    }

    const CreateSchema = z.object({
      label: z.string().min(1),
      slug: z.string().min(1).optional(),
      sort_order: z.number().int().min(0).optional(),
      parent_id: z.string().optional(),
      color: z.string().optional(),
      short_description: z.string().max(140).optional(),
    });

    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const createData: CreateMetadataOption = {
      group_key: groupKey,
      ...parsed.data,
    };

    const option = await metadataRepo.createOption(createData, userId);

    const response: ApiSuccessResponse<{ option: typeof option }> = {
      data: { option },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating metadata option:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create metadata option',
      },
      request_id: requestId,
    });
  }
}

/**
 * PATCH /v1/metadata/options/:optionId
 * Update a metadata option (rename, reorder, archive)
 * Requires: Admin role
 */
export async function updateMetadataOption(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const optionId = req.params.optionId;

    const UpdateSchema = z.object({
      label: z.string().min(1).optional(),
      slug: z.string().min(1).optional(),
      sort_order: z.number().int().min(0).optional(),
      archived_at: z.string().optional(), // ISO datetime to archive, undefined/null to unarchive (legacy)
      status: z.enum(['active', 'archived']).optional(), // active | archived
      deleted_at: z.string().optional().nullable(), // ISO datetime to soft-delete, null to restore
      color: z.string().optional().nullable(), // Set to null to clear color
      short_description: z.string().max(140).optional().nullable(), // Set to null to clear description
    });

    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const updates: UpdateMetadataOption = parsed.data;

    const option = await metadataRepo.updateOption(optionId, updates, userId);

    const response: ApiSuccessResponse<{ option: typeof option }> = {
      data: { option },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating metadata option:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update metadata option',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/metadata/options/:optionId
 * Get a single metadata option by ID
 */
export async function getMetadataOption(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const optionId = req.params.optionId;
    const option = await metadataRepo.getOptionById(optionId);

    if (!option) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Metadata option ${optionId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<{ option: typeof option }> = {
      data: { option },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting metadata option:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get metadata option',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/metadata/:groupKey/options/:optionId/usage
 * Get usage count for a metadata option
 * Returns how many Courses and Resources reference this option
 */
export async function getMetadataOptionUsage(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const groupKey = req.params.groupKey as MetadataGroupKey;
    const optionId = req.params.optionId;

    // Validate group key
    const validGroupKeys: MetadataGroupKey[] = ['product', 'product_suite', 'topic_tag', 'badge', 'audience'];
    if (!validGroupKeys.includes(groupKey)) {
      res.status(400).json({
        error: {
          code: 'INVALID_GROUP_KEY',
          message: `Invalid group key. Must be one of: ${validGroupKeys.join(', ')}`,
        },
        request_id: requestId,
      });
      return;
    }

    // Check usage - we allow checking usage even if the option is soft-deleted or doesn't exist
    // This is useful for seeing what references an option before permanent deletion
    const usage = await metadataRepo.getUsageCount(optionId, groupKey);

    const response: ApiSuccessResponse<typeof usage> = {
      data: usage,
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting metadata option usage:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get metadata option usage',
      },
      request_id: requestId,
    });
  }
}

/**
 * DELETE /v1/metadata/:groupKey/options/:optionId
 * Delete a metadata option (safe delete with dependency checks)
 * Requires: Admin role
 * 
 * Default behavior: safe delete only if usage == 0
 * If usage > 0, return 409 with message and suggested actions
 */
export async function deleteMetadataOption(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const groupKey = req.params.groupKey as MetadataGroupKey;
    const optionId = req.params.optionId;
    const force = req.query.force === 'true'; // Force delete even if in use (dangerous)

    // Validate group key
    const validGroupKeys: MetadataGroupKey[] = ['product', 'product_suite', 'topic_tag', 'badge', 'audience'];
    if (!validGroupKeys.includes(groupKey)) {
      res.status(400).json({
        error: {
          code: 'INVALID_GROUP_KEY',
          message: `Invalid group key. Must be one of: ${validGroupKeys.join(', ')}`,
        },
        request_id: requestId,
      });
      return;
    }

    // Check usage
    const usage = await metadataRepo.getUsageCount(optionId, groupKey);
    const totalUsage = usage.used_by_courses + usage.used_by_resources;

    if (totalUsage > 0 && !force) {
      res.status(409).json({
        error: {
          code: 'OPTION_IN_USE',
          message: `Cannot delete option: it is used by ${totalUsage} item(s)`,
          details: {
            used_by_courses: usage.used_by_courses,
            used_by_resources: usage.used_by_resources,
            sample_course_ids: usage.sample_course_ids,
            sample_resource_ids: usage.sample_resource_ids,
            suggestion: 'Archive the option instead, or migrate references to another option first',
          },
        },
        request_id: requestId,
      });
      return;
    }

    // Soft delete (set deleted_at)
    await metadataRepo.deleteOption(optionId, userId);

    const response: ApiSuccessResponse<{ message: string }> = {
      data: { message: 'Metadata option deleted successfully' },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error deleting metadata option:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete metadata option',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/metadata/:groupKey/options/:optionId/merge
 * Merge a metadata option into another option
 * Moves all references from source -> target, then archives or deletes source
 * Requires: Admin role
 */
export async function mergeMetadataOption(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user?.user_id;
  
  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'User ID required' },
      request_id: requestId,
    });
    return;
  }

  try {
    const groupKey = req.params.groupKey as MetadataGroupKey;
    const sourceOptionId = req.params.optionId;

    const MergeSchema = z.object({
      target_option_id: z.string().min(1),
      delete_source: z.boolean().optional().default(false), // If true, delete source after merge; otherwise archive
    });

    const parsed = MergeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      });
      return;
    }

    const { target_option_id, delete_source } = parsed.data;

    // Validate group key
    const validGroupKeys: MetadataGroupKey[] = ['product', 'product_suite', 'topic_tag', 'badge', 'audience'];
    if (!validGroupKeys.includes(groupKey)) {
      res.status(400).json({
        error: {
          code: 'INVALID_GROUP_KEY',
          message: `Invalid group key. Must be one of: ${validGroupKeys.join(', ')}`,
        },
        request_id: requestId,
      });
      return;
    }

    // Verify both options exist and are in the same group
    const sourceOption = await metadataRepo.getOptionById(sourceOptionId);
    const targetOption = await metadataRepo.getOptionById(target_option_id);

    if (!sourceOption) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Source metadata option ${sourceOptionId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    if (!targetOption) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Target metadata option ${target_option_id} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    if (sourceOption.group_key !== targetOption.group_key) {
      res.status(400).json({
        error: {
          code: 'INVALID_MERGE',
          message: 'Cannot merge options from different metadata groups',
        },
        request_id: requestId,
      });
      return;
    }

    // Get usage to migrate
    const usage = await metadataRepo.getUsageCount(sourceOptionId, groupKey);

    // Migrate references in Courses
    if (usage.used_by_courses > 0) {
      await migrateCourseReferences(groupKey, sourceOptionId, target_option_id);
    }

    // Migrate references in Resources
    if (usage.used_by_resources > 0) {
      await migrateResourceReferences(groupKey, sourceOptionId, target_option_id);
    }

    // Archive or delete source option
    if (delete_source) {
      await metadataRepo.deleteOption(sourceOptionId, userId);
    } else {
      await metadataRepo.updateOption(sourceOptionId, { status: 'archived' }, userId);
    }

    const response: ApiSuccessResponse<{
      message: string;
      migrated_courses: number;
      migrated_resources: number;
    }> = {
      data: {
        message: 'Metadata option merged successfully',
        migrated_courses: usage.used_by_courses,
        migrated_resources: usage.used_by_resources,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error merging metadata option:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to merge metadata option',
      },
      request_id: requestId,
    });
  }
}

/**
 * Helper: Migrate course references from source to target option
 * 
 * Note: This is a placeholder. Full implementation should scan all courses
 * and update references in batches. For now, merge operations should use
 * the migration script for bulk updates.
 */
async function migrateCourseReferences(
  groupKey: MetadataGroupKey,
  sourceOptionId: string,
  targetOptionId: string
): Promise<void> {
  // TODO: Implement full course reference migration
  // This would require:
  // 1. Scan LMS_COURSES_TABLE
  // 2. Find courses using sourceOptionId in product_id, product_suite_id, or topic_tag_ids
  // 3. Update to use targetOptionId
  // 4. Handle batching for large datasets
  console.warn('Course reference migration not fully implemented - consider using migration script for bulk operations');
}

/**
 * Helper: Migrate resource references from source to target option
 * 
 * Note: This is a placeholder. Full implementation should scan all resources
 * and update references in batches. For now, merge operations should use
 * the migration script for bulk updates.
 */
async function migrateResourceReferences(
  groupKey: MetadataGroupKey,
  sourceOptionId: string,
  targetOptionId: string
): Promise<void> {
  // TODO: Implement full resource reference migration
  // This would require:
  // 1. Scan CONTENT_TABLE
  // 2. Find resources using sourceOptionId in product_id, product_suite_id, or topic_tag_ids
  // 3. Update to use targetOptionId
  // 4. Handle batching for large datasets
  console.warn('Resource reference migration not fully implemented - consider using migration script for bulk operations');
}

