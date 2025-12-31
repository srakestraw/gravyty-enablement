/**
 * Learning Permissions Utility
 * 
 * Maps role-based permissions to learning permission keys.
 * Used to control UI visibility and actions based on user roles.
 */

import type { Role } from './roles';
import { normalizeRole } from './roles';

export type LearningPermission =
  // View permissions
  | 'learning.course.view.published'
  | 'learning.path.view.published'
  // Create permissions
  | 'learning.course.create'
  | 'learning.path.create'
  // Edit permissions
  | 'learning.course.edit.own'
  | 'learning.course.edit.any'
  | 'learning.path.edit.own'
  | 'learning.path.edit.any'
  // Draft view permissions
  | 'learning.course.view.drafts.own'
  | 'learning.course.view.drafts.any'
  | 'learning.path.view.drafts.own'
  | 'learning.path.view.drafts.any'
  // Publish permissions
  | 'learning.course.publish'
  | 'learning.path.publish'
  // Archive permissions (if supported)
  | 'learning.course.archive'
  | 'learning.path.archive'
  // Admin gate
  | 'admin.access';

/**
 * Check if user has a specific learning permission
 */
export function hasLearningPermission(
  userRole: string | null | undefined,
  permission: LearningPermission
): boolean {
  const role = normalizeRole(userRole);
  
  // Admin gate - only Admin role has admin.access
  if (permission === 'admin.access') {
    return role === 'Admin';
  }

  // Viewer baseline permissions
  if (role === 'Viewer') {
    return (
      permission === 'learning.course.view.published' ||
      permission === 'learning.path.view.published'
    );
  }

  // Contributor permissions
  if (role === 'Contributor') {
    // View published
    if (
      permission === 'learning.course.view.published' ||
      permission === 'learning.path.view.published'
    ) {
      return true;
    }
    // Create
    if (
      permission === 'learning.course.create' ||
      permission === 'learning.path.create'
    ) {
      return true;
    }
    // Edit own
    if (
      permission === 'learning.course.edit.own' ||
      permission === 'learning.path.edit.own'
    ) {
      return true;
    }
    // View drafts own
    if (
      permission === 'learning.course.view.drafts.own' ||
      permission === 'learning.path.view.drafts.own'
    ) {
      return true;
    }
    return false;
  }

  // Approver permissions (Contributor + publish)
  if (role === 'Approver') {
    // All Contributor permissions
    if (
      permission === 'learning.course.view.published' ||
      permission === 'learning.path.view.published' ||
      permission === 'learning.course.create' ||
      permission === 'learning.path.create' ||
      permission === 'learning.course.edit.own' ||
      permission === 'learning.path.edit.own' ||
      permission === 'learning.course.view.drafts.own' ||
      permission === 'learning.path.view.drafts.own'
    ) {
      return true;
    }
    // Publish
    if (
      permission === 'learning.course.publish' ||
      permission === 'learning.path.publish'
    ) {
      return true;
    }
    // Edit any (can edit others' content)
    if (
      permission === 'learning.course.edit.any' ||
      permission === 'learning.path.edit.any'
    ) {
      return true;
    }
    // View drafts any
    if (
      permission === 'learning.course.view.drafts.any' ||
      permission === 'learning.path.view.drafts.any'
    ) {
      return true;
    }
    return false;
  }

  // Admin permissions (all permissions)
  if (role === 'Admin') {
    return true;
  }

  return false;
}

/**
 * Check if user can create courses/paths
 */
export function canCreateCourse(userRole: string | null | undefined): boolean {
  return hasLearningPermission(userRole, 'learning.course.create');
}

export function canCreatePath(userRole: string | null | undefined): boolean {
  return hasLearningPermission(userRole, 'learning.path.create');
}

/**
 * Check if user can edit a course/path
 * @param userRole - User's role
 * @param ownerUserId - Owner user ID of the course/path (optional)
 * @param currentUserId - Current user's ID (optional)
 * @param permissionType - 'own' or 'any'
 */
export function canEditCourse(
  userRole: string | null | undefined,
  ownerUserId?: string | null,
  currentUserId?: string | null,
  permissionType: 'own' | 'any' = 'own'
): boolean {
  if (permissionType === 'any') {
    return hasLearningPermission(userRole, 'learning.course.edit.any');
  }
  
  // Check edit.own permission
  if (!hasLearningPermission(userRole, 'learning.course.edit.own')) {
    return false;
  }
  
  // If owner info is available, check ownership
  if (ownerUserId && currentUserId) {
    return ownerUserId === currentUserId;
  }
  
  // If no owner info, assume user can edit (will be validated server-side)
  return true;
}

export function canEditPath(
  userRole: string | null | undefined,
  ownerUserId?: string | null,
  currentUserId?: string | null,
  permissionType: 'own' | 'any' = 'own'
): boolean {
  if (permissionType === 'any') {
    return hasLearningPermission(userRole, 'learning.path.edit.any');
  }
  
  if (!hasLearningPermission(userRole, 'learning.path.edit.own')) {
    return false;
  }
  
  if (ownerUserId && currentUserId) {
    return ownerUserId === currentUserId;
  }
  
  return true;
}

/**
 * Check if user can publish courses/paths
 */
export function canPublishCourse(userRole: string | null | undefined): boolean {
  return hasLearningPermission(userRole, 'learning.course.publish');
}

export function canPublishPath(userRole: string | null | undefined): boolean {
  return hasLearningPermission(userRole, 'learning.path.publish');
}

/**
 * Check if user can view drafts
 * @param userRole - User's role
 * @param ownerUserId - Owner user ID of the draft (optional)
 * @param currentUserId - Current user's ID (optional)
 * @param permissionType - 'own' or 'any'
 */
export function canViewDraftCourse(
  userRole: string | null | undefined,
  ownerUserId?: string | null,
  currentUserId?: string | null,
  permissionType: 'own' | 'any' = 'own'
): boolean {
  if (permissionType === 'any') {
    return hasLearningPermission(userRole, 'learning.course.view.drafts.any');
  }
  
  if (!hasLearningPermission(userRole, 'learning.course.view.drafts.own')) {
    return false;
  }
  
  if (ownerUserId && currentUserId) {
    return ownerUserId === currentUserId;
  }
  
  return true;
}

export function canViewDraftPath(
  userRole: string | null | undefined,
  ownerUserId?: string | null,
  currentUserId?: string | null,
  permissionType: 'own' | 'any' = 'own'
): boolean {
  if (permissionType === 'any') {
    return hasLearningPermission(userRole, 'learning.path.view.drafts.any');
  }
  
  if (!hasLearningPermission(userRole, 'learning.path.view.drafts.own')) {
    return false;
  }
  
  if (ownerUserId && currentUserId) {
    return ownerUserId === currentUserId;
  }
  
  return true;
}

