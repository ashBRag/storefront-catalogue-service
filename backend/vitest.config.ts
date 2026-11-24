import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Only used by `npm run coverage` (vitest run --coverage).
    coverage: {
      provider: 'v8',
      // The use-cases and the HTTP layer: where the acceptance criteria live.
      include: ['src/services/**', 'src/http/**'],
      reporter: [['text', { skipFull: false }], 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
