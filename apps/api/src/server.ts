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

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize storage repositories
export const storageRepos = createStorageRepos();

// Middleware
app.use(cors());
app.use(express.json());
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

