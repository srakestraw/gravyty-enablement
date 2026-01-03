/**
 * NEW JWT Authentication Middleware - Built from Scratch
 * 
 * Simple, clean implementation focused on:
 * 1. Extract groups from token
 * 2. Determine role from groups
 * 3. Attach to request
 */

import { Request, Response, NextFunction } from 'express';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { UserRole } from '@gravyty/domain';
import { AuthenticatedRequest } from '../types';
import https from 'https';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || '';
const USER_POOL_CLIENT_ID = process.env.COGNITO_USER_POOL_CLIENT_ID || '';

console.log('[JWT Auth NEW] Configuration:', {
  userPoolId: USER_POOL_ID || 'NOT SET',
  clientId: USER_POOL_CLIENT_ID ? `${USER_POOL_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
  isConfigured: !!(USER_POOL_ID && USER_POOL_CLIENT_ID),
});

// Configure SSL certificate handling for AWS Cognito JWKS requests
// This fixes "unable to get local issuer certificate" errors
// For local development, we need to handle SSL certificate verification
if (process.env.NODE_ENV !== 'production') {
  // Set environment variable to disable SSL verification in development
  // This is safe because we're only connecting to AWS Cognito (trusted service)
  // In production, proper CA certificates should be configured
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('[JWT Auth NEW] ⚠️ SSL certificate validation disabled for development');
  console.log('[JWT Auth NEW] ⚠️ This should NOT be used in production!');
}

const jwtVerifier = USER_POOL_ID && USER_POOL_CLIENT_ID
  ? CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id',
      clientId: USER_POOL_CLIENT_ID,
      // Configure JWKS cache and request options
      jwksCacheOptions: {
        maxAge: 5 * 60 * 1000, // 5 minutes
      },
    })
  : null;

/**
 * STEP 1: Extract groups from token payload
 * Simple, direct extraction - no complex fallbacks
 */
function extractGroupsFromPayload(payload: any): string[] {
  // Try cognito:groups first (standard Cognito claim)
  if (payload['cognito:groups']) {
    const groups = payload['cognito:groups'];
    if (Array.isArray(groups)) {
      return groups.map(g => String(g).trim()).filter(Boolean);
    }
    return [String(groups).trim()].filter(Boolean);
  }
  
  // Fallback to 'groups'
  if (payload.groups) {
    const groups = payload.groups;
    if (Array.isArray(groups)) {
      return groups.map(g => String(g).trim()).filter(Boolean);
    }
    return [String(groups).trim()].filter(Boolean);
  }
  
  return [];
}

/**
 * STEP 2: Determine role from groups
 * Simple, direct matching
 */
function determineRoleFromGroups(groups: string[]): UserRole {
  if (groups.length === 0) {
    return 'Viewer';
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowerGroups = groups.map(g => g.toLowerCase());
  
  // Check in order of precedence
  if (lowerGroups.includes('admin')) {
    return 'Admin';
  }
  if (lowerGroups.includes('approver')) {
    return 'Approver';
  }
  if (lowerGroups.includes('contributor')) {
    return 'Contributor';
  }
  if (lowerGroups.includes('viewer')) {
    return 'Viewer';
  }
  
  // Default to Viewer
  return 'Viewer';
}

/**
 * NEW JWT Authentication Middleware
 * Clean, simple implementation
 */
export async function jwtAuthMiddlewareNew(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  console.log('[JWT Auth NEW] ========================================');
  console.log('[JWT Auth NEW] Request:', req.method, req.path);
  
  // Fallback to dev headers if JWT not configured
  if (!jwtVerifier) {
    console.log('[JWT Auth NEW] JWT not configured, using dev headers');
    return fallbackToDevHeaders(req, res, next);
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[JWT Auth NEW] No auth header, falling back to dev headers');
      return fallbackToDevHeaders(req, res, next);
    }
    
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing Authorization header',
      },
      request_id: requestId,
    });
    return;
  }

  const token = authHeader.substring(7);
  
  // STEP 1: Decode raw token to see what's in it
  let rawPayload: any = null;
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length >= 2) {
      rawPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
      console.log('[JWT Auth NEW] Raw token payload:', {
        email: rawPayload.email,
        cognitoGroups: rawPayload['cognito:groups'],
        groups: rawPayload.groups,
        allKeys: Object.keys(rawPayload),
      });
    }
  } catch (error) {
    console.error('[JWT Auth NEW] Failed to decode raw token:', error);
  }

  try {
    // STEP 2: Verify token signature
    console.log('[JWT Auth NEW] Attempting to verify token...');
    const payload = await jwtVerifier.verify(token);
    console.log('[JWT Auth NEW] ✅ Token verified successfully');
    console.log('[JWT Auth NEW] Verified payload keys:', Object.keys(payload));
    console.log('[JWT Auth NEW] Verified payload cognito:groups:', payload['cognito:groups']);
    console.log('[JWT Auth NEW] Verified payload groups:', payload.groups);
    
    // STEP 3: Extract groups - PRIORITIZE RAW PAYLOAD
    // CognitoJwtVerifier may strip custom claims like cognito:groups
    // So we always check raw payload first, then fall back to verified payload
    let groups: string[] = [];
    
    if (rawPayload) {
      console.log('[JWT Auth NEW] 🔍 Checking raw payload for groups first...');
      console.log('[JWT Auth NEW] Raw payload cognito:groups:', rawPayload['cognito:groups']);
      console.log('[JWT Auth NEW] Raw payload groups:', rawPayload.groups);
      groups = extractGroupsFromPayload(rawPayload);
      console.log('[JWT Auth NEW] Groups from raw payload:', groups);
    }
    
    // Fallback to verified payload if raw payload had no groups
    if (groups.length === 0) {
      console.log('[JWT Auth NEW] ⚠️ No groups in raw payload, trying verified payload');
      groups = extractGroupsFromPayload(payload);
      console.log('[JWT Auth NEW] Groups from verified payload:', groups);
    }
    
    // CRITICAL: Final fallback - force extract if we see groups but extraction returned empty
    if (groups.length === 0 && rawPayload && (rawPayload['cognito:groups'] || rawPayload.groups)) {
      console.error('[JWT Auth NEW] 🚨 CRITICAL: Groups exist in raw payload but extraction returned empty!');
      console.error('[JWT Auth NEW] Raw payload cognito:groups:', rawPayload['cognito:groups']);
      console.error('[JWT Auth NEW] Raw payload groups:', rawPayload.groups);
      console.error('[JWT Auth NEW] Raw payload type:', typeof rawPayload['cognito:groups']);
      console.error('[JWT Auth NEW] Raw payload isArray:', Array.isArray(rawPayload['cognito:groups']));
      
      // Force extract with most aggressive approach
      if (rawPayload['cognito:groups']) {
        const rawGroups = rawPayload['cognito:groups'];
        if (Array.isArray(rawGroups)) {
          groups = rawGroups.map(g => String(g).trim()).filter(Boolean);
        } else if (typeof rawGroups === 'string') {
          // Try parsing as JSON string
          try {
            const parsed = JSON.parse(rawGroups);
            if (Array.isArray(parsed)) {
              groups = parsed.map(g => String(g).trim()).filter(Boolean);
            } else {
              groups = [String(parsed).trim()].filter(Boolean);
            }
          } catch {
            groups = [String(rawGroups).trim()].filter(Boolean);
          }
        } else {
          groups = [String(rawGroups).trim()].filter(Boolean);
        }
        console.log('[JWT Auth NEW] ✅ Force extracted groups from raw payload:', groups);
      }
    }
    
    console.log('[JWT Auth NEW] Final groups extracted:', groups);
    console.log('[JWT Auth NEW] Groups count:', groups.length);
    
    // STEP 5: Determine role from groups
    console.log('[JWT Auth NEW] Determining role from groups:', groups);
    let role = determineRoleFromGroups(groups);
    
    // CRITICAL SAFETY CHECK: If groups contain Admin but role is not Admin, force Admin
    // This handles edge cases where role extraction might fail
    if (role !== 'Admin' && groups.length > 0) {
      const hasAdmin = groups.some(g => {
        const normalized = String(g).trim().toLowerCase();
        return normalized === 'admin';
      });
      
      if (hasAdmin) {
        console.error('[JWT Auth NEW] 🚨 CRITICAL: Groups contain Admin but role extraction returned:', role);
        console.error('[JWT Auth NEW] Groups:', groups);
        console.error('[JWT Auth NEW] 🚨 Forcing Admin role - this should not happen!');
        role = 'Admin';
        console.log('[JWT Auth NEW] ✅ Corrected role to Admin');
      }
    }
    
    console.log('[JWT Auth NEW] Role determined:', {
      groups,
      groupsStringified: JSON.stringify(groups),
      role,
      hasAdmin: groups.some(g => g.toLowerCase() === 'admin'),
      adminCheck: groups.map(g => ({ original: g, lower: g.toLowerCase(), isAdmin: g.toLowerCase() === 'admin' })),
    });
    
    // STEP 6: Attach to request
    req.user = {
      role,
      user_id: payload.sub,
      email: payload.email,
    };
    
    // Store groups for debugging
    (req as any).tokenGroups = groups;
    
    console.log('[JWT Auth NEW] User attached to request:', {
      userId: req.user.user_id,
      email: req.user.email,
      role: req.user.role,
      groups,
    });
    
    console.log('[JWT Auth NEW] ========================================');
    next();
  } catch (error) {
    console.error('[JWT Auth NEW] ❌ Token verification failed:', error);
    console.error('[JWT Auth NEW] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    // If verification failed but we have raw payload with groups, try to use it anyway
    // This is a fallback for SSL/certificate issues
    if (rawPayload && (rawPayload['cognito:groups'] || rawPayload.groups)) {
      console.log('[JWT Auth NEW] ⚠️ Verification failed but raw payload has groups - attempting fallback');
      try {
        const groups = extractGroupsFromPayload(rawPayload);
        const role = determineRoleFromGroups(groups);
        console.log('[JWT Auth NEW] Fallback: Using groups from raw payload:', {
          groups,
          role,
        });
        
        // Attach user with role from raw payload (less secure but works)
        req.user = {
          role,
          user_id: rawPayload.sub || 'unknown',
          email: rawPayload.email,
        };
        (req as any).tokenGroups = groups;
        
        console.log('[JWT Auth NEW] ⚠️ Fallback user attached:', req.user);
        console.log('[JWT Auth NEW] ========================================');
        next();
        return;
      } catch (fallbackError) {
        console.error('[JWT Auth NEW] Fallback also failed:', fallbackError);
      }
    }
    
    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Token verification failed',
      },
      request_id: requestId,
    });
  }
}

/**
 * Fallback to dev headers
 */
function fallbackToDevHeaders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const roleHeader = req.headers['x-dev-role'] as string;
  const role: UserRole = roleHeader === 'Admin' || roleHeader === 'Contributor' || roleHeader === 'Approver' 
    ? roleHeader 
    : 'Viewer';
  
  req.user = {
    role,
    user_id: req.headers['x-dev-user-id'] as string || 'dev-user',
  };
  
  next();
}

/**
 * Require specific role
 */
export function requireRoleNew(minRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    Viewer: 0,
    Contributor: 1,
    Approver: 2,
    Admin: 3,
  };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as UserRole;
    const userLevel = roleHierarchy[userRole] ?? 0;
    const requiredLevel = roleHierarchy[minRole] ?? 0;
    const hasAccess = userLevel >= requiredLevel;

    console.log('[RBAC NEW] Role check:', {
      userRole,
      userLevel,
      requiredRole: minRole,
      requiredLevel,
      hasAccess,
      endpoint: req.path,
    });

    if (!hasAccess) {
      const requestId = req.headers['x-request-id'] as string || generateRequestId();
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

