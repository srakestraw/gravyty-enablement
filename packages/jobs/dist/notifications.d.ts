/**
 * Notification Creation Logic
 *
 * Provides utilities for creating notifications with idempotency support
 */
import type { Notification } from '@gravyty/domain';
export interface CreateNotificationParams {
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    contentId?: string;
    notificationId?: string;
}
/**
 * Create a notification for a user
 *
 * If notificationId is provided, checks for existing notification to ensure idempotency.
 * If a notification with the same ID already exists, returns the existing notification.
 */
export declare function createNotification(params: CreateNotificationParams): Promise<Notification>;
//# sourceMappingURL=notifications.d.ts.map