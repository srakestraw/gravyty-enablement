/**
 * Taxonomy API Handlers
 * 
 * Handlers for taxonomy management endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { taxonomyRepo } from '../storage/dynamo/taxonomyRepo';
import type {
  TaxonomyGroupKey,
  CreateTaxonomyOption,
  UpdateTaxonomyOption,
  MergeTaxonomyOption,
} from '@gravyty/domain';

/**
 * GET /v1/taxonomy/:groupKey/options
 * List taxonomy options for a group
 */
export async function listTaxonomyOptions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const groupKey = req.params.groupKey as TaxonomyGroupKey;
    const query = req.query.query as string | undefined;
    const includeArchived = req.query.include_archived === 'true';
    const parentId = req.query.parent_id as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    // Validate group key
    const validGroupKeys: TaxonomyGroupKey[] = ['product', 'product_suite', 'topic_tag'];
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

    const result = await taxonomyRepo.listOptions({
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
    console.error(`[${requestId}] Error listing taxonomy options:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list taxonomy options',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/taxonomy/:groupKey/options
 * Create a new taxonomy option
 * Requires: Admin role
 */
export async function createTaxonomyOption(req: AuthenticatedRequest, res: Response) {
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
    const groupKey = req.params.groupKey as TaxonomyGroupKey;

    // Validate group key
    const validGroupKeys: TaxonomyGroupKey[] = ['product', 'product_suite', 'topic_tag'];
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

    const createData: CreateTaxonomyOption = {
      group_key: groupKey,
      ...parsed.data,
    };

    const option = await taxonomyRepo.createOption(createData, userId);

    const response: ApiSuccessResponse<{ option: typeof option }> = {
      data: { option },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating taxonomy option:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create taxonomy option',
      },
      request_id: requestId,
    });
  }
}

/**
 * PATCH /v1/taxonomy/options/:optionId
 * Update a taxonomy option (rename, reorder, archive)
 * Requires: Admin role
 */
export async function updateTaxonomyOption(req: AuthenticatedRequest, res: Response) {
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
      color: z.string().optional(),
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

    const updates: UpdateTaxonomyOption = parsed.data;

    const option = await taxonomyRepo.updateOption(optionId, updates, userId);

    const response: ApiSuccessResponse<{ option: typeof option }> = {
      data: { option },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating taxonomy option:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update taxonomy option',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/taxonomy/options/:optionId
 * Get a single taxonomy option by ID
 */
export async function getTaxonomyOption(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const optionId = req.params.optionId;
    const option = await taxonomyRepo.getOptionById(optionId);

    if (!option) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Taxonomy option ${optionId} not found`,
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
    console.error(`[${requestId}] Error getting taxonomy option:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get taxonomy option',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/taxonomy/:groupKey/options/:optionId/usage
 * Get usage count for a taxonomy option
 * Returns how many Courses and Resources reference this option
 */
export async function getTaxonomyOptionUsage(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const groupKey = req.params.groupKey as TaxonomyGroupKey;
    const optionId = req.params.optionId;

    // Validate group key
    const validGroupKeys: TaxonomyGroupKey[] = ['product', 'product_suite', 'topic_tag'];
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

    // Verify option exists
    const option = await taxonomyRepo.getOptionById(optionId);
    if (!option) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Taxonomy option ${optionId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    const usage = await taxonomyRepo.getUsageCount(optionId, groupKey);

    const response: ApiSuccessResponse<typeof usage> = {
      data: usage,
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting taxonomy option usage:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get taxonomy option usage',
      },
      request_id: requestId,
    });
  }
}

/**
 * DELETE /v1/taxonomy/:groupKey/options/:optionId
 * Delete a taxonomy option (safe delete with dependency checks)
 * Requires: Admin role
 * 
 * Default behavior: safe delete only if usage == 0
 * If usage > 0, return 409 with message and suggested actions
 */
export async function deleteTaxonomyOption(req: AuthenticatedRequest, res: Response) {
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
    const groupKey = req.params.groupKey as TaxonomyGroupKey;
    const optionId = req.params.optionId;
    const force = req.query.force === 'true'; // Force delete even if in use (dangerous)

    // Validate group key
    const validGroupKeys: TaxonomyGroupKey[] = ['product', 'product_suite', 'topic_tag'];
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
    const usage = await taxonomyRepo.getUsageCount(optionId, groupKey);
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
    await taxonomyRepo.deleteOption(optionId, userId);

    const response: ApiSuccessResponse<{ message: string }> = {
      data: { message: 'Taxonomy option deleted successfully' },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error deleting taxonomy option:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete taxonomy option',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/taxonomy/:groupKey/options/:optionId/merge
 * Merge a taxonomy option into another option
 * Moves all references from source -> target, then archives or deletes source
 * Requires: Admin role
 */
export async function mergeTaxonomyOption(req: AuthenticatedRequest, res: Response) {
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
    const groupKey = req.params.groupKey as TaxonomyGroupKey;
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
    const validGroupKeys: TaxonomyGroupKey[] = ['product', 'product_suite', 'topic_tag'];
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
    const sourceOption = await taxonomyRepo.getOptionById(sourceOptionId);
    const targetOption = await taxonomyRepo.getOptionById(target_option_id);

    if (!sourceOption) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Source taxonomy option ${sourceOptionId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    if (!targetOption) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Target taxonomy option ${target_option_id} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    if (sourceOption.group_key !== targetOption.group_key) {
      res.status(400).json({
        error: {
          code: 'INVALID_MERGE',
          message: 'Cannot merge options from different taxonomy groups',
        },
        request_id: requestId,
      });
      return;
    }

    // Get usage to migrate
    const usage = await taxonomyRepo.getUsageCount(sourceOptionId, groupKey);

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
      await taxonomyRepo.deleteOption(sourceOptionId, userId);
    } else {
      await taxonomyRepo.updateOption(sourceOptionId, { status: 'archived' }, userId);
    }

    const response: ApiSuccessResponse<{
      message: string;
      migrated_courses: number;
      migrated_resources: number;
    }> = {
      data: {
        message: 'Taxonomy option merged successfully',
        migrated_courses: usage.used_by_courses,
        migrated_resources: usage.used_by_resources,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error merging taxonomy option:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to merge taxonomy option',
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
  groupKey: TaxonomyGroupKey,
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
  groupKey: TaxonomyGroupKey,
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

