/**
 * Fails a deploy whose build would have no Firebase config, or a config that must never ship.
 *
 * Usage: node scripts/check-firebase-config.ts <mode>   (e.g. `staging`, the mode deploys build with)
 *
 * Without this the build still succeeds, Hosting serves it, and the app only reports the problem
 * in the browser as an opaque Firebase error. It runs from `hosting.predeploy` in firebase.json,
 * so it covers every deploy regardless of which npm script started it. `npm run build` stays
 * usable without credentials, since it is also the project's type and bundle check.
 */
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite';

const WEB_APP_DIR = fileURLToPath(new URL('../apps/web', import.meta.url));

const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  // Without it the app sends no App Check tokens, and once enforcement is on in the console,
  // Firebase would reject every request from the deployed site.
  'VITE_APPCHECK_SITE_KEY',
];

/** What is wrong with a deploy's env, if anything. */
export function findConfigProblems(env: Record<string, string | undefined>, mode: string): string[] {
  const problems: string[] = [];
  const missing = REQUIRED.filter((key) => !env[key]);

  if (missing.length > 0) {
    problems.push(`Firebase config is missing: ${missing.join(', ')}. Copy apps/web/.env.example to apps/web/.env.${mode} and fill it in from the Firebase console (see docs/DEPLOYMENT.md, "App Check Setup", for the site key).`);
  }

  if (env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    problems.push('The build is pointed at the Firebase emulators (VITE_USE_FIREBASE_EMULATORS=true).');
  }

  if (env.VITE_APPCHECK_DEBUG_TOKEN) {
    // A registered debug token passes App Check, so shipping it would let anyone bypass it.
    problems.push(`An App Check debug token is set (VITE_APPCHECK_DEBUG_TOKEN, likely in apps/web/.env.${mode}.local). It is for local runs only; remove it before deploying.`);
  }

  return problems;
}

if (import.meta.main) {
  const mode = process.argv[2];

  if (!mode) {
    console.error('Usage: node scripts/check-firebase-config.ts <mode>');
    process.exit(1);
  }

  // Reads .env.<mode> and .env.<mode>.local, plus any VITE_ variables in the shell.
  const env = loadEnv(mode, WEB_APP_DIR, 'VITE_');
  const problems = findConfigProblems(env, mode);

  if (problems.length > 0) {
    console.error(`Refusing to deploy the ${mode} build:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
    process.exit(1);
  }

  console.log(`Deploying the ${mode} build with Firebase project "${env.VITE_FIREBASE_PROJECT_ID}", App Check on.`);
}
