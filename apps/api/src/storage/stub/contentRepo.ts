import type { ContentItem } from '@gravyty/domain';
import type { ContentRepo } from '../index';

const contentStore = new Map<string, ContentItem>();

export class StubContentRepo implements ContentRepo {
  async list(params: {
    query?: string;
    product_suite?: string;
    product_concept?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ContentItem[]; next_cursor?: string }> {
    let items = Array.from(contentStore.values());

    // Apply filters
    if (params.query) {
      const lowerQuery = params.query.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.summary.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    if (params.product_suite) {
      items = items.filter(item => item.product_suite === params.product_suite);
    }

    if (params.product_concept) {
      items = items.filter(item => item.product_concept === params.product_concept);
    }

    if (params.status) {
      items = items.filter(item => item.status === params.status);
    }

    // Sort by last_updated descending
    items.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());

    // Apply pagination
    const limit = params.limit || 50;
    const startIndex = params.cursor ? parseInt(params.cursor, 10) : 0;
    const paginatedItems = items.slice(startIndex, startIndex + limit);
    const nextCursor = startIndex + limit < items.length ? String(startIndex + limit) : undefined;

    return {
      items: paginatedItems,
      ...(nextCursor && { next_cursor: nextCursor }),
    };
  }

  async get(id: string): Promise<ContentItem | null> {
    return contentStore.get(id) || null;
  }

  async create(item: ContentItem): Promise<ContentItem> {
    contentStore.set(item.content_id, item);
    return item;
  }

  async update(id: string, updates: Partial<ContentItem>): Promise<ContentItem> {
    const existing = contentStore.get(id);
    if (!existing) {
      throw new Error(`Content item ${id} not found`);
    }

    const updated = { ...existing, ...updates, content_id: id, last_updated: new Date().toISOString() };
    contentStore.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    contentStore.delete(id);
  }
}

// Initialize with sample data
export function initializeStubContent() {
  const now = new Date().toISOString();
  
  contentStore.set('1', {
    content_id: '1',
    title: 'Product Overview: Gravyty AI',
    summary: 'Introduction to Gravyty AI capabilities and use cases',
    status: 'Approved',
    product_suite: 'AI',
    product_concept: 'Product',
    audience_role: 'AE',
    lifecycle_stage: 'Active',
    owner_user_id: 'product-team',
    last_updated: now,
    tags: ['AI', 'Product'],
    version: '1.0.0',
  } as ContentItem);

  contentStore.set('2', {
    content_id: '2',
    title: 'Sales Playbook: Enterprise Deals',
    summary: 'Step-by-step guide for closing enterprise deals',
    status: 'Approved',
    product_suite: 'Sales',
    product_concept: 'Playbook',
    audience_role: 'AE',
    lifecycle_stage: 'Active',
    owner_user_id: 'sales-team',
    last_updated: now,
    tags: ['Sales', 'Playbook'],
    version: '1.0.0',
  } as ContentItem);

  contentStore.set('3', {
    content_id: '3',
    title: 'Customer Success: Onboarding Best Practices',
    summary: 'Best practices for onboarding new customers',
    status: 'Draft',
    product_suite: 'CSM',
    product_concept: 'Onboarding',
    audience_role: 'CSM',
    lifecycle_stage: 'Draft',
    owner_user_id: 'cs-team',
    last_updated: now,
    tags: ['CSM', 'Onboarding'],
    version: '1.0.0',
  } as ContentItem);
}




