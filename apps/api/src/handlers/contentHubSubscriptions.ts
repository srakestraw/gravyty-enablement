/**
 * Content Hub Subscriptions API Handlers
 * 
 * Handlers for subscription endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse } from '../types';
import { v4 as uuidv4 } from 'uuid';
import type { Subscription, SubscriptionTargetType, SubscriptionTriggers } from '@gravyty/domain';
import { SubscriptionSchema, SubscriptionTargetTypeSchema, SubscriptionTriggersSchema } from '@gravyty/domain';

import { contentHubSubscriptionRepo } from '../storage/dynamo/contentHubSubscriptionRepo';
import { assetRepo } from '../storage/dynamo/assetRepo';

/**
 * POST /v1/content-hub/subscriptions
 * Create a new subscription
 */
export async function createSubscription(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    const CreateSubscriptionSchema = z.object({
      target_type: SubscriptionTargetTypeSchema,
      target_id: z.string().min(1),
      triggers: SubscriptionTriggersSchema.optional(),
    });
    
    const parsed = CreateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors,
        },
      };
      return res.status(400).json(response);
    }
    
    const { target_type, target_id, triggers } = parsed.data;
    
    // Verify target exists (for assets)
    if (target_type === 'asset') {
      const asset = await assetRepo.get(target_id);
      if (!asset) {
        const response: ApiErrorResponse = {
          error: {
            code: 'NOT_FOUND',
            message: `Asset ${target_id} not found`,
          },
        };
        return res.status(404).json(response);
      }
    }
    
    // Check if subscription already exists
    const existing = await contentHubSubscriptionRepo.findByUserAndTarget(userId, target_type, target_id);
    if (existing) {
      const response: ApiSuccessResponse<Subscription> = {
        data: existing,
      };
      return res.status(200).json(response);
    }
    
    // Create subscription
    const subscriptionId = `sub_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const subscription: Subscription = {
      subscription_id: subscriptionId,
      target_type,
      target_id,
      user_id: userId,
      triggers: triggers || {
        newVersion: true,
        expiringSoon: true,
        expired: true,
        comments: false,
        mentions: true,
      },
      created_at: now,
      entity_type: 'SUBSCRIPTION',
      'target_type#target_id': `${target_type}#${target_id}`,
      'user_id#subscription_id': `${userId}#${subscriptionId}`,
    };
    
    const created = await contentHubSubscriptionRepo.create(subscription);
    
    const response: ApiSuccessResponse<Subscription> = {
      data: created,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating subscription:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create subscription',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/content-hub/subscriptions
 * List subscriptions for the current user
 */
export async function listSubscriptions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    const target_type = req.query.target_type as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;
    
    const result = await contentHubSubscriptionRepo.listByUser(userId, {
      target_type,
      limit,
      cursor,
    });
    
    const response: ApiSuccessResponse<{ items: Subscription[]; next_cursor?: string }> = {
      data: result,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing subscriptions:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list subscriptions',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * DELETE /v1/content-hub/subscriptions/:id
 * Delete a subscription
 */
export async function deleteSubscription(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const subscriptionId = req.params.id;
  const userId = req.user!.userId;
  
  try {
    await contentHubSubscriptionRepo.delete(subscriptionId, userId);
    
    const response: ApiSuccessResponse<void> = {
      data: undefined,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error deleting subscription:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      const response: ApiErrorResponse = {
        error: {
          code: 'NOT_FOUND',
          message: `Subscription ${subscriptionId} not found`,
        },
      };
      return res.status(404).json(response);
    }
    
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete subscription',
      },
    };
    return res.status(500).json(response);
  }
}

/**
 * GET /v1/content-hub/subscriptions/check
 * Check if user is subscribed to a target
 */
export async function checkSubscription(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const userId = req.user!.userId;
  
  try {
    const target_type = req.query.target_type as string;
    const target_id = req.query.target_id as string;
    
    if (!target_type || !target_id) {
      const response: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'target_type and target_id are required',
        },
      };
      return res.status(400).json(response);
    }
    
    const subscription = await contentHubSubscriptionRepo.findByUserAndTarget(
      userId,
      target_type,
      target_id
    );
    
    const response: ApiSuccessResponse<{ subscribed: boolean; subscription?: Subscription }> = {
      data: {
        subscribed: !!subscription,
        subscription: subscription || undefined,
      },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error checking subscription:`, error);
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to check subscription',
      },
    };
    return res.status(500).json(response);
  }
}

