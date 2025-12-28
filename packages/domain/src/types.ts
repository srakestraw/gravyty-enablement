import { z } from 'zod';

/**
 * User Role
 */
export const UserRoleSchema = z.enum(['Viewer', 'Contributor', 'Approver', 'Admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

/**
 * Content Status
 */
export const ContentStatusSchema = z.enum(['Draft', 'Approved', 'Deprecated', 'Expired']);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

/**
 * Content Item
 */
export const ContentItemSchema = z.object({
  content_id: z.string(),
  status: ContentStatusSchema,
  title: z.string(),
  summary: z.string(),
  product_suite: z.string().optional(),
  product_concept: z.string().optional(),
  audience_role: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  owner_user_id: z.string(),
  tags: z.array(z.string()),
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
  product_suite_concept: z.string().optional(), // For GSI2
});

export type ContentItem = z.infer<typeof ContentItemSchema>;

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

export type Notification = z.infer<typeof NotificationSchema>;

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

export type Subscription = z.infer<typeof SubscriptionSchema>;

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

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

