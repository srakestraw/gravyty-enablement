/**
 * Admin Users Handlers
 * 
 * Handlers for admin user management endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { ApiSuccessResponse } from '../types';
import { UserRoleSchema } from '@gravyty/domain';
import {
  listUsers,
  adminCreateUserInvite,
  setSingleRoleGroup,
  adminEnableUser,
  adminDisableUser,
  getUserByUsername,
} from '../aws/cognitoClient';

/**
 * GET /v1/admin/users
 * List all users with admin context
 */
export async function listAdminUsers(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const query = req.query.query as string | undefined;
    const paginationToken = req.query.cursor as string | undefined;

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'limit must be between 1 and 100',
        },
        request_id: requestId,
      });
      return;
    }

    const result = await listUsers({
      query,
      limit,
      paginationToken,
    });

    const response: ApiSuccessResponse<{
      items: typeof result.users;
      next_cursor?: string;
    }> = {
      data: {
        items: result.users,
        ...(result.paginationToken && { next_cursor: result.paginationToken }),
      },
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error listing admin users:`, error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list users',
      },
      request_id: requestId,
    });
  }
}

/**
 * POST /v1/admin/users/invite
 * Invite a new user to the system
 */
export async function inviteUser(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  try {
    const { email, name, role } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email is required',
        },
        request_id: requestId,
      });
      return;
    }

    // Validate role if provided
    let userRole: 'Viewer' | 'Contributor' | 'Approver' | 'Admin' = 'Viewer';
    if (role) {
      const roleParse = UserRoleSchema.safeParse(role);
      if (!roleParse.success) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid role: ${role}. Must be one of: Viewer, Contributor, Approver, Admin`,
          },
          request_id: requestId,
        });
        return;
      }
      userRole = roleParse.data;
    }

    // Create user
    const user = await adminCreateUserInvite(email, name);

    // Set role/group if provided
    if (userRole) {
      await setSingleRoleGroup(user.username, userRole);
      user.role = userRole;
      user.groups = [userRole];
    }

    const response: ApiSuccessResponse<typeof user> = {
      data: user,
      request_id: requestId,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error(`[${requestId}] Error inviting user:`, error);
    
    // Handle Cognito-specific errors
    if (error instanceof Error) {
      if (error.name === 'UsernameExistsException') {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'User with this email already exists',
          },
          request_id: requestId,
        });
        return;
      }
      if (error.name === 'InvalidParameterException') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
          },
          request_id: requestId,
        });
        return;
      }
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to invite user',
      },
      request_id: requestId,
    });
  }
}

/**
 * PATCH /v1/admin/users/:username/role
 * Update a user's role
 */
export async function updateUserRole(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const username = req.params.username;

  try {
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'role is required',
        },
        request_id: requestId,
      });
      return;
    }

    const roleParse = UserRoleSchema.safeParse(role);
    if (!roleParse.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid role: ${role}. Must be one of: Viewer, Contributor, Approver, Admin`,
        },
        request_id: requestId,
      });
      return;
    }

    const userRole = roleParse.data;

    // Check if user exists
    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        request_id: requestId,
      });
      return;
    }

    // Update role
    await setSingleRoleGroup(username, userRole);

    // Get updated user
    const updatedUser = await getUserByUsername(username);
    if (!updatedUser) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve updated user',
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<typeof updatedUser> = {
      data: updatedUser,
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error updating user role:`, error);
    
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        request_id: requestId,
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user role',
      },
      request_id: requestId,
    });
  }
}

/**
 * PATCH /v1/admin/users/:username/enable
 * Enable a user account
 */
export async function enableUser(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const username = req.params.username;

  try {
    // Check if user exists
    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        request_id: requestId,
      });
      return;
    }

    // Enable user
    await adminEnableUser(username);

    // Get updated user
    const updatedUser = await getUserByUsername(username);
    if (!updatedUser) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve updated user',
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<typeof updatedUser> = {
      data: updatedUser,
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error enabling user:`, error);
    
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        request_id: requestId,
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to enable user',
      },
      request_id: requestId,
    });
  }
}

/**
 * PATCH /v1/admin/users/:username/disable
 * Disable a user account
 */
export async function disableUser(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const username = req.params.username;

  try {
    // Check if user exists
    const existingUser = await getUserByUsername(username);
    if (!existingUser) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        request_id: requestId,
      });
      return;
    }

    // Disable user
    await adminDisableUser(username);

    // Get updated user
    const updatedUser = await getUserByUsername(username);
    if (!updatedUser) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve updated user',
        },
        request_id: requestId,
      });
      return;
    }

    const response: ApiSuccessResponse<typeof updatedUser> = {
      data: updatedUser,
      request_id: requestId,
    };

    res.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error disabling user:`, error);
    
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        request_id: requestId,
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to disable user',
      },
      request_id: requestId,
    });
  }
}

