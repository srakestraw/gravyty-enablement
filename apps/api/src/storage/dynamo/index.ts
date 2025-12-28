/**
 * DynamoDB Storage Implementations
 */

import { DynamoEventRepo } from './eventRepo';
import type { EventRepo } from '../index';

export function createDynamoRepos(): {
  event: EventRepo;
} {
  return {
    event: new DynamoEventRepo(),
  };
}



