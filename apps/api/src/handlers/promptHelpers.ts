/**
 * Prompt Helpers API Handlers
 * 
 * Handlers for prompt helper management endpoints
 */

import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, ApiSuccessResponse } from '../types';
import { DynamoPromptHelperRepo } from '../storage/dynamo/promptHelperRepo';
import { composePrompt, buildVariableContext } from '../services/promptComposition';
import type {
  CreatePromptHelper,
  UpdatePromptHelper,
  ComposePromptRequest,
  PromptHelperAppliesTo,
  PromptHelperContext,
} from '@gravyty/domain';

const promptHelperRepo = new DynamoPromptHelperRepo();

/**
 * GET /v1/admin/prompt-helpers
 * List prompt helpers with filters
 */
export async function listPromptHelpers(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    console.log(`[PromptHelpers] Listing prompt helpers - Request ID: ${requestId}`);
    console.log(`[PromptHelpers] User:`, req.user);
    console.log(`[PromptHelpers] Query params:`, req.query);
    
    const status = req.query.status as string | undefined;
    const appliesTo = req.query.applies_to as PromptHelperAppliesTo | undefined;
    const providerSupport = req.query.provider_support as 'openai' | 'gemini' | 'both' | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const cursor = req.query.cursor as string | undefined;

    console.log(`[PromptHelpers] Calling promptHelperRepo.list with:`, {
      status,
      applies_to: appliesTo,
      provider_support: providerSupport,
      limit,
      cursor,
    });

    const result = await promptHelperRepo.list({
      status: status as any,
      applies_to: appliesTo,
      provider_support: providerSupport,
      limit,
      cursor,
    });

    console.log(`[PromptHelpers] Successfully retrieved ${result.items.length} prompt helpers`);

    const response: ApiSuccessResponse<{ helpers: typeof result.items; next_cursor?: string }> = {
      data: {
        helpers: result.items,
        ...(result.next_cursor && { next_cursor: result.next_cursor }),
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[PromptHelpers] [${requestId}] Error listing prompt helpers:`, error);
    console.error(`[PromptHelpers] Error details:`, {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list prompt helpers',
        details: process.env.NODE_ENV !== 'production' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/prompt-helpers?applies_to=
 * Get prompt helpers for consumer use (published only)
 */
export async function getPromptHelpersForContext(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const appliesTo = req.query.applies_to as PromptHelperAppliesTo | undefined;
    
    if (!appliesTo) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'applies_to query parameter is required',
        },
        request_id: requestId,
      });
      return;
    }

    const result = await promptHelperRepo.list({
      status: 'published',
      applies_to: appliesTo,
    });

    const response: ApiSuccessResponse<{ helpers: typeof result.items }> = {
      data: {
        helpers: result.items,
      },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting prompt helpers for context:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get prompt helpers',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/admin/prompt-helpers/:helperId
 * Get a single prompt helper
 */
export async function getPromptHelper(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const helperId = req.params.helperId;
    const helper = await promptHelperRepo.get(helperId);

    if (!helper) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Prompt helper ${helperId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<{ helper: typeof helper }> = {
      data: { helper },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting prompt helper:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/prompt-helpers
 * Create a new prompt helper
 */
export async function createPromptHelper(req: AuthenticatedRequest, res: Response) {
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
    const CreateSchema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().min(1).max(500),
      applies_to: z.array(z.enum(['cover_image', 'description', 'rte'])).min(1),
      composition_mode: z.enum(['template', 'style_pack', 'hybrid']),
      prefix_text: z.string().optional(),
      template_text: z.string().optional(),
      suffix_text: z.string().optional(),
      negative_text: z.string().optional(),
      rte_action_instructions: z.record(z.string(), z.string().optional()).optional(),
      provider_overrides: z.object({
        openai: z.string().optional(),
        gemini: z.string().optional(),
      }).optional(),
      allowed_variables: z.array(z.string()).default([]),
      is_default_for: z.array(z.enum([
        'cover_image',
        'description',
        'rte_shorten',
        'rte_expand',
        'rte_rewrite',
        'rte_tone_shift',
        'rte_summarize',
      ])).default([]),
      is_system: z.boolean().default(false),
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

    const createData: CreatePromptHelper = {
      ...parsed.data,
      status: 'draft',
    };

    const helper = await promptHelperRepo.create(createData, userId);

    const response: ApiSuccessResponse<{ helper: typeof helper }> = {
      data: { helper },
      request_id: requestId,
    };
    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error creating prompt helper:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * PUT /v1/admin/prompt-helpers/:helperId
 * Update a prompt helper (draft only)
 */
export async function updatePromptHelper(req: AuthenticatedRequest, res: Response) {
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
    const helperId = req.params.helperId;
    
    const UpdateSchema = z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().min(1).max(500).optional(),
      applies_to: z.array(z.enum(['cover_image', 'description', 'rte'])).min(1).optional(),
      composition_mode: z.enum(['template', 'style_pack', 'hybrid']).optional(),
      prefix_text: z.string().optional(),
      template_text: z.string().optional(),
      suffix_text: z.string().optional(),
      negative_text: z.string().optional(),
      rte_action_instructions: z.record(z.string(), z.string().optional()).optional(),
      provider_overrides: z.object({
        openai: z.string().optional(),
        gemini: z.string().optional(),
      }).optional(),
      allowed_variables: z.array(z.string()).optional(),
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

    const updateData: UpdatePromptHelper = parsed.data;
    const helper = await promptHelperRepo.update(helperId, updateData, userId);

    const response: ApiSuccessResponse<{ helper: typeof helper }> = {
      data: { helper },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating prompt helper:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404
      : error instanceof Error && error.message.includes('only draft') ? 400
      : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/prompt-helpers/:helperId/publish
 * Publish a prompt helper (creates version)
 */
export async function publishPromptHelper(req: AuthenticatedRequest, res: Response) {
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
    const helperId = req.params.helperId;
    const version = await promptHelperRepo.publish(helperId, userId);

    const response: ApiSuccessResponse<{ version: typeof version }> = {
      data: { version },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error publishing prompt helper:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to publish prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/prompt-helpers/:helperId/archive
 * Archive a prompt helper
 */
export async function archivePromptHelper(req: AuthenticatedRequest, res: Response) {
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
    const helperId = req.params.helperId;
    await promptHelperRepo.archive(helperId, userId);

    const response: ApiSuccessResponse<{ success: true }> = {
      data: { success: true },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error archiving prompt helper:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to archive prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * DELETE /v1/admin/prompt-helpers/:helperId
 * Delete a prompt helper (soft delete)
 */
export async function deletePromptHelper(req: AuthenticatedRequest, res: Response) {
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
    const helperId = req.params.helperId;
    
    // Check if helper exists
    const helper = await promptHelperRepo.get(helperId);
    if (!helper) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Prompt helper ${helperId} not found`,
        },
        request_id: requestId,
      });
      return;
    }

    // Safety guard: Block delete if helper is set as default for any context
    if (helper.is_default_for && helper.is_default_for.length > 0) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Remove as default before deleting.',
        },
        request_id: requestId,
      });
      return;
    }

    // Safety guard: Block delete if helper is published (require archive first)
    // This prevents accidental deletion of published helpers
    if (helper.status === 'published') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Cannot delete published helper. Archive it first.',
        },
        request_id: requestId,
      });
      return;
    }

    // Perform soft delete
    await promptHelperRepo.delete(helperId, userId);

    res.status(204).send();
  } catch (error) {
    console.error(`[${requestId}] Error deleting prompt helper:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404
      : error instanceof Error && error.message.includes('CONFLICT') ? 409
      : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 409 ? 'CONFLICT' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/prompt-helpers/:helperId/set-default
 * Set prompt helper as default for contexts
 */
export async function setDefaultPromptHelper(req: AuthenticatedRequest, res: Response) {
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
    const helperId = req.params.helperId;
    
    const SetDefaultSchema = z.object({
      contexts: z.array(z.enum([
        'cover_image',
        'description',
        'rte_shorten',
        'rte_expand',
        'rte_rewrite',
        'rte_tone_shift',
        'rte_summarize',
      ])).min(1),
    });

    const parsed = SetDefaultSchema.safeParse(req.body);
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

    await promptHelperRepo.setDefault(helperId, parsed.data.contexts, userId);

    const response: ApiSuccessResponse<{ success: true }> = {
      data: { success: true },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error setting default prompt helper:`, error);
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404
      : error instanceof Error && error.message.includes('Only published') ? 400
      : 500;
    res.status(statusCode).json({
      error: {
        code: statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to set default prompt helper',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/prompt-helpers/compose-preview
 * Preview composed prompt (for testing)
 */
export async function composePromptPreview(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const ComposeSchema = z.object({
      helper_id: z.string().uuid().optional(),
      context: z.enum(['cover_image', 'description', 'rte']),
      variables: z.record(z.string(), z.any()).optional(),
      user_content: z.string().optional(),
      user_instruction: z.string().optional(),
      action_type: z.enum(['shorten', 'expand', 'rewrite', 'tone_shift', 'summarize']).optional(),
      provider: z.enum(['openai', 'gemini']).optional(),
    });

    const parsed = ComposeSchema.safeParse(req.body);
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

    const composeRequest: ComposePromptRequest = parsed.data;

    // Get helper (or default)
    let helper;
    if (composeRequest.helper_id) {
      helper = await promptHelperRepo.get(composeRequest.helper_id);
      if (!helper) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Prompt helper ${composeRequest.helper_id} not found`,
          },
          request_id: requestId,
        });
        return;
      }
    } else {
      // Get default for context
      const contextMap: Record<PromptHelperAppliesTo, PromptHelperContext> = {
        cover_image: 'cover_image',
        description: 'description',
        rte: composeRequest.action_type === 'shorten' ? 'rte_shorten'
          : composeRequest.action_type === 'expand' ? 'rte_expand'
          : composeRequest.action_type === 'rewrite' ? 'rte_rewrite'
          : composeRequest.action_type === 'tone_shift' ? 'rte_tone_shift'
          : composeRequest.action_type === 'summarize' ? 'rte_summarize'
          : 'rte_shorten', // Default fallback
      };
      const defaultContext = contextMap[composeRequest.context];
      helper = await promptHelperRepo.getDefault(defaultContext);
      
      if (!helper) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `No default prompt helper found for context ${composeRequest.context}`,
          },
          request_id: requestId,
        });
        return;
      }
    }

    // Build variable context
    const variableContext = buildVariableContext(composeRequest, composeRequest.variables);

    // Compose prompt
    const composed = composePrompt(helper, composeRequest, variableContext);

    const response: ApiSuccessResponse<typeof composed> = {
      data: composed,
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error composing prompt preview:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to compose prompt preview',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/admin/prompt-helpers/:helperId/versions
 * List versions for a prompt helper
 */
export async function listPromptHelperVersions(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const helperId = req.params.helperId;
    const versions = await promptHelperRepo.listVersions(helperId);

    const response: ApiSuccessResponse<{ versions: typeof versions }> = {
      data: { versions },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing prompt helper versions:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list versions',
      },
      request_id: requestId,
    });
  }
}

/**
 * GET /v1/admin/prompt-helpers/:helperId/audit-log
 * Get audit log for a prompt helper
 */
export async function getPromptHelperAuditLog(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  
  try {
    const helperId = req.params.helperId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const auditLog = await promptHelperRepo.getAuditLog(helperId, limit);

    const response: ApiSuccessResponse<{ audit_log: typeof auditLog }> = {
      data: { audit_log: auditLog },
      request_id: requestId,
    };
    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error getting audit log:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get audit log',
      },
      request_id: requestId,
    });
  }
}


