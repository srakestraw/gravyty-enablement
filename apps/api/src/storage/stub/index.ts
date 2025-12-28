/**
 * Stub Storage Implementations
 */

import { StubEventRepo } from './eventRepo';
import type { EventRepo } from '../index';

export function createStubRepos(): {
  event: EventRepo;
} {
  return {
    event: new StubEventRepo(),
  };
}



