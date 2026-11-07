import {defineConfig} from 'vitest/config';

// Unit tests only; `npm run test:emulator` and `npm run test:e2e` cover the rest.
export default defineConfig({
  test: {
    projects: [
      'apps/web/vitest.config.ts',
      {test: {name: 'core', root: 'packages/core', environment: 'node', include: ['tests/**/*.spec.ts']}},
      {test: {name: 'scripts', environment: 'node', include: ['tests/scripts/**/*.spec.ts']}},
    ],
  },
});
