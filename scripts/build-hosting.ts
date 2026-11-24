/**
 * Builds the web app for the project a Hosting deploy goes to. It runs from `hosting.predeploy` in firebase.json, so
 * it covers every Hosting deploy whichever npm script started it. The Firebase CLI gives it the project as
 * GCLOUD_PROJECT, and `scripts/environments.ts` gives the Vite mode, so a deploy cannot build another project's config.
 */
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite-plus';
import {findConfigProblems} from './check-firebase-config.ts';
import {hostedMode} from './environments.ts';

const WEB_APP_DIR = fileURLToPath(new URL('../apps/web', import.meta.url));
const projectId = process.env.GCLOUD_PROJECT;
const mode = hostedMode(projectId);

if (!projectId || !mode) {
  console.error(
    `Refusing to deploy Hosting to "${projectId ?? 'no project'}": scripts/environments.ts does not list it.`,
  );
  process.exit(1);
}

// Reads .env.<mode> and .env.<mode>.local, plus any VITE_ variables in the shell.
const problems = findConfigProblems(loadEnv(mode, WEB_APP_DIR, 'VITE_'), mode, projectId);

if (problems.length > 0) {
  console.error(`Refusing to deploy the ${mode} build:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exit(1);
}

console.log(`Building the ${mode} build for Firebase project "${projectId}", App Check on.`);
execSync(`npm run type-check && npm run build -w @bible-center/web -- --mode ${mode}`, {stdio: 'inherit'});
