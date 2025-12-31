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
  adminDeleteUser,
  getUserByUsername,
  findUserByUsernameOrEmail,
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
  const username = decodeURIComponent(req.params.username);

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

    // Check if user exists - try username first, then email if username fails
    let existingUser = await getUserByUsername(username);
    
    // If not found by username, try as email (for federated users)
    if (!existingUser && username.includes('@')) {
      // Try finding user by email in the list
      const usersResult = await listUsers({ query: username, limit: 1 });
      const foundUser = usersResult.users.find(u => u.email === username);
      if (foundUser) {
        existingUser = await getUserByUsername(foundUser.username);
      }
    }

    if (!existingUser) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User not found: ${username}`,
        },
        request_id: requestId,
      });
      return;
    }

    // Use the actual username from Cognito (might be UUID for federated users)
    const cognitoUsername = existingUser.username;

    // Update role
    await setSingleRoleGroup(cognitoUsername, userRole);

    // Get updated user
    const updatedUser = await getUserByUsername(cognitoUsername);
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
          message: `User not found: ${username}`,
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
  const username = decodeURIComponent(req.params.username);

  try {
    // Check if user exists - try username first, then email if username fails
    let existingUser = await getUserByUsername(username);
    
    // If not found by username, try as email (for federated users)
    if (!existingUser && username.includes('@')) {
      // Try finding user by email in the list
      const usersResult = await listUsers({ query: username, limit: 1 });
      const foundUser = usersResult.users.find(u => u.email === username);
      if (foundUser) {
        existingUser = await getUserByUsername(foundUser.username);
      }
    }

    if (!existingUser) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User not found: ${username}`,
        },
        request_id: requestId,
      });
      return;
    }

    // Use the actual username from Cognito (might be UUID for federated users)
    const cognitoUsername = existingUser.username;

    // Enable user
    await adminEnableUser(cognitoUsername);

    // Get updated user
    const updatedUser = await getUserByUsername(cognitoUsername);
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
          message: `User not found: ${username}`,
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
  const username = decodeURIComponent(req.params.username);

  try {
    // Check if user exists - try username first
    let existingUser = await getUserByUsername(username);
    
    // If not found by direct username lookup, search in user list
    // This handles cases where username might be UUID or email
    if (!existingUser) {
      // For UUIDs, we need to get all users and search manually (no filter)
      // For emails, we can use the filter to search
      let usersResult;
      if (username.includes('@')) {
        // Email - use filter to search efficiently
        usersResult = await listUsers({ query: username, limit: 100 });
      } else {
        // UUID - get all users and search by username field
        usersResult = await listUsers({ limit: 100 });
      }
      
      // Try to find by username (UUID) first
      let foundUser = usersResult.users.find(u => u.username === username);
      
      // If not found and it's an email, try by email
      if (!foundUser && username.includes('@')) {
        foundUser = usersResult.users.find(u => u.email === username);
      }
      
      // If found, use that user directly (already has all info from listUsers)
      // No need to call getUserByUsername again since listUsers already fetches groups
      if (foundUser) {
        existingUser = foundUser;
      }
    }

    if (!existingUser) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User not found: ${username}. The user may have been deleted or does not exist.`,
        },
        request_id: requestId,
      });
      return;
    }

    // Use the actual username from Cognito (might be UUID for federated users)
    const cognitoUsername = existingUser.username;

    // Disable user
    await adminDisableUser(cognitoUsername);

    // Get updated user
    const updatedUser = await getUserByUsername(cognitoUsername);
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
          message: `User not found: ${username}`,
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

/**
 * DELETE /v1/admin/users/:username
 * Delete a user account
 */
export async function deleteUser(req: AuthenticatedRequest, res: Response) {
  const requestId = req.headers['x-request-id'] as string;
  const username = decodeURIComponent(req.params.username);

  try {
    console.log(`[${requestId}] Attempting to delete user: ${username}`);
    
    // Check if user exists - try username first
    let existingUser = await getUserByUsername(username);
    
    // If not found by direct username lookup, use the search helper
    // This handles cases where username might be UUID or email
    if (!existingUser) {
      console.log(`[${requestId}] User not found by direct lookup, searching user list...`);
      existingUser = await findUserByUsernameOrEmail(username);
      
      if (existingUser) {
        console.log(`[${requestId}] Found user via search: ${existingUser.username} (${existingUser.email})`);
      } else {
        console.log(`[${requestId}] User not found in list after searching`);
      }
    }

    if (!existingUser) {
      console.error(`[${requestId}] User not found: ${username}`);
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User not found: ${username}. The user may have been deleted or does not exist.`,
        },
        request_id: requestId,
      });
      return;
    }

    // Use the actual username from Cognito (might be UUID for federated users)
    const cognitoUsername = existingUser.username;
    console.log(`[${requestId}] Deleting user with Cognito username: ${cognitoUsername} (email: ${existingUser.email})`);

    // Delete user - use the username we found
    // If this fails, it might be because the user was already deleted or doesn't exist
    try {
      await adminDeleteUser(cognitoUsername);
      console.log(`[${requestId}] Successfully deleted user: ${cognitoUsername}`);
    } catch (deleteError) {
      console.error(`[${requestId}] Error calling adminDeleteUser:`, deleteError);
      // Re-throw to be handled by outer catch
      throw deleteError;
    }

    res.status(204).send();
  } catch (error) {
    console.error(`[${requestId}] Error deleting user:`, error);
    
    if (error instanceof Error && error.name === 'UserNotFoundException') {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `User not found: ${username}`,
        },
        request_id: requestId,
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete user',
      },
      request_id: requestId,
    });
  }
}

