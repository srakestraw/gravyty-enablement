/**
 * Course Assets API Handlers
 * 
 * Handlers for attaching Content Hub assets to courses
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { CourseAsset, Asset, AssetVersion } from '@gravyty/domain';

import { courseAssetRepo } from '../storage/dynamo/courseAssetRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import { assetVersionRepo } from '../storage/dynamo/assetVersionRepo';

/**
 * POST /v1/lms/courses/:id/assets
 * Attach an asset to a course
 */
export async function attachAssetToCourse(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.id;
  const userId = req.user!.userId;
  
  try {
    const AttachAssetSchema = z.object({
      asset_id: z.string(),
      version_id: z.string().optional(), // Nullable - null means canonical (always latest)
      display_label: z.string().optional(),
      module_id: z.string().optional(),
      lesson_id: z.string().optional(),
      sort_order: z.number().int().min(0).optional().default(0),
    });
    
    const parsed = AttachAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }
    
    const { asset_id, version_id, display_label, module_id, lesson_id, sort_order } = parsed.data;
    
    // Verify course exists (would need to import course repo or handler)
    // For now, assume course exists if we get here
    
    // Verify asset exists
    const asset = await assetRepo.get(asset_id);
    if (!asset) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Asset ${asset_id} not found`,
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }
    
    // Verify version exists if specified
    if (version_id) {
      const version = await assetVersionRepo.get(version_id);
      if (!version || version.asset_id !== asset_id) {
        const response: ApiErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: `Version ${version_id} not found for asset ${asset_id}`,
          },
          request_id: requestId,
        };
        return res.status(404).json(response);
      }
      
      // Ensure version is published (for version-pinned attachments)
      if (version.status !== 'published') {
        const response: ApiErrorResponse = {
          error: {
            code: 'BAD_REQUEST',
            message: 'Only published versions can be attached to courses',
          },
          request_id: requestId,
        };
        return res.status(400).json(response);
      }
    } else {
      // For canonical attachments, verify asset has a published version
      if (!asset.current_published_version_id) {
        const response: ApiErrorResponse = {
          error: {
            code: 'BAD_REQUEST',
            message: 'Asset has no published version. Please publish a version first or attach a specific version.',
          },
          request_id: requestId,
        };
        return res.status(400).json(response);
      }
    }
    
    // Create course asset
    const courseAssetId = `course_asset_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const courseAsset: CourseAsset = {
      course_asset_id: courseAssetId,
      course_id: courseId,
      asset_id,
      version_id: version_id || undefined,
      display_label: display_label || undefined,
      module_id: module_id || undefined,
      lesson_id: lesson_id || undefined,
      sort_order: sort_order || 0,
      created_at: now,
      created_by: userId,
      entity_type: 'COURSE_ASSET',
      'course_id#sort_order': `${courseId}#${sort_order || 0}`,
      'asset_id#course_id': `${asset_id}#${courseId}`,
    };
    
    const created = await courseAssetRepo.create(courseAsset);
    
    const response: ApiSuccessResponse<CourseAsset> = {
      data: created,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error attaching asset to course:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to attach asset to course',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/lms/courses/:id/assets
 * List assets attached to a course
 */
export async function listCourseAssets(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.id;
  
  try {
    const moduleId = req.query.module_id as string | undefined;
    const lessonId = req.query.lesson_id as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    let result;
    try {
      result = await courseAssetRepo.listByCourse(courseId, {
        moduleId,
        lessonId,
        limit,
        cursor,
      });
    } catch (repoError) {
      // If repository call fails (e.g., table doesn't exist, connection issue), return empty list
      console.warn(`[${requestId}] Failed to list course assets from repository for course ${courseId}:`, repoError);
      const response: ApiSuccessResponse<{
        items: Array<CourseAsset & { asset: Asset | null; version: AssetVersion | null }>;
        next_cursor?: string;
      }> = {
        data: {
          items: [],
        },
        request_id: requestId,
      };
      return res.status(200).json(response);
    }
    
    // Ensure result.items exists
    if (!result || !result.items) {
      const response: ApiSuccessResponse<{
        items: Array<CourseAsset & { asset: Asset | null; version: AssetVersion | null }>;
        next_cursor?: string;
      }> = {
        data: {
          items: [],
          next_cursor: result?.next_cursor,
        },
        request_id: requestId,
      };
      return res.status(200).json(response);
    }
    
    // Enrich with asset and version data
    const enrichedItems = await Promise.all(
      result.items.map(async (courseAsset) => {
        try {
          const asset = await assetRepo.get(courseAsset.asset_id);
          let version: AssetVersion | null = null;
          
          if (courseAsset.version_id) {
            // Version-pinned
            try {
              version = await assetVersionRepo.get(courseAsset.version_id);
            } catch (err) {
              console.warn(`[${requestId}] Failed to fetch version ${courseAsset.version_id} for course asset ${courseAsset.course_asset_id}:`, err);
            }
          } else if (asset?.current_published_version_id) {
            // Canonical - resolve to latest published
            try {
              version = await assetVersionRepo.get(asset.current_published_version_id);
            } catch (err) {
              console.warn(`[${requestId}] Failed to fetch published version ${asset.current_published_version_id} for asset ${courseAsset.asset_id}:`, err);
            }
          }
          
          return {
            ...courseAsset,
            asset: asset || null,
            version: version || null,
          };
        } catch (err) {
          console.warn(`[${requestId}] Failed to enrich course asset ${courseAsset.course_asset_id}:`, err);
          // Return course asset with null asset/version if enrichment fails
          return {
            ...courseAsset,
            asset: null,
            version: null,
          };
        }
      })
    );
    
    const response: ApiSuccessResponse<{
      items: Array<CourseAsset & { asset: Asset | null; version: AssetVersion | null }>;
      next_cursor?: string;
    }> = {
      data: {
        items: enrichedItems,
        next_cursor: result.next_cursor,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing course assets:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list course assets',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

/**
 * PATCH /v1/lms/courses/:id/assets/:courseAssetId
 * Update course asset (label, version pin, sort order)
 */
export async function updateCourseAsset(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.id;
  const courseAssetId = req.params.courseAssetId;
  
  try {
    const UpdateCourseAssetSchema = z.object({
      display_label: z.string().optional(),
      version_id: z.string().nullable().optional(), // null means canonical
      sort_order: z.number().int().min(0).optional(),
    });
    
    const parsed = UpdateCourseAssetSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
        request_id: requestId,
      };
      return res.status(400).json(response);
    }
    
    // Get course asset
    const courseAsset = await courseAssetRepo.get(courseAssetId);
    if (!courseAsset || courseAsset.course_id !== courseId) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Course asset ${courseAssetId} not found for course ${courseId}`,
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }
    
    // Verify version exists if specified
    if (parsed.data.version_id !== undefined && parsed.data.version_id !== null) {
      const version = await assetVersionRepo.get(parsed.data.version_id);
      if (!version || version.asset_id !== courseAsset.asset_id) {
        const response: ApiErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: `Version ${parsed.data.version_id} not found for asset ${courseAsset.asset_id}`,
          },
          request_id: requestId,
        };
        return res.status(404).json(response);
      }
      
      // Ensure version is published
      if (version.status !== 'published') {
        const response: ApiErrorResponse = {
          error: {
            code: 'BAD_REQUEST',
            message: 'Only published versions can be attached to courses',
          },
          request_id: requestId,
        };
        return res.status(400).json(response);
      }
    }
    
    // Build updates
    const updates: Partial<CourseAsset> = {};
    if (parsed.data.display_label !== undefined) {
      updates.display_label = parsed.data.display_label || undefined;
    }
    if (parsed.data.version_id !== undefined) {
      updates.version_id = parsed.data.version_id || undefined;
    }
    if (parsed.data.sort_order !== undefined) {
      updates.sort_order = parsed.data.sort_order;
      updates['course_id#sort_order'] = `${courseId}#${parsed.data.sort_order}`;
    }
    
    const updated = await courseAssetRepo.update(courseAssetId, updates);
    
    const response: ApiSuccessResponse<CourseAsset> = {
      data: updated,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating course asset:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update course asset',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

/**
 * DELETE /v1/lms/courses/:id/assets/:courseAssetId
 * Detach asset from course
 */
export async function detachAssetFromCourse(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const courseId = req.params.id;
  const courseAssetId = req.params.courseAssetId;
  
  try {
    // Verify course asset exists and belongs to course
    const courseAsset = await courseAssetRepo.get(courseAssetId);
    if (!courseAsset || courseAsset.course_id !== courseId) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Course asset ${courseAssetId} not found for course ${courseId}`,
        },
        request_id: requestId,
      };
      return res.status(404).json(response);
    }
    
    await courseAssetRepo.delete(courseAssetId);
    
    const response: ApiSuccessResponse<void> = {
      data: undefined,
      request_id: requestId,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error detaching asset from course:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to detach asset from course',
      },
      request_id: requestId,
    };
    return res.status(500).json(response);
  }
}

