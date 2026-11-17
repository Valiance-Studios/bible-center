/**
 * Finds what would make a deploy's build ship without its Firebase config, with the wrong project's config, or with
 * config that must never ship. `scripts/build-hosting.ts` runs it before every Hosting build.
 *
 * Without it the build still succeeds, Hosting serves it, and the app only reports the problem in the browser as an
 * opaque Firebase error. `npm run build` stays usable without it, since it is also the project's type and bundle check.
 */
const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  // Without it the app sends no App Check tokens, and once enforcement is on in the console,
  // Firebase would reject every request from the deployed site.
  'VITE_APPCHECK_SITE_KEY',
];

/** What is wrong with the env a deploy to `projectId` would build with, in `mode`, if anything. */
export function findConfigProblems(env: Record<string, string | undefined>, mode: string, projectId: string): string[] {
  const problems: string[] = [];
  const missing = REQUIRED.filter((key) => !env[key]);

  if (missing.length > 0) {
    problems.push(`Firebase config is missing: ${missing.join(', ')}. Copy apps/web/.env.example to apps/web/.env.${mode} and fill it in from the Firebase console (see docs/DEPLOYMENT.md, "App Check Setup", for the site key).`);
  }

  if (env.VITE_FIREBASE_PROJECT_ID && env.VITE_FIREBASE_PROJECT_ID !== projectId) {
    // The site would be served by one project while its app talks to another.
    problems.push(`apps/web/.env.${mode} is for "${env.VITE_FIREBASE_PROJECT_ID}", not "${projectId}", which this deploy goes to.`);
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
