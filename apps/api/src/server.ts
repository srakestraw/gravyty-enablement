import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/requestId';
// TEMPORARY: Using new simplified middleware
import { jwtAuthMiddlewareNew as jwtAuthMiddleware, requireRoleNew as requireRole } from './middleware/jwtAuth.new';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter, telemetryRateLimiter } from './middleware/rateLimit';
import * as eventHandlers from './handlers/events';
import * as analyticsHandlers from './handlers/analytics';
import { createStorageRepos } from './storage/factory';
import lmsRoutes from './routes/lms';
import adminUsersRoutes from './routes/adminUsers';
import metadataRoutes from './routes/metadata';
import searchRoutes from './routes/search';

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize storage repositories
export const storageRepos = createStorageRepos();

// Middleware
app.use(cors());
// JSON parser - only parse when Content-Type is application/json
// This allows raw body parsers on specific routes to work correctly
app.use(express.json({ 
  limit: '50mb',
  type: (req) => {
    // Skip JSON parsing for file upload routes - let route-specific raw parser handle it
    if (req.path.includes('/media/') && req.path.includes('/upload') && req.method === 'PUT') {
      return false;
    }
    // Only parse JSON content types
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('application/json');
  }
}));
app.use(requestIdMiddleware);
app.use(apiRateLimiter); // Apply rate limiting to all routes

// Debug endpoint - shows auth info (uses new middleware)
app.get('/debug/auth-info', jwtAuthMiddleware, (req: express.Request, res: express.Response) => {
  const authReq = req as any;
  
  // Decode token manually for comparison
  let decodedToken: any = null;
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const tokenParts = token.split('.');
      if (tokenParts.length >= 2) {
        decodedToken = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
      }
    }
  } catch (e) {
    // Ignore
  }
  
  res.json({
    message: 'Debug endpoint - shows processed authentication info',
    timestamp: new Date().toISOString(),
    
    // What the middleware processed
    user: authReq.user || 'not set',
    userRole: authReq.user?.role || 'not set',
    tokenGroups: authReq.tokenGroups || 'not available',
    
    // Raw token decode
    decodedToken: decodedToken ? {
      email: decodedToken.email,
      cognitoGroups: decodedToken['cognito:groups'],
      groups: decodedToken.groups,
    } : 'could not decode token',
    
    // Diagnostic
    diagnostic: {
      hasGroupsInToken: !!decodedToken?.['cognito:groups'] || !!decodedToken?.groups,
      groupsExtracted: !!authReq.tokenGroups && Array.isArray(authReq.tokenGroups) && authReq.tokenGroups.length > 0,
      roleDetermined: !!authReq.user?.role,
      roleIsAdmin: authReq.user?.role === 'Admin',
    },
  });
});

// Test endpoint to verify admin access (runs WITH jwtAuthMiddleware and requireRole)
app.get('/debug/test-admin', jwtAuthMiddleware, requireRole('Admin'), (req: express.Request, res: express.Response) => {
  const authReq = req as any;
  res.json({
    message: '✅ Admin access granted!',
    user: authReq.user,
    tokenGroups: authReq.tokenGroups,
    timestamp: new Date().toISOString(),
  });
});

// Apply JWT auth to all routes (using new simplified middleware)
app.use(jwtAuthMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API v1 routes
const v1 = express.Router();

// Event routes
v1.post('/events', telemetryRateLimiter, eventHandlers.createEvent);

// Analytics routes (Admin only)
v1.get('/analytics/overview', requireRole('Admin'), analyticsHandlers.getAnalyticsOverview);
v1.get('/analytics/content', requireRole('Admin'), analyticsHandlers.getContentAnalytics);
v1.get('/analytics/users', requireRole('Admin'), analyticsHandlers.getUserAnalytics);

// LMS routes (Viewer+)
v1.use('/lms', lmsRoutes);

// LMS Admin routes (Contributor+)
import lmsAdminRoutes from './routes/lmsAdmin';
v1.use('/lms/admin', lmsAdminRoutes);

// Admin Users routes (Admin only)
v1.use('/admin/users', requireRole('Admin'), adminUsersRoutes);

// Badge routes (Admin only)
import badgeRoutes from './routes/badges';
v1.use('/admin/badges', badgeRoutes);

// Metadata routes (Viewer+ for read, Admin for write)
v1.use('/metadata', metadataRoutes);

// Prompt Helpers routes (Admin for management, Contributor+ for consumer)
import promptHelpersRoutes from './routes/promptHelpers';
v1.use('/', promptHelpersRoutes);

// Search routes (Viewer+)
v1.use('/search', searchRoutes);

// Content Hub routes (Viewer+)
import contentHubRoutes from './routes/contentHub';
v1.use('/', contentHubRoutes);

// Google Drive Integration routes
import googleDriveRoutes from './routes/googleDriveIntegration';
v1.use('/integrations/google-drive', googleDriveRoutes);

// Asset import/sync routes (part of Content Hub)
import * as googleDriveImportHandlers from './handlers/googleDriveAssetImport';
v1.post('/assets/import/google-drive', requireRole('Contributor'), googleDriveImportHandlers.importFromGoogleDrive);
v1.post('/assets/:id/sync', requireRole('Contributor'), googleDriveImportHandlers.syncAssetFromDrive);
v1.get('/assets/:id/sync-status', requireRole('Viewer'), googleDriveImportHandlers.getAssetSyncStatus);

// Public share link routes (no authentication)
import publicShareLinkRoutes from './routes/publicShareLinks';
app.use('/v1', publicShareLinkRoutes); // Mount at /v1 level for consistency

app.use('/v1', v1);

// Error handler (must be last)
app.use(errorHandler);

// Start server (only if not in Lambda)
if (process.env.AWS_LAMBDA_FUNCTION_NAME === undefined) {
  app.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📚 API docs: http://localhost:${PORT}/v1`);
  });
}

export default app;

