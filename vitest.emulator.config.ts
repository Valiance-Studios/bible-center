import {defineConfig} from 'vite-plus';

// Security rules and Cloud Functions tests run in Node against the Auth and Firestore emulators
// (see `npm run test:emulator`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.spec.ts', 'tests/functions/**/*.spec.ts'],
    // Suites share one emulator database and clear it between tests.
    fileParallelism: false,
    // The Admin SDK in apps/functions finds the emulators and project from these, as it would when deployed.
    env: {
      GCLOUD_PROJECT: 'demo-bible-center',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    },
  },
});
