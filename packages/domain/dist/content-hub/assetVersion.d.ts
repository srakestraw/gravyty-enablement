/**
 * Content Hub - Asset Version Domain Model
 *
 * Represents a specific version of an asset (v1, v2, v3).
 */
import { z } from 'zod';
/**
 * Asset Version Status
 */
export declare const AssetVersionStatusSchema: z.ZodEnum<["draft", "scheduled", "published", "deprecated", "expired", "archived"]>;
export type AssetVersionStatus = z.infer<typeof AssetVersionStatusSchema>;
/**
 * Source Version Reference (for Google Drive sync)
 */
export declare const SourceVersionRefSchema: z.ZodOptional<z.ZodObject<{
    drive_revision_id: z.ZodOptional<z.ZodString>;
    modified_time: z.ZodOptional<z.ZodString>;
    checksum: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    drive_revision_id?: string | undefined;
    modified_time?: string | undefined;
    checksum?: string | undefined;
}, {
    drive_revision_id?: string | undefined;
    modified_time?: string | undefined;
    checksum?: string | undefined;
}>>;
export type SourceVersionRef = z.infer<typeof SourceVersionRefSchema>;
/**
 * Asset Version
 *
 * Specific revision of an asset with lifecycle state.
 */
export declare const AssetVersionSchema: z.ZodObject<{
    version_id: z.ZodString;
    asset_id: z.ZodString;
    version_number: z.ZodNumber;
    status: z.ZodEnum<["draft", "scheduled", "published", "deprecated", "expired", "archived"]>;
    publish_at: z.ZodOptional<z.ZodString>;
    expire_at: z.ZodOptional<z.ZodString>;
    published_by: z.ZodOptional<z.ZodString>;
    published_at: z.ZodOptional<z.ZodString>;
    change_log: z.ZodOptional<z.ZodString>;
    storage_key: z.ZodOptional<z.ZodString>;
    checksum: z.ZodOptional<z.ZodString>;
    mime_type: z.ZodOptional<z.ZodString>;
    size_bytes: z.ZodOptional<z.ZodNumber>;
    thumbnail_key: z.ZodOptional<z.ZodString>;
    preview_key: z.ZodOptional<z.ZodString>;
    source_version_ref: z.ZodOptional<z.ZodObject<{
        drive_revision_id: z.ZodOptional<z.ZodString>;
        modified_time: z.ZodOptional<z.ZodString>;
        checksum: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        drive_revision_id?: string | undefined;
        modified_time?: string | undefined;
        checksum?: string | undefined;
    }, {
        drive_revision_id?: string | undefined;
        modified_time?: string | undefined;
        checksum?: string | undefined;
    }>>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"ASSET_VERSION">>;
    'asset_id#version_number': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "published" | "archived" | "scheduled" | "deprecated" | "expired";
    created_at: string;
    created_by: string;
    updated_at: string;
    asset_id: string;
    entity_type: "ASSET_VERSION";
    version_id: string;
    version_number: number;
    size_bytes?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    checksum?: string | undefined;
    publish_at?: string | undefined;
    expire_at?: string | undefined;
    change_log?: string | undefined;
    storage_key?: string | undefined;
    mime_type?: string | undefined;
    thumbnail_key?: string | undefined;
    preview_key?: string | undefined;
    source_version_ref?: {
        drive_revision_id?: string | undefined;
        modified_time?: string | undefined;
        checksum?: string | undefined;
    } | undefined;
    'asset_id#version_number'?: string | undefined;
}, {
    status: "draft" | "published" | "archived" | "scheduled" | "deprecated" | "expired";
    created_at: string;
    created_by: string;
    updated_at: string;
    asset_id: string;
    version_id: string;
    version_number: number;
    size_bytes?: number | undefined;
    published_at?: string | undefined;
    published_by?: string | undefined;
    entity_type?: "ASSET_VERSION" | undefined;
    checksum?: string | undefined;
    publish_at?: string | undefined;
    expire_at?: string | undefined;
    change_log?: string | undefined;
    storage_key?: string | undefined;
    mime_type?: string | undefined;
    thumbnail_key?: string | undefined;
    preview_key?: string | undefined;
    source_version_ref?: {
        drive_revision_id?: string | undefined;
        modified_time?: string | undefined;
        checksum?: string | undefined;
    } | undefined;
    'asset_id#version_number'?: string | undefined;
}>;
export type AssetVersion = z.infer<typeof AssetVersionSchema>;
//# sourceMappingURL=assetVersion.d.ts.map