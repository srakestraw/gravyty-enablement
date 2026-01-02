/**
 * Content Hub - Subscription Domain Model
 *
 * User subscriptions to assets, metadata nodes, or collections for notifications.
 */
import { z } from 'zod';
/**
 * Subscription Target Type
 */
export declare const SubscriptionTargetTypeSchema: z.ZodEnum<["asset", "metadata", "collection", "savedSearch"]>;
export type SubscriptionTargetType = z.infer<typeof SubscriptionTargetTypeSchema>;
/**
 * Subscription Triggers
 */
export declare const SubscriptionTriggersSchema: z.ZodDefault<z.ZodObject<{
    newVersion: z.ZodDefault<z.ZodBoolean>;
    expiringSoon: z.ZodDefault<z.ZodBoolean>;
    expired: z.ZodDefault<z.ZodBoolean>;
    comments: z.ZodDefault<z.ZodBoolean>;
    mentions: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    expired: boolean;
    newVersion: boolean;
    expiringSoon: boolean;
    comments: boolean;
    mentions: boolean;
}, {
    expired?: boolean | undefined;
    newVersion?: boolean | undefined;
    expiringSoon?: boolean | undefined;
    comments?: boolean | undefined;
    mentions?: boolean | undefined;
}>>;
export type SubscriptionTriggers = z.infer<typeof SubscriptionTriggersSchema>;
/**
 * Subscription
 *
 * User subscription to receive notifications for specific targets.
 */
export declare const SubscriptionSchema: z.ZodObject<{
    subscription_id: z.ZodString;
    target_type: z.ZodEnum<["asset", "metadata", "collection", "savedSearch"]>;
    target_id: z.ZodString;
    user_id: z.ZodString;
    triggers: z.ZodDefault<z.ZodObject<{
        newVersion: z.ZodDefault<z.ZodBoolean>;
        expiringSoon: z.ZodDefault<z.ZodBoolean>;
        expired: z.ZodDefault<z.ZodBoolean>;
        comments: z.ZodDefault<z.ZodBoolean>;
        mentions: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        expired: boolean;
        newVersion: boolean;
        expiringSoon: boolean;
        comments: boolean;
        mentions: boolean;
    }, {
        expired?: boolean | undefined;
        newVersion?: boolean | undefined;
        expiringSoon?: boolean | undefined;
        comments?: boolean | undefined;
        mentions?: boolean | undefined;
    }>>;
    created_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"SUBSCRIPTION">>;
    'target_type#target_id': z.ZodOptional<z.ZodString>;
    'user_id#subscription_id': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    user_id: string;
    subscription_id: string;
    entity_type: "SUBSCRIPTION";
    target_type: "metadata" | "asset" | "collection" | "savedSearch";
    target_id: string;
    triggers: {
        expired: boolean;
        newVersion: boolean;
        expiringSoon: boolean;
        comments: boolean;
        mentions: boolean;
    };
    'target_type#target_id'?: string | undefined;
    'user_id#subscription_id'?: string | undefined;
}, {
    created_at: string;
    user_id: string;
    subscription_id: string;
    target_type: "metadata" | "asset" | "collection" | "savedSearch";
    target_id: string;
    entity_type?: "SUBSCRIPTION" | undefined;
    triggers?: {
        expired?: boolean | undefined;
        newVersion?: boolean | undefined;
        expiringSoon?: boolean | undefined;
        comments?: boolean | undefined;
        mentions?: boolean | undefined;
    } | undefined;
    'target_type#target_id'?: string | undefined;
    'user_id#subscription_id'?: string | undefined;
}>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
//# sourceMappingURL=subscription.d.ts.map