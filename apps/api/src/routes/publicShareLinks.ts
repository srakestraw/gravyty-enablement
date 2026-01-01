/**
 * Public Share Link Routes
 * 
 * Public routes for external share link access (no authentication required)
 */

import express from 'express';
import * as publicShareLinkHandlers from '../handlers/publicShareLinks';

const router = express.Router();

// Public routes - no authentication required
router.get('/s/:token', publicShareLinkHandlers.getShareLinkLanding);
router.post('/s/:token/events', publicShareLinkHandlers.trackShareEvent);
router.post('/s/:token/verify', publicShareLinkHandlers.verifyEmail);

export default router;

