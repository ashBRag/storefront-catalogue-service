import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library auto-cleans only when test globals are enabled; they aren't here.
afterEach(() => {
  cleanup();
});
