import { z } from 'zod';
/**
 * User Role
 */
export const UserRoleSchema = z.enum(['Viewer', 'Contributor', 'Approver', 'Admin']);
/**
 * Cognito User Status
 */
export const CognitoUserStatusSchema = z.enum([
    'UNCONFIRMED',
    'CONFIRMED',
    'ARCHIVED',
    'COMPROMISED',
    'UNKNOWN',
    'RESET_REQUIRED',
    'FORCE_CHANGE_PASSWORD',
]);
/**
 * Admin User
 *
 * Represents a user in the admin context with role and status information.
 */
export const AdminUserSchema = z.object({
    username: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    role: UserRoleSchema,
    enabled: z.boolean(),
    user_status: CognitoUserStatusSchema,
    created_at: z.string(),
    modified_at: z.string(),
    groups: z.array(z.string()),
});
/**
 * Content Status
 */
export const ContentStatusSchema = z.enum(['Draft', 'Approved', 'Deprecated', 'Expired']);
/**
 * Content Item
 */
export const ContentItemSchema = z.object({
    content_id: z.string(),
    status: ContentStatusSchema,
    title: z.string(),
    summary: z.string(),
    // New field names (preferred)
    product: z.string().optional(), // Was "product_suite" (legacy, use product_ids)
    product_suite: z.string().optional(), // Was "product_concept" (legacy, use product_suite_ids)
    tags: z.array(z.string()),
    product_id: z.string().optional(), // Legacy single value (use product_ids)
    product_ids: z.array(z.string()).default([]), // Multi-select product IDs
    product_suite_id: z.string().optional(), // Legacy single value (use product_suite_ids)
    product_suite_ids: z.array(z.string()).default([]), // Multi-select product suite IDs
    topic_tag_ids: z.array(z.string()).default([]),
    // Legacy fields (for backward compatibility - will be normalized on read)
    legacy_product_suite: z.string().optional(), // Old product_suite -> maps to product
    legacy_product_concept: z.string().optional(), // Old product_concept -> maps to product_suite
    legacy_product_suite_id: z.string().optional(), // Old product_suite_id -> maps to product_id
    legacy_product_concept_id: z.string().optional(), // Old product_concept_id -> maps to product_suite_id
    audience_role: z.string().optional(),
    lifecycle_stage: z.string().optional(),
    owner_user_id: z.string(),
    version: z.string(),
    last_updated: z.string(),
    review_due_date: z.string().optional(),
    effective_date: z.string().optional(),
    expiry_date: z.string().optional(),
    expiry_policy: z.enum(['soft_expire', 'hard_expire']).optional(),
    s3_uri: z.string().optional(),
    file_name: z.string().optional(),
    content_type: z.string().optional(),
    size_bytes: z.number().optional(),
    s3_bucket: z.string().optional(),
    s3_key: z.string().optional(),
    uploaded_at: z.string().optional(),
    // GSI attributes (for querying)
    status_last_updated: z.string().optional(), // For GSI1
    product_suite_concept: z.string().optional(), // For GSI2 (legacy - maps to product#product_suite)
    product_product_suite: z.string().optional(), // For GSI2 (new - product#product_suite)
});
/**
 * Notification
 */
export const NotificationSchema = z.object({
    notification_id: z.string(),
    user_id: z.string(),
    type: z.enum(['info', 'success', 'warning', 'error']),
    title: z.string(),
    message: z.string(),
    read: z.boolean(),
    created_at: z.string(),
    content_id: z.string().optional(),
    // DynamoDB composite key
    'created_at#notification_id': z.string().optional(),
});
/**
 * Subscription
 */
export const SubscriptionSchema = z.object({
    subscription_id: z.string(),
    user_id: z.string(),
    product_suite: z.string().optional(),
    product_concept: z.string().optional(),
    tags: z.array(z.string()).optional(),
    created_at: z.string(),
});
/**
 * Activity Event
 */
export const ActivityEventSchema = z.object({
    event_name: z.string(),
    user_id: z.string().optional(),
    content_id: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    timestamp: z.string().datetime().optional(),
});
//# sourceMappingURL=types.js.map