/**
 * Content Hub - Asset Domain Model
 *
 * Represents a logical asset (e.g., "Q1 Sales Deck") that can have multiple versions.
 */
import { z } from 'zod';
/**
 * Asset Type
 */
export declare const AssetTypeSchema: z.ZodEnum<["deck", "doc", "image", "video", "logo", "worksheet", "link"]>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
/**
 * Asset Source Type
 */
export declare const AssetSourceTypeSchema: z.ZodEnum<["UPLOAD", "LINK", "GOOGLE_DRIVE"]>;
export type AssetSourceType = z.infer<typeof AssetSourceTypeSchema>;
/**
 * Source Reference (JSON)
 *
 * Structure depends on sourceType:
 * - LINK: { url: string, preview?: string }
 * - GOOGLE_DRIVE: { driveFileId: string, driveMimeType: string, driveWebViewLink?: string, connectorId: string }
 */
export declare const SourceRefSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
/**
 * Asset
 *
 * Logical asset that can have multiple versions.
 */
export declare const AssetSchema: z.ZodObject<{
    asset_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    asset_type: z.ZodEnum<["deck", "doc", "image", "video", "logo", "worksheet", "link"]>;
    owner_id: z.ZodString;
    taxonomy_node_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    source_type: z.ZodEnum<["UPLOAD", "LINK", "GOOGLE_DRIVE"]>;
    source_ref: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    current_published_version_id: z.ZodOptional<z.ZodString>;
    pinned: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"ASSET">>;
    'taxonomy_node_id#status': z.ZodOptional<z.ZodString>;
    'owner_id#updated_at': z.ZodOptional<z.ZodString>;
    'pinned#updated_at': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    title: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    asset_id: string;
    asset_type: "image" | "video" | "link" | "deck" | "doc" | "logo" | "worksheet";
    owner_id: string;
    taxonomy_node_ids: string[];
    source_type: "UPLOAD" | "LINK" | "GOOGLE_DRIVE";
    pinned: boolean;
    entity_type: "ASSET";
    description?: string | undefined;
    source_ref?: Record<string, unknown> | undefined;
    current_published_version_id?: string | undefined;
    'taxonomy_node_id#status'?: string | undefined;
    'owner_id#updated_at'?: string | undefined;
    'pinned#updated_at'?: string | undefined;
}, {
    created_at: string;
    title: string;
    created_by: string;
    updated_at: string;
    updated_by: string;
    asset_id: string;
    asset_type: "image" | "video" | "link" | "deck" | "doc" | "logo" | "worksheet";
    owner_id: string;
    source_type: "UPLOAD" | "LINK" | "GOOGLE_DRIVE";
    description?: string | undefined;
    taxonomy_node_ids?: string[] | undefined;
    source_ref?: Record<string, unknown> | undefined;
    current_published_version_id?: string | undefined;
    pinned?: boolean | undefined;
    entity_type?: "ASSET" | undefined;
    'taxonomy_node_id#status'?: string | undefined;
    'owner_id#updated_at'?: string | undefined;
    'pinned#updated_at'?: string | undefined;
}>;
export type Asset = z.infer<typeof AssetSchema>;
//# sourceMappingURL=asset.d.ts.map