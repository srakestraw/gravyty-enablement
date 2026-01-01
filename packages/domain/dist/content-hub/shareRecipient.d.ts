/**
 * Content Hub - Share Recipient Domain Model
 *
 * Email verification for share links with email-verified access mode.
 */
import { z } from 'zod';
/**
 * Share Recipient
 *
 * Email address associated with a share link for verification.
 */
export declare const ShareRecipientSchema: z.ZodObject<{
    recipient_id: z.ZodString;
    share_link_id: z.ZodString;
    email: z.ZodString;
    email_hash: z.ZodOptional<z.ZodString>;
    verified: z.ZodDefault<z.ZodBoolean>;
    verification_token: z.ZodOptional<z.ZodString>;
    verified_at: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"SHARE_RECIPIENT">>;
    'share_link_id#email': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    created_at: string;
    entity_type: "SHARE_RECIPIENT";
    share_link_id: string;
    recipient_id: string;
    verified: boolean;
    email_hash?: string | undefined;
    verification_token?: string | undefined;
    verified_at?: string | undefined;
    'share_link_id#email'?: string | undefined;
}, {
    email: string;
    created_at: string;
    share_link_id: string;
    recipient_id: string;
    entity_type?: "SHARE_RECIPIENT" | undefined;
    email_hash?: string | undefined;
    verified?: boolean | undefined;
    verification_token?: string | undefined;
    verified_at?: string | undefined;
    'share_link_id#email'?: string | undefined;
}>;
export type ShareRecipient = z.infer<typeof ShareRecipientSchema>;
//# sourceMappingURL=shareRecipient.d.ts.map