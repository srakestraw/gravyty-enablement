/**
 * Check if content item is eligible for bot/assistant
 */
export function isEligibleForBot(contentItem) {
    return contentItem.status === 'Approved' && !isExpired(contentItem);
}
/**
 * Check if content item is eligible for search
 */
export function isEligibleForSearch(contentItem) {
    return contentItem.status === 'Approved' && !isExpired(contentItem);
}
/**
 * Check if content item is expired
 */
function isExpired(contentItem) {
    if (!contentItem.expiry_date) {
        return false;
    }
    const expiryDate = new Date(contentItem.expiry_date);
    const now = new Date();
    if (contentItem.expiry_policy === 'hard_expire') {
        return now > expiryDate;
    }
    // soft_expire: mark as expired but still accessible
    return now > expiryDate;
}
/**
 * Check if user can perform action based on role
 */
export function canUser(action, role) {
    const permissions = {
        Viewer: ['read'],
        Contributor: ['read', 'create', 'update'],
        Approver: ['read', 'create', 'update', 'approve', 'deprecate', 'expire'],
        Admin: ['read', 'create', 'update', 'approve', 'deprecate', 'expire', 'delete', 'admin'],
    };
    const rolePermissions = permissions[role] || [];
    return rolePermissions.includes(action) || rolePermissions.includes('admin');
}
/**
 * Check if user can perform content action
 */
export function canUserContentAction(action, role) {
    return canUser(action, role);
}
//# sourceMappingURL=helpers.js.map