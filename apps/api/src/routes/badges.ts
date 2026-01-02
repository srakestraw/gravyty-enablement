/**
 * Badge Routes
 * 
 * Badge management API routes under /v1/admin/badges/*
 */

import express from 'express';
import { requireRoleNew as requireRole } from '../middleware/jwtAuth.new';
import * as badgeHandlers from '../handlers/badges';

const router = express.Router();

// All badge routes require Admin role
router.use(requireRole('Admin'));

// List badges
router.get('/', badgeHandlers.listBadges);

// Create badge
router.post('/', badgeHandlers.createBadge);

// Get badge details
router.get('/:badgeId', badgeHandlers.getBadge);

// Update badge
router.put('/:badgeId', badgeHandlers.updateBadge);

// Delete badge
router.delete('/:badgeId', badgeHandlers.deleteBadge);

// List badge awards
router.get('/:badgeId/awards', badgeHandlers.listBadgeAwards);

// Manually award badge to user
router.post('/:badgeId/award', badgeHandlers.awardBadgeToUser);

export default router;

