import type {FirebaseApp} from 'firebase/app';

import {afterEach, describe, expect, it, vi} from 'vitest';
import {initializeAppCheck, ReCaptchaEnterpriseProvider} from 'firebase/app-check';
import {activateAppCheck} from '@/firebase/appCheck';

vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: vi.fn(),
}));

const app = {} as FirebaseApp;

describe('activateAppCheck', () => {
  afterEach(() => {
    delete self.FIREBASE_APPCHECK_DEBUG_TOKEN;
    vi.clearAllMocks();
  });

  it('uses reCAPTCHA Enterprise with the site key and refreshes tokens', () => {
    activateAppCheck(app, {siteKey: 'site-key'});

    expect(ReCaptchaEnterpriseProvider).toHaveBeenCalledWith('site-key');
    expect(initializeAppCheck).toHaveBeenCalledWith(app, expect.objectContaining({isTokenAutoRefreshEnabled: true}));
  });

  it('sets a debug token only when one is given', () => {
    activateAppCheck(app, {siteKey: 'site-key'});
    expect(self.FIREBASE_APPCHECK_DEBUG_TOKEN).toBeUndefined();

    activateAppCheck(app, {siteKey: 'site-key', debugToken: 'debug-token'});
    expect(self.FIREBASE_APPCHECK_DEBUG_TOKEN).toBe('debug-token');
  });
});
