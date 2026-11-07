import {defineConfig} from 'vitest/config';

// Security rules tests run in Node against the Firestore emulator (see `npm run test:emulator`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.spec.ts'],
    // Suites share one emulator database and clear it between tests.
    fileParallelism: false,
  },
});
