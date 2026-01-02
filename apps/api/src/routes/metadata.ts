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

// List options - public (Viewer+)
router.get('/:groupKey/options', requireRole('Viewer'), metadataHandlers.listMetadataOptions);

// Get single option - public (Viewer+)
router.get('/options/:optionId', requireRole('Viewer'), metadataHandlers.getMetadataOption);

// Create option - Admin only
router.post('/:groupKey/options', requireRole('Admin'), metadataHandlers.createMetadataOption);

// Update option - Admin only
router.patch('/options/:optionId', requireRole('Admin'), metadataHandlers.updateMetadataOption);

// Get usage count - Admin only
router.get('/:groupKey/options/:optionId/usage', requireRole('Admin'), metadataHandlers.getMetadataOptionUsage);

// Delete option - Admin only
router.delete('/:groupKey/options/:optionId', requireRole('Admin'), metadataHandlers.deleteMetadataOption);

// Merge option - Admin only
router.post('/:groupKey/options/:optionId/merge', requireRole('Admin'), metadataHandlers.mergeMetadataOption);

// Migration routes - Admin only
router.get('/migration/scan', requireRole('Admin'), migrationHandlers.scanLegacyMetadataValues);
router.post('/migration/apply', requireRole('Admin'), migrationHandlers.applyMetadataMigration);

export default router;

