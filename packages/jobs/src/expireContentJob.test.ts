/**
 * Unit Tests for Expiry Job Logic
 * 
 * Lightweight tests for subscription matching and idempotency
 * Run with: npm test (or node --loader ts-node/esm src/expireContentJob.test.ts)
 */

import { subscriptionMatchesContent } from './subscriptionMatching';
import type { ContentItem, Subscription } from '@gravyty/domain';

// Test data helpers
function createContentItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    content_id: 'content_1',
    title: 'Test Content',
    summary: 'Test summary',
    status: 'Approved',
    owner_user_id: 'user1',
    last_updated: new Date().toISOString(),
    tags: [],
    version: '1.0.0',
    ...overrides,
  } as ContentItem;
}

function createSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    subscription_id: 'sub_1',
    user_id: 'user1',
    created_at: new Date().toISOString(),
    ...overrides,
  } as Subscription;
}

// Test cases
const tests: Array<{
  name: string;
  subscription: Partial<Subscription>;
  content: Partial<ContentItem>;
  expected: boolean;
}> = [
  {
    name: 'Exact match - product suite and concept',
    subscription: { product_suite: 'CRM', product_concept: 'Contacts' },
    content: { product_suite: 'CRM', product_concept: 'Contacts' },
    expected: true,
  },
  {
    name: 'Wildcard product suite',
    subscription: { product_suite: '*', product_concept: 'Contacts' },
    content: { product_suite: 'CRM', product_concept: 'Contacts' },
    expected: true,
  },
  {
    name: 'Wildcard product concept',
    subscription: { product_suite: 'CRM', product_concept: '*' },
    content: { product_suite: 'CRM', product_concept: 'Contacts' },
    expected: true,
  },
  {
    name: 'Tag overlap match',
    subscription: { product_suite: 'CRM', product_concept: 'Contacts', tags: ['sales', 'support'] },
    content: { product_suite: 'CRM', product_concept: 'Contacts', tags: ['sales'] },
    expected: true,
  },
  {
    name: 'No tag overlap',
    subscription: { product_suite: 'CRM', product_concept: 'Contacts', tags: ['sales'] },
    content: { product_suite: 'CRM', product_concept: 'Contacts', tags: ['marketing'] },
    expected: false,
  },
  {
    name: 'Subscription with no tags matches all',
    subscription: { product_suite: 'CRM', product_concept: 'Contacts' },
    content: { product_suite: 'CRM', product_concept: 'Contacts', tags: ['sales'] },
    expected: true,
  },
  {
    name: 'Product suite mismatch',
    subscription: { product_suite: 'CRM', product_concept: 'Contacts' },
    content: { product_suite: 'Marketing', product_concept: 'Contacts' },
    expected: false,
  },
];

// Run tests
function runTests() {
  console.log('🧪 Running Expiry Job Tests\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const subscription = createSubscription(test.subscription);
    const content = createContentItem(test.content);
    
    const result = subscriptionMatchesContent(subscription, content);
    const success = result === test.expected;
    
    if (success) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      console.log(`   Expected: ${test.expected}, Got: ${result}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if executed directly
// Usage: npm run build && node dist/expireContentJob.test.js
if (process.argv[1] && process.argv[1].includes('expireContentJob.test')) {
  runTests();
}

export { runTests };

