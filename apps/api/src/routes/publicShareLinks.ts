/**
 * Public Share Link Routes
 * 
 * Public routes for external share link access (no authentication required)
 */

import express from 'express';
import * as publicShareLinkHandlers from '../handlers/publicShareLinks';
import * as shareDownloadHandlers from '../handlers/publicShareLinkDownloads';

const router = express.Router();

// Public routes - no authentication required
router.get('/s/:token', publicShareLinkHandlers.getShareLinkLanding);
router.post('/s/:token/events', publicShareLinkHandlers.trackShareEvent);
router.post('/s/:token/verify', publicShareLinkHandlers.verifyEmail);
router.get('/s/:token/attachments/:attachmentId/download', shareDownloadHandlers.downloadAttachmentByToken);
router.get('/s/:token/download', shareDownloadHandlers.downloadAllByToken);

export default router;


