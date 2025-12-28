/**
 * JWT Authentication Middleware
 * 
 * Validates Cognito JWT tokens and extracts user context
 */

import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { UserRole, UserRoleSchema } from '@gravyty/domain';
import { AuthenticatedRequest } from '../types';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const USER_POOL_CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID || '';

// Create JWT verifier
const jwtVerifier = USER_POOL_ID && USER_POOL_CLIENT_ID
  ? CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id',
      clientId: USER_POOL_CLIENT_ID,
    })
  : null;

/**
 * Extract role from Cognito groups claim
 * Falls back to Viewer if no groups or invalid group
 */
function extractRoleFromGroups(groups?: string[]): UserRole {
  if (!groups || groups.length === 0) {
    return 'Viewer';
  }

  // Check groups in precedence order (Admin > Approver > Contributor > Viewer)
  if (groups.includes('Admin')) {
    return 'Admin';
  }
  if (groups.includes('Approver')) {
    return 'Approver';
  }
  if (groups.includes('Contributor')) {
    return 'Contributor';
  }
  if (groups.includes('Viewer')) {
    return 'Viewer';
  }

  // Default to Viewer if group doesn't match
  return 'Viewer';
}

/**
 * JWT Authentication Middleware
 * 
 * Validates JWT token from Authorization header and extracts user context
 */
export async function jwtAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Allow fallback to dev headers if JWT verification not configured
  if (!jwtVerifier) {
    console.warn('⚠️  JWT verification not configured. Using dev header fallback.');
    return fallbackToDevHeaders(req, res, next);
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Try fallback to dev headers for local development
    if (process.env.NODE_ENV !== 'production') {
      return fallbackToDevHeaders(req, res, next);
    }

    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid Authorization header',
      },
      request_id: requestId,
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify JWT token
    const payload = await jwtVerifier.verify(token);

    // Extract user ID from 'sub' claim
    const userId = payload.sub;

    // Extract groups from 'cognito:groups' claim
    const groups = payload['cognito:groups'] as string[] | undefined;
    const role = extractRoleFromGroups(groups);

    // Extract email if available
    const email = payload.email as string | undefined;

    // Debug logging in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JWT Auth] Token verified:', {
        userId,
        email,
        groups,
        extractedRole: role,
        hasCognitoGroups: !!payload['cognito:groups'],
        allClaims: Object.keys(payload),
      });
    }

    // Attach user context to request
    req.user = {
      role,
      user_id: userId,
      email,
    };

    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Invalid token',
      },
      request_id: requestId,
    });
  }
}

/**
 * Fallback to dev headers for local development
 */
function fallbackToDevHeaders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const roleHeader = req.headers['x-dev-role'] as string;
  
  // Default to Viewer if no role header
  let role: UserRole = 'Viewer';
  
  if (roleHeader) {
    const parsed = UserRoleSchema.safeParse(roleHeader);
    if (parsed.success) {
      role = parsed.data;
    } else {
      console.warn(`Invalid role header: ${roleHeader}. Defaulting to Viewer.`);
    }
  }

  // Attach user context to request
  req.user = {
    role,
    user_id: req.headers['x-dev-user-id'] as string || 'dev-user',
  };

  next();
}

/**
 * Require specific role or higher
 */
export function requireRole(minRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    Viewer: 0,
    Contributor: 1,
    Approver: 2,
    Admin: 3,
  };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = roleHierarchy[minRole] || 0;

    if (userLevel < requiredLevel) {
      const requestId = req.headers['x-request-id'] as string || generateRequestId();
      
      // Debug logging in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[RBAC] Access denied:', {
          userRole,
          userLevel,
          requiredRole: minRole,
          requiredLevel,
          userId: req.user?.user_id,
          email: req.user?.email,
        });
      }
      
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Requires ${minRole} role or higher. Current role: ${userRole}`,
        },
        request_id: requestId,
      });
      return;
    }

    next();
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}



