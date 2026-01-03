/**
 * Search Routes
 * 
 * Unified search API routes under /v1/search/*
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as searchHandlers from '../handlers/unifiedSearch';

const router = express.Router();

// All search routes require Viewer+ role
router.use(requireRole('Viewer'));

// Unified search
router.get('/', searchHandlers.unifiedSearch);

export default router;


