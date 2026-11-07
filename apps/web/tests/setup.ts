import {afterEach, vi} from 'vitest';
import {cleanup} from '@testing-library/react';

afterEach(cleanup);

// jsdom has no matchMedia, which Mantine reads to resolve the "auto" color scheme.
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
}));
