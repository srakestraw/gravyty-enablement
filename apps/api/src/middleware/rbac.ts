import { Request, Response, NextFunction } from 'express';
import { UserRole, UserRoleSchema } from '@gravyty/domain';
import { AuthenticatedRequest } from '../types';

/**
 * RBAC Middleware Stub
 * 
 * ⚠️ SECURITY WARNING: This is a development stub only!
 * 
 * TODO: Replace with Cognito JWT validation before production deployment.
 * 
 * For now, reads role from x-dev-role header with basic validation.
 * In production, this MUST be replaced with proper JWT token validation.
 */
export function rbacMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const roleHeader = req.headers['x-dev-role'] as string;
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Warn in production if still using stub
  if (isProduction) {
    console.warn('⚠️  SECURITY WARNING: Using RBAC stub in production! Implement Cognito JWT validation immediately.');
  }
  
  // Default to Viewer if no role header
  let role: UserRole = 'Viewer';
  
  if (roleHeader) {
    const parsed = UserRoleSchema.safeParse(roleHeader);
    if (parsed.success) {
      role = parsed.data;
    } else {
      // Invalid role header - log warning but continue as Viewer
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
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Requires ${minRole} role or higher`,
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

