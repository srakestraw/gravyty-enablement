/**
 * Admin Users Routes
 * 
 * Admin user management API routes under /v1/admin/users/*
 */

import express from 'express';
import * as adminUsersHandlers from '../handlers/adminUsers';

const router = express.Router();

// List users
router.get('/', adminUsersHandlers.listAdminUsers);

// Invite user
router.post('/invite', adminUsersHandlers.inviteUser);

// Update user role
router.patch('/:username/role', adminUsersHandlers.updateUserRole);

// Enable user
router.patch('/:username/enable', adminUsersHandlers.enableUser);

// Disable user
router.patch('/:username/disable', adminUsersHandlers.disableUser);

// Delete user
router.delete('/:username', adminUsersHandlers.deleteUser);

export default router;

