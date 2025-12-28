import { z } from 'zod';
/**
 * User Role
 */
export const UserRoleSchema = z.enum(['Viewer', 'Contributor', 'Approver', 'Admin']);
/**
 * Activity Event
 */
export const ActivityEventSchema = z.object({
    event_name: z.string(),
    user_id: z.string().optional(),
    content_id: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    timestamp: z.string().datetime().optional(),
});
//# sourceMappingURL=types.js.map