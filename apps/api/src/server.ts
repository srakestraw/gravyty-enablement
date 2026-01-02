import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/requestId';
import { jwtAuthMiddleware, requireRole } from './middleware/jwtAuth';
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
app.use(jwtAuthMiddleware); // JWT authentication (falls back to dev headers if not configured)

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

// Metadata routes (Viewer+ for read, Admin for write)
v1.use('/metadata', metadataRoutes);

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

