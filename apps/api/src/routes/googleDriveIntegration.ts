/**
 * Google Drive Integration Routes
 * 
 * Routes for Google Drive OAuth and file operations
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as googleDriveHandlers from '../handlers/googleDriveIntegration';
import * as googleDriveImportHandlers from '../handlers/googleDriveAssetImport';

const router = express.Router();

// Admin endpoints (Admin only)
router.post('/connect', requireRole('Admin'), googleDriveHandlers.connectGoogleDrive);
router.post('/callback', requireRole('Admin'), googleDriveHandlers.googleDriveCallback);
router.get('/status', requireRole('Admin'), googleDriveHandlers.getGoogleDriveStatus);
router.post('/disconnect', requireRole('Admin'), googleDriveHandlers.disconnectGoogleDrive);

// User endpoints (Viewer+)
router.get('/browse', requireRole('Viewer'), googleDriveHandlers.browseGoogleDrive);

export default router;

