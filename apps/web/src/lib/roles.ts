/**
 * Role Management Utilities
 * 
 * Centralized role normalization and checking logic.
 * Handles case-insensitive role mapping and provides consistent Admin gating.
 */

export type Role = 'Viewer' | 'Contributor' | 'Approver' | 'Admin';

/**
 * Normalize a role string to a valid Role type.
 * Case-insensitive mapping with sensible defaults.
 */
export function normalizeRole(input?: string | null): Role {
  if (!input) {
    return 'Viewer';
  }

  const normalized = input.trim().toLowerCase();

  // Admin variants
  if (normalized === 'admin' || normalized === 'administrator') {
    return 'Admin';
  }

  // Approver variants
  if (normalized === 'approver') {
    return 'Approver';
  }

  // Contributor variants
  if (normalized === 'contributor' || normalized === 'editor') {
    return 'Contributor';
  }

  // Viewer variants
  if (normalized === 'viewer' || normalized === 'read' || normalized === 'readonly') {
    return 'Viewer';
  }

  // Default to Viewer for unknown values
  return 'Viewer';
}

/**
 * Extract role from Cognito groups array.
 * Priority: Admin > Approver > Contributor > Viewer
 */
export function roleFromGroups(groups?: string[] | null): Role {
  if (!groups || groups.length === 0) {
    return 'Viewer';
  }

  // Check groups in priority order
  for (const group of groups) {
    const role = normalizeRole(group);
    if (role === 'Admin') {
      return 'Admin';
    }
  }

  for (const group of groups) {
    const role = normalizeRole(group);
    if (role === 'Approver') {
      return 'Approver';
    }
  }

  for (const group of groups) {
    const role = normalizeRole(group);
    if (role === 'Contributor') {
      return 'Contributor';
    }
  }

  // Default to Viewer
  return 'Viewer';
}

/**
 * Check if a role string represents an Admin.
 * Case-insensitive check using normalizeRole.
 */
export function isAdmin(input?: string | null): boolean {
  return normalizeRole(input) === 'Admin';
}


