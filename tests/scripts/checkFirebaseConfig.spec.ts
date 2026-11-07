import {describe, expect, it} from 'vitest';
import {findConfigProblems} from '../../scripts/check-firebase-config';

const VALID_ENV = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'domain',
  VITE_FIREBASE_PROJECT_ID: 'project',
  VITE_FIREBASE_APP_ID: 'app',
  VITE_APPCHECK_SITE_KEY: 'site-key',
};

describe('findConfigProblems', () => {
  it('accepts a complete config', () => {
    expect(findConfigProblems(VALID_ENV, 'staging')).toEqual([]);
  });

  it('requires the App Check site key', () => {
    const [problem] = findConfigProblems({...VALID_ENV, VITE_APPCHECK_SITE_KEY: ''}, 'staging');

    expect(problem).toContain('VITE_APPCHECK_SITE_KEY');
  });

  it('refuses a debug token', () => {
    const [problem] = findConfigProblems({...VALID_ENV, VITE_APPCHECK_DEBUG_TOKEN: 'token'}, 'staging');

    expect(problem).toContain('debug token');
  });

  it('refuses a build pointed at the emulators', () => {
    const [problem] = findConfigProblems({...VALID_ENV, VITE_USE_FIREBASE_EMULATORS: 'true'}, 'staging');

    expect(problem).toContain('emulators');
  });
});
