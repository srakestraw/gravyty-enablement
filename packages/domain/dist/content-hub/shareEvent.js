/**
 * Content Hub - Share Event Domain Model
 *
 * Tracking events for share links (views, downloads, etc.).
 */
import { z } from 'zod';
/**
 * Share Event Type
 */
export const ShareEventTypeSchema = z.enum([
    'view',
    'download',
    'verify',
]);
/**
 * Share Event
 *
 * Event tracking for share link usage.
 */
export const ShareEventSchema = z.object({
    // Primary key
    event_id: z.string(),
    share_link_id: z.string(),
    // Event details
    event_type: ShareEventTypeSchema,
    resolved_version_id: z.string().optional(), // For canonical links - which version was accessed
    // User/Client info
    ip_address: z.string().optional(),
    user_agent: z.string().optional(),
    recipient_email: z.string().optional(), // If email-verified
    // Timestamps
    created_at: z.string(), // ISO datetime
    // DynamoDB discriminator
    entity_type: z.literal('SHARE_EVENT').default('SHARE_EVENT'),
    // GSI attributes
    'share_link_id#created_at': z.string().optional(), // For querying events by share link
});
//# sourceMappingURL=shareEvent.js.map