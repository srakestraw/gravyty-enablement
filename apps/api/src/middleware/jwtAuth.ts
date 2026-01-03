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

// Log configuration on startup
console.log('[JWT Auth] Configuration:', {
  userPoolId: USER_POOL_ID || 'NOT SET',
  clientId: USER_POOL_CLIENT_ID ? `${USER_POOL_CLIENT_ID.substring(0, 10)}...` : 'NOT SET',
  isConfigured: !!(USER_POOL_ID && USER_POOL_CLIENT_ID),
});

// Create JWT verifier with cache configuration
const jwtVerifier = USER_POOL_ID && USER_POOL_CLIENT_ID
  ? CognitoJwtVerifier.create({
      userPoolId: USER_POOL_ID,
      tokenUse: 'id',
      clientId: USER_POOL_CLIENT_ID,
      // Configure JWKS cache to refresh more frequently
      // Default is 5 minutes, but we'll set it lower for better reliability
      cacheMaxAge: 2 * 60 * 1000, // 2 minutes
    })
  : null;

/**
 * Extract groups from various formats and normalize to string array
 * Handles: arrays, strings, JSON strings, single values, null/undefined
 */
export function normalizeGroups(groups: any): string[] {
  if (!groups) {
    return [];
  }

  // Already an array - normalize and return
  if (Array.isArray(groups)) {
    return groups
      .map(g => String(g).trim())
      .filter(Boolean)
      .filter(g => g.length > 0);
  }

  // String - try parsing as JSON first, then treat as single value
  if (typeof groups === 'string') {
    const trimmed = groups.trim();
    if (!trimmed) return [];
    
    // Try parsing as JSON
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map(g => String(g).trim())
          .filter(Boolean)
          .filter(g => g.length > 0);
      }
      // Single value from JSON
      return [String(parsed).trim()].filter(Boolean);
    } catch {
      // Not JSON, treat as single string value
      return [trimmed].filter(Boolean);
    }
  }

  // Other types - convert to string
  return [String(groups).trim()].filter(Boolean);
}

/**
 * Extract role from Cognito groups claim
 * Falls back to Viewer if no groups or invalid group
 * 
 * REFACTORED: Simplified and made more robust
 */
