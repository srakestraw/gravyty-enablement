/**
 * Storage Factory
 * 
 * Creates storage repositories based on STORAGE_BACKEND environment variable
 */

import { createStubRepos } from './stub';
import { createDynamoRepos } from './dynamo';
import type { EventRepo } from './index';

const STORAGE_BACKEND = process.env.STORAGE_BACKEND || 'stub';

export interface StorageRepos {
  event: EventRepo;
}

export function createStorageRepos(): StorageRepos {
  if (STORAGE_BACKEND === 'aws') {
    console.log('Using DynamoDB storage backend');
    return createDynamoRepos();
  } else {
    console.log('Using stub storage backend');
    return createStubRepos();
  }
}



