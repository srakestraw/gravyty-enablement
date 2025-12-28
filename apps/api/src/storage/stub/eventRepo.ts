import type { ActivityEvent } from '@gravyty/domain';
import type { EventRepo } from '../index';

const MAX_EVENTS = 1000;
const eventStore: ActivityEvent[] = [];

export class StubEventRepo implements EventRepo {
  async create(event: ActivityEvent): Promise<void> {
    eventStore.push(event);
    if (eventStore.length > MAX_EVENTS) {
      eventStore.shift();
    }
  }

  async list(limit: number = 100): Promise<ActivityEvent[]> {
    return eventStore.slice(-limit).reverse();
  }
}




