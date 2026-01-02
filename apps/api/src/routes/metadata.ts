/**
 * Metadata Routes
 * 
 * Metadata management API routes under /v1/metadata/*
 */

import express from 'express';
import { requireRole } from '../middleware/jwtAuth';
import * as metadataHandlers from '../handlers/metadata';
import * as migrationHandlers from '../handlers/metadataMigration';

const router = express.Router();

// IMPORTANT: More specific routes must come BEFORE less specific routes
// Express matches routes in order, so /:groupKey/options/:optionId/usage must come before /:groupKey/options

// Get usage count - Admin only (must come before /:groupKey/options)
router.get('/:groupKey/options/:optionId/usage', requireRole('Admin'), metadataHandlers.getMetadataOptionUsage);

// Merge option - Admin only (must come before /:groupKey/options)
router.post('/:groupKey/options/:optionId/merge', requireRole('Admin'), metadataHandlers.mergeMetadataOption);

// Delete option - Admin only (must come before /:groupKey/options)
router.delete('/:groupKey/options/:optionId', requireRole('Admin'), metadataHandlers.deleteMetadataOption);

// List options - public (Viewer+)
router.get('/:groupKey/options', requireRole('Viewer'), metadataHandlers.listMetadataOptions);

// Get single option - public (Viewer+)
router.get('/options/:optionId', requireRole('Viewer'), metadataHandlers.getMetadataOption);

// Create option - Admin only
router.post('/:groupKey/options', requireRole('Admin'), metadataHandlers.createMetadataOption);

// Update option - Admin only
router.patch('/options/:optionId', requireRole('Admin'), metadataHandlers.updateMetadataOption);

// Migration routes - Admin only
router.get('/migration/scan', requireRole('Admin'), migrationHandlers.scanLegacyMetadataValues);
router.post('/migration/apply', requireRole('Admin'), migrationHandlers.applyMetadataMigration);

export default router;

