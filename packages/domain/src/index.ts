/**
 * Gravyty Enablement Portal - Domain Types and Helpers
 */

// Export types but exclude Subscription (conflicts with content-hub Subscription)
export {
  UserRoleSchema,
  type UserRole,
  CognitoUserStatusSchema,
  type CognitoUserStatus,
  AdminUserSchema,
  type AdminUser,
  ContentStatusSchema,
  type ContentStatus,
  ContentItemSchema,
  type ContentItem,
  NotificationSchema,
  type Notification,
  ActivityEventSchema,
  type ActivityEvent,
  // Exclude Subscription and SubscriptionSchema - they conflict with content-hub versions
  // If needed, import directly from './types.js'
} from './types.js';

// LMS Domain Module
export * from './lms/index.js';

// Metadata Domain Module
export * from './metadata.js';
export * from './metadata-normalization.js';

// Content Hub Domain Module (includes Subscription)
export * from './content-hub/index.js';



