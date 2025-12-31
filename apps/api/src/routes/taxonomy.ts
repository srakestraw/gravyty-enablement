/**
 * Taxonomy Routes
 * 
 * Taxonomy management API routes under /v1/taxonomy/*
 */

import express from 'express';
import { requireRole } from '../middleware/jwtAuth';
import * as taxonomyHandlers from '../handlers/taxonomy';
import * as migrationHandlers from '../handlers/taxonomyMigration';

const router = express.Router();

// List options - public (Viewer+)
router.get('/:groupKey/options', requireRole('Viewer'), taxonomyHandlers.listTaxonomyOptions);

// Get single option - public (Viewer+)
router.get('/options/:optionId', requireRole('Viewer'), taxonomyHandlers.getTaxonomyOption);

// Create option - Admin only
router.post('/:groupKey/options', requireRole('Admin'), taxonomyHandlers.createTaxonomyOption);

// Update option - Admin only
router.patch('/options/:optionId', requireRole('Admin'), taxonomyHandlers.updateTaxonomyOption);

// Get usage count - Admin only
router.get('/:groupKey/options/:optionId/usage', requireRole('Admin'), taxonomyHandlers.getTaxonomyOptionUsage);

// Delete option - Admin only
router.delete('/:groupKey/options/:optionId', requireRole('Admin'), taxonomyHandlers.deleteTaxonomyOption);

// Merge option - Admin only
router.post('/:groupKey/options/:optionId/merge', requireRole('Admin'), taxonomyHandlers.mergeTaxonomyOption);

// Migration routes - Admin only
router.get('/migration/scan', requireRole('Admin'), migrationHandlers.scanLegacyTaxonomyValues);
router.post('/migration/apply', requireRole('Admin'), migrationHandlers.applyTaxonomyMigration);

export default router;

