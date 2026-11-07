/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  /** The reCAPTCHA Enterprise site key App Check uses. Not needed against the emulators. */
  readonly VITE_APPCHECK_SITE_KEY?: string;
  /** Only in a gitignored `.env.staging.local`, for local runs against staging; deploys refuse it. */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string;
}

interface Window {
  /** Read by App Check at start-up: a registered debug token to use instead of reCAPTCHA. */
  FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
