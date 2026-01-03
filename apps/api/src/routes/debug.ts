/**
 * Debug Routes
 * 
 * Temporary routes for debugging authentication issues
 */

import express from 'express';
import { jwtAuthMiddlewareNew as jwtAuthMiddleware } from '../middleware/jwtAuth.new';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Debug endpoint to see what the API sees
router.get('/auth-info', jwtAuthMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.user,
    tokenGroups: (req as any).tokenGroups || 'not available',
    tokenPayloadGroups: (req as any).tokenPayloadGroups || 'not available',
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'not present',
    },
  });
});

export default router;

