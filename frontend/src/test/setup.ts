import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jest-dom adds DOM matchers (toBeInTheDocument, toBeDisabled, toHaveValue,
// toHaveAccessibleDescription, …) to Vitest's expect.

// Testing Library auto-cleans only when test globals are enabled; they aren't here.
afterEach(() => {
  cleanup();
});
