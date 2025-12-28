import type { Subscription } from '@gravyty/domain';
import type { SubscriptionRepo } from '../index';

const subscriptionStore = new Map<string, Subscription>();

export class StubSubscriptionRepo implements SubscriptionRepo {
  async list(userId: string): Promise<Subscription[]> {
    return Array.from(subscriptionStore.values())
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async get(id: string, userId: string): Promise<Subscription | null> {
    const subscription = subscriptionStore.get(id);
    if (!subscription || subscription.user_id !== userId) {
      return null;
    }
    return subscription;
  }

  async create(subscription: Subscription): Promise<Subscription> {
    subscriptionStore.set(subscription.id, subscription);
    return subscription;
  }

  async delete(id: string, userId: string): Promise<void> {
    const subscription = subscriptionStore.get(id);
    if (subscription && subscription.user_id === userId) {
      subscriptionStore.delete(id);
    }
  }
}




