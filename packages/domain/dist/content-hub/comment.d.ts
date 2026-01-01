/**
 * Content Hub - Comment Domain Model
 *
 * Threaded comments on assets for feedback and collaboration.
 */
import { z } from 'zod';
/**
 * Comment
 *
 * Threaded comment on an asset or specific version.
 */
export declare const CommentSchema: z.ZodObject<{
    comment_id: z.ZodString;
    asset_id: z.ZodString;
    version_id: z.ZodOptional<z.ZodString>;
    user_id: z.ZodString;
    body: z.ZodString;
    parent_comment_id: z.ZodOptional<z.ZodString>;
    resolved_at: z.ZodOptional<z.ZodString>;
    resolved_by: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodOptional<z.ZodString>;
    entity_type: z.ZodDefault<z.ZodLiteral<"COMMENT">>;
    'asset_id#created_at': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    user_id: string;
    body: string;
    asset_id: string;
    entity_type: "COMMENT";
    comment_id: string;
    updated_at?: string | undefined;
    version_id?: string | undefined;
    parent_comment_id?: string | undefined;
    resolved_at?: string | undefined;
    resolved_by?: string | undefined;
    'asset_id#created_at'?: string | undefined;
}, {
    created_at: string;
    user_id: string;
    body: string;
    asset_id: string;
    comment_id: string;
    updated_at?: string | undefined;
    entity_type?: "COMMENT" | undefined;
    version_id?: string | undefined;
    parent_comment_id?: string | undefined;
    resolved_at?: string | undefined;
    resolved_by?: string | undefined;
    'asset_id#created_at'?: string | undefined;
}>;
export type Comment = z.infer<typeof CommentSchema>;
//# sourceMappingURL=comment.d.ts.map