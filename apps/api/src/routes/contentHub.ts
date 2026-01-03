/**
 * Content Hub Routes
 * 
 * Content Hub API routes under /v1/assets/* and /v1/versions/*
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as contentHubHandlers from '../handlers/contentHub';
import * as lifecycleHandlers from '../handlers/contentHubLifecycle';
import * as commentHandlers from '../handlers/contentHubComments';
import * as flagHandlers from '../handlers/contentHubFlags';
import * as subscriptionHandlers from '../handlers/contentHubSubscriptions';
import * as shareLinkHandlers from '../handlers/contentHubShareLinks';
import * as downloadHandlers from '../handlers/contentHubDownloads';

const router = express.Router();

// All Content Hub routes require Viewer+ role
router.use(requireRole('Viewer'));

// Assets
router.post('/assets', requireRole('Contributor'), contentHubHandlers.createAsset);
router.get('/assets', contentHubHandlers.listAssets);
router.get('/assets/keywords', contentHubHandlers.getAssetKeywords);
router.get('/assets/:id', contentHubHandlers.getAsset);
router.patch('/assets/:id', requireRole('Contributor'), contentHubHandlers.updateAsset);
// Pin/unpin temporarily disabled - handlers not implemented
// router.post('/assets/:id/pin', requireRole('Approver'), contentHubHandlers.pinAsset);
// router.delete('/assets/:id/pin', requireRole('Approver'), contentHubHandlers.unpinAsset);

// Versions
router.post('/assets/:id/versions/init-upload', requireRole('Contributor'), contentHubHandlers.initUpload);
router.post('/assets/:id/versions/complete-upload', requireRole('Contributor'), contentHubHandlers.completeUpload);
router.post('/assets/:id/versions/save-rich-text', requireRole('Contributor'), contentHubHandlers.saveRichTextContent);
router.get('/assets/:id/versions', contentHubHandlers.listVersions);

// Downloads
router.get('/versions/:id/download-url', contentHubHandlers.getDownloadUrl);
router.get('/assets/:assetId/attachments/:attachmentId/download', downloadHandlers.downloadAttachment);
router.get('/assets/:assetId/download', downloadHandlers.downloadAllAttachments);

// Lifecycle (Approver+)
router.post('/versions/:id/publish', requireRole('Approver'), lifecycleHandlers.publishVersionHandler);
router.post('/versions/:id/schedule', requireRole('Approver'), lifecycleHandlers.scheduleVersion);
router.patch('/versions/:id/expire-at', requireRole('Approver'), lifecycleHandlers.setExpireAt);
router.post('/versions/:id/expire', requireRole('Approver'), lifecycleHandlers.expireVersion);
router.post('/versions/:id/archive', requireRole('Approver'), lifecycleHandlers.archiveVersion);

// Comments (authenticated)
router.post('/assets/:id/comments', commentHandlers.createComment);
router.get('/assets/:id/comments', commentHandlers.listComments);
router.patch('/comments/:id/resolve', commentHandlers.resolveComment);

// Flags and Requests (authenticated)
router.post('/assets/:id/flags/outdated', flagHandlers.flagOutdated);
router.get('/assets/:id/flags', flagHandlers.listFlags);
router.patch('/flags/:id/resolve', flagHandlers.resolveFlag);
router.post('/assets/:id/requests/update', flagHandlers.requestUpdate);
router.get('/assets/:id/requests', flagHandlers.listRequests);
router.patch('/requests/:id/resolve', flagHandlers.resolveRequest);

// Subscriptions (authenticated)
router.post('/subscriptions', subscriptionHandlers.createSubscription);
router.get('/subscriptions', subscriptionHandlers.listSubscriptions);
router.get('/subscriptions/check', subscriptionHandlers.checkSubscription);
router.delete('/subscriptions/:id', subscriptionHandlers.deleteSubscription);

// Share Links (Contributor+)
router.post('/share-links', requireRole('Contributor'), shareLinkHandlers.createShareLink);
router.get('/share-links', shareLinkHandlers.listShareLinks);
router.post('/share-links/:id/revoke', shareLinkHandlers.revokeShareLink);

export default router;

