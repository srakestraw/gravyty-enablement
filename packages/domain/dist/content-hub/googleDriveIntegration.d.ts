/**
 * Content Hub - Google Drive Integration Domain Model
 *
 * Models for Google Drive integration and sync status.
 */
import { z } from 'zod';
/**
 * Google Drive Connection Status
 */
export declare const GoogleDriveConnectionStatusSchema: z.ZodEnum<["connected", "disconnected", "error"]>;
export type GoogleDriveConnectionStatus = z.infer<typeof GoogleDriveConnectionStatusSchema>;
/**
 * Google Drive Connection
 *
 * Organization-level Google Drive connection configuration.
 */
export declare const GoogleDriveConnectionSchema: z.ZodObject<{
    connection_id: z.ZodString;
    status: z.ZodEnum<["connected", "disconnected", "error"]>;
    access_token: z.ZodOptional<z.ZodString>;
    refresh_token: z.ZodOptional<z.ZodString>;
    token_expires_at: z.ZodOptional<z.ZodString>;
    allowed_folder_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    connected_at: z.ZodOptional<z.ZodString>;
    connected_by: z.ZodOptional<z.ZodString>;
    last_sync_at: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"GOOGLE_DRIVE_CONNECTION">>;
}, "strip", z.ZodTypeAny, {
    status: "error" | "connected" | "disconnected";
    created_at: string;
    updated_at: string;
    entity_type: "GOOGLE_DRIVE_CONNECTION";
    connection_id: string;
    access_token?: string | undefined;
    refresh_token?: string | undefined;
    token_expires_at?: string | undefined;
    allowed_folder_ids?: string[] | undefined;
    connected_at?: string | undefined;
    connected_by?: string | undefined;
    last_sync_at?: string | undefined;
}, {
    status: "error" | "connected" | "disconnected";
    created_at: string;
    updated_at: string;
    connection_id: string;
    entity_type?: "GOOGLE_DRIVE_CONNECTION" | undefined;
    access_token?: string | undefined;
    refresh_token?: string | undefined;
    token_expires_at?: string | undefined;
    allowed_folder_ids?: string[] | undefined;
    connected_at?: string | undefined;
    connected_by?: string | undefined;
    last_sync_at?: string | undefined;
}>;
export type GoogleDriveConnection = z.infer<typeof GoogleDriveConnectionSchema>;
/**
 * Google Drive File Reference
 *
 * Reference to a Google Drive file for imported assets.
 */
export declare const GoogleDriveFileRefSchema: z.ZodObject<{
    file_id: z.ZodString;
    name: z.ZodString;
    mime_type: z.ZodString;
    size_bytes: z.ZodOptional<z.ZodNumber>;
    modified_time: z.ZodString;
    web_view_link: z.ZodOptional<z.ZodString>;
    web_content_link: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    modified_time: string;
    mime_type: string;
    file_id: string;
    size_bytes?: number | undefined;
    web_view_link?: string | undefined;
    web_content_link?: string | undefined;
}, {
    name: string;
    modified_time: string;
    mime_type: string;
    file_id: string;
    size_bytes?: number | undefined;
    web_view_link?: string | undefined;
    web_content_link?: string | undefined;
}>;
export type GoogleDriveFileRef = z.infer<typeof GoogleDriveFileRefSchema>;
/**
 * Asset Sync Status
 */
export declare const AssetSyncStatusSchema: z.ZodEnum<["synced", "pending", "syncing", "error", "source_unavailable"]>;
export type AssetSyncStatus = z.infer<typeof AssetSyncStatusSchema>;
/**
 * Asset Sync Metadata
 *
 * Stored as part of Asset.source_ref when source_type is GOOGLE_DRIVE
 */
export declare const AssetSyncMetadataSchema: z.ZodObject<{
    drive_file_id: z.ZodString;
    drive_file_name: z.ZodString;
    last_synced_at: z.ZodOptional<z.ZodString>;
    last_sync_status: z.ZodEnum<["synced", "pending", "syncing", "error", "source_unavailable"]>;
    last_sync_error: z.ZodOptional<z.ZodString>;
    last_modified_time: z.ZodString;
}, "strip", z.ZodTypeAny, {
    drive_file_id: string;
    drive_file_name: string;
    last_sync_status: "error" | "synced" | "pending" | "syncing" | "source_unavailable";
    last_modified_time: string;
    last_synced_at?: string | undefined;
    last_sync_error?: string | undefined;
}, {
    drive_file_id: string;
    drive_file_name: string;
    last_sync_status: "error" | "synced" | "pending" | "syncing" | "source_unavailable";
    last_modified_time: string;
    last_synced_at?: string | undefined;
    last_sync_error?: string | undefined;
}>;
export type AssetSyncMetadata = z.infer<typeof AssetSyncMetadataSchema>;
//# sourceMappingURL=googleDriveIntegration.d.ts.map