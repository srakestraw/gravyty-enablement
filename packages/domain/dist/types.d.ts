import { z } from 'zod';
/**
 * User Role
 */
export declare const UserRoleSchema: z.ZodEnum<["Viewer", "Contributor", "Approver", "Admin"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
/**
 * Activity Event
 */
export declare const ActivityEventSchema: z.ZodObject<{
    event_name: z.ZodString;
    user_id: z.ZodOptional<z.ZodString>;
    content_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    timestamp: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    event_name: string;
    user_id?: string | undefined;
    content_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    timestamp?: string | undefined;
}, {
    event_name: string;
    user_id?: string | undefined;
    content_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    timestamp?: string | undefined;
}>;
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
//# sourceMappingURL=types.d.ts.map