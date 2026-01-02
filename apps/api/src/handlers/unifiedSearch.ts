/**
 * Unified Search API Handler
 * 
 * Search across multiple entity types (Courses, Learning Paths, Role Playing, Assets, Kits)
 * with metadata filtering
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { lmsRepo } from '../storage/dynamo/lmsRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';
import type { UnifiedSearchResult, UnifiedSearchParams, UnifiedSearchResponse } from '@gravyty/domain';
import type { Course, LearningPath } from '@gravyty/domain';
import type { Asset } from '@gravyty/domain';

/**
 * GET /v1/search
 * Unified search across all entity types
 */
export async function unifiedSearch(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    // Parse query parameters
    const querySchema = z.object({
      q: z.string().optional(),
      entity_types: z.string().optional().transform((val) => 
        val ? val.split(',').map(t => t.trim()) as any[] : undefined
      ),
      product_ids: z.string().optional().transform((val) => 
        val ? val.split(',').map(id => id.trim()) : undefined
      ),
      product_suite_ids: z.string().optional().transform((val) => 
        val ? val.split(',').map(id => id.trim()) : undefined
      ),
      topic_tag_ids: z.string().optional().transform((val) => 
        val ? val.split(',').map(id => id.trim()) : undefined
      ),
      audience_ids: z.string().optional().transform((val) => 
        val ? val.split(',').map(id => id.trim()) : undefined
      ),
      badge_ids: z.string().optional().transform((val) => 
        val ? val.split(',').map(id => id.trim()) : undefined
      ),
      limit: z.string().optional().transform((val) => 
        val ? parseInt(val, 10) : undefined
      ),
      cursor: z.string().optional(),
    });
    
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        request_id: requestId,
      };
      res.status(400).json(response);
      return;
    }
    
    const params: UnifiedSearchParams = {
      q: parsed.data.q,
      entity_types: parsed.data.entity_types as any,
      product_ids: parsed.data.product_ids,
      product_suite_ids: parsed.data.product_suite_ids,
      topic_tag_ids: parsed.data.topic_tag_ids,
      audience_ids: parsed.data.audience_ids,
      badge_ids: parsed.data.badge_ids,
      limit: parsed.data.limit || 20,
      cursor: parsed.data.cursor,
    };
    
    const results: UnifiedSearchResult[] = [];
    const entityTypes = params.entity_types || ['course', 'learning_path', 'content'];
    
    // Search Courses
    if (entityTypes.includes('course')) {
      try {
        const courses = await lmsRepo.listCoursesDraft({ limit: params.limit });
        for (const course of courses.items) {
          // Apply filters
          if (params.product_ids && (!course.product_ids || !course.product_ids.some(id => params.product_ids!.includes(id)))) {
            continue;
          }
          if (params.product_suite_ids && (!course.product_suite_ids || !course.product_suite_ids.some(id => params.product_suite_ids!.includes(id)))) {
            continue;
          }
          if (params.topic_tag_ids && (!course.topic_tag_ids || !course.topic_tag_ids.some(id => params.topic_tag_ids!.includes(id)))) {
            continue;
          }
          if (params.audience_ids && (!course.audience_ids || !course.audience_ids.some(id => params.audience_ids!.includes(id)))) {
            continue;
          }
          if (params.badge_ids && (!course.badge_ids || !course.badge_ids.some(id => params.badge_ids!.includes(id)))) {
            continue;
          }
          
          // Text search
          if (params.q) {
            const searchLower = params.q.toLowerCase();
            if (
              !course.title.toLowerCase().includes(searchLower) &&
              !course.short_description?.toLowerCase().includes(searchLower) &&
              !course.description?.toLowerCase().includes(searchLower)
            ) {
              continue;
            }
          }
          
          results.push({
            entity_type: 'course',
            entity_id: course.course_id,
            title: course.title,
            short_description: course.short_description,
            cover_image: course.cover_image,
            metadata: {
              product_ids: course.product_ids,
              product_suite_ids: course.product_suite_ids,
              topic_tag_ids: course.topic_tag_ids,
              audience_ids: course.audience_ids,
              badge_ids: course.badge_ids,
            },
            status: course.status,
            published_at: course.published_at,
            updated_at: course.updated_at,
          });
        }
      } catch (error) {
        console.error(`[${requestId}] Error searching courses:`, error);
      }
    }
    
    // Search Learning Paths
    if (entityTypes.includes('learning_path')) {
      try {
        const paths = await lmsRepo.listPathsDraft({ limit: params.limit });
        for (const path of paths.items) {
          // Apply filters
          if (params.product_ids && (!path.product_ids || !path.product_ids.some(id => params.product_ids!.includes(id)))) {
            continue;
          }
          if (params.product_suite_ids && (!path.product_suite_ids || !path.product_suite_ids.some(id => params.product_suite_ids!.includes(id)))) {
            continue;
          }
          if (params.topic_tag_ids && (!path.topic_tag_ids || !path.topic_tag_ids.some(id => params.topic_tag_ids!.includes(id)))) {
            continue;
          }
          if (params.audience_ids && (!path.audience_ids || !path.audience_ids.some(id => params.audience_ids!.includes(id)))) {
            continue;
          }
          if (params.badge_ids && (!path.badges || !path.badges.some(id => params.badge_ids!.includes(id)))) {
            continue;
          }
          
          // Text search
          if (params.q) {
            const searchLower = params.q.toLowerCase();
            if (
              !path.title.toLowerCase().includes(searchLower) &&
              !path.short_description?.toLowerCase().includes(searchLower) &&
              !path.description?.toLowerCase().includes(searchLower)
            ) {
              continue;
            }
          }
          
          results.push({
            entity_type: 'learning_path',
            entity_id: path.path_id,
            title: path.title,
            short_description: path.short_description,
            cover_image: path.cover_image,
            metadata: {
              product_ids: path.product_ids,
              product_suite_ids: path.product_suite_ids,
              topic_tag_ids: path.topic_tag_ids,
              audience_ids: path.audience_ids,
              badge_ids: path.badges,
            },
            status: path.status,
            published_at: path.published_at,
            updated_at: path.updated_at,
          });
        }
      } catch (error) {
        console.error(`[${requestId}] Error searching learning paths:`, error);
      }
    }
    
    // Search Assets/Content
    if (entityTypes.includes('content')) {
      try {
        const assets = await assetRepo.list({ limit: params.limit });
        for (const asset of assets.items) {
          // Apply filters - Assets use metadata_node_ids, so we need to check if any match
          // For now, we'll skip metadata filtering for assets as they use a different structure
          // TODO: Implement proper metadata filtering for assets
          
          // Text search
          if (params.q) {
            const searchLower = params.q.toLowerCase();
            if (
              !asset.title.toLowerCase().includes(searchLower) &&
              !asset.description?.toLowerCase().includes(searchLower)
            ) {
              continue;
            }
          }
          
          results.push({
            entity_type: 'content',
            entity_id: asset.asset_id,
            title: asset.title,
            short_description: asset.description,
            cover_image: asset.cover_image,
            metadata: {
              // Assets use metadata_node_ids which may include product/product_suite/topic_tag IDs
              // For now, we'll leave these empty and implement proper mapping later
            },
            updated_at: asset.updated_at,
          });
        }
      } catch (error) {
        console.error(`[${requestId}] Error searching assets:`, error);
      }
    }
    
    // Sort by updated_at descending
    results.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });
    
    // Apply limit
    const limitedResults = results.slice(0, params.limit || 20);
    
    const response: ApiSuccessResponse<UnifiedSearchResponse> = {
      data: {
        results: limitedResults,
        total: results.length,
      },
      request_id: requestId,
    };
    
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error in unified search:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to perform search',
      },
      request_id: requestId,
    };
    res.status(500).json(response);
  }
}

