import {defineConfig, mergeConfig} from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'web',
      environment: 'jsdom',
      include: ['tests/**/*.spec.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
    },
  }),
);
