import { z } from 'zod';
/**
 * User Role
 */
export declare const UserRoleSchema: z.ZodEnum<["Viewer", "Contributor", "Approver", "Admin"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
/**
 * Cognito User Status
 */
export declare const CognitoUserStatusSchema: z.ZodEnum<["UNCONFIRMED", "CONFIRMED", "ARCHIVED", "COMPROMISED", "UNKNOWN", "RESET_REQUIRED", "FORCE_CHANGE_PASSWORD"]>;
export type CognitoUserStatus = z.infer<typeof CognitoUserStatusSchema>;
/**
 * Admin User
 *
 * Represents a user in the admin context with role and status information.
 */
export declare const AdminUserSchema: z.ZodObject<{
    username: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["Viewer", "Contributor", "Approver", "Admin"]>;
    enabled: z.ZodBoolean;
    user_status: z.ZodEnum<["UNCONFIRMED", "CONFIRMED", "ARCHIVED", "COMPROMISED", "UNKNOWN", "RESET_REQUIRED", "FORCE_CHANGE_PASSWORD"]>;
    created_at: z.ZodString;
    modified_at: z.ZodString;
    groups: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    username: string;
    email: string;
    role: "Viewer" | "Contributor" | "Approver" | "Admin";
    enabled: boolean;
    user_status: "UNCONFIRMED" | "CONFIRMED" | "ARCHIVED" | "COMPROMISED" | "UNKNOWN" | "RESET_REQUIRED" | "FORCE_CHANGE_PASSWORD";
    created_at: string;
    modified_at: string;
    groups: string[];
    name?: string | undefined;
}, {
    username: string;
    email: string;
    role: "Viewer" | "Contributor" | "Approver" | "Admin";
    enabled: boolean;
    user_status: "UNCONFIRMED" | "CONFIRMED" | "ARCHIVED" | "COMPROMISED" | "UNKNOWN" | "RESET_REQUIRED" | "FORCE_CHANGE_PASSWORD";
    created_at: string;
    modified_at: string;
    groups: string[];
    name?: string | undefined;
}>;
export type AdminUser = z.infer<typeof AdminUserSchema>;
/**
 * Content Status
 */
export declare const ContentStatusSchema: z.ZodEnum<["Draft", "Approved", "Deprecated", "Expired"]>;
export type ContentStatus = z.infer<typeof ContentStatusSchema>;
/**
 * Content Item
 */
export declare const ContentItemSchema: z.ZodObject<{
    content_id: z.ZodString;
    status: z.ZodEnum<["Draft", "Approved", "Deprecated", "Expired"]>;
    title: z.ZodString;
    summary: z.ZodString;
    product: z.ZodOptional<z.ZodString>;
    product_suite: z.ZodOptional<z.ZodString>;
    tags: z.ZodArray<z.ZodString, "many">;
    product_id: z.ZodOptional<z.ZodString>;
    product_suite_id: z.ZodOptional<z.ZodString>;
    topic_tag_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    legacy_product_suite: z.ZodOptional<z.ZodString>;
    legacy_product_concept: z.ZodOptional<z.ZodString>;
    legacy_product_suite_id: z.ZodOptional<z.ZodString>;
    legacy_product_concept_id: z.ZodOptional<z.ZodString>;
    audience_role: z.ZodOptional<z.ZodString>;
    lifecycle_stage: z.ZodOptional<z.ZodString>;
    owner_user_id: z.ZodString;
    version: z.ZodString;
    last_updated: z.ZodString;
    review_due_date: z.ZodOptional<z.ZodString>;
    effective_date: z.ZodOptional<z.ZodString>;
    expiry_date: z.ZodOptional<z.ZodString>;
    expiry_policy: z.ZodOptional<z.ZodEnum<["soft_expire", "hard_expire"]>>;
    s3_uri: z.ZodOptional<z.ZodString>;
    file_name: z.ZodOptional<z.ZodString>;
    content_type: z.ZodOptional<z.ZodString>;
    size_bytes: z.ZodOptional<z.ZodNumber>;
    s3_bucket: z.ZodOptional<z.ZodString>;
    s3_key: z.ZodOptional<z.ZodString>;
    uploaded_at: z.ZodOptional<z.ZodString>;
    status_last_updated: z.ZodOptional<z.ZodString>;
    product_suite_concept: z.ZodOptional<z.ZodString>;
    product_product_suite: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "Draft" | "Approved" | "Deprecated" | "Expired";
    content_id: string;
    title: string;
    summary: string;
    tags: string[];
    topic_tag_ids: string[];
    owner_user_id: string;
    version: string;
    last_updated: string;
    product?: string | undefined;
    product_suite?: string | undefined;
    product_id?: string | undefined;
    product_suite_id?: string | undefined;
    legacy_product_suite?: string | undefined;
    legacy_product_concept?: string | undefined;
    legacy_product_suite_id?: string | undefined;
    legacy_product_concept_id?: string | undefined;
    audience_role?: string | undefined;
    lifecycle_stage?: string | undefined;
    review_due_date?: string | undefined;
    effective_date?: string | undefined;
    expiry_date?: string | undefined;
    expiry_policy?: "soft_expire" | "hard_expire" | undefined;
    s3_uri?: string | undefined;
    file_name?: string | undefined;
    content_type?: string | undefined;
    size_bytes?: number | undefined;
    s3_bucket?: string | undefined;
    s3_key?: string | undefined;
    uploaded_at?: string | undefined;
    status_last_updated?: string | undefined;
    product_suite_concept?: string | undefined;
    product_product_suite?: string | undefined;
}, {
    status: "Draft" | "Approved" | "Deprecated" | "Expired";
    content_id: string;
    title: string;
    summary: string;
    tags: string[];
    owner_user_id: string;
    version: string;
    last_updated: string;
    product?: string | undefined;
    product_suite?: string | undefined;
    product_id?: string | undefined;
    product_suite_id?: string | undefined;
    topic_tag_ids?: string[] | undefined;
    legacy_product_suite?: string | undefined;
    legacy_product_concept?: string | undefined;
    legacy_product_suite_id?: string | undefined;
    legacy_product_concept_id?: string | undefined;
    audience_role?: string | undefined;
    lifecycle_stage?: string | undefined;
    review_due_date?: string | undefined;
    effective_date?: string | undefined;
    expiry_date?: string | undefined;
    expiry_policy?: "soft_expire" | "hard_expire" | undefined;
    s3_uri?: string | undefined;
    file_name?: string | undefined;
    content_type?: string | undefined;
    size_bytes?: number | undefined;
    s3_bucket?: string | undefined;
    s3_key?: string | undefined;
    uploaded_at?: string | undefined;
    status_last_updated?: string | undefined;
    product_suite_concept?: string | undefined;
    product_product_suite?: string | undefined;
}>;
export type ContentItem = z.infer<typeof ContentItemSchema>;
/**
 * Notification
 */
export declare const NotificationSchema: z.ZodObject<{
    notification_id: z.ZodString;
    user_id: z.ZodString;
    type: z.ZodEnum<["info", "success", "warning", "error"]>;
    title: z.ZodString;
    message: z.ZodString;
    read: z.ZodBoolean;
    created_at: z.ZodString;
    content_id: z.ZodOptional<z.ZodString>;
    'created_at#notification_id': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    type: "info" | "success" | "warning" | "error";
    created_at: string;
    title: string;
    notification_id: string;
    user_id: string;
    read: boolean;
    content_id?: string | undefined;
    'created_at#notification_id'?: string | undefined;
}, {
    message: string;
    type: "info" | "success" | "warning" | "error";
    created_at: string;
    title: string;
    notification_id: string;
    user_id: string;
    read: boolean;
    content_id?: string | undefined;
    'created_at#notification_id'?: string | undefined;
}>;
export type Notification = z.infer<typeof NotificationSchema>;
/**
 * Subscription
 */
export declare const SubscriptionSchema: z.ZodObject<{
    subscription_id: z.ZodString;
    user_id: z.ZodString;
    product_suite: z.ZodOptional<z.ZodString>;
    product_concept: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    user_id: string;
    subscription_id: string;
    product_suite?: string | undefined;
    tags?: string[] | undefined;
    product_concept?: string | undefined;
}, {
    created_at: string;
    user_id: string;
    subscription_id: string;
    product_suite?: string | undefined;
    tags?: string[] | undefined;
    product_concept?: string | undefined;
}>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
/**
 * Activity Event
 */
export declare const ActivityEventSchema: z.ZodObject<{
    event_name: z.ZodString;
    user_id: z.ZodOptional<z.ZodString>;
    content_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    event_name: string;
    content_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    timestamp?: string | undefined;
}, {
    event_name: string;
    content_id?: string | undefined;
    user_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    timestamp?: string | undefined;
}>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
//# sourceMappingURL=types.d.ts.map