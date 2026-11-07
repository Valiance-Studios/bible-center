import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import {defineConfig} from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';

const stylisticOptions = {
  semi: true,
  quotes: 'single',
  braceStyle: '1tbs',
  arrowParens: true,
  jsx: true,
};

export default defineConfig([
  // Ignored paths
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },

  // All source files (JS, TS, TSX)
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [tseslint.configs.recommended],
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      ...stylistic.configs.customize(stylisticOptions).rules,
      '@stylistic/object-curly-spacing': ['error', 'never'],
    },
  },

  // React components and hooks
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'apps/web/tests/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
  },

  // Application TypeScript (browser)
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'apps/web/env.d.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Tooling config files and scripts (Node)
  {
    files: ['*.config.{js,ts}', 'apps/web/*.config.ts', 'scripts/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Unit and rules tests (Vitest)
  {
    files: ['apps/web/tests/**/*.{ts,tsx}', 'packages/core/tests/**/*.ts', 'tests/scripts/**/*.ts', 'tests/rules/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node,
      },
    },
  },

  // E2E tests (Playwright, Node)
  {
    files: ['apps/web/e2e/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);
