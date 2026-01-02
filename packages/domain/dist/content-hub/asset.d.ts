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
    metadata_node_ids: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    source_type: z.ZodEnum<["UPLOAD", "LINK", "GOOGLE_DRIVE"]>;
    source_ref: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    current_published_version_id: z.ZodOptional<z.ZodString>;
    pinned: z.ZodDefault<z.ZodBoolean>;
    cover_image: z.ZodOptional<z.ZodObject<{
        media_id: z.ZodString;
        type: z.ZodEnum<["image", "video", "document", "audio", "other"]>;
        url: z.ZodString;
        s3_bucket: z.ZodOptional<z.ZodString>;
        s3_key: z.ZodOptional<z.ZodString>;
        filename: z.ZodOptional<z.ZodString>;
        content_type: z.ZodOptional<z.ZodString>;
        size_bytes: z.ZodOptional<z.ZodNumber>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        thumbnail_url: z.ZodOptional<z.ZodString>;
        transcription_job_id: z.ZodOptional<z.ZodString>;
        transcription_status: z.ZodOptional<z.ZodEnum<["queued", "processing", "complete", "failed"]>>;
        transcription_language: z.ZodOptional<z.ZodString>;
        transcription_error: z.ZodOptional<z.ZodString>;
        created_at: z.ZodString;
        created_by: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    }, {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    }>>;
    created_at: z.ZodString;
    created_by: z.ZodString;
    updated_at: z.ZodString;
    updated_by: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"ASSET">>;
    'metadata_node_id#status': z.ZodOptional<z.ZodString>;
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
    metadata_node_ids: string[];
    source_type: "UPLOAD" | "LINK" | "GOOGLE_DRIVE";
    pinned: boolean;
    entity_type: "ASSET";
    description?: string | undefined;
    cover_image?: {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    } | undefined;
    source_ref?: Record<string, unknown> | undefined;
    current_published_version_id?: string | undefined;
    'metadata_node_id#status'?: string | undefined;
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
    cover_image?: {
        type: "image" | "video" | "document" | "audio" | "other";
        created_at: string;
        media_id: string;
        url: string;
        created_by: string;
        content_type?: string | undefined;
        size_bytes?: number | undefined;
        s3_bucket?: string | undefined;
        s3_key?: string | undefined;
        filename?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        thumbnail_url?: string | undefined;
        transcription_job_id?: string | undefined;
        transcription_status?: "queued" | "processing" | "complete" | "failed" | undefined;
        transcription_language?: string | undefined;
        transcription_error?: string | undefined;
    } | undefined;
    metadata_node_ids?: string[] | undefined;
    source_ref?: Record<string, unknown> | undefined;
    current_published_version_id?: string | undefined;
    pinned?: boolean | undefined;
    entity_type?: "ASSET" | undefined;
    'metadata_node_id#status'?: string | undefined;
    'owner_id#updated_at'?: string | undefined;
    'pinned#updated_at'?: string | undefined;
}>;
export type Asset = z.infer<typeof AssetSchema>;
//# sourceMappingURL=asset.d.ts.map