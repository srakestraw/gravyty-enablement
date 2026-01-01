/**
 * Content Hub - Share Event Domain Model
 *
 * Tracking events for share links (views, downloads, etc.).
 */
import { z } from 'zod';
/**
 * Share Event Type
 */
export declare const ShareEventTypeSchema: z.ZodEnum<["view", "download", "verify"]>;
export type ShareEventType = z.infer<typeof ShareEventTypeSchema>;
/**
 * Share Event
 *
 * Event tracking for share link usage.
 */
export declare const ShareEventSchema: z.ZodObject<{
    event_id: z.ZodString;
    share_link_id: z.ZodString;
    event_type: z.ZodEnum<["view", "download", "verify"]>;
    resolved_version_id: z.ZodOptional<z.ZodString>;
    ip_address: z.ZodOptional<z.ZodString>;
    user_agent: z.ZodOptional<z.ZodString>;
    recipient_email: z.ZodOptional<z.ZodString>;
    created_at: z.ZodString;
    entity_type: z.ZodDefault<z.ZodLiteral<"SHARE_EVENT">>;
    'share_link_id#created_at': z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_at: string;
    entity_type: "SHARE_EVENT";
    share_link_id: string;
    event_id: string;
    event_type: "view" | "download" | "verify";
    resolved_version_id?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
    recipient_email?: string | undefined;
    'share_link_id#created_at'?: string | undefined;
}, {
    created_at: string;
    share_link_id: string;
    event_id: string;
    event_type: "view" | "download" | "verify";
    entity_type?: "SHARE_EVENT" | undefined;
    resolved_version_id?: string | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
    recipient_email?: string | undefined;
    'share_link_id#created_at'?: string | undefined;
}>;
export type ShareEvent = z.infer<typeof ShareEventSchema>;
//# sourceMappingURL=shareEvent.d.ts.map