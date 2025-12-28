import type { Notification } from '@gravyty/domain';
import type { NotificationRepo } from '../index';

const notificationStore = new Map<string, Notification>();

export class StubNotificationRepo implements NotificationRepo {
  async list(userId: string): Promise<Notification[]> {
    return Array.from(notificationStore.values())
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async get(id: string, userId: string): Promise<Notification | null> {
    const notification = notificationStore.get(id);
    if (!notification || notification.user_id !== userId) {
      return null;
    }
    return notification;
  }

  async create(notification: Notification): Promise<Notification> {
    notificationStore.set(notification.notification_id, notification);
    return notification;
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = notificationStore.get(id);
    if (!notification || notification.user_id !== userId) {
      throw new Error(`Notification ${id} not found`);
    }
    notification.read = true;
    notificationStore.set(id, notification);
    return notification;
  }

  async delete(id: string, userId: string): Promise<void> {
    const notification = notificationStore.get(id);
    if (notification && notification.user_id === userId) {
      notificationStore.delete(id);
    }
  }
}

export function initializeStubNotifications() {
  const now = new Date().toISOString();
  
  notificationStore.set('1', {
    notification_id: '1',
    user_id: 'dev-user',
    type: 'info',
    title: 'New Content Available',
    message: 'New product overview document has been added',
    read: false,
    created_at: now,
    content_id: '1',
  } as Notification);

  notificationStore.set('2', {
    notification_id: '2',
    user_id: 'dev-user',
    type: 'success',
    title: 'Content Updated',
    message: 'Sales playbook has been updated with new information',
    read: false,
    created_at: now,
    content_id: '2',
  } as Notification);
}




