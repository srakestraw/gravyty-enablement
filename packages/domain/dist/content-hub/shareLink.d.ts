/**
 * Content Hub - Share Link Domain Model
 *
 * External sharing via unique URLs with tracking and revocation.
 */
import { z } from 'zod';
/**
 * Share Link Target Type
 */
export declare const ShareLinkTargetTypeSchema: z.ZodEnum<["canonicalAsset", "version"]>;
export type ShareLinkTargetType = z.infer<typeof ShareLinkTargetTypeSchema>;
/**
 * Share Link Status
 */
export declare const ShareLinkStatusSchema: z.ZodEnum<["active", "expired", "revoked"]>;
export type ShareLinkStatus = z.infer<typeof ShareLinkStatusSchema>;
/**
 * Share Link Access Mode
 */
export declare const ShareLinkAccessModeSchema: z.ZodEnum<["open", "emailVerify", "password"]>;
export type ShareLinkAccessMode = z.infer<typeof ShareLinkAccessModeSchema>;
/**
 * Share Link
 *
 * Unique URL for external sharing with tracking and controls.
 */
export declare const ShareLinkSchema: z.ZodObject<{
    share_link_id: z.ZodString;
    token: z.ZodString;
    target_type: z.ZodEnum<["canonicalAsset", "version"]>;
    asset_id: z.ZodString;
    version_id: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["active", "expired", "revoked"]>;
    expires_at: z.ZodOptional<z.ZodString>;
    expire_with_asset: z.ZodDefault<z.ZodBoolean>;
    access_mode: z.ZodEnum<["open", "emailVerify", "password"]>;
    allow_download: z.ZodDefault<z.ZodBoolean>;
    allow_comments: z.ZodDefault<z.ZodBoolean>;
    notify_on_new_version: z.ZodDefault<z.ZodBoolean>;
    last_access_at: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"SHARE_LINK">>;
    share_token: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "expired" | "revoked";
    created_at: string;
    created_by: string;
    asset_id: string;
    entity_type: "SHARE_LINK";
    share_link_id: string;
    token: string;
    target_type: "version" | "canonicalAsset";
    expire_with_asset: boolean;
    access_mode: "open" | "emailVerify" | "password";
    allow_download: boolean;
    allow_comments: boolean;
    notify_on_new_version: boolean;
    version_id?: string | undefined;
    expires_at?: string | undefined;
    last_access_at?: string | undefined;
    share_token?: string | undefined;
}, {
    status: "active" | "expired" | "revoked";
    created_at: string;
    created_by: string;
    asset_id: string;
    share_link_id: string;
    token: string;
    target_type: "version" | "canonicalAsset";
    access_mode: "open" | "emailVerify" | "password";
    entity_type?: "SHARE_LINK" | undefined;
    version_id?: string | undefined;
    expires_at?: string | undefined;
    expire_with_asset?: boolean | undefined;
    allow_download?: boolean | undefined;
    allow_comments?: boolean | undefined;
    notify_on_new_version?: boolean | undefined;
    last_access_at?: string | undefined;
    share_token?: string | undefined;
}>;
export type ShareLink = z.infer<typeof ShareLinkSchema>;
//# sourceMappingURL=shareLink.d.ts.map