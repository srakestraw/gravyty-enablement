/**
 * Content Hub - Subscription Domain Model
 *
 * User subscriptions to assets, metadata nodes, or collections for notifications.
 */
import { z } from 'zod';
/**
 * Subscription Target Type
 */
export const SubscriptionTargetTypeSchema = z.enum([
    'asset',
    'metadata',
    'collection',
    'savedSearch', // Phase 2
]);
/**
 * Subscription Triggers
 */
export const SubscriptionTriggersSchema = z.object({
    newVersion: z.boolean().default(true),
    expiringSoon: z.boolean().default(true),
    expired: z.boolean().default(true),
    comments: z.boolean().default(false),
    mentions: z.boolean().default(true),
}).default({});
/**
 * Subscription
 *
 * User subscription to receive notifications for specific targets.
 */
export const SubscriptionSchema = z.object({
    // Primary key
    subscription_id: z.string(),
    // Target
    target_type: SubscriptionTargetTypeSchema,
    target_id: z.string(),
    // User
    user_id: z.string(),
    // Triggers
    triggers: SubscriptionTriggersSchema,
    // Timestamps
    created_at: z.string(), // ISO datetime
    // DynamoDB discriminator
    entity_type: z.literal('SUBSCRIPTION').default('SUBSCRIPTION'),
    // GSI attributes
    'target_type#target_id': z.string().optional(), // For BySubscriptionTarget GSI
    'user_id#subscription_id': z.string().optional(), // For querying user subscriptions
});
//# sourceMappingURL=subscription.js.map