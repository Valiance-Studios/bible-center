import type {FirebaseApp} from 'firebase/app';
import type {AppCheck} from 'firebase/app-check';

import {initializeAppCheck, ReCaptchaEnterpriseProvider} from 'firebase/app-check';

export interface AppCheckConfig {
  /** The reCAPTCHA Enterprise site key registered for the web app (public). */
  siteKey: string;
  /**
   * A debug token registered in the Firebase console, for running against a real project from a
   * domain reCAPTCHA does not allow (localhost). Never part of a deployed build: deploys refuse one.
   */
  debugToken?: string;
}

/**
 * Starts App Check, so requests to Firestore and Auth carry a token proving they come from this app.
 * reCAPTCHA Enterprise attests the page invisibly. Call it before Auth or Firestore make requests.
 */
export function activateAppCheck(app: FirebaseApp, {siteKey, debugToken}: AppCheckConfig): AppCheck {
  if (debugToken) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  return initializeAppCheck(app, {provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true});
}
