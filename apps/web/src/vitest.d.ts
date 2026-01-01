/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { expect, afterEach } from 'vitest';
import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    interface JestAssertion<T = any> extends jest.Matchers<void, T> {}
  }
}

