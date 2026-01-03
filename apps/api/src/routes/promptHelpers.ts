/**
 * Prompt Helpers Routes
 * 
 * Prompt helper management API routes
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as promptHelperHandlers from '../handlers/promptHelpers';

const router = express.Router();

// Admin routes - require Admin role
router.get('/admin/prompt-helpers', requireRole('Admin'), promptHelperHandlers.listPromptHelpers);
router.post('/admin/prompt-helpers', requireRole('Admin'), promptHelperHandlers.createPromptHelper);
router.get('/admin/prompt-helpers/:helperId', requireRole('Admin'), promptHelperHandlers.getPromptHelper);
router.put('/admin/prompt-helpers/:helperId', requireRole('Admin'), promptHelperHandlers.updatePromptHelper);
router.delete('/admin/prompt-helpers/:helperId', requireRole('Admin'), promptHelperHandlers.deletePromptHelper);
router.post('/admin/prompt-helpers/:helperId/publish', requireRole('Admin'), promptHelperHandlers.publishPromptHelper);
router.post('/admin/prompt-helpers/:helperId/archive', requireRole('Admin'), promptHelperHandlers.archivePromptHelper);
router.post('/admin/prompt-helpers/:helperId/set-default', requireRole('Admin'), promptHelperHandlers.setDefaultPromptHelper);
router.get('/admin/prompt-helpers/:helperId/versions', requireRole('Admin'), promptHelperHandlers.listPromptHelperVersions);
router.get('/admin/prompt-helpers/:helperId/audit-log', requireRole('Admin'), promptHelperHandlers.getPromptHelperAuditLog);

// Consumer routes - require Contributor+ role
router.get('/prompt-helpers', requireRole('Contributor'), promptHelperHandlers.getPromptHelpersForContext);
router.post('/prompt-helpers/compose-preview', requireRole('Contributor'), promptHelperHandlers.composePromptPreview);

export default router;


