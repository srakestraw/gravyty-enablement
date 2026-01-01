/**
 * Content Hub - Outdated Flag Domain Model
 *
 * Flags for marking assets as outdated and requesting updates.
 */
import { z } from 'zod';
/**
 * OutdatedFlag
 *
 * Flag indicating an asset is outdated, with optional resolution.
 */
export declare const OutdatedFlagSchema: z.ZodObject<{
    flag_id: z.ZodString;
    asset_id: z.ZodString;
    user_id: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    resolved_at: z.ZodOptional<z.ZodString>;
    resolved_by: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"OUTDATED_FLAG">>;
    'asset_id#created_at': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    user_id: string;
    asset_id: string;
    entity_type: "OUTDATED_FLAG";
    flag_id: string;
    resolved_at?: string | undefined;
    resolved_by?: string | undefined;
    'asset_id#created_at'?: string | undefined;
    reason?: string | undefined;
}, {
    created_at: string;
    user_id: string;
    asset_id: string;
    flag_id: string;
    entity_type?: "OUTDATED_FLAG" | undefined;
    resolved_at?: string | undefined;
    resolved_by?: string | undefined;
    'asset_id#created_at'?: string | undefined;
    reason?: string | undefined;
}>;
export type OutdatedFlag = z.infer<typeof OutdatedFlagSchema>;
/**
 * UpdateRequest
 *
 * Request for updating an asset.
 */
export declare const UpdateRequestSchema: z.ZodObject<{
    request_id: z.ZodString;
    asset_id: z.ZodString;
    user_id: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    resolved_at: z.ZodOptional<z.ZodString>;
    resolved_by: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"UPDATE_REQUEST">>;
    'asset_id#created_at': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    user_id: string;
    asset_id: string;
    entity_type: "UPDATE_REQUEST";
    request_id: string;
    message?: string | undefined;
    resolved_at?: string | undefined;
    resolved_by?: string | undefined;
    'asset_id#created_at'?: string | undefined;
}, {
    created_at: string;
    user_id: string;
    asset_id: string;
    request_id: string;
    message?: string | undefined;
    entity_type?: "UPDATE_REQUEST" | undefined;
    resolved_at?: string | undefined;
    resolved_by?: string | undefined;
    'asset_id#created_at'?: string | undefined;
}>;
export type UpdateRequest = z.infer<typeof UpdateRequestSchema>;
//# sourceMappingURL=outdatedFlag.d.ts.map