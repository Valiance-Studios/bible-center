import {defineConfig} from 'vite-plus';

// The formatter, linter and unit tests for the whole repository. The web app's dev server and build are
// configured in apps/web/vite.config.ts.
export default defineConfig({
  fmt: {
    printWidth: 120,
    singleQuote: true,
    bracketSpacing: false,
    quoteProps: 'consistent',
    sortPackageJson: false,
    ignorePatterns: [
      // Generated
      'apps/functions/lib/**',
      'apps/web/public/**',
      // Written by hand
      '**/*.md',
    ],
  },
  lint: {
    plugins: ['eslint', 'oxc', 'typescript', 'unicorn', 'react'],
    categories: {correctness: 'error'},
    jsPlugins: [{name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin'}],
    options: {typeAware: true, typeCheck: true},
    ignorePatterns: ['apps/functions/lib/**', 'apps/web/public/**'],
    rules: {
      'vite-plus/prefer-vite-plus-imports': 'error',
      // The rest of typescript-eslint's recommended rules, which are not in Oxlint's correctness category.
      'no-array-constructor': 'error',
      'no-empty': 'error',
      'prefer-const': 'error',
      'typescript/ban-ts-comment': 'error',
      'typescript/no-empty-object-type': 'error',
      'typescript/no-explicit-any': 'error',
      'typescript/no-namespace': 'error',
      'typescript/no-require-imports': 'error',
      'typescript/no-unnecessary-type-constraint': 'error',
      'typescript/no-unsafe-function-type': 'error',
    },
    overrides: [
      {
        // `expect(object.method)` does not call the method.
        files: ['**/tests/**/*.{ts,tsx}'],
        rules: {'typescript/unbound-method': 'off'},
      },
      {
        // eslint-plugin-react-hooks' recommended rules, except the two about React Compiler's configuration.
        files: ['apps/web/src/**/*.{ts,tsx}', 'apps/web/tests/**/*.{ts,tsx}'],
        rules: {
          'react/rules-of-hooks': 'error',
          'react/exhaustive-deps': 'error',
          'react/static-components': 'error',
          'react/use-memo': 'error',
          'react/preserve-manual-memoization': 'error',
          'react/incompatible-library': 'error',
          'react/immutability': 'error',
          'react/globals': 'error',
          'react/refs': 'error',
          'react/set-state-in-effect': 'error',
          'react/error-boundaries': 'error',
          'react/purity': 'error',
          'react/set-state-in-render': 'error',
          'react/unsupported-syntax': 'error',
        },
      },
    ],
  },
  // Unit tests only; `npm run test:emulator` and `npm run test:e2e` cover the rest.
  test: {
    projects: [
      'apps/web/vite.config.ts',
      {test: {name: 'core', root: 'packages/core', environment: 'node', include: ['tests/**/*.spec.ts']}},
      {test: {name: 'scripts', environment: 'node', include: ['tests/scripts/**/*.spec.ts']}},
    ],
  },
});