export function extractRoleFromGroups(groups?: string[] | any): UserRole {
  // Normalize groups to string array
  const normalizedGroups = normalizeGroups(groups);
  
  // Log for debugging
  console.log('[extractRoleFromGroups]', {
    input: groups,
    inputType: typeof groups,
    normalized: normalizedGroups,
    normalizedLowercase: normalizedGroups.map(g => g.toLowerCase()),
  });

  if (normalizedGroups.length === 0) {
    console.log('[extractRoleFromGroups] No groups found, returning Viewer');
    return 'Viewer';
  }

  // Convert to lowercase for case-insensitive matching
  const lowerGroups = normalizedGroups.map(g => g.toLowerCase());

  // Check in precedence order (Admin > Approver > Contributor > Viewer)
  // Use exact match on lowercase version
  if (lowerGroups.includes('admin')) {
    console.log('[extractRoleFromGroups] ✅ Admin role detected');
    return 'Admin';
  }
  if (lowerGroups.includes('approver')) {
    console.log('[extractRoleFromGroups] ✅ Approver role detected');
    return 'Approver';
  }
  if (lowerGroups.includes('contributor')) {
    console.log('[extractRoleFromGroups] ✅ Contributor role detected');
    return 'Contributor';
  }
  if (lowerGroups.includes('viewer')) {
    console.log('[extractRoleFromGroups] ✅ Viewer role detected');
    return 'Viewer';
  }

  // Default to Viewer
  console.log('[extractRoleFromGroups] ⚠️ No matching role found, defaulting to Viewer. Groups:', normalizedGroups);
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

  // Log request details for debugging
  console.log('[JWT Auth] ========================================');
  console.log('[JWT Auth] 🔍 NEW REQUEST - Starting JWT verification');
  console.log('[JWT Auth] Request path:', req.path);
  console.log('[JWT Auth] Request method:', req.method);
  console.log('[JWT Auth] Authorization header present:', !!authHeader);
  console.log('[JWT Auth] Token length:', token.length);
  console.log('[JWT Auth] Token preview:', token.substring(0, 50) + '...');

  // Decode token manually BEFORE verification to see raw payload
  // This helps debug if the verifier is stripping claims
  let rawPayload: any = null;
  let tokenIssuer: string | null = null;
  let tokenKid: string | null = null;
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length >= 2) {
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
      tokenKid = header.kid || null;
      
      // Decode payload BEFORE verification to see raw claims
      rawPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
      tokenIssuer = rawPayload.iss || null;
      
      // Log raw payload groups BEFORE verification - CRITICAL DEBUG INFO
      const rawGroups = rawPayload['cognito:groups'] || rawPayload.groups || [];
      console.log('[JWT Auth] 📋 Raw token payload (BEFORE verification):', {
        hasCognitoGroups: !!rawPayload['cognito:groups'],
        cognitoGroups: rawPayload['cognito:groups'],
        cognitoGroupsType: typeof rawPayload['cognito:groups'],
        cognitoGroupsIsArray: Array.isArray(rawPayload['cognito:groups']),
        cognitoGroupsStringified: JSON.stringify(rawPayload['cognito:groups']),
        hasGroups: !!rawPayload.groups,
        groups: rawPayload.groups,
        groupsType: typeof rawPayload.groups,
        groupsIsArray: Array.isArray(rawPayload.groups),
        rawGroupsExtracted: rawGroups,
        rawGroupsExtractedType: typeof rawGroups,
        rawGroupsExtractedIsArray: Array.isArray(rawGroups),
        allKeys: Object.keys(rawPayload).filter(k => k.toLowerCase().includes('group')),
        allPayloadKeys: Object.keys(rawPayload),
        email: rawPayload.email,
        issuer: rawPayload.iss,
        sub: rawPayload.sub,
        // Show full raw payload for debugging (truncated)
        fullRawPayload: JSON.stringify(rawPayload).substring(0, 1000),
      });
    } else {
      console.error('[JWT Auth] ❌ Invalid token format - expected 3 parts separated by dots, got:', tokenParts.length);
    }
  } catch (decodeError) {
    console.error('[JWT Auth] ❌ Failed to decode token before verification:', decodeError);
    if (decodeError instanceof Error) {
      console.error('[JWT Auth] Decode error details:', {
        message: decodeError.message,
        stack: decodeError.stack,
      });
    }
  }

  try {
    // Verify JWT token
    const payload = await jwtVerifier.verify(token);

    // Extract user ID from 'sub' claim
    const userId = payload.sub;

    // Extract groups from token - REFACTORED to be more robust
    // CRITICAL: Always use raw payload first since aws-jwt-verify may strip custom claims
    console.log('[JWT Auth] 🔍 STEP 1: Extracting groups from token...');
    
    let groups: string[] = [];
    
    // PRIORITY 1: Extract from raw payload (most reliable - before verification)
    if (rawPayload) {
      // Try cognito:groups first (standard Cognito claim)
      if (rawPayload['cognito:groups']) {
        groups = normalizeGroups(rawPayload['cognito:groups']);
        console.log('[JWT Auth] ✅ Extracted groups from raw payload (cognito:groups):', {
          original: rawPayload['cognito:groups'],
          normalized: groups,
        });
      }
      // Fallback to 'groups' claim
      else if (rawPayload.groups && groups.length === 0) {
        groups = normalizeGroups(rawPayload.groups);
        console.log('[JWT Auth] ✅ Extracted groups from raw payload (groups):', {
          original: rawPayload.groups,
          normalized: groups,
        });
      }
      
      // Log what we found
      if (groups.length === 0) {
        console.warn('[JWT Auth] ⚠️ No groups found in raw payload', {
          hasCognitoGroups: !!rawPayload['cognito:groups'],
          hasGroups: !!rawPayload.groups,
          allKeys: Object.keys(rawPayload),
          groupKeys: Object.keys(rawPayload).filter(k => k.toLowerCase().includes('group')),
        });
      }
    }
    
    // PRIORITY 2: Fallback to verified payload if raw didn't have groups
    if (groups.length === 0) {
      console.log('[JWT Auth] 🔄 Checking verified payload for groups...');
      
      if (payload['cognito:groups']) {
        groups = normalizeGroups(payload['cognito:groups']);
        console.log('[JWT Auth] ✅ Extracted groups from verified payload (cognito:groups):', groups);
      } else if (payload.groups) {
        groups = normalizeGroups(payload.groups);
        console.log('[JWT Auth] ✅ Extracted groups from verified payload (groups):', groups);
      } else if (payload.cognito_groups) {
        groups = normalizeGroups(payload.cognito_groups);
        console.log('[JWT Auth] ✅ Extracted groups from verified payload (cognito_groups):', groups);
      }
      
      if (groups.length === 0) {
        console.error('[JWT Auth] ❌ No groups found in verified payload either!', {
          verifiedPayloadKeys: Object.keys(payload),
          groupKeys: Object.keys(payload).filter(k => k.toLowerCase().includes('group')),
        });
      }
    }
    
    // FINAL FALLBACK: Try raw payload again if still no groups
    if (groups.length === 0 && rawPayload) {
      console.error('[JWT Auth] 🚨 CRITICAL: No groups extracted! Trying raw payload recovery...');
      // Try all possible group claim names
      const possibleKeys = ['cognito:groups', 'groups', 'cognito_groups'];
      for (const key of possibleKeys) {
        if (rawPayload[key]) {
          groups = normalizeGroups(rawPayload[key]);
          if (groups.length > 0) {
            console.log(`[JWT Auth] ✅ Recovered groups from raw payload (${key}):`, groups);
            break;
          }
        }
      }
    }
    
    // Log final groups state
    console.log('[JWT Auth] 📊 Final groups extracted:', {
      groups,
      count: groups.length,
      stringified: JSON.stringify(groups),
      hasAdmin: groups.some(g => g.toLowerCase() === 'admin'),
    });
    
    // Extract role from groups - REFACTORED
    console.log('[JWT Auth] 🎯 STEP 2: Extracting role from groups...');
    let role = extractRoleFromGroups(groups);
    
    // CRITICAL SAFETY CHECK: If groups contain Admin but role is not Admin, force Admin
    // This handles edge cases where role extraction might fail
    if (role !== 'Admin' && groups.length > 0) {
      const hasAdmin = groups.some(g => {
        const normalized = String(g).trim().toLowerCase();
        return normalized === 'admin';
      });
      
      if (hasAdmin) {
        console.error('[JWT Auth] 🚨 CRITICAL: Groups contain Admin but role extraction returned:', role);
        console.error('[JWT Auth] 🚨 Forcing Admin role - this should not happen!');
        role = 'Admin';
        console.log('[JWT Auth] ✅ Corrected role to Admin');
      }
    }
    
    const finalRole = role;
    
    console.log('[JWT Auth] 🎯 STEP 3: Final role determination:', {
      groups,
      extractedRole: role,
      finalRole,
      hasAdminInGroups: groups.some(g => g.toLowerCase() === 'admin'),
    });

    // Extract email if available
    const email = payload.email as string | undefined;

    // Always log token verification details (not just in dev mode)
    // This helps debug authentication issues
    console.log('[JWT Auth] ✅ Token verified (AFTER verification):', {
      userId,
      email,
      groups,
      groupsType: typeof groups,
      groupsIsArray: Array.isArray(groups),
      groupsLength: Array.isArray(groups) ? groups.length : 'N/A',
      groupsContent: Array.isArray(groups) ? groups : [groups],
      groupsStringified: JSON.stringify(groups),
      extractedRole: role,
      finalRole: finalRole,
      roleWasCorrected: role !== finalRole,
      hasCognitoGroups: !!payload['cognito:groups'],
      cognitoGroupsValue: payload['cognito:groups'],
      cognitoGroupsType: typeof payload['cognito:groups'],
      cognitoGroupsIsArray: Array.isArray(payload['cognito:groups']),
      cognitoGroupsStringified: JSON.stringify(payload['cognito:groups']),
      hasGroupsClaim: !!payload.groups,
      groupsClaimValue: payload.groups,
      groupsClaimType: typeof payload.groups,
      groupsClaimIsArray: Array.isArray(payload.groups),
      allPayloadKeys: Object.keys(payload).filter(k => k.toLowerCase().includes('group')),
      tokenIssuer: payload.iss,
      expectedIssuer: USER_POOL_ID ? `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${USER_POOL_ID}` : 'not configured',
      issuerMatches: payload.iss === (USER_POOL_ID ? `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${USER_POOL_ID}` : null),
      // Compare with raw payload
      rawPayloadHadGroups: rawPayload ? !!rawPayload['cognito:groups'] : 'N/A',
      rawPayloadGroups: rawPayload ? rawPayload['cognito:groups'] : 'N/A',
      rawPayloadGroupsType: rawPayload ? typeof rawPayload['cognito:groups'] : 'N/A',
      rawPayloadGroupsIsArray: rawPayload ? Array.isArray(rawPayload['cognito:groups']) : 'N/A',
      rawPayloadGroupsStringified: rawPayload ? JSON.stringify(rawPayload['cognito:groups']) : 'N/A',
      // Log full payload keys for debugging
      verifiedPayloadKeys: Object.keys(payload),
      rawPayloadKeys: rawPayload ? Object.keys(rawPayload) : 'N/A',
    });
    
    console.log('[JWT Auth] ========================================');

    // Attach user context to request (use finalRole which may have been corrected)
    req.user = {
      role: finalRole,
      user_id: userId,
      email,
    };
    
    // Store groups in request for debugging (always, not just dev mode)
    (req as any).tokenGroups = groups;
    (req as any).tokenPayloadGroups = payload['cognito:groups'];

    next();
  } catch (error) {
    // Enhanced error logging for JWKS issues
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isJwksError = errorMessage.includes('JWK') || errorMessage.includes('kid') || errorMessage.includes('JWKS');
    
    console.error('JWT verification failed:', {
      error: errorMessage,
      isJwksError,
      configuredUserPoolId: USER_POOL_ID,
      configuredClientId: USER_POOL_CLIENT_ID,
      tokenIssuer: tokenIssuer || 'unknown',
      tokenKid: tokenKid || 'unknown',
      expectedIssuer: USER_POOL_ID ? `https://cognito-idp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${USER_POOL_ID}` : 'not configured',
    });

    const requestId = req.headers['x-request-id'] as string || generateRequestId();
    
    // Provide more helpful error message for JWKS issues
    let userMessage = errorMessage;
    if (isJwksError) {
      userMessage = `JWT verification failed: ${errorMessage}. This may indicate a token from a different User Pool or a stale JWKS cache. Please sign out and sign in again.`;
    }
    
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: userMessage,
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

    // Always log role check (helps debug permission issues)
    console.log('[RBAC] 🔐 Role check:', {
      userRole,
      userLevel,
      requiredRole: minRole,
      requiredLevel,
      userId: req.user?.user_id,
      email: req.user?.email,
      groupsFromToken: (req as any).tokenGroups || 'not available',
      groupsFromTokenType: typeof (req as any).tokenGroups,
      groupsFromTokenIsArray: Array.isArray((req as any).tokenGroups),
      groupsFromTokenStringified: JSON.stringify((req as any).tokenGroups || 'not available'),
      groupsFromPayload: (req as any).tokenPayloadGroups || 'not available',
      groupsFromPayloadType: typeof (req as any).tokenPayloadGroups,
      groupsFromPayloadIsArray: Array.isArray((req as any).tokenPayloadGroups),
      groupsFromPayloadStringified: JSON.stringify((req as any).tokenPayloadGroups || 'not available'),
      endpoint: req.path,
      method: req.method,
      reqUserObject: req.user,
      willPass: userLevel >= requiredLevel,
      comparison: `${userLevel} >= ${requiredLevel} = ${userLevel >= requiredLevel}`,
    });

    if (userLevel < requiredLevel) {
      const requestId = req.headers['x-request-id'] as string || generateRequestId();
      
      // Always log access denied (helps debug permission issues)
      console.error('[RBAC] ❌ Access denied:', {
        userRole,
        userLevel,
        requiredRole: minRole,
        requiredLevel,
        userId: req.user?.user_id,
        email: req.user?.email,
        // Include groups from the original token payload if available
        groupsFromToken: (req as any).tokenGroups || 'not available',
        groupsFromTokenType: typeof (req as any).tokenGroups,
        groupsFromTokenIsArray: Array.isArray((req as any).tokenGroups),
        groupsFromTokenStringified: JSON.stringify((req as any).tokenGroups || 'not available'),
        groupsFromPayload: (req as any).tokenPayloadGroups || 'not available',
        groupsFromPayloadType: typeof (req as any).tokenPayloadGroups,
        groupsFromPayloadIsArray: Array.isArray((req as any).tokenPayloadGroups),
        groupsFromPayloadStringified: JSON.stringify((req as any).tokenPayloadGroups || 'not available'),
        endpoint: req.path,
        method: req.method,
        comparison: `${userLevel} >= ${requiredLevel} = ${userLevel >= requiredLevel}`,
        reqUserObject: req.user,
      });
      
      // Enhanced error response with debugging info
      const debugInfo = {
        userRole,
        userLevel,
        requiredRole: minRole,
        requiredLevel,
        userId: req.user?.user_id,
        email: req.user?.email,
        groupsFromToken: (req as any).tokenGroups || 'not available',
        groupsFromTokenStringified: JSON.stringify((req as any).tokenGroups || 'not available'),
        groupsFromPayload: (req as any).tokenPayloadGroups || 'not available',
        groupsFromPayloadStringified: JSON.stringify((req as any).tokenPayloadGroups || 'not available'),
        reqUserObject: req.user,
      };
      
      console.error('[RBAC] ❌ Sending 403 response with debug info:', debugInfo);
      
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Requires ${minRole} role or higher. Current role: ${userRole}`,
          // Include debug info in development
          ...(process.env.NODE_ENV !== 'production' && { debug: debugInfo }),
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



