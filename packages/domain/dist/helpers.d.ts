import { ContentItem, UserRole } from './types';
/**
 * Check if content item is eligible for bot/assistant
 */
export declare function isEligibleForBot(contentItem: ContentItem): boolean;
/**
 * Check if content item is eligible for search
 */
export declare function isEligibleForSearch(contentItem: ContentItem): boolean;
/**
 * Check if user can perform action based on role
 */
export declare function canUser(action: string, role: UserRole): boolean;
/**
 * Check if user can perform content action
 */
export declare function canUserContentAction(action: 'create' | 'update' | 'approve' | 'deprecate' | 'expire', role: UserRole): boolean;
//# sourceMappingURL=helpers.d.ts.map